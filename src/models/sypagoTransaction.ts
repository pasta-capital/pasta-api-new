import { Document, Schema, model } from "mongoose";
import * as env from "../config/env.config";

// Subesquema para la información de la cuenta
const AccountSchema = new Schema(
  {
    bank_code: { type: String, required: true },
    type: { type: String, required: true },
    number: { type: String, required: true },
  },
  { _id: false },
);

// Subesquema para la información del documento
const DocumentInfoSchema = new Schema(
  {
    type: { type: String, required: true },
    number: { type: String, required: true },
  },
  { _id: false },
);

// Subesquema para el teléfono
const PhoneSchema = new Schema(
  {
    area_code: { type: String, required: true },
    number: { type: String, required: true },
  },
  { _id: false },
);

// Subesquema para el usuario receptor
const ReceivingUserSchema = new Schema(
  {
    phone: { type: PhoneSchema },
    email: { type: String },
    otp: { type: String },
    name: { type: String },
    document_info: { type: DocumentInfoSchema, required: true },
    account: { type: AccountSchema, required: true },
  },
  { _id: false },
);

// Subesquema para el monto
const AmountSchema = new Schema(
  {
    type: { type: String, required: true },
    amt: { type: Number, required: true },
    pay_amt: { type: Number, required: true },
    currency: { type: String, required: true },
    rate: { type: Number, required: true },
  },
  { _id: false },
);

// Esquema principal
const TransactionSchema = new Schema<env.SypagoTransaction>(
  {
    internal_id: { type: String, required: true },
    transaction_id: { type: String, required: true },
    ref_ibp: String,
    group_id: { type: String, default: "" },
    operation_date: { type: Date },
    amount: { type: AmountSchema, required: true },
    receiving_user: { type: ReceivingUserSchema, required: true },
    status: { type: String, required: true },
    rejected_code: { type: String },
  },
  {
    timestamps: true, // agrega createdAt y updatedAt
    versionKey: false, // elimina __v
    collection: "SypagoTransaction", // nombre de la colección en la base de datos
  },
);

const SypagoTransaction = model<env.SypagoTransaction>(
  "SypagoTransaction",
  TransactionSchema,
);

export default SypagoTransaction;
