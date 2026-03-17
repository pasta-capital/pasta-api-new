import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const beneficiarySchema = new Schema<env.Beneficiary>({
  name: {
    type: String,
    required: true,
  },
  identification: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  bank: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "Bank",
  },
});

const Beneficiary = model<env.Beneficiary>("Beneficiary", beneficiarySchema);

export default Beneficiary;
