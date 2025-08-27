import Joi from 'joi';

export const achievementSchemas = {
  // 사용자 달성 업적 조회 쿼리 검증
  userAchievementsQuery: Joi.object({
    user_id: Joi.number().integer().positive().required().messages({
      'any.required': 'user_id는 필수입니다.',
      'number.base': 'user_id는 숫자여야 합니다.',
      'number.integer': 'user_id는 정수여야 합니다.',
      'number.positive': 'user_id는 양수여야 합니다.'
    })
  })
};