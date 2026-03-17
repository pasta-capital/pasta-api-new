import Joi from "joi";

// Definir la interfaz para los filtros
export interface banescoCargoEnCuentaPago {
  dataRequest: {
    device: {
      description: string;
      ipAddress: string;
      type: string;
    };
    payment: {
      customerId: string;
      accountDebit: string;
      accountType: string;
      amount: number;
      companyCode: string;
      companyId: string;
      concept: string;
      paymentId: string;
    };
    securityAuth: {
      otp: string;
      sessionId: string;
    };
    auth?: {
      code?: string;
      token?: string;
    };
  };
}

export const banescoCargoEnCuentaPagoValidationSchema = Joi.object({
  dataRequest: Joi.object({
    device: Joi.object({
      description: Joi.string().optional(),
      ipAddress: Joi.string()
        .ip({ version: ["ipv4", "ipv6"], cidr: "forbidden" }) // valida IP
        .optional()
        .messages({
          "string.ip": 'El campo "ipAddress" debe ser una dirección IP válida',
        }),
      type: Joi.string().optional(),
    })
      .required()
      .messages({
        "any.required": 'El objeto "device" es obligatorio',
        "object.base": 'El objeto "device" debe ser un objeto válido',
      }),
    payment: Joi.object({
      customerId: Joi.string().required().max(10).messages({
        "string.base": 'El campo "customerId" debe ser un texto.',
        "string.max":
          'El campo "customerId" no puede tener más de 10 caracteres',
        "string.required": 'El campo "customerId" es obligatorio',
      }),
      accountDebit: Joi.string().required().messages({
        "string.required": 'El campo "accountDebit" es obligatorio',
      }),
      accountType: Joi.string().max(3).required().messages({
        "string.max":
          'El campo "accountType" no puede tener más de 3 caracteres',
        "string.required": 'El campo "accountType" es obligatorio',
      }),
      amount: Joi.number().required().messages({
        "number.base": 'El campo "amount" debe ser un número',
        "number.required": 'El campo "amount" es obligatorio',
      }),
      companyCode: Joi.string().max(3).required().messages({
        "string.base": 'El campo "companyCode" debe ser un texto.',
        "string.max":
          'El campo "companyCode" no puede tener más de 3 caracteres',
        "string.required": 'El campo "companyCode" es obligatorio',
      }),
      companyId: Joi.string().max(10).required().messages({
        "string.base": 'El campo "companyId" debe ser un texto.',
        "string.required": 'El campo "companyId" es obligatorio',
        "string.max":
          'El campo "companyId" no puede tener más de 10 caracteres',
      }),
      concept: Joi.string().max(60).optional().messages({
        "string.max": 'El campo "concept" no puede tener más de 60 caracteres',
      }),
      paymentId: Joi.string()
        .allow("")
        .optional(),
    })
      .required()
      .messages({
        "any.required": 'El objeto "payment" es obligatorio',
        "object.base": 'El objeto "payment" debe ser un objeto válido',
      }),
    securityAuth: Joi.object({
      otp: Joi.string().optional().allow("").messages({
        "string.base": 'El campo "otp" debe ser un texto.',
      }),
      sessionId: Joi.string().required().messages({
        "string.base": 'El campo "sessionId" debe ser un texto.',
        "string.required": 'El campo "sessionId" es obligatorio',
      }),
    })
      .optional()
      .messages({
        "object.base": 'El objeto "securityAuth" debe ser un objeto válido',
      }),
    auth: Joi.object({
      code: Joi.string().optional().messages({
        "string.base": 'El campo "code" debe ser un texto.',
        "string.required": 'El campo "code" es obligatorio',
      }),
      token: Joi.string().optional().messages({
        "string.base": 'El campo "token" debe ser un texto.',
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
