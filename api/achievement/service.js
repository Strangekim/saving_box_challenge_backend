import { query } from '../database/postgreSQL.js';
import { customError } from '../util/customError.js';

// ============== 사용자 존재 확인 서비스 ==============
export const validateUserExists = async (userId) => {
  const result = await query(
    'SELECT id, nickname FROM users.list WHERE id = $1',
    [userId]
  );
  
  if (result.rows.length === 0) {
    throw customError(404, '존재하지 않는 사용자입니다.');
  }
  
  return result.rows[0];
};

// ============== 전체 업적 목록 조회 (달성 여부 포함) ==============
export const getAllAchievementsWithUserStatus = async (userId) => {
  const achievementsQuery = `
    SELECT 
      -- 업적 기본 정보
      al.id as achievement_id,
      al.code,
      al.title,
      al.description,
      al.condition,
      al.is_active,
      al.created_at as achievement_created_at,
      
      -- 사용자 달성 정보
      CASE WHEN au.achievement_id IS NOT NULL THEN true ELSE false END as is_completed,
      au.unlocked_at,
      au.meta,
      
      -- 보상 아이템들
      json_agg(
        CASE WHEN ar.item_id IS NOT NULL THEN
          json_build_object(
            'item_id', cil.id,
            'item_name', cil.name,
            'item_description', cil.description,
            'item_type_id', cit.id,
            'item_type_code', cit.code,
            'item_type_name', cit.name,
            'is_default', cil.is_default
          )
        ELSE NULL END
        ORDER BY cit.id, cil.id
      ) FILTER (WHERE ar.item_id IS NOT NULL) as reward_items
      
    FROM achievement.list al
    
    -- 사용자 달성 여부 조인 (LEFT JOIN으로 전체 업적 포함)
    LEFT JOIN achievement.user au ON al.id = au.achievement_id AND au.user_id = $1
    
    -- 보상 아이템 정보 조인
    LEFT JOIN achievement.reward ar ON al.id = ar.achievement_id
    LEFT JOIN cosmetic_item.list cil ON ar.item_id = cil.id
    LEFT JOIN cosmetic_item.type cit ON cil.cosmetic_item_type = cit.id
    
    WHERE al.is_active = true
    
    GROUP BY 
      al.id, al.code, al.title, al.description, al.condition, 
      al.is_active, al.created_at,
      au.achievement_id, au.unlocked_at, au.meta
    
    ORDER BY al.created_at ASC
  `;
  
  const result = await query(achievementsQuery, [userId]);
  
  // 결과 포맷팅
  const achievements = result.rows.map(achievement => ({
    achievement_id: achievement.achievement_id,
    code: achievement.code,
    title: achievement.title,
    description: achievement.description,
    condition: achievement.condition,
    is_active: achievement.is_active,
    is_completed: achievement.is_completed,
    unlocked_at: achievement.unlocked_at,
    meta: achievement.meta,
    achievement_created_at: achievement.achievement_created_at,
    reward_items: achievement.reward_items || []
  }));
  
  return achievements;
};

// ============== 사용자 업적 통계 조회 ==============
export const getUserAchievementStats = async (userId) => {
  const statsQuery = `
    SELECT 
      COUNT(al.*) as total_achievements,
      COUNT(au.achievement_id) as completed_achievements
    FROM achievement.list al
    LEFT JOIN achievement.user au ON al.id = au.achievement_id AND au.user_id = $1
    WHERE al.is_active = true
  `;
  
  const result = await query(statsQuery, [userId]);
  const stats = result.rows[0];
  
  return {
    total_achievements: parseInt(stats.total_achievements),
    completed_achievements: parseInt(stats.completed_achievements),
    completion_rate: stats.total_achievements > 0 ? 
      ((stats.completed_achievements / stats.total_achievements) * 100).toFixed(1) : "0.0"
  };
};