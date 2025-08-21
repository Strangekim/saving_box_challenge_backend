import Joi from 'joi';

export const loginSchema = Joi.object({
  email: Joi.string().email().max(40).required()
});