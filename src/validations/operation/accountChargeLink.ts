import Joi from "joi";

// Definir la interfaz para los filtros
export interface accounyChargeLink {
  device: {
    description: string;
    ipAddress: string;
    type: string;
  };
}

export const accounyChargeLinkValidationSchema = Joi.object({
  device: Joi.object({
    description: Joi.string().required().messages({
      "string.required": 'El campo "description" es obligatorio',
    }),
    ipAddress: Joi.string()
      .ip({ version: ["ipv4", "ipv6"], cidr: "forbidden" }) // valida IP
      .required()
      .messages({
        "string.ip": 'El campo "ipAddress" debe ser una dirección IP válida',
        "string.required": 'El campo "ipAddress" es obligatorio',
      }),
    type: Joi.string().required().messages({
      "string.required": 'El campo "type" es obligatorio',
    }),
  })
    .required()
    .messages({
      "any.required": 'El objeto "device" es obligatorio',
      "object.base": 'El objeto "device" debe ser un objeto válido',
    }),
});
