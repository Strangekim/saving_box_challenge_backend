import { query } from "../../database/postgreSQL.js";
import { NOTIFICATION_TYPES,formatMessage } from "./templates.js";

// 수동적 업적 목록 (읽지 않은 상태로 생성할 업적들)
const PASSIVE_ACHIEVEMENTS = [
  'ACH_FIRST_GET_LIKE',        // 첫 좋아요 받기
  'ACH_FIRST_BUCKET_SUCCESS',  // 첫 적금통 성공
  'ACH_FIRST_CHALLENGE',       // 첫 챌린지 성공
  // 향후 추가될 수 있는 수동적 업적들
];

// 단일 알림 생성
export const createNotification = async (userId, notificationType, data) => {
  const typeConfig = NOTIFICATION_TYPES[notificationType];
  if (!typeConfig) {
    throw new Error(`Unknown notification type: ${notificationType}`);
  }
  
  // 필수 필드 검증
  const missingFields = typeConfig.requiredFields.filter(field => 
    data[field] === undefined || data[field] === null
  );
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
  
  // 메시지 생성
  const title = formatMessage(typeConfig.titleTemplate, data);
  const message = formatMessage(typeConfig.messageTemplate, data);
  const relatedIds = typeConfig.getRelatedIds(data);

  // 업적 알림의 읽음 상태 결정
  let isRead = false;
  let readAt = null;
  
  if (notificationType === 'ACHIEVEMENT') {
    const isPassiveAchievement = data.achievementCode && 
      PASSIVE_ACHIEVEMENTS.includes(data.achievementCode);
    
    if (!isPassiveAchievement) {
      // 능동적 업적은 읽음 처리 (기존 로직)
      isRead = true;
      readAt = new Date();
    }
    // 수동적 업적은 읽지 않은 상태 (isRead = false, readAt = null)
  }
  
  // DB 저장
  const result = await query(`
    INSERT INTO notification.list (
      user_id, type, title, message,
      related_bucket_id, related_comment_id, related_achievement_id, sender_id,
      is_read, read_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [
    userId,
    typeConfig.type,
    title,
    message,
    relatedIds.related_bucket_id,
    relatedIds.related_comment_id,
    relatedIds.related_achievement_id,
    relatedIds.sender_id,
    isRead,
    readAt
  ]);
  
  return result.rows[0];
};

// 대량 알림 생성 (챌린지용)
export const createBulkNotification = async (userIds, notificationType, data) => {
  if (userIds.length === 0) return [];
  
  const typeConfig = NOTIFICATION_TYPES[notificationType];
  if (!typeConfig) {
    throw new Error(`Unknown notification type: ${notificationType}`);
  }
  
  const title = formatMessage(typeConfig.titleTemplate, data);
  const message = formatMessage(typeConfig.messageTemplate, data);
  const relatedIds = typeConfig.getRelatedIds(data);
  
  // 배치 INSERT
  const values = userIds.map((_, index) => {
    const base = index * 8;
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`;
  }).join(', ');
  
  const params = userIds.flatMap(userId => [
    userId,
    typeConfig.type,
    title,
    message,
    relatedIds.related_bucket_id,
    relatedIds.related_comment_id,
    relatedIds.related_achievement_id,
    relatedIds.sender_id
  ]);
  
  const result = await query(`
    INSERT INTO notification.list (
      user_id, type, title, message,
      related_bucket_id, related_comment_id, related_achievement_id, sender_id
    ) VALUES ${values}
    RETURNING *
  `, params);
  
  return result.rows;
};