import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const frequentQuestionSchema = new Schema<env.FrequentQuestion>(
  {
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: "FrequentQuestion",
  },
);

const FrequentQuestion = model<env.FrequentQuestion>(
  "FrequentQuestion",
  frequentQuestionSchema,
);

export default FrequentQuestion;
