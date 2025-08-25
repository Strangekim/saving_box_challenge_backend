import { trycatchWrapper } from '../util/trycatchWrapper.js';
import { 
  getUserNotifications,
  markAllNotificationsAsRead,
  getNotificationCounts
} from './service.js';

// ============== 알림 목록 조회 ==============
export const getNotificationsController = trycatchWrapper(async (req, res) => {
  const userId = req.session?.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  
  if (!userId) {
    // 로그인하지 않은 경우 빈 응답
    return res.status(200).json({
      notifications: [],
      counts: { total: 0, unread: 0 },
      pagination: { page, limit, total: 0, has_next: false }
    });
  }
  
  // 로그인한 경우 실제 알림 조회
  const notifications = await getUserNotifications(userId, page, limit);
  const counts = await getNotificationCounts(userId);
  
  res.status(200).json({
    notifications,
    counts,
    pagination: {
      page,
      limit,
      total: counts.total,
      has_next: (page * limit) < counts.total
    }
  });
});

// ============== 모든 알림 읽음 처리 ==============
export const markAllNotificationsAsReadController = trycatchWrapper(async (req, res) => {
  const userId = req.session?.userId;
  
  if (!userId) {
    // 로그인하지 않은 경우 아무것도 하지 않고 성공 응답
    return res.status(200).json({
      updatedCount: 0
    });
  }
  
  const result = await markAllNotificationsAsRead(userId);
  
  res.status(200).json({
    updatedCount: result.updatedCount
  });
});