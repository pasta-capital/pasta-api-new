import Joi from "joi";

// Definir la interfaz para los filtros
export interface banescoConfirmacionTransaccion {
  dataRequest: {
    device: {
      type: string;
      description: string;
      ipAddress: string;
    };
    securityAuth: {
      sessionId: string;
    };
    transaction: {
      referenceNumber?: string;
      amount?: number;
      accountId?: string;
      trnDate?: string;
      startDt?: string;
      endDt?: string;
      phoneNum?: string;
      bankId?: string;
    };
  };
}
// Esquema de validación para los filtros
export const banescoConfirmacionTransaccionValidationSchema = Joi.object({
  dataRequest: Joi.object({
    device: Joi.object({
      type: Joi.string().required().messages({
        "string.base": 'El campo "type" es obligatorio',
      }),
      description: Joi.string().required().messages({
        "string.base": 'El campo "description" es obligatorio',
      }),
      ipAddress: Joi.string()
        .ip({ version: ["ipv4", "ipv6"], cidr: "forbidden" }) // valida IP
        .required()
        .messages({
          "string.ip": 'El campo "ipAddress" debe ser una dirección IP válida',
          "string.base": 'El campo "ipAddress" es obligatorio',
        }),
    })
      .required()
      .messages({
        "any.required": 'El objeto "device" es obligatorio',
        "object.base": 'El objeto "device" debe ser un objeto válido',
      }),
    securityAuth: Joi.object({
      sessionId: Joi.string().optional().allow("").messages({
        "string.base": 'El campo "sessionId" debe ser un texto.',
      }),
    })
      .optional()
      .messages({
        "object.base": 'El objeto "securityAuth" debe ser un objeto válido',
      }),
    transaction: Joi.object({
      referenceNumber: Joi.string()
        .allow("")
        .pattern(/^\d{6}$/)
        .optional()
        .messages({
          "string.pattern.name":
            'El formato del campo "referenceNumber" debe ser 6 dígitos',
          "string.base": 'El campo "referenceNumber" debe ser un texto.',
        }),
      accountId: Joi.string()
        .pattern(/^\d{20}$/)
        .allow("")
        .optional()
        .messages({
          "string.pattern.name":
            'El formato del campo "accountId" debe ser 20 dígitos',
        }),
      amount: Joi.number().optional().messages({
        "number.base": 'El campo "amount" debe ser un número',
      }),
      trnDate: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .allow("")
        .messages({
          "string.pattern.name":
            'El formato del campo "trnDate" debe ser YYYY-MM-DD',
        }),
      startDt: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .allow("")
        .messages({
          "string.pattern.name":
            'El formato del campo "startDt" debe ser YYYY-MM-DD',
        }),
      endDt: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .allow("")
        .messages({
          "string.pattern.name":
            'El formato del campo "endDt" debe ser YYYY-MM-DD',
        }),
      phoneNum: Joi.string()
        .pattern(/^\d{12}$/)
        .allow("")
        .optional()
        .messages({
          "string.pattern.name":
            'El formato del campo "phoneNum" debe ser 12 dígitos',
        }),
      bankId: Joi.string()
        .pattern(/^\d{4}$/)
        .allow("")
        .optional()
        .messages({
          "string.pattern.name":
            'El formato del campo "bankId" debe ser 4 dígitos',
        }),
    })
      .required()
      .messages({
        "any.required": 'El objeto "transaction" es obligatorio',
        "object.base": 'El objeto "transaction" debe ser un objeto válido',
      }),
  })
    .required()
    .messages({
      "any.required": 'El objeto "dataRequest" es obligatorio',
      "object.base": 'El objeto "dataRequest" debe ser un objeto válido',
    }),
});
