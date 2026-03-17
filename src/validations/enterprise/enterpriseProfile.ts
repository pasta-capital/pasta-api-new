import Joi from "joi";

export const enterpriseProfileValidationSchema = Joi.object({
  name: Joi.string().required().messages({
    "string.empty": 'Campo "name" es obligatorio',
    "string.base": 'Campo "name" debe ser un texto',
  }),
  commercialActivity: Joi.string().required().messages({
    "string.empty": 'Campo "commercialActivity" es obligatorio',
    "string.base": 'Campo "commercialActivity" debe ser un texto',
  }),
  website: Joi.string().uri().optional().allow("").messages({
    "string.uri": 'Campo "website" debe ser una URL válida',
    "string.base": 'Campo "website" debe ser un texto',
  }),
  email: Joi.string().email().required().messages({
    "string.email": 'Campo "email" debe ser un correo electrónico válido',
    "string.base": 'Campo "email" debe ser un texto',
  }),
  rif: Joi.string().required().messages({
    "string.empty": 'Campo "rif" es obligatorio',
    "string.base": 'Campo "rif" debe ser un texto',
  }),
  address: Joi.string().required().messages({
    "string.empty": 'Campo "address" es obligatorio',
    "string.base": 'Campo "address" debe ser un texto',
  }),
  phone: Joi.string().optional().messages({
    "string.base": 'Campo "phone" debe ser un texto',
  }),
  contactDetails: Joi.object({
    name: Joi.string().required().messages({
      "string.empty": 'Campo "contactDetails.name" es obligatorio',
      "string.base": 'Campo "contactDetails.name" debe ser un texto',
    }),
    lastname: Joi.string().required().messages({
      "string.empty": 'Campo "contactDetails.lastname" es obligatorio',
      "string.base": 'Campo "contactDetails.lastname" debe ser un texto',
    }),
    email: Joi.string().email().required().messages({
      "string.email":
        'Campo "contactDetails.email" debe ser un correo electrónico válido',
      "string.base": 'Campo "contactDetails.email" debe ser un texto',
    }),
    identification: Joi.string().required().messages({
      "string.empty": 'Campo "contactDetails.identification" es obligatorio',
      "string.base": 'Campo "contactDetails.identification" debe ser un texto',
    }),
    phone: Joi.string().optional().messages({
      "string.base": 'Campo "contactDetails.phone" debe ser un texto',
    }),
  })
    .required()
    .messages({
      "object.required": 'Campo "contactDetails" es obligatorio',
    }),
});
