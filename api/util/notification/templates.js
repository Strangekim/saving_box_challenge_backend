// 알림 타입별 템플릿과 설정
export const NOTIFICATION_TYPES = {
  COMMENT: {
    type: 'comment',
    titleTemplate: '새 댓글이 달렸습니다',
    messageTemplate: '{commenterName}님이 "{bucketName}"에 댓글을 남겼습니다: {commentPreview}',
    requiredFields: ['bucketId', 'commentId', 'commenterId', 'commenterName', 'bucketName', 'commentContent'],
    getRelatedIds: (data) => ({
      related_bucket_id: data.bucketId,
      related_comment_id: data.commentId,
      related_achievement_id: null,
      sender_id: data.commenterId
    })
  },

  ACHIEVEMENT: {
    type: 'achievement',
    titleTemplate: '🎉 업적 달성!',
    messageTemplate: '"{achievementTitle}" 업적을 달성했습니다!',
    requiredFields: ['achievementId', 'achievementTitle'], // ✨ achievementCode는 선택적 필드로 변경
    getRelatedIds: (data) => ({
      related_bucket_id: null,
      related_comment_id: null,
      related_achievement_id: data.achievementId,
      sender_id: null
    })
  },

  PAYMENT_SUCCESS: {
    type: 'payment_success',
    titleTemplate: '✅ 입금 완료!',
    messageTemplate: '"{bucketName}"에 {amount}원이 성공적으로 입금되었습니다.',
    requiredFields: ['bucketId', 'bucketName', 'amount'],
    getRelatedIds: (data) => ({
      related_bucket_id: data.bucketId,
      related_comment_id: null,
      related_achievement_id: null,
      sender_id: null
    })
  },

  PAYMENT_FAILED: {
    type: 'payment_failed',
    titleTemplate: '❌ 입금 실패',
    messageTemplate: '"{bucketName}"에 입금이 실패했습니다. {reason}',
    requiredFields: ['bucketId', 'bucketName', 'reason'],
    getRelatedIds: (data) => ({
      related_bucket_id: data.bucketId,
      related_comment_id: null,
      related_achievement_id: null,
      sender_id: null
    })
  },

  NEW_CHALLENGE: {
    type: 'new_challenge',
    titleTemplate: '🚀 새로운 챌린지!',
    messageTemplate: '"{challengeName}" 챌린지가 시작되었습니다!',
    requiredFields: ['challengeName'],
    getRelatedIds: (data) => ({
      related_bucket_id: null,
      related_comment_id: null,
      related_achievement_id: null,
      sender_id: null
    })
  }
};

// 메시지 템플릿 처리
export const formatMessage = (template, data) => {
  return template.replace(/{(\w+)}/g, (match, key) => {
    if (key === 'commentPreview') {
      return data.commentContent?.length > 50 
        ? data.commentContent.substring(0, 50) + '...'
        : data.commentContent || '';
    }
    
    if (key === 'amount' && typeof data[key] === 'number') {
      return data[key].toLocaleString();
    }
    
    return data[key] || '';
  });
};