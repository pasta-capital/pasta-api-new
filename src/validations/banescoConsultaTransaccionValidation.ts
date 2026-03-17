import Joi from "joi";

// Definir la interfaz para los filtros
export interface banescoConsultaTransaccion {
  dataRequest: {
    device: {
      type: string;
      description: string;
      ipAddress: string;
    };
    transaction: {
      customerIdR: string;
      paymentId: string;
      referenceNumber: string;
    };
    auth: {
      code: string;
    };
  };
}

export const banescoConsultaTransaccionValidationSchema = Joi.object({
  dataRequest: Joi.object({
    device: Joi.object({
      type: Joi.string().optional(),
      description: Joi.string().optional(),
      ipAddress: Joi.string()
        .ip({ version: ["ipv4", "ipv6"], cidr: "forbidden" }) // valida IP
        .optional()
        .messages({
          "string.ip": 'El campo "ipAddress" debe ser una dirección IP válida',
        }),
    })
      .optional()
      .messages({
        "object.base": 'El objeto "device" debe ser un objeto válido',
      }),
    transaction: Joi.object({
      customerIdR: Joi.string().max(10).allow("").required().messages({
        "string.max":
          'El campo "customerIdR" no puede tener más de 10 caracteres',
        "any.required": 'El campo "customerIdR" es obligatorio',
      }),
      paymentId: Joi.string().max(22).allow("").optional().messages({
        "string.max":
          'El campo "paymentId" no puede tener más de 22 caracteres',
      }),
      referenceNumber: Joi.string()
        .pattern(/^\d+$/)
        .max(11)
        .allow("")
        .optional()
        .messages({
          "string.pattern.base":
            'El campo "referenceNumber" solo puede contener dígitos',
          "string.max":
            'El campo "referenceNumber" no puede tener más de 11 caracteres',
        }),
    })
      .required()
      .messages({
        "any.required": 'El objeto "transaction" es obligatorio',
        "object.base": 'El objeto "transaction" debe ser un objeto válido',
      }),
    auth: Joi.object({
      code: Joi.string().required().messages({
        "string.base": 'El campo "code" debe ser un texto.',
        "string.required": 'El campo "code" es obligatorio',
      }),
    })
      .required()
      .messages({
        "object.base": 'El objeto "auth" debe ser un objeto válido',
        "any.required": 'El objeto "auth" es obligatorio',
      }),
  })
    .required()
    .messages({
      "any.required": 'El objeto "dataRequest" es obligatorio',
      "object.base": 'El objeto "dataRequest" debe ser un objeto válido',
    }),
});
