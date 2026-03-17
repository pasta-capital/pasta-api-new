import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const locationSchema = new Schema<env.Location>(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["country", "state", "city", "parish", "municipality"],
    },
    code: String,
    location: {
      type: Schema.Types.ObjectId,
      ref: "Location",
    },
  },
  {
    collection: "Location",
  },
);

const Location = model<env.Location>("Location", locationSchema);

export default Location;
