import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const accountSchema = new Schema<env.Account>(
  {
    user: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: "User",
      index: true,
    },
    bank: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: "Bank",
      index: true,
    },
    type: {
      type: String,
      /* enum: ["checking", "savings"], */
      default: "checking",
    },
    number: {
      type: String,
      required: [true, "can't be blank"],
      index: true,
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: "Account",
  },
);

const Account = model<env.Account>("Account", accountSchema);

export default Account;
