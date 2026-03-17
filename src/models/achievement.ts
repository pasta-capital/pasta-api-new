import { Schema, model } from "mongoose";
import { Achievement } from "../config/env.config";

const achievementSchema = new Schema<Achievement>(
  {
    code: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: "Achievement",
  },
);

const Achievement = model<Achievement>("Achievement", achievementSchema);

export default Achievement;
