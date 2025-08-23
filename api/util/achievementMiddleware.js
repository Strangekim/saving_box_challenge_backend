import { processUserAction } from './achievementService.js';


// ============== 업적 처리 후 응답 가로채기 함수 ==============
export const handleAchievementResponse = async (req, res, actionType, actionData = {}, originalResponseData = null) => {
  // 이미 응답이 전송되었는지 확인
  if (res.headersSent) {
    return false;
  }
  
  // 로그인된 사용자만 업적 처리
  if (!req.session?.userId) {
    return false;
  }
  
  try {
    const userId = req.session.userId;
    
    // 업적 처리
    const achievementResult = await processUserAction(userId, actionType, actionData);
    
    if (achievementResult.newAchievements.length > 0) {
      // 다시 한 번 응답 상태 확인
      if (res.headersSent) {
        return false;
      }
      
      // 기본 응답 데이터와 업적 정보를 합친 응답
      const achievementResponse = {
        // 원래 응답 데이터가 있으면 포함
        ...(originalResponseData || { success: true }),
        type: 'achievement_unlocked',
        message: '축하합니다! 새로운 업적을 달성했습니다!',
        achievements: {
          count: achievementResult.newAchievements.length,
          totalRewards: achievementResult.newAchievements.reduce(
            (total, ach) => total + ach.rewards.length, 0
          ),
          list: achievementResult.newAchievements.map(unlock => ({
            id: unlock.achievement.id,
            title: unlock.achievement.title,
            description: unlock.achievement.description,
            code: unlock.achievement.code,
            rewards: unlock.rewards.map(reward => ({
              itemId: reward.item_id,
              itemName: reward.item_name,
              itemType: reward.item_type_name
            }))
          }))
        }
      };
      
      try {
        res.status(202).json(achievementResponse);
        return true; // 응답이 가로채졌음을 알림
      } catch (responseError) {
        console.error('응답 전송 중 오류:', responseError);
        return false;
      }
    }
    
    return false; // 업적이 없어서 일반 응답 진행
    
  } catch (error) {
    console.error('업적 처리 오류:', error);
    // 업적 처리 실패해도 원본 응답은 그대로 진행
    return false;
  }
};


// ============== 액션별 헬퍼 함수들 ==============

// 적금통 생성 업적 처리
export const handleBucketCreationAchievement = async (req, res, bucketData, responseData = null) => {
  return handleAchievementResponse(req, res, 'create_bucket', {
    bucketId: bucketData.id,
    targetAmount: req.body.target_amount
  }, responseData);
};

// 좋아요 업적 처리
export const handleLikeAchievement = async (req, res, likeData) => {
  return handleAchievementResponse(req, res, 'give_like', {
    bucketId: req.params.bucketId,
    targetUserId: likeData.targetUserId
  });
};

// 댓글 작성 업적 처리
export const handleCommentAchievement = async (req, res, commentData) => {
  return handleAchievementResponse(req, res, 'create_comment', {
    bucketId: req.params.bucketId,
    commentId: commentData.id
  });
};

// 적금 납입 업적 처리
export const handleBucketPushAchievement = async (req, res, pushData) => {
  return handleAchievementResponse(req, res, 'bucket_push', {
    bucketId: req.params.bucketId,
    amount: req.body.amount
  });
};

// 적금통 완료 업적 처리
export const handleBucketCompletionAchievement = async (req, res, completionData) => {
  return handleAchievementResponse(req, res, 'complete_bucket', {
    bucketId: completionData.bucketId,
    finalAmount: completionData.finalAmount
  });
};

// 챌린지 완료 업적 처리
export const handleChallengeCompletionAchievement = async (req, res, challengeData) => {
  return handleAchievementResponse(req, res, 'complete_challenge', {
    challengeId: challengeData.challengeId,
    ranking: challengeData.ranking
  });
};

