import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const preSubscriptionSchema = new Schema<env.PreSubscription>(
  {
    identification: {
      type: String,
      required: true,
      index: true, // Índice para búsquedas rápidas por identificación
    },
    name: {
      type: String,
      required: true,
    },
    bankCode: {
      type: String,
      required: true,
    },
    accountNumber: {
      type: String,
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
    },
    transactionStatus: {
      type: String,
      required: true,
    },
    transactionRate: {
      type: Number,
      required: true,
    },
    transactionAmount: {
      type: Number,
      required: true,
    },
    consumed: {
      type: Boolean,
      default: false,
      index: true, // Índice para búsquedas de pre-suscripciones no consumidas
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Agrega automáticamente campos 'createdAt' y 'updatedAt'
    strict: true,
    collection: "PreSubscription", // Nombre de la colección en la base de datos
  },
);

// Índice compuesto para búsquedas por identificación y estado de consumo
preSubscriptionSchema.index({ identification: 1, consumed: 1 });

preSubscriptionSchema.index({ createdAt: 1 });

const PreSubscription = model<env.PreSubscription>(
  "PreSubscription",
  preSubscriptionSchema,
);

export default PreSubscription;
