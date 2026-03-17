import Joi from "joi";

export const requestOperationValidationSchema = Joi.object({
  currency: Joi.string().required().messages({
    "string.base": 'El campo "currency" debe ser un texto.',
    "string.required": 'El campo "currency" es obligatorio',
  }),
  amount: Joi.number().required().messages({
    "number.base": 'El campo "amount" debe ser un número.',
    "number.required": 'El campo "amount" es obligatorio',
  }),
  feeCount: Joi.number().required().messages({
    "number.base": 'El campo "feeCount" debe ser un número.',
    "number.required": 'El campo "feeCount" es obligatorio',
  }),
  // isThirdParty: Joi.boolean().required().messages({
  //   "boolean.base": 'El campo "isThirdParty" debe ser un booleano.',
  //   "boolean.required": 'El campo "isThirdParty" es obligatorio',
  // }),
  // account: Joi.string().when("isThirdParty", {
  //   is: false,
  //   then: Joi.string().required().messages({
  //     "string.base": 'El campo "account" debe ser un texto.',
  //     "string.required":
  //       'El campo "account" es obligatorio cuando "isThirdParty" es false',
  //   }),
  //   otherwise: Joi.string().optional(),
  // }),
  isThirdParty: Joi.boolean().optional(),
  account: Joi.string().required().messages({
    "string.base": 'El campo "account" debe ser un texto.',
    "any.required": 'El campo "account" es obligatorio',
  }),
  beneficiary: Joi.object({
    //   name: Joi.string().required().messages({
    //     "string.base": 'El campo "name" debe ser un texto.',
    //     "any.required": 'El campo "name" es obligatorio cuando "isThirdParty" es true',
    //   }),
    identificationType: Joi.string().optional().messages({
      "string.base": 'El campo "identificationType" debe ser un texto.',
      "any.required": 'El campo "identificationType" es obligatorio',
    }),
    identificationNumber: Joi.string().optional().messages({
      "string.base": 'El campo "identificationNumber" debe ser un texto.',
      "any.required": 'El campo "identificationNumber" es obligatorio',
    }),
    phone: Joi.string().optional().messages({
      "string.base": 'El campo "phone" debe ser un texto.',
      "any.required": 'El campo "phone" es obligatorio',
    }),
    bankCode: Joi.string().optional().messages({
      "string.base": 'El campo "bankCode" debe ser un texto.',
      "any.required": 'El campo "bankCode" es obligatorio',
    }),
  }),
});
