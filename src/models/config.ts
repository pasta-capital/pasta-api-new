import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const configSchema = new Schema<env.Config>(
  {
    key: {
      type: String,
      required: [true, "can't be blank"],
      unique: true,
    },
    description: String,
    value: {
      type: Schema.Types.Mixed,
      required: [true, "can't be blank"],
    },
    type: {
      type: String,
      required: [true, "can't be blank"],
      enum: ["string", "number", "boolean", "array"],
      default: "string",
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: "Config",
  },
);

const Config = model<env.Config>("Config", configSchema);

export default Config;
