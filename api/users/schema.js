import Joi from 'joi';

export const loginSchema = Joi.object({
  email: Joi.string().email().max(40).required()
});

export const nicknameSchema = Joi.object({
  nickname: Joi.string().trim().min(1).max(10) .pattern(/^[\p{Script=Hangul}A-Za-z0-9_-]+$/u) // 한글/영문/숫자/_/-
    .required()
}).messages({
  'string.base': '닉네임은 문자열이어야 합니다.',
  'string.empty': '닉네임을 입력해주세요.',
  'string.min': '닉네임은 최소 {#limit}자 이상이어야 합니다.',
  'string.max': '닉네임은 최대 {#limit}자까지 가능합니다.',
  'string.pattern.base': '닉네임은 한글/영문/숫자/(_,-)만 사용할 수 있어요.',
  'any.required': '닉네임은 필수 값입니다.'
});

export const updateCharacterSchema = Joi.object({
  character_item_id: Joi.number().integer().positive().required(), // 캐릭터는 필수
  outfit_item_id: Joi.number().integer().positive().allow(null), // NULL 허용
  hat_item_id: Joi.number().integer().positive().allow(null)     // NULL 허용
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

// 사용자 ID 파라미터 검증
export const userIdParam = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'any.required': '사용자 ID는 필수입니다.',
    'number.base': '사용자 ID는 숫자여야 합니다.',
    'number.integer': '사용자 ID는 정수여야 합니다.',
    'number.positive': '사용자 ID는 양수여야 합니다.'
  })
});

// 다른 사용자 적금통 목록 조회 쿼리 검증 
export const otherUserBucketsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'page는 숫자여야 합니다.',
    'number.integer': 'page는 정수여야 합니다.',
    'number.min': 'page는 1 이상이어야 합니다.'
  })
});