import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const balanceSchema = new Schema<env.Balance>(
  {
    account: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: "AdminAccount",
      index: true,
    },
    isIncome: {
      type: Boolean,
      required: [true, "can't be blank"],
    },
    amount: {
      type: Number,
      required: [true, "can't be blank"],
    },
    description: String,
    category: String,
    reference: String,
    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected"],
      default: "confirmed",
    },
    client: String,
  },
  {
    timestamps: true,
    strict: true,
    collection: "Balance",
  },
);

const Balance = model<env.Balance>("Balance", balanceSchema);

export default Balance;
