import Joi from "joi";

// Definir la interfaz para los filtros
export interface PayDebt {
  payments: string[];
}

export const payDebtValidationSchema = Joi.object({
  payments: Joi.array().items(Joi.string().required()).required().messages({
    "array.base": 'El campo "payments" debe ser un array',
    "array.items": 'El campo "payments" debe contener al menos un elemento',
  }),
  manualRate: Joi.string().optional(),
});

export const payDebtConfirmationValidationSchema = Joi.object({
  id: Joi.string().required().messages({
    "string.base": 'El campo "id" debe ser un texto.',
    "string.required": 'El campo "id" es obligatorio',
  }),
  device: Joi.object({
    type: Joi.string().optional().allow("").messages({
      "string.base": 'El campo "type" debe ser un texto.',
      "string.required": 'El campo "type" es obligatorio',
    }),
    description: Joi.string().optional().allow("").messages({
      "string.base": 'El campo "description" debe ser un texto.',
      "string.required": 'El campo "description" es obligatorio',
    }),
    ipAddress: Joi.string()
      .ip({ version: ["ipv4", "ipv6"], cidr: "forbidden" })
      .optional()
      .allow("")
      .messages({
        "string.ip": 'El campo "ipAddress" debe ser una dirección IP válida',
        "string.base": 'El campo "ipAddress" debe ser un texto.',
        "string.required": 'El campo "ipAddress" es obligatorio',
      }),
  }).optional(),
  paymentType: Joi.string()
    .required()
    .valid("mobile", "transfer", "debit")
    .messages({
      "string.base": 'El campo "paymentType" debe ser un texto.',
      "any.required": 'El campo "paymentType" es obligatorio',
      "any.only": 'El campo "paymentType" no es válido',
    }),
  phone: Joi.string().when("paymentType", {
    is: "mobile",
    then: Joi.string().required().messages({
      "string.base": 'El campo "phone" debe ser un texto.',
      "any.required":
        'El campo "phone" es obligatorio cuando "paymentType" es "mobile".',
    }),
    otherwise: Joi.string().optional().messages({
      "string.base": 'El campo "phone" debe ser un texto.',
    }),
  }),
  date: Joi.date().when("paymentType", {
    // is: "mobile",
    is: Joi.string().valid("mobile", "transfer"),
    then: Joi.date().required().messages({
      "string.base": 'El campo "date" debe ser un texto.',
      "any.required":
        'El campo "date" es obligatorio cuando "paymentType" es "mobile" o "transfer".',
    }),
    otherwise: Joi.date().optional().messages({
      "date.base": 'El campo "date" debe ser una fecha válida',
    }),
  }),
  reference: Joi.string().when("paymentType", {
    is: Joi.string().valid("mobile", "transfer"),
    then: Joi.string().required().messages({
      "string.base": 'El campo "reference" debe ser un texto.',
      "any.required":
        'El campo "reference" es obligatorio cuando "paymentType" es "mobile".',
    }),
    otherwise: Joi.string().optional().messages({
      "string.base": 'El campo "reference" debe ser un texto.',
    }),
  }),
  bankCode: Joi.string().when("paymentType", {
    is: "mobile",
    then: Joi.string().required().messages({
      "string.base": 'El campo "bankCode" debe ser un texto.',
      "any.required":
        'El campo "bankCode" es obligatorio cuando "paymentType" es "mobile".',
    }),
    otherwise: Joi.string().optional().messages({
      "string.base": 'El campo "bankCode" debe ser un texto.',
    }),
  }),
  // account: Joi.string().when("paymentType", {
  //   is: "debit",
  //   //is: Joi.string().valid("debit", "transfer"),
  //   then: Joi.string().required().messages({
  //     "string.base": 'El campo "account" debe ser un texto.',
  //     "any.required":
  //       'El campo "account" es obligatorio cuando "paymentType" es "debit".',
  //   }),
  //   otherwise: Joi.string().optional().messages({
  //     "string.base": 'El campo "account" debe ser un texto.',
  //   }),
  // }),
  otp: Joi.string().when("paymentType", {
    is: "debit",
    then: Joi.string().required().messages({
      "string.base": 'El campo "otp" debe ser un texto.',
      "any.required":
        'El campo "otp" es obligatorio cuando "paymentType" es "debit".',
    }),
    otherwise: Joi.string().optional().messages({
      "string.base": 'El campo "otp" debe ser un texto.',
    }),
  }),
  // auth: Joi.string().when("paymentType", {
  //   is: "debit",
  //   then: Joi.string().required().messages({
  //     "string.base": 'El campo "auth" debe ser un texto.',
  //     "any.required":
  //       'El campo "auth" es obligatorio cuando "paymentType" es "debit".',
  //   }),
  //   otherwise: Joi.string().optional().messages({
  //     "string.base": 'El campo "auth" debe ser un texto.',
  //   }),
  // }),
});
