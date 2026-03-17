import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const rateHistorySchema = new Schema<env.RateHistory>(
  {
    date: { type: Date, required: true, default: Date.now },
    validDate: { type: Date, required: true, default: Date.now },
    usd: { type: Number, required: true },
    rub: { type: Number},
    try: { type: Number },
    cny: { type: Number },
    eur: { type: Number },
  },

  {
    timestamps: true,
    strict: true,
    collection: "RateHistory",
  },
);

const RateHistory = model<env.RateHistory>("RateHistory", rateHistorySchema);

export default RateHistory;
