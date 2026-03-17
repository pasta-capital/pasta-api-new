import Joi from "joi";

export interface GetClienteByDocIdentidad {
  tipoIdentificacion: string;
  nroIdentificacion: string;
}

export const getClienteByDocIdentidadValidationSchema = Joi.object({
  tipoIdentificacion: Joi.string().valid("0", "1").required().messages({
    "string.valid.base": "tipoIdentificacion debe ser 0 (persona jurídica) o 1 (persona natural)",
  }),
  nroIdentificacion: Joi.string().min(5).max(15).required().messages({
    "string.min": "nroIdentificacion debe tener al menos 5 caracteres",
    "string.max": "nroIdentificacion no puede exceder 15 caracteres",
  }),
});
