import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const adminAccountSchema = new Schema<env.AdminAccount>(
  {
    currency: {
      type: String,
      enum: ["USD", "VEF"],
      required: [true, "can't be blank"],
    },
    bank: {
      type: Schema.Types.ObjectId,
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
    collection: "AdminAccount",
  },
);

const AdminAccount = model<env.AdminAccount>(
  "AdminAccount",
  adminAccountSchema,
);

export default AdminAccount;
