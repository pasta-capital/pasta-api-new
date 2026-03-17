import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const creditScoreSchema = new Schema<env.CreditScore>(
  {
    code: String,
    name: String,
    score: Number,
    items: [
      {
        code: String,
        name: String,
        value: Number,
      },
    ],
  },
  {
    timestamps: true,
    strict: true,
    collection: "CreditScore",
  },
);

const CreditScore = model<env.CreditScore>("CreditScore", creditScoreSchema);

export default CreditScore;
