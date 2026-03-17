import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const subscriptionPaymentSchema = new Schema<env.SubscriptionPayment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Indexamos para búsquedas más rápidas por usuario
    },
    amountVef: {
      type: Number,
      required: true,
    },
    amountUsd: {
      type: Number,
      required: true,
    },
    // Moneda en la que se realizó el pago
    rate: {
      type: Number,
      required: true,
    },
    // Fecha del pago
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["pending", "debited", "completed", "failed", "late", "paid"],
      default: "pending",
    },
    details: {
      type: String,
    },
    account: {
      bank: {
        type: Schema.Types.ObjectId,
        ref: "Bank",
      },
      type: {
        type: String,
      },
      number: {
        type: String,
      },
    },
    receiptId: {
      type: String,
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: "SubscriptionPayment",
  },
);

// Índice compuesto para consultas de historial por usuario y fecha
subscriptionPaymentSchema.index({ user: 1, changedAt: -1 });

const SubscriptionPayment = model<env.SubscriptionPayment>(
  "SubscriptionPayment",
  subscriptionPaymentSchema,
);

export default SubscriptionPayment;
