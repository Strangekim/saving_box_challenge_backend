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
      .messages({
        'string.pattern.base': 'accountTypeUniqueNo 형식이 올바르지 않습니다.'
      })
      .required(),

    // 목표 금액 (target_date 제거, subscriptionPeriod는 상품에서 자동 설정)
    target_amount: Joi.number().integer().min(10_000).max(1_000_000_000).required(),

    // 공개 여부 (문자 "TRUE"/"FALSE"도 허용)
    is_public: Joi.boolean()
      .truthy('TRUE', 'true', '1', 'Y', 'YES')
      .falsy('FALSE', 'false', '0', 'N', 'NO')
      .default(false),

    // 납입 주기
    deposit_cycle: Joi.string().valid('daily').default('daily')
    .messages({
      'any.only': '현재는 daily만 가능합니다.'
    }),

    // 아바타/코스메틱 아이템 (선택)
    character_item_id: Joi.number().integer().positive().required(), // 캐릭터는 필수
    outfit_item_id: Joi.number().integer().positive().allow(null),   // NULL 허용
    hat_item_id: Joi.number().integer().positive().allow(null)
  }),

  // 적금통 수정하기 검증
  updateBucket : Joi.object({
    name: Joi.string().trim().min(2).max(30),
    description: Joi.string().trim().max(500).allow(''), // 빈 문자열은 허용, null은 불가
    character_item_id: Joi.number().integer().positive().required(), // 캐릭터는 필수
    outfit_item_id: Joi.number().integer().positive().allow(null),   // NULL 허용
    hat_item_id: Joi.number().integer().positive().allow(null)
  }).min(1),

  bucketComment : Joi.object({
    content: Joi.string().trim().min(1).max(500).required().messages({
      'any.required': 'content는 필수입니다.',
      'string.base': 'content는 문자열이어야 합니다.',
      'string.empty': 'content는 비워둘 수 없습니다.',
      'string.min': 'content는 최소 1자 이상이어야 합니다.',
      'string.max': 'content는 최대 500자까지 가능합니다.',
    })
  }),

  // 목록 조회 쿼리 검증 
  listQuery: Joi.object({
    category: Joi.string()
      .valid('recently', 'like', 'my_liked')
      .default('recently')
      .messages({
        'any.only': 'category는 recently, like, my_liked 중 하나여야 합니다.'
      }),
    page: Joi.number().integer().min(1).default(1).messages({
      'number.base': 'page는 숫자여야 합니다.',
      'number.integer': 'page는 정수여야 합니다.',
      'number.min': 'page는 1 이상이어야 합니다.'
    })
  }),

    bucketComment : Joi.object({
    content: Joi.string().trim().min(1).max(500).required().messages({
      'any.required': 'content는 필수입니다.',
      'string.base': 'content는 문자열이어야 합니다.',
      'string.empty': 'content는 비워둘 수 없습니다.',
      'string.min': 'content는 최소 1자 이상이어야 합니다.',
      'string.max': 'content는 최대 500자까지 가능합니다.',
    })
  }),

  updateComment: Joi.object({
    content: Joi.string().trim().min(1).max(500).required().messages({
      'any.required': 'content는 필수입니다.',
      'string.base': 'content는 문자열이어야 합니다.',
      'string.empty': 'content는 비워둘 수 없습니다.',
      'string.min': 'content는 최소 1자 이상이어야 합니다.',
      'string.max': 'content는 최대 500자까지 가능합니다.',
    })
  }),

  commentIdParam: Joi.object({
    commentId: Joi.number().integer().positive().required().messages({
      'any.required': '댓글 ID는 필수입니다.',
      'number.base': '댓글 ID는 숫자여야 합니다.',
      'number.integer': '댓글 ID는 정수여야 합니다.',
      'number.positive': '댓글 ID는 양수여야 합니다.'
    })
  }),

};