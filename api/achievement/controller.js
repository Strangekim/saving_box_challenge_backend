import { trycatchWrapper } from '../util/trycatchWrapper.js';
import {
  validateUserExists,
  getAllAchievementsWithUserStatus,
  getUserAchievementStats
} from './service.js';

// ============== 전체 업적 목록 조회 (달성 여부 포함) ==============
export const getAllAchievementsController = trycatchWrapper(async (req, res) => {
  const { user_id } = req.query;
  
  // 1. 사용자 존재 확인
  const user = await validateUserExists(user_id);
  
  // 2. 전체 업적 목록 조회 (달성 여부 포함)
  const achievements = await getAllAchievementsWithUserStatus(user_id);
  
  // 3. 업적 통계 조회
  const stats = await getUserAchievementStats(user_id);
  
  // 4. 성공 응답
  res.status(200).json({
    message: '전체 업적 목록 조회 성공',
    user: {
      user_id: user.id,
      nickname: user.nickname
    },
    stats,
    achievements
  });
});