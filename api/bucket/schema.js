import Joi from 'joi';

export const idParam = (name = 'id') =>
  Joi.object({ [name]: Joi.number().integer().positive().required() });

export const savingsSchemas = {
  // 적금통 생성 요청 바디 검증
  createBucket: Joi.object({
    // 기본 정보
    name: Joi.string().trim().min(2).max(30).required(),
    description: Joi.string().trim().max(500).allow(''),

    // 계좌/상품 식별자 (형식은 예시 기반, 너무 빡세지 않게 제한)
    accountTypeUniqueNo: Joi.string()
      .trim()
      .pattern(/^[0-9]{3}-[0-9]-[A-Za-z0-9]{8,}$/) // 예: 001-3-29802e64e42943
      .messages('accountTypeUniqueNo 형식이 올바르지 않습니다.')
      .required(),

    // 목표 금액/일자
    target_amount: Joi.number().integer().min(10_000).max(1_000_000_000).required(),
    subscriptionPeriod: Joi.number().integer().min(1),
    // 공개 여부 (문자 "TRUE"/"FALSE"도 허용)
    is_public: Joi.boolean()
      .truthy('TRUE', 'true', '1', 'Y', 'YES')
      .falsy('FALSE', 'false', '0', 'N', 'NO')
      .default(false),

    // 납입 주기
    deposit_cycle: Joi.string().valid('daily', 'weekly', 'monthly').default('daily'),

    // 아바타/코스메틱 아이템 (선택)
    character_item_id: Joi.number().integer().positive().required(),
    outfit_item_id:   Joi.number().integer().positive().required(),
    hat_item_id:      Joi.number().integer().positive().required(),
  }),

  // 적금통 수정하기 검증
  updateBucket : Joi.object({
    name: Joi.string().trim().min(2).max(30),
    description: Joi.string().trim().max(500).allow(''), // 빈 문자열은 허용, null은 불가
    character_item_id: Joi.number().integer().positive(), // null 불가
    outfit_item_id: Joi.number().integer().positive(),
    hat_item_id: Joi.number().integer().positive(),
  }).min(1),

  bucketComment : Joi.object({
    content: Joi.string().trim().min().max(500).required().messages({
      'any.required': 'content는 필수입니다.',
      'string.base': 'content는 문자열이어야 합니다.',
      'string.empty': 'content는 비워둘 수 없습니다.',
      'string.min': 'content는 최소 1자 이상이어야 합니다.',
      'string.max': 'content는 최대 500자까지 가능합니다.',
    })
  })
};
