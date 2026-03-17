import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const bankSchema = new Schema<env.Bank>(
  {
    name: {
      type: String,
      required: [true, "can't be blank"],
      index: true,
    },
    code: {
      type: String,
      required: [true, "can't be blank"],
      index: true,
    },
    laCode: String,
    currency: {
      type: String,
      enum: ["USD", "VEF"],
      required: [true, "can't be blank"],
      default: "VEF",
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: "Bank",
  },
);

const Bank = model<env.Bank>("Bank", bankSchema);

export default Bank;
