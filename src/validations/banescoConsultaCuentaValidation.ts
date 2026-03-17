import Joi from "joi";

// Definir la interfaz para los filtros
export interface banescoConsultaCuenta {
  dataRequest: {
    device: {
      type: string;
      description: string;
      ipAddress: string;
      sid: string;
    };
    currency?: string;
    customer?: {
      customerIdType?: string;
      customerId?: string;
    };
    securityAuth?: {
      otp?: string;
    };
    auth: {
      code: string;
    };
  };
}

export const banescoConsultaCuentaValidationSchema = Joi.object({
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
      sid: Joi.string()
        .optional()
        .allow("")
        // .pattern(/^\d+$/)
        .messages({
          "string.base": 'El campo "sid" debe ser un texto.',
          "string.pattern.name": 'El formato del campo "sid" es inválido.',
        }),
    })
      .optional()
      .messages({
        "object.base": 'El objeto "device" debe ser un objeto válido',
      }),
    currency: Joi.string().optional(),
    customer: Joi.object({
      customerIdType: Joi.string().valid("V", "J").optional().messages({
        "any.only": 'El campo "customerIdType" solo puede ser "V" o "J".',
      }),
      customerId: Joi.string().optional().messages({
        "string.base": 'El campo "customerId" debe ser un texto.',
        "string.empty": 'El campo "customerId" no puede estar vacío.',
      }),
    })
      .optional()
      .messages({
        "any.required": 'El objeto "customer" es obligatorio',
        "object.base": 'El objeto "customer" debe ser un objeto válido',
      }),
    securityAuth: Joi.object({
      otp: Joi.string()
        .optional()
        .pattern(/^\d{8}$/)
        .messages({
          "string.base": '"otp" debe ser un texto.',
          "string.empty": '"otp" no puede estar vacío.',
          "string.pattern.name":
            'El formato del campo "otp" debe ser 8 dígitos',
        }),
    })
      .optional()
      .messages({
        "object.base": 'El objeto "securityAuth" debe ser un objeto válido',
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
