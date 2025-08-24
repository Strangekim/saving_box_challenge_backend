import Joi from 'joi';

export const loginSchema = Joi.object({
  email: Joi.string().email().max(40).required()
});

export const updateCharacterSchema = Joi.object({
  character_item_id: Joi.number().integer().positive().required().messages({
    'any.required': '캐릭터 아이템을 선택해주세요.',
    'number.base': '캐릭터 아이템 ID는 숫자여야 합니다.',
    'number.positive': '유효하지 않은 캐릭터 아이템입니다.'
  }),
  outfit_item_id: Joi.number().integer().positive().required().messages({
    'any.required': '한벌옷 아이템을 선택해주세요.',
    'number.base': '한벌옷 아이템 ID는 숫자여야 합니다.',
    'number.positive': '유효하지 않은 한벌옷 아이템입니다.'
  }),
  hat_item_id: Joi.number().integer().positive().required().messages({
    'any.required': '모자 아이템을 선택해주세요.',
    'number.base': '모자 아이템 ID는 숫자여야 합니다.',
    'number.positive': '유효하지 않은 모자 아이템입니다.'
  })
});

// 내 적금통 목록 조회 쿼리 검증 
export const myBucketsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'page는 숫자여야 합니다.',
    'number.integer': 'page는 정수여야 합니다.',
    'number.min': 'page는 1 이상이어야 합니다.'
  }),
  status: Joi.string().valid('all', 'in_progress', 'success', 'failed').default('all').messages({
    'any.only': 'status는 all, in_progress, success, failed 중 하나여야 합니다.'
  })
});