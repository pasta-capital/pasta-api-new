import Joi from "joi";

export const requestOtpValidationSchema = Joi.object({
  creditor_account: Joi.object({
    bank_code: Joi.string().length(4).required(),
    type: Joi.string().valid("CNTA", "CELE").required(),
    number: Joi.string().min(6).max(30).required(),
  }).required(),

  debitor_document_info: Joi.object({
    type: Joi.string().valid("V", "E", "J", "P").required(),
    number: Joi.string().min(5).max(15).required(),
  }).required(),

  debitor_account: Joi.object({
    bank_code: Joi.string().length(4).required(),
    type: Joi.string().valid("CNTA", "CELE").required(),
    number: Joi.string().min(6).max(30).required(),
  }).required(),

  amount: Joi.object({
    amt: Joi.number().positive().required(),
    currency: Joi.string().valid("VES", "USD").required(),
  }).required(),
});
