import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const enterpriseSchema = new Schema<env.Enterprise>(
  {
    name: {
      type: String,
      required: [true, "Enterprise name is required"],
    },
    commercialActivity: {
      type: String,
      required: [true, "Commercial activity is required"],
    },
    website: String,
    email: {
      type: String,
      required: [true, "Email is required"],
    },
    rif: {
      type: String,
      required: [true, "RIF is required"],
    },
    address: {
      type: String,
      required: [true, "Address is required"],
    },
    phone: String,
    contactDetails: {
      name: {
        type: String,
        required: [true, "Contact name is required"],
      },
      lastname: {
        type: String,
        required: [true, "Contact lastname is required"],
      },
      email: {
        type: String,
        required: [true, "Contact email is required"],
      },
      identification: {
        type: String,
        required: [true, "Contact identification is required"],
      },
      phone: {
        type: String,
        required: [true, "Contact phone is required"],
      },
    },
    employees: [{ type: Schema.Types.ObjectId, ref: "User" }],
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: "Enterprise",
  },
);

const Enterprise = model<env.Enterprise>("Enterprise", enterpriseSchema);

export default Enterprise;
