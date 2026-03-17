import Joi from "joi";

// Subesquema para cuenta bancaria
const accountSchema = Joi.object({
  bank_code: Joi.string()
    .pattern(/^\d{4}$/)
    .required()
    .messages({
      "string.pattern.base": "El código de banco debe tener 4 dígitos",
    }),
  type: Joi.string().valid("CNTA", "CELE").required().messages({
    "string.valid.base": "El tipo de cuenta debe ser CNTA o CELE",
  }),
  number: Joi.string().min(10).max(30).required(),
});

// Subesquema para monto
const amountSchema = Joi.object({
  amt: Joi.number().positive().required(),
  currency: Joi.string().length(3).required(), // Ej: VES, USD
});

// Subesquema para URLs de notificación
const notificationUrlsSchema = Joi.object({
  web_hook_endpoint: Joi.string().uri().required(),
});

// Subesquema para documento
const documentInfoSchema = Joi.object({
  type: Joi.string().valid("V", "E", "J", "P").required(),
  number: Joi.string().min(5).max(15).required(),
});

// Subesquema para usuario receptor
const receivingUserSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  document_info: documentInfoSchema.required(),
  account: accountSchema.required(),
});

// Esquema principal
export const creditValidationSchema = Joi.object({
  internal_id: Joi.string().alphanum().min(6).max(20).required(),
  group_id: Joi.string().alphanum().min(6).max(20).optional(),
  account: accountSchema.required(),
  sub_product: Joi.string().max(10).required(),
  amount: amountSchema.required(),
  concept: Joi.string().max(255).required(),
  notification_urls: notificationUrlsSchema.required(),
  receiving_user: receivingUserSchema.required(),
});
