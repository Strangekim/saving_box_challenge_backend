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