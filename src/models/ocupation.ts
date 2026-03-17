import { Schema, model, Document } from "mongoose";
import * as env from "../config/env.config";

const OcupationSchema = new Schema<env.Ocupation>(
  {
    name: { type: String, required: true },
    laCode: { type: String },
  },
  {
    timestamps: true,
    collection: "Ocupation",
  },
);

export default model<env.Ocupation>("Ocupation", OcupationSchema);
