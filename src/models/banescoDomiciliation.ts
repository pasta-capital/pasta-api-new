import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const banescoDomiciliationSchema = new Schema<env.BanescoDomiciliation>(
  {
    orderId: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    payments: [
      {
        type: Schema.Types.ObjectId,
        ref: "SubscriptionPayment",
      },
    ],
  },
  {
    timestamps: true,
    strict: true,
    collection: "BanescoDomiciliation",
  },
);

const BanescoDomiciliation = model<env.BanescoDomiciliation>(
  "BanescoDomiciliation",
  banescoDomiciliationSchema,
);

export default BanescoDomiciliation;
