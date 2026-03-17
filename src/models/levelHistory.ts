// models/levelHistory.js
import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const levelHistorySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Indexamos para búsquedas más rápidas por usuario
    },
    oldLevel: {
      type: Number,
      required: true,
    },
    newLevel: {
      type: Number,
      required: true,
    },
    pointsAtChange: {
      type: Number,
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    // Campos opcionales que podrían ser útiles
    reason: {
      type: String,
      enum: [
        "POINTS_INCREASE",
        "POINTS_DECREASE",
        "ADMIN_ADJUSTMENT",
        "PROMOTION",
        "OTHER",
      ],
      default: "POINTS_INCREASE",
    },
    notes: {
      type: String,
    },
    // Si quieres guardar un snapshot de los beneficios obtenidos
    newBenefits: {
      creditLimit: Number,
      interestRate: Number,
      cashbackPercentage: Number,
      // Otros beneficios específicos
    },
  },
  {
    timestamps: true,
    collection: "LevelHistory",
  },
);

// Índice compuesto para consultas de historial por usuario y fecha
levelHistorySchema.index({ user: 1, changedAt: -1 });

const LevelHistory = model<env.LevelHistory>(
  "LevelHistory",
  levelHistorySchema,
);

export default LevelHistory;
