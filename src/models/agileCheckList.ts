import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const AgileCheckListSchema = new Schema<env.AgileCheckList>(
  {
    description: {
      type: String,
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
  },
  {
    collection: "AgileCheckList",
  },
);

const AgileCheckList = model<env.AgileCheckList>(
  "AgileCheckList",
  AgileCheckListSchema,
);

export default AgileCheckList;
