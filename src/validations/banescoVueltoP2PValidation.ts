import Joi from "joi";

// Definir la interfaz para los filtros
export interface banescoVueltoP2P {
  dataRequest: {
    device: {
      type: string;
      description: string;
      ipAddress: string;
      sid: string;
    };
    p2p: {
      accountFrom: {
        accountId: string;
      };
      accountTo: {
        bankId: string;
        customerId: string;
        phoneNum: string;
      };
      amount: number;
      paymentId: string;
      concept: string;
      trnDate: string;
      trnTime: string;
    };
  };
}
// Esquema de validación para los filtros
export const banescoVueltoP2PValidationSchema = Joi.object({
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
      sid: Joi.string().optional(),
    }).required(),
    p2p: Joi.object({
      accountFrom: Joi.object({
        accountId: Joi.string().max(20).allow("").optional().messages({
          "string.max":
            'El campo "accountId" no puede tener más de 20 caracteres',
        }),
      })
        .required()
        .messages({
          "any.required": 'El objeto "accountFrom" es obligatorio',
          "object.base": 'El objeto "accountFrom" debe ser un objeto válido',
        }),
      accountTo: Joi.object({
        bankId: Joi.string().max(4).required().messages({
          "string.max": 'El campo "bankId" no puede tener más de 4 caracteres',
          "string.required": 'El objeto "bankId" es obligatorio',
        }),
        customerId: Joi.string()
          .max(9)
          .allow("")
          .pattern(/^[VJEG]/i)
          .required()
          .messages({
            "string.max":
              'El campo "customerId" no puede tener más de 9 caracteres',
            "string.pattern.name":
              'El campo "customerId" debe empezar con "V", "J", "E" o "G"',
          }),
        phoneNum: Joi.string().max(12).pattern(/^\d+$/).required().messages({
          "string.max":
            'El campo "phoneNum" no puede tener más de 12 caracteres',
          "string.pattern.name":
            'El campo "phoneNum" solo puede contener números',
        }),
      })
        .required()
        .messages({
          "any.required": 'El objeto "accountTo" es obligatorio',
          "object.base": 'El objeto "accountTo" debe ser un objeto válido',
        }),
      amount: Joi.number().required().messages({
        "number.required": 'El campo "amount" es obligatorio',
      }),
      paymentId: Joi.string().length(14).optional().messages({
        "string.length":
          'El campo "paymentId" debe tener exactamente 14 caracteres',
        "string.base": 'El campo "paymentId" debe ser una cadena de texto',
      }),
      concept: Joi.string().optional(),
      trnDate: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .required()
        .messages({
          "string.pattern.name":
            'El formato del campo "trnDate" debe ser YYYY-MM-DD',
          "string.required": 'El campo "trnDate" es obligatorio',
        }),
      trnTime: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
        .required()
        .messages({
          "string.pattern.name": "El formato debe ser HH:mm:ss",
          "string.required": 'El campo "trnTime" es obligatorio',
        }),
    })
      .required()
      .messages({
        "any.required": 'El objeto "p2p" es obligatorio',
        "object.base": 'El objeto "p2p" debe ser un objeto válido',
      }),
  })
    .required()
    .messages({
      "any.required": 'El objeto "dataRequest" es obligatorio',
      "object.base": 'El objeto "dataRequest" debe ser un objeto válido',
    }),
});
