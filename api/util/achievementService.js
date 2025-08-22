import { query } from '../database/postgreSQL.js';

// ============== 업적 메트릭 업데이트 ==============
export const updateUserMetrics = async (userId, metricUpdates) => {
  // metricUpdates 예시: { bucket_count: 1, comment_count: 1 }
  
  const updateFields = [];
  const values = [];
  let paramIndex = 1;
  
  // 동적으로 UPDATE 쿼리 생성
  for (const [field, increment] of Object.entries(metricUpdates)) {
    updateFields.push(`${field} = ${field} + $${paramIndex}`);
    values.push(increment);
    paramIndex++;
  }
  
  values.push(userId); // WHERE 조건용
  
  const updateQuery = `
    UPDATE users.metrics 
    SET ${updateFields.join(', ')}, updated_at = NOW()
    WHERE user_id = $${paramIndex}
    RETURNING *
  `;
  
  const result = await query(updateQuery, values);
  return result.rows[0];
};

// ============== 달성 가능한 업적 확인 ==============
export const checkAchievements = async (userId, updatedMetrics) => {
  // 사용자가 아직 달성하지 않은 업적들 조회
  const unlockedAchievements = await query(`
    SELECT al.* 
    FROM achievement.list al
    LEFT JOIN achievement.user au ON al.id = au.achievement_id AND au.user_id = $1
    WHERE au.id IS NULL AND al.is_active = true
  `, [userId]);
  
  const newlyUnlocked = [];
  
  for (const achievement of unlockedAchievements.rows) {
    const condition = JSON.parse(achievement.condition);
    const isUnlocked = checkAchievementCondition(updatedMetrics, condition);
    
    if (isUnlocked) {
      newlyUnlocked.push(achievement);
    }
  }
  
  return newlyUnlocked;
};

// ============== 업적 조건 확인 헬퍼 ==============
const checkAchievementCondition = (metrics, condition) => {
  const { type, value } = condition;
  
  // metrics에서 해당 타입의 현재 값 확인
  const currentValue = metrics[type] || 0;
  
  return currentValue >= value;
};

// ============== 업적 달성 처리 ==============
export const unlockAchievements = async (userId, achievements) => {
  if (achievements.length === 0) return [];
  
  const unlockedResults = [];
  
  for (const achievement of achievements) {
    // 1. 업적 달성 기록
    const unlockResult = await query(`
      INSERT INTO achievement.user (user_id, achievement_id, meta)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [userId, achievement.id, JSON.stringify({ unlocked_at: new Date() })]);
    
    // 2. 보상 아이템 조회
    const rewards = await query(`
      SELECT ar.item_id, cil.name as item_name, cit.name as item_type_name
      FROM achievement.reward ar
      JOIN cosmetic_item.list cil ON ar.item_id = cil.id
      JOIN cosmetic_item.type cit ON cil.cosmetic_item_type = cit.id
      WHERE ar.achievement_id = $1
    `, [achievement.id]);
    
    // 3. 사용자 가방에 보상 아이템 지급
    for (const reward of rewards.rows) {
      await query(`
        INSERT INTO users.inventory (user_id, item_id, item_type_id)
        VALUES ($1, $2, (SELECT cosmetic_item_type FROM cosmetic_item.list WHERE id = $2))
        ON CONFLICT (user_id, item_id) DO NOTHING
      `, [userId, reward.item_id]);
    }
    
    unlockedResults.push({
      achievement,
      rewards: rewards.rows
    });
  }
  
  return unlockedResults;
};

// ============== 메인 업적 처리 함수 ==============
export const processUserAction = async (userId, actionType, actionData = {}) => {
  // 액션 타입별 메트릭 증가량 정의
  const actionMetrics = {
    'create_bucket': { bucket_count: 1 },
    'give_like': { count_like_sum: 1 },
    'receive_like': { get_like_sum: 1 },
    'create_comment': { comment_count: 1 },
    'bucket_push': { bucket_push_count: 1 },
    'complete_bucket': { success_bucket_count: 1 },
    'complete_challenge': { challenge_success_count: 1 }
  };
  
  const metricUpdates = actionMetrics[actionType];
  if (!metricUpdates) {
    throw new Error(`Unknown action type: ${actionType}`);
  }
  
  // 1. 메트릭 업데이트
  const updatedMetrics = await updateUserMetrics(userId, metricUpdates);
  
  // 2. 새로 달성한 업적 확인
  const newAchievements = await checkAchievements(userId, updatedMetrics);
  
  // 3. 업적 달성 처리 및 보상 지급
  const unlockedResults = await unlockAchievements(userId, newAchievements);
  
  return {
    updatedMetrics,
    newAchievements: unlockedResults
  };
};