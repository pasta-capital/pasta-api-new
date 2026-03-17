import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const laModelSchema = new Schema<env.LaModel>(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "LaModel",
  },
);

const LaModel = model<env.LaModel>("LaModel", laModelSchema);

export default LaModel;
