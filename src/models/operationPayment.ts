import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

export const OPERATION_EXPIRE_AT_INDEX_NAME = "expireAt";

const paymentSchema = new Schema<env.OperationPayment>(
  {
    date: {
      type: Date,
      required: [true, "can't be blank"],
    },
    amountUsd: {
      type: Number,
      required: [true, "can't be blank"],
    },
    amountUsdTotal: {
      type: Number,
    },
    interestRate: Number,
    interest: Number,
    amountVef: Number,
    rate: Number,
    status: {
      type: String,
      enum: [
        "void",
        "pending-approval",
        "pending",
        "paid",
        "overdue",
        "inArrears",
        "rejected",
      ],
      required: [true, "can't be blank"],
    },
    paymentMethod: String,
    paidAt: Date,
    user: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: "User",
      index: true,
    },
    operation: {
      type: Schema.Types.ObjectId,
      ref: "Operation",
    },
    points: Number,
    expireAt: {
      type: Date,
      index: {
        name: OPERATION_EXPIRE_AT_INDEX_NAME,
        expireAfterSeconds: env.OPERATION_EXPIRE_AT,
        background: true,
      },
    },
    laCuota: String,
    laCopaso: String,
    laNupaso: String,
  },
  {
    timestamps: true,
    strict: true,
    collection: "OperationPayment",
  },
);

const OperationPayment = model<env.OperationPayment>(
  "OperationPayment",
  paymentSchema,
);

export default OperationPayment;
