import Joi from "joi";

export const requestOtpValidationSchema = Joi.object({
  id: Joi.string().required().messages({
    "string.base": 'El campo "id" debe ser un texto.',
    "string.required": 'El campo "id" es obligatorio',
  }),
  phone: Joi.string().required().messages({
    "string.base": 'El campo "phone" debe ser un texto.',
    "any.required":
      'El campo "phone" es obligatorio cuando "paymentType" es "mobile".',
  }),
  bankCode: Joi.string().required().messages({
    "string.base": 'El campo "bankCode" debe ser un texto.',
    "any.required":
      'El campo "bankCode" es obligatorio cuando "paymentType" es "mobile".',
  }),
  identificationType: Joi.string()
    .valid("V", "E", "J", "P")
    .required()
    .messages({
      "string.valid.base": 'El campo "identificationType" debe ser V, E, J o P',
    }),
  identificationNumber: Joi.string().min(5).max(15).required().messages({
    "string.base": 'El campo "identificationNumber" debe ser un texto.',
    "string.min":
      'El campo "identificationNumber" debe tener al menos 5 caracteres',
    "string.max":
      'El campo "identificationNumber" debe tener al menos 15 caracteres',
  }),
});
