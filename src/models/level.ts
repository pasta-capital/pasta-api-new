import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const levelSchema = new Schema<env.Level>(
  {
    name: String,
    level: Number,
    pointsRequired: Number,
    creditLimit: Number,
    allowedFeeCount: [Number],
  },
  {
    timestamps: true,
    collection: "Level",
  },
);

const Level = model<env.Level>("Level", levelSchema);

export default Level;
