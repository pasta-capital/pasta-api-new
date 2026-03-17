import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const banescoTransactionSchema = new Schema<env.BanescoTransaction>(
  {
    referenceNumber: {
      type: String,
      required: [true, "can't be blank"],
    },
    amount: {
      type: Number,
      required: [true, "can't be blank"],
    },
    accountId: {
      type: String,
      required: [true, "can't be blank"],
    },
    trnDate: {
      type: String,
      required: [true, "can't be blank"],
    },
    trnTime: {
      type: String,
      required: [true, "can't be blank"],
    },
    sourceBankId: {
      type: String,
      required: [true, "can't be blank"],
    },
    concept: {
      type: String,
      required: [true, "can't be blank"],
    },
    customerIdBen: {
      type: String,
      required: [true, "can't be blank"],
    },
    trnType: {
      type: String,
      required: [true, "can't be blank"],
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: "BanescoTransaction",
  },
);

const BanescoTransaction = model<env.BanescoTransaction>(
  "BanescoTransaction",
  banescoTransactionSchema,
);

export default BanescoTransaction;
