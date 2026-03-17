import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const adminSchema = new Schema<env.Admin>(
  {
    name: {
      type: String,
      required: [true, "can't be blank"],
    },
    lastname: {
      type: String,
      required: [true, "can't be blank"],
    },
    email: {
      type: String,
      required: [true, "can't be blank"],
      unique: true,
    },
    password: {
      type: String,
      minlength: 6,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    phone: String,
    roles: [{ type: Schema.Types.ObjectId, ref: "Role" }],
    pushToken: String,
    pushTokens: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: "Admin",
  },
);

const Admin = model<env.Admin>("Admin", adminSchema);

export default Admin;
