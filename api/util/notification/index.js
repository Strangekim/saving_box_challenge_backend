import { createNotification, createBulkNotification } from './creator.js';
import { query } from '../../database/postgreSQL.js';

// 기본 생성 함수들 노출
export { createNotification, createBulkNotification };

// 편의 함수들 (자주 사용하는 패턴)
export const notifyComment = async (bucketOwnerId, commentData) => {
  return createNotification(bucketOwnerId, 'COMMENT', commentData);
};

export const notifyAchievement = async (userId, achievementData) => {
  return createNotification(userId, 'ACHIEVEMENT', achievementData);
};

export const notifyPaymentSuccess = async (userId, bucketData, amount) => {
  return createNotification(userId, 'PAYMENT_SUCCESS', {
    bucketId: bucketData.id,
    bucketName: bucketData.name,
    amount
  });
};

export const notifyPaymentFailed = async (userId, bucketData, reason) => {
  return createNotification(userId, 'PAYMENT_FAILED', {
    bucketId: bucketData.id,
    bucketName: bucketData.name,
    reason
  });
};

export const notifyNewChallenge = async (challengeData) => {
  // 모든 사용자 조회
  const allUsers = await query('SELECT id FROM users.list');
  const userIds = allUsers.rows.map(user => user.id);
  
  return createBulkNotification(userIds, 'NEW_CHALLENGE', {
    challengeName: challengeData.name
  });
};