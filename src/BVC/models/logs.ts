import mongoose, { Schema, Document } from "mongoose";

export interface IBankLog extends Document {
  endpoint: string;
  requestPayload: any; // El objeto 'dt' antes de encriptar (legible)
  responsePayload: any; // El objeto desencriptado (legible)
  statusCode: number;
  timestamp: Date;
  bankId: mongoose.Types.ObjectId;
  bankCode: string;
  operationId: mongoose.Types.ObjectId;
}

const LogSchema = new Schema<IBankLog>(
  {
    bankId: { type: Schema.Types.ObjectId, ref: "Bank", required: true },
    bankCode: {
      type: String,
      required: true,
      index: true,
    },
    operationId: {
      type: Schema.Types.ObjectId,
      ref: "BankOperation",
      required: false,
      index: true,
      sparse: true,
    },
    endpoint: { type: String, required: true },
    requestPayload: { type: Schema.Types.Mixed },
    responsePayload: { type: Schema.Types.Mixed },
    statusCode: { type: Number },
    timestamp: { type: Date, default: Date.now },
  },
  {
    collection: "BankLog",
  },
);

const FIFTEEN_DAYS_IN_SECONDS = 15 * 24 * 60 * 60;
LogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: FIFTEEN_DAYS_IN_SECONDS },
);

export const BankLog = mongoose.model<IBankLog>("BankLog", LogSchema);
