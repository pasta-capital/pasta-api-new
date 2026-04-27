import { Schema, model } from "mongoose";
import * as env from "../config/env.config";
import { required } from "joi";

export const OPERATION_EXPIRE_AT_INDEX_NAME = "expireAt";
const operationSchema = new Schema<env.Operation>(
  {
    user: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: "User",
      index: true,
    },
    currency: {
      type: String,
      enum: ["USD", "VEF"],
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
    annualCommission: {
      type: Number,
      required: [true, "can't be blank"],
    },
    commissionAmount: {
      type: Number,
      required: [true, "can't be blank"],
    },
    settledAmount: {
      type: Number,
      required: [true, "can't be blank"],
    },
    amountUsd: {
      type: Number,
      required: [true, "can't be blank"],
    }, // amountVef * rate
    feeCount: {
      type: Number,
      required: [true, "can't be blank"],
    },
    period: {
      type: String,
      enum: ["fortnight", "month", "year"],
      required: [true, "can't be blank"],
      default: "month",
    },
    paymentPlan: [
      {
        type: Schema.Types.ObjectId,
        ref: "OperationPayment",
      },
    ],
    comment: String,
    isThirdParty: {
      type: Boolean,
      required: [true, "can't be blank"],
      default: false,
    },
    beneficiary: {
      type: {
        name: String,
        identificationType: String,
        identificationNumber: String,
        phone: String,
        bankCode: String,
      },
    },
    status: {
      type: String,
      enum: [
        "void",
        "pending",
        "processing",
        "approved",
        "completed",
        "rejected",
      ],
      required: [true, "can't be blank"],
    },
    expireAt: {
      type: Date,
      index: {
        name: OPERATION_EXPIRE_AT_INDEX_NAME,
        expireAfterSeconds: 0,
        background: true,
      },
    },
    reference: String,
    account: {
      bank: {
        type: Schema.Types.ObjectId,
        ref: "Bank",
        // required: [true, "Bank ID is required"],
      },
      type: {
        type: String,
        // required: [true, "Account type is required"],
      },
      number: {
        type: String,
        // required: [true, "Account number is required"],
      },
    },
    banescoVuelto: {
      type: Schema.Types.ObjectId,
      ref: "BanescoVuelto",
    },
    icon: String,
    internalReference: String,
    bankTxId: String,
    laCopaso: String,
    userAgent: String,
    score: Number,
    laStatus: String,
    syncAttempts: {
      type: Number,
      default: 0,
      index: true,
    },
    lastSyncAttemptAt: Date,
    syncError: String,
  },
  {
    timestamps: true,
    strict: true,
    collection: "Operation",
  },
);

const Operation = model<env.Operation>("Operation", operationSchema);

export default Operation;
