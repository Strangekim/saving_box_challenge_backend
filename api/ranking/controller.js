import { trycatchWrapper } from '../util/trycatchWrapper.js';
import { 
  getAllUniversityRankings, 
  getUniversityMajorRankings,
  getTopUniversityMajorRankings,
  getUserUniversityInfo
} from './service.js';

// ============== 대학별/학과별 챌린지 랭킹 조회 ==============
export const getRankingsController = trycatchWrapper(async (req, res) => {
  const { category, limit } = req.query;
  const userId = req.session?.userId || null;
  
  // 사용자 대학/학과 정보 조회 (로그인한 경우만)
  const userInfo = await getUserUniversityInfo(userId);
  
  if (category === 'university') {
    // 대학별 랭킹 조회
    const universityRankings = await getAllUniversityRankings(limit);
    
    // 사용자 대학 랭킹 위치 찾기
    let myUniversityRanking = null;
    if (userInfo) {
      myUniversityRanking = universityRankings.find(
        univ => univ.university_id === userInfo.university_id
      );
    }
    
    // 응답 포맷팅
    const response = {
      category: 'university',
      message: '대학별 챌린지 랭킹 조회 성공',
      my_university: userInfo ? {
        university_id: userInfo.university_id,
        university_name: userInfo.university_name,
        major_id: userInfo.major_id,
        major_name: userInfo.major_name,
        ranking_position: myUniversityRanking ? myUniversityRanking.ranking_position : null,
        total_score: myUniversityRanking ? myUniversityRanking.total_score : null
      } : null,
      ranking: {
        total_universities: universityRankings.length,
        updated_at: new Date().toISOString(),
        methodology: {
          description: '진행중인 챌린지 상품 기반 종합 점수 랭킹',
          target: '진행중(in_progress) 및 완료된(success) 챌린지 상품만 집계',
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
    
  } else if (category === 'major') {
    // 학과별 랭킹 조회
    let majorRankings;
    let targetUniversityInfo = null;
    
    if (userInfo) {
      // 로그인한 경우: 사용자 대학의 학과 랭킹
      majorRankings = await getUniversityMajorRankings(userInfo.university_id, limit);
      targetUniversityInfo = {
        university_id: userInfo.university_id,
        university_name: userInfo.university_name
      };
    } else {
      // 비로그인한 경우: 1등 대학의 학과 랭킹
      majorRankings = await getTopUniversityMajorRankings(limit);
      if (majorRankings.length > 0) {
        targetUniversityInfo = {
          university_id: majorRankings[0].university_id,
          university_name: majorRankings[0].university_name
        };
      }
    }
    
    // 사용자 학과 랭킹 위치 찾기
    let myMajorRanking = null;
    if (userInfo && majorRankings.length > 0) {
      myMajorRanking = majorRankings.find(
        major => major.major_id === userInfo.major_id
      );
    }
    
    const response = {
      category: 'major',
      message: userInfo ? 
        '내 대학 학과별 챌린지 랭킹 조회 성공' : 
        '1등 대학 학과별 챌린지 랭킹 조회 성공',
      target_university: targetUniversityInfo,
      my_major: userInfo ? {
        university_id: userInfo.university_id,
        university_name: userInfo.university_name,
        major_id: userInfo.major_id,
        major_name: userInfo.major_name,
        ranking_position: myMajorRanking ? myMajorRanking.ranking_position : null,
        total_score: myMajorRanking ? myMajorRanking.total_score : null
      } : null,
      ranking: {
        total_majors: majorRankings.length,
        updated_at: new Date().toISOString(),
        methodology: {
          description: '진행중인 챌린지 상품 기반 종합 점수 랭킹',
          target: '진행중(in_progress) 및 완료된(success) 챌린지 상품만 집계',
          scope: userInfo ? '내 대학 내 학과별 랭킹' : '1등 대학 내 학과별 랭킹',
          weights: {
            challenge_completion_rate: '40%',
            avg_success_rate: '30%', 
            participant_count: '20%',
            avg_target_amount: '10%'
          }
        },
        majors: majorRankings
      }
    };
    
    res.status(200).json(response);
  }
});