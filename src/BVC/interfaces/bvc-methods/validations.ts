import { z } from "zod";

/**
 * Validacion para operacion - Pago Movil
 */
export const BvcP2CValidateSchema = z.object({
  referencia: z.string().min(6).max(12).regex(/^\d+$/),
  //date movement like "dd/MM/yyyy" datetime
  fecha: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
  banco: z.coerce
    .string()
    .transform((val) => val.padStart(4, "0")) // Asegura que "104" sea "0104"
    .refine((val) => /^\d{4}$/.test(val), {
      message: "Bank code must be exactly 4 digits",
    }),
  telefonoP: z.string().regex(/^584(12|14|16|24|26|22)\d{7}$/), // Must include country code (58) and valid mobile prefix
  identificacion: z.string().regex(/^[VJGPE]\d{1,9}$/),
  monto: z
    .preprocess((val) => {
      if (typeof val === "string") return parseFloat(val);
      return val;
    }, z.number().nonnegative().multipleOf(0.01))
    .transform((val) => val.toFixed(2)),
  processPayment: z.boolean().optional(),
  pagador: z.string().max(40).optional(),
});

// Infer types
export type BvcP2CValidate = z.infer<typeof BvcP2CValidateSchema>;
