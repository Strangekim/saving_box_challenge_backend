import Joi from 'joi';

export const rankingSchemas = {
  // 랭킹 조회 쿼리 검증
  rankingQuery: Joi.object({
    category: Joi.string().valid('university', 'major').default('university').messages({
      'any.only': 'category는 university 또는 major만 가능합니다.'
    }),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })
};