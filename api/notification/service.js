import { query } from '../database/postgreSQL.js';

// ============== 사용자 알림 조회 ==============
export const getUserNotifications = async (userId, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  
  const result = await query(`
    SELECT 
      n.id,
      n.type,
      n.title,
      n.message,
      n.is_read,
      n.read_at,
      n.created_at,
      
      -- 관련 정보들
      sb.name as related_bucket_name,
      al.title as related_achievement_title,
      sender.nickname as sender_nickname
      
    FROM notification.list n
    LEFT JOIN saving_bucket.list sb ON n.related_bucket_id = sb.id
    LEFT JOIN achievement.list al ON n.related_achievement_id = al.id
    LEFT JOIN users.list sender ON n.sender_id = sender.id
    
    WHERE n.user_id = $1
    ORDER BY n.created_at DESC
    LIMIT $2 OFFSET $3
  `, [userId, limit, offset]);
  
  return result.rows.map(notification => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    is_read: notification.is_read,
    read_at: notification.read_at,
    created_at: notification.created_at,
    related_info: {
      bucket_name: notification.related_bucket_name,
      achievement_title: notification.related_achievement_title,
      sender_nickname: notification.sender_nickname
    }
  }));
};

// ============== 알림 통계 조회 ==============
export const getNotificationCounts = async (userId) => {
  const result = await query(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN is_read = false THEN 1 END) as unread
    FROM notification.list 
    WHERE user_id = $1
  `, [userId]);
  
  return {
    total: parseInt(result.rows[0].total),
    unread: parseInt(result.rows[0].unread)
  };
};

// ============== 모든 알림 읽음 처리 ==============
export const markAllNotificationsAsRead = async (userId) => {
  const result = await query(`
    UPDATE notification.list 
    SET is_read = true, read_at = NOW()
    WHERE user_id = $1 AND is_read = false
    RETURNING id
  `, [userId]);
  
  return {
    updatedCount: result.rows.length
  };
};