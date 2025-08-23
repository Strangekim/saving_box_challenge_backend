import { trycatchWrapper } from '../util/trycatchWrapper.js';
import { 
  getAllUniversityRankings, 
  getIndividualRankingInUniversity 
} from './service.js';

// ============== 대학별 챌린지 랭킹 조회 ==============
export const getRankingsController = trycatchWrapper(async (req, res) => {
  const { category, university_id, limit } = req.query;
  
  if (category === 'university') {
    // 대학별 랭킹 조회
    const universityRankings = await getAllUniversityRankings(limit);
    
    // 응답 포맷팅
    const response = {
      category: 'university',
      message: '대학별 챌린지 랭킹 조회 성공',
      ranking: {
        total_universities: universityRankings.length,
        updated_at: new Date().toISOString(),
        methodology: {
          description: '종합 점수 기반 랭킹',
          weights: {
            challenge_completion_rate: '40%',
            avg_success_rate: '30%', 
            participant_count: '20%',
            avg_target_amount: '10%'
          }
        },
        universities: universityRankings
      }
    };
    
    res.status(200).json(response);
    
  } else if (category === 'individual') {
    // 대학 내 개인 랭킹 조회
    const individualRankings = await getIndividualRankingInUniversity(university_id, limit);
    
    const response = {
      category: 'individual',
      university_id: parseInt(university_id),
      message: '대학 내 개인 챌린지 랭킹 조회 성공',
      ranking: {
        total_students: individualRankings.length,
        updated_at: new Date().toISOString(),
        students: individualRankings
      }
    };
    
    res.status(200).json(response);
  }
});