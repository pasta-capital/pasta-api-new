import Joi from "joi";

export const debitOtpValidationSchema = Joi.object({
  internal_id: Joi.string().alphanum().min(6).max(20).required(),
  group_id: Joi.string().alphanum().min(6).max(20),

  account: Joi.object({
    bank_code: Joi.string().length(4).required(),
    type: Joi.string().valid("CNTA", "CELE").required(),
    number: Joi.string().min(6).max(30).required(),
  }).required(),

  amount: Joi.object({
    amt: Joi.number().positive().required(),
    currency: Joi.string().valid("VES", "USD").required(),
  }).required(),

  concept: Joi.string().min(3).max(100).required(),

  notification_urls: Joi.object({
    web_hook_endpoint: Joi.string().uri().required(),
  }).required(),

  receiving_user: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    otp: Joi.string().pattern(/^\d+$/).required(),
    document_info: Joi.object({
      type: Joi.string().valid("V", "E", "J", "P").required(),
      number: Joi.string().min(5).max(15).required(),
    }).required(),
    account: Joi.object({
      bank_code: Joi.string().length(4).required(),
      type: Joi.string().valid("CNTA", "CELE").required(),
      number: Joi.string().min(6).max(30).required(),
    }).required(),
  }).required(),
});
