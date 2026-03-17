import Joi from "joi";

// Definir la interfaz para los filtros
export interface banescoCargoEnCuentaLink {
  dataRequest: {
    device: {
      description: string;
      ipAddress: string;
      type: string;
    };
    user: {
      uuid: string;
    };
  };
}

export const banescoCargoEnCuentaLinkValidationSchema = Joi.object({
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

    user: Joi.object({
      uuid: Joi.string().required().messages({
        "string.base": 'El campo "uuid" debe ser un texto.',
        "string.required": 'El campo "uuid" es obligatorio',
      }),
    })
      .required()
      .messages({
        "any.required": 'El objeto "user" es obligatorio',
        "object.base": 'El objeto "user" debe ser un objeto válido',
      }),
  })
    .required()
    .messages({
      "any.required": 'El objeto "dataRequest" es obligatorio',
      "object.base": 'El objeto "dataRequest" debe ser un objeto válido',
    }),
});
