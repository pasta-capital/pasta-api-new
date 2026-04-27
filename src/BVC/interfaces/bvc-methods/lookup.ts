import { z } from "zod";

export const BvcGetSingularTxSchema = z
  .object({
    fecha: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/), // DD/MM/YYYY
    referencia: z.string().optional(), // La referencia 03D... que devolvió el banco
    trackingId: z.string().optional(), // Tu ID de seguimiento original
    modalidad: z.enum(["CTI", "DBI"]).optional(), // CTI=Crédito, DBI=Débito
  })
  .refine((data) => data.referencia || data.trackingId, {
    message: "Debe proveer al menos la referencia del banco o su trackingId",
    path: ["referencia"],
  });

export const BvcGetInternalRefSchema = z.object({
  internalRef: z.string().min(1),
});

export type BvcGetSingularTx = z.infer<typeof BvcGetSingularTxSchema>;
export type BvcGetInternalRef = z.infer<typeof BvcGetInternalRefSchema>;
