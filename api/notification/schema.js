import Joi from 'joi';

// 알림 ID 파라미터 검증
export const notificationIdParam = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': '알림 ID는 숫자여야 합니다',
    'number.integer': '알림 ID는 정수여야 합니다', 
    'number.positive': '알림 ID는 양수여야 합니다',
    'any.required': '알림 ID는 필수입니다'
  })
});