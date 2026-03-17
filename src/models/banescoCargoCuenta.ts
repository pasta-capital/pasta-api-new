import { Schema, model, Document } from "mongoose";
import { BanescoCargoCuenta } from "../config/env.config";

const banescoCargoCuentaSchema = new Schema<BanescoCargoCuenta>(
  {
    device: new Schema({
      description: String,
      ipAddress: String,
      type: String,
    }),
    payment: new Schema({
      customerId: String,
      accountDebit: String,
      accountType: String,
      amount: Number,
      companyCode: String,
      companyId: String,
      concept: String,
      paymentId: String,
    }),
    securityAuth: new Schema({
      sessionId: String,
    }),
    referenceNumber: String,
  },
  { timestamps: true, collection: "BanescoCargoCuenta" },
);

const BanescoCargoCuenta = model<BanescoCargoCuenta>(
  "BanescoCargoCuenta",
  banescoCargoCuentaSchema,
);

export default BanescoCargoCuenta;
