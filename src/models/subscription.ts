import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const subscriptionSchema = new Schema<env.Subscription>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Indexamos para búsquedas más rápidas por usuario
    },
    plan: {
      type: String,
      enum: ["monthly", "quarterly", "semi_annually", "annually"],
      default: "monthly",
      required: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    // account: {
    //   type: Schema.Types.ObjectId,
    //   ref: "Account",
    //   required: true,
    //   index: true, // Indexamos para búsquedas más rápidas por usuario
    // },
    contractNumber: {
      type: String,
    },
    transactionId: {
      type: String,
    },
    transactionRate: {
      type: Number,
    },
    transactionAmount: {
      type: Number,
    },
    // Estado de la suscripción
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Agrega automáticamente campos 'createdAt' y 'updatedAt'
    strict: true,
    collection: "Subscription", // Nombre de la colección en la base de datos
  },
);

// // Índice compuesto para consultas de historial por usuario y fecha
// subscriptionSchema.index({ user: 1, changedAt: -1 });

subscriptionSchema.index({ createdAt: 1 });

const Subscription = model<env.Subscription>(
  "Subscription",
  subscriptionSchema,
);

export default Subscription;
