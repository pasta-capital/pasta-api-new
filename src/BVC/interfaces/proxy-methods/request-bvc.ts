import { z } from "zod";

/**
 * Envelope de Request para BVC
 */
export const BvcRequestEnvelopeSchema = z.object({
  hs: z.string(),
  dt: z.string(),
});

/**
 * Envelope de Response desde BVC
 */
export const BvcResponseEnvelopeSchema = z.object({
  response: z.string(), // El JSON String encriptado con AES128
  dt: z.string().optional(), // Alternativa si el campo 'response' no está presente
});

export const BvcErrorResponseSchema = z.object({
  codError: z.string(),
  mensaje: z.string(),
  codigoErrorCCE: z.string().optional(),
});

export const UniversalSchema = z.object({
  // Identificadores
  transactionId: z.string().optional(), // Tu trackingId / internalRef
  bankReference: z.string().optional(),
  date: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/)
    .optional(), // DD/MM/YYYY
  bankCode: z.coerce
    .string()
    .transform((val) => val.padStart(4, "0")) // Asegura que "104" sea "0104"
    .refine((val) => /^\d{4}$/.test(val), {
      message: "Bank code must be exactly 4 digits",
    })
    .optional(),
  phone: z
    .string()
    .regex(/^584(12|14|16|24|26|22)\d{7}$/)
    .optional(), // Must include country code (58) and valid mobile prefix
  amount: z
    .preprocess((val) => {
      if (typeof val === "string") return parseFloat(val);
      return val;
    }, z.number().nonnegative().multipleOf(0.01))
    .transform((val) => val.toFixed(2))
    .optional(), // Formatea a string con 2 decimales
  concept: z.string().optional(),
  name: z.string().max(40).optional(),
  idType: z.enum(["V", "E", "P", "J", "G"]).optional(),
  idNumber: z.string().max(9).regex(/^\d+$/).optional(),
  accountType: z.enum(["CNTA", "CELE", "ALIS"]).optional(),
  accountNumber: z.string().max(30).optional(),
  trackingId: z.string().max(30).optional(),
  idPago: z.string().min(1).max(15).optional(),
  token: z.string().min(1).max(15).optional(),
  operationType: z.enum(["CTI", "DBI"]).optional(),
});

// Infer types
export type BvcRequestEnvelope = z.infer<typeof BvcRequestEnvelopeSchema>;
export type BvcResponseEnvelope = z.infer<typeof BvcResponseEnvelopeSchema>;
export type BvcErrorResponse = z.infer<typeof BvcErrorResponseSchema>;
export type Universal = z.infer<typeof UniversalSchema>;
