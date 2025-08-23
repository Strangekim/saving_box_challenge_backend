import { query } from '../database/postgreSQL.js';

// ============== 대학별 챌린지 랭킹 조회 서비스 ==============
export const getUniversityChallengeStat = async (universityId) => {
  const statsQuery = `
    SELECT 
      -- 기본 정보
      uni.id as university_id,
      uni.name as university_name,
      
      -- 챌린지 완료율 계산 (40% 가중치)
      COUNT(CASE WHEN sb.is_challenge = true THEN 1 END) as total_challenge_buckets,
      COUNT(CASE WHEN sb.is_challenge = true AND sb.status = 'success' THEN 1 END) as completed_challenge_buckets,
      CASE 
        WHEN COUNT(CASE WHEN sb.is_challenge = true THEN 1 END) > 0 
        THEN (COUNT(CASE WHEN sb.is_challenge = true AND sb.status = 'success' THEN 1 END)::float / 
              COUNT(CASE WHEN sb.is_challenge = true THEN 1 END) * 100)
        ELSE 0 
      END as challenge_completion_rate,
      
      -- 평균 성공률 계산 (30% 가중치) - 진행중 + 완료된 챌린지만
      AVG(
        CASE 
          WHEN sb.is_challenge = true AND sb.total_payment > 0 
          THEN (sb.success_payment::float / sb.total_payment * 100)
          ELSE NULL 
        END
      ) as avg_success_rate,
      
      -- 참여자 수 (20% 가중치)
      COUNT(DISTINCT CASE WHEN sb.is_challenge = true THEN sb.user_id END) as participant_count,
      
      -- 평균 목표 금액 (10% 가중치) - 정규화를 위해 10만원 단위로
      AVG(CASE WHEN sb.is_challenge = true THEN sb.target_amount END) / 100000.0 as avg_target_amount_100k
      
    FROM users.university uni
    LEFT JOIN users.list u ON uni.id = u.university_id
    LEFT JOIN saving_bucket.list sb ON u.id = sb.user_id
    WHERE uni.id = $1
    GROUP BY uni.id, uni.name
  `;
  
  const result = await query(statsQuery, [universityId]);
  return result.rows[0];
};

export const getAllUniversityRankings = async (limit = 20) => {
  // 1. 모든 대학의 통계 조회
  const universitiesQuery = `
    SELECT id, name FROM users.university ORDER BY id
  `;
  
  const universitiesResult = await query(universitiesQuery);
  const universities = universitiesResult.rows;
  
  // 2. 각 대학별 상세 통계 조회
  const universityStats = [];
  
  for (const university of universities) {
    const stats = await getUniversityChallengeStat(university.id);
    if (stats) {
      universityStats.push(stats);
    }
  }
   // 3. 정규화를 위한 최대값 계산
  const maxParticipants = Math.max(...universityStats.map(s => s.participant_count || 0));
  const maxAvgTarget = Math.max(...universityStats.map(s => s.avg_target_amount_100k || 0));
  
  // 4. 종합 점수 계산 및 랭킹 부여
  const rankedUniversities = universityStats
    .map(stats => {
      // NULL 처리
      const completionRate = stats.challenge_completion_rate || 0;
      const successRate = stats.avg_success_rate || 0;
      const participantCount = stats.participant_count || 0;
      const avgTarget = stats.avg_target_amount_100k || 0;
      
      // 정규화 (0-100 스케일)
      const normalizedParticipants = maxParticipants > 0 ? (participantCount / maxParticipants * 100) : 0;
      const normalizedAvgTarget = maxAvgTarget > 0 ? (avgTarget / maxAvgTarget * 100) : 0;
      
      // 가중치 적용 종합 점수 계산
      const totalScore = (
        completionRate * 0.40 +      // 챌린지 완료율 (40%)
        successRate * 0.30 +         // 평균 성공률 (30%) 
        normalizedParticipants * 0.20 + // 참여자 수 (20%)
        normalizedAvgTarget * 0.10    // 평균 목표 금액 (10%)
      );
      
      return {
        university_id: stats.university_id,
        university_name: stats.university_name,
        total_score: Math.round(totalScore * 100) / 100, // 소수점 2자리
        
        // 세부 지표들
        challenge_completion_rate: Math.round(completionRate * 100) / 100,
        avg_success_rate: Math.round(successRate * 100) / 100,
        participant_count: participantCount,
        total_challenge_buckets: stats.total_challenge_buckets || 0,
        completed_challenge_buckets: stats.completed_challenge_buckets || 0,
        avg_target_amount: Math.round((stats.avg_target_amount_100k || 0) * 100000), // 원래 금액으로 복원
        
        // 정규화된 값들 (디버깅/투명성 목적)
        normalized_participants: Math.round(normalizedParticipants * 100) / 100,
        normalized_avg_target: Math.round(normalizedAvgTarget * 100) / 100
      };
    })
    .sort((a, b) => b.total_score - a.total_score) // 점수 높은 순 정렬
    .slice(0, limit)
    .map((university, index) => ({
      ...university,
      ranking_position: index + 1
    }));
  
  return rankedUniversities;
};

// ============== 대학 내 개인 랭킹 조회 서비스 (미래 확장용) ==============
export const getIndividualRankingInUniversity = async (universityId, limit = 20) => {
  const individualQuery = `
    SELECT 
      u.id as user_id,
      u.nickname,
      u.university_id,
      
      -- 개인 챌린지 성과
      um.challenge_success_count,
      COUNT(CASE WHEN sb.is_challenge = true THEN 1 END) as total_challenges,
      COUNT(CASE WHEN sb.is_challenge = true AND sb.status = 'success' THEN 1 END) as completed_challenges,
      
      -- 개인 평균 달성률
      AVG(
        CASE 
          WHEN sb.is_challenge = true AND sb.total_payment > 0 
          THEN (sb.success_payment::float / sb.total_payment * 100)
          ELSE NULL 
        END
      ) as personal_avg_success_rate,
      
      -- 총 목표 금액
      SUM(CASE WHEN sb.is_challenge = true THEN sb.target_amount ELSE 0 END) as total_target_amount
      
    FROM users.list u
    JOIN users.metrics um ON u.id = um.user_id
    LEFT JOIN saving_bucket.list sb ON u.id = sb.user_id
    WHERE u.university_id = $1
    GROUP BY u.id, u.nickname, u.university_id, um.challenge_success_count
    HAVING COUNT(CASE WHEN sb.is_challenge = true THEN 1 END) > 0  -- 챌린지 참여자만
    ORDER BY um.challenge_success_count DESC, personal_avg_success_rate DESC
    LIMIT $2
  `;
  
  const result = await query(individualQuery, [universityId, limit]);
  
  return result.rows.map((user, index) => ({
    ranking_position: index + 1,
    user_id: user.user_id,
    nickname: user.nickname,
    challenge_success_count: user.challenge_success_count,
    total_challenges: user.total_challenges,
    completed_challenges: user.completed_challenges,
    personal_avg_success_rate: Math.round((user.personal_avg_success_rate || 0) * 100) / 100,
    total_target_amount: user.total_target_amount || 0
  }));
};