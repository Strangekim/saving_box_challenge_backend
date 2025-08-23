import Joi from 'joi';

export const rankingSchemas = {
  // 랭킹 조회 쿼리 검증
  rankingQuery: Joi.object({
    category: Joi.string().valid('university', 'individual').default('university').messages({
      'any.only': 'category는 university 또는 individual만 가능합니다.'
    }),
    university_id: Joi.when('category', {
      is: 'individual',
      then: Joi.number().integer().positive().required().messages({
        'any.required': 'individual 랭킹 조회 시 university_id는 필수입니다.'
      }),
      otherwise: Joi.forbidden()
    }),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })
};