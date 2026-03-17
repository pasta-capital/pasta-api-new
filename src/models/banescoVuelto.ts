import { Schema, model, Document } from "mongoose";
import { BanescoVuelto } from "../config/env.config";

const banescoVueltoSchema = new Schema<BanescoVuelto>(
  {
    device: new Schema({
      description: String,
      ipAddress: String,
      type: String,
      sid: String,
    }),
    p2p: {
      accountFrom: {
        accountId: String,
      },
      accountTo: {
        bankId: String,
        customerId: String,
        phoneNum: String,
      },
      amount: Number,
      paymentId: String,
      concept: String,
      trnDate: String,
      trnTime: String,
    },
    referenceNumber: String,
  },
  { timestamps: true, collection: "BanescoVuelto" },
);

const BanescoVuelto = model<BanescoVuelto>(
  "BanescoVuelto",
  banescoVueltoSchema,
);

export default BanescoVuelto;
