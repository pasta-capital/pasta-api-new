import { Schema, model } from "mongoose";
import validator from "validator";
import * as env from "../config/env.config";

export const TOKEN_EXPIRE_AT_INDEX_NAME = "expireAt";

const tokenSchema = new Schema<env.Token>(
  {
    user: {
      type: Schema.Types.ObjectId,
      //required: [true, "can't be blank"],
      ref: "User",
      index: true,
    },
    email: {
      type: String,
      validate: {
        validator: (value: string) => validator.isEmail(value),
        message: "{VALUE} is not a valid email",
      },
      index: true,
    },
    token: {
      type: String,
      required: [true, "can't be blank"],
      index: true,
    },
    expireAt: {
      type: Date,
      default: new Date(Date.now()),
      index: {
        name: TOKEN_EXPIRE_AT_INDEX_NAME,
        expireAfterSeconds: 0,
        background: true,
      },
    },
    type: {
      type: String,
      enum: [
        "reset",
        "register-email",
        "register-sms",
        "change-password",
        "edit-profile",
        "password-admin-reset",
      ],
      default: "reset",
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: "Token",
  },
);

const Token = model<env.Token>("Token", tokenSchema);

export default Token;
