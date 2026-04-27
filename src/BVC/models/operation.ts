import mongoose, { Schema, Document } from "mongoose";

export interface IBankOperation extends Document {
  internalRef: string; // Identificador Interno
  status:
    | "OK"
    | "KO"
    | "PENDING"
    | "VERIFICADO"
    | "CARGADO"
    | "PAGADO"
    | "RECHAZADO"
    | "INCIERTO";
  operationType: "IMMEDIATE_CREDIT" | "IMMEDIATE_DEBIT" | "MOBILE_VALIDATE";
  bankReference?: string; // Para Débito / Credito Inmediato y Ref Pago movil
  idPago?: string; // Identificador del debito inmediato para el token
  amount: number;
  createdAt: Date;
  updatedAt: Date;
  rawResponse?: any; // Guardamos el JSON desencriptado
  bankId: mongoose.Types.ObjectId;
  bankCode: string;
}

const OperationSchema = new Schema<IBankOperation>(
  {
    bankId: { type: Schema.Types.ObjectId, ref: "Bank", required: true },
    bankCode: {
      type: String,
      required: true,
      index: true,
    },
    internalRef: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "OK",
        "KO",
        "PENDING",
        "VERIFICADO",
        "CARGADO",
        "PAGADO",
        "RECHAZADO",
        "INCIERTO",
      ],
      default: "PENDING",
    },
    operationType: {
      type: String,
      enum: ["IMMEDIATE_CREDIT", "IMMEDIATE_DEBIT", "MOBILE_VALIDATE"],
      required: true,
    },
    bankReference: { type: String, index: true, sparse: true },
    amount: { type: Number, required: true },
    rawResponse: { type: Schema.Types.Mixed },
    idPago: { type: String, index: true, sparse: true },
  },
  {
    collection: "BankOperation",
    timestamps: true,
  },
);

export const BankOperation = mongoose.model<IBankOperation>(
  "BankOperation",
  OperationSchema,
);
