import { z } from "zod";

/**
 * 1. Debito Inmediato - Comienza Tsx (Cobro)
 */
export const BvcDebitRequestSchema = z
  .object({
    monto: z
      .preprocess((val) => {
        if (typeof val === "string") return parseFloat(val);
        return val;
      }, z.number().nonnegative().multipleOf(0.01))
      .transform((val) => val.toFixed(2)),
    nombreBen: z.string().min(1),
    cirifBen: z
      .string()
      .min(1)
      .max(9)
      .regex(/^\d+$/, { message: "Debe contener solo números" }),
    tipoPersonaBen: z.enum(["V", "E", "P", "J", "G"]),
    tipoDatoCuentaBen: z.enum(["CNTA", "CELE", "ALIS"]),
    cuentaBen: z.string().min(1).max(30),
    codBancoBen: z
      .string()
      .length(4)
      .regex(/^\d{4}$/),
    concepto: z.string().min(4),
    transactionID: z.string().max(30),
  })
  .refine(
    (data) => {
      if (data.tipoDatoCuentaBen === "CNTA") {
        return data.cuentaBen.length === 20 && /^\d+$/.test(data.cuentaBen);
      }
      if (data.tipoDatoCuentaBen === "CELE") {
        const phoneRegex = /^584(12|14|16|24|26|15|22)\d{7}$/;
        return phoneRegex.test(data.cuentaBen);
      }
      if (data.tipoDatoCuentaBen === "ALIS") {
        return data.cuentaBen.length >= 5; // Req random 5 min
      }
      return true;
    },
    {
      message:
        "La longitud o formato de 'cuentaBen' no coincide con el tipo seleccionado (CNTA=20, CELE=12/58..., ALIS>=5)",
      path: ["cuentaBen"],
    },
  );

/**
 * 1. Token para Debito Inmediato (Cobro)
 */
export const BvcDebitTokenRequestSchema = z.object({
  idPago: z.string().min(1).regex(/^\d+$/),
  token: z.string().min(1),
});

/**
 * 3. Credito Inmediato (Pagar)
 */
export const BvcCreditRequestSchema = z
  .object({
    monto: z
      .preprocess((val) => {
        // Si mandan un string "300.5", lo convierte a número para validarlo
        if (typeof val === "string") return parseFloat(val);
        return val;
      }, z.number().nonnegative().multipleOf(0.01))
      .transform((val) => val.toFixed(2)),
    nombreBen: z.string().min(4),
    cirifBen: z
      .string()
      .min(1)
      .max(9)
      .regex(/^\d+$/, { message: "Debe contener solo números" }),
    tipoPersonaBen: z.enum(["V", "E", "P", "J", "G"]),
    tipoDatoCuentaBen: z.enum(["CNTA", "CELE", "ALIS"]),
    cuentaBen: z.string().min(1).max(30),
    codBancoBen: z
      .string()
      .length(4)
      .regex(/^\d{4}$/),
    concepto: z.string().min(4).max(100),
    transactionID: z.string().max(30),
  })
  .refine(
    (data) => {
      if (data.tipoDatoCuentaBen === "CNTA") {
        return data.cuentaBen.length === 20 && /^\d+$/.test(data.cuentaBen);
      }
      if (data.tipoDatoCuentaBen === "CELE") {
        const phoneRegex = /^584(12|14|16|24|26|15|22)\d{7}$/;
        return phoneRegex.test(data.cuentaBen);
      }
      if (data.tipoDatoCuentaBen === "ALIS") {
        return data.cuentaBen.length >= 5; // Tu requerimiento de mínimo 5
      }
      return true;
    },
    {
      message:
        "La longitud o formato de 'cuentaBen' no coincide con el tipo seleccionado (CNTA=20, CELE=12/58..., ALIS>=5)",
      path: ["cuentaBen"], // El error se marcará específicamente en este campo
    },
  );

export type BvcDebitTokenRequest = z.infer<typeof BvcDebitTokenRequestSchema>;
export type BvcDebitRequest = z.infer<typeof BvcDebitRequestSchema>;
export type BvcCreditRequest = z.infer<typeof BvcCreditRequestSchema>;
