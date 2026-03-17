import { Schema, model, Document } from "mongoose";
import * as env from "../config/env.config";

export const OPERATION_PAYMENT_EXPIRE_AT_INDEX_NAME = "expireAt";
const paymentSchema = new Schema<env.Payment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    operationPayments: [
      {
        type: Schema.Types.ObjectId,
        ref: "OperationPayment",
      },
    ],
    laCuotas: [String],
    amountUsd: {
      type: Number,
      required: [true, "can't be blank"],
    },
    amountVef: {
      type: Number,
      required: [true, "can't be blank"],
    },
    rate: {
      type: Number,
      required: [true, "can't be blank"],
    },
    paymentType: {
      type: String,
      enum: ["debit", "transfer", "mobile", "card", "buddy"],
    },
    points: {
      type: Number,
      required: [true, "can't be blank"],
    },
    expireAt: {
      type: Date,
      index: {
        name: OPERATION_PAYMENT_EXPIRE_AT_INDEX_NAME,
        expireAfterSeconds: 0,
        background: true,
      },
    },
    status: {
      type: String,
      enum: ["void", "confirmed", "error"],
      default: "void",
      required: [true, "can't be blank"],
    },
    errorMessage: String,
    reference: String,
    internalReference: String,
    debitorAccount: {
      bankCode: String,
      identificationType: String,
      identificationNumber: String,
      phone: String,
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: "Payment",
  },
);

const Payment = model<env.Payment>("Payment", paymentSchema);

export default Payment;
