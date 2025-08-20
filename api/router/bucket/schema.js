const Joi = require('joi');

export const savingsSchemas = {
  createSavings: Joi.object({
    name: Joi.string().min(2).max(30).required(),
    targetAmount: Joi.number().min(10000).max(100000000).required(),
    targetDate: Joi.date().min('now').required(),
    autoTransferAmount: Joi.number().min(1000).optional(),
    autoTransferCycle: Joi.string().valid('daily', 'weekly', 'monthly').optional()
  }),
  
  deposit: Joi.object({
    amount: Joi.number().min(1000).max(10000000).required(),
    memo: Joi.string().max(100).optional()
  })
};
