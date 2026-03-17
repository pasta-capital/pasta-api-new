import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const agileCheckTokenSchema = new Schema<env.AgileCheckToken>(
  {
    accessToken: {
      type: String,
      required: [true, "can't be blank"],
    },
    tokenType: {
      type: String,
      required: [true, "can't be blank"],
    },
    expireAt: {
      type: Date,
      required: [true, "can't be blank"],
      index: {
        name: "expireAt",
        expireAfterSeconds: env.AGILE_CHECK_TOKEN_EXPIRE_AT,
        background: true,
      },
    },
    expiresIn: {
      type: Number,
      required: [true, "can't be blank"],
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: "AgileCheckToken",
  },
);

const AgileCheckToken = model<env.AgileCheckToken>(
  "AgileCheckToken",
  agileCheckTokenSchema,
);

export default AgileCheckToken;
