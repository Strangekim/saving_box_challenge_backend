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