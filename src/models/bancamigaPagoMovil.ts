import mongoose, { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const transactionSchema = new Schema(
  {
    ID: {
      type: String,
      required: true,
      // unique: true,
    },
    created_at: {
      type: Date,
      required: true,
    },
    Dni: {
      type: String,
      required: true,
    },
    PhoneDest: {
      type: String,
      required: true,
    },
    PhoneOrig: {
      type: String,
      required: true,
    },
    Amount: {
      type: Number,
      required: true,
    },
    BancoOrig: {
      type: String,
      required: true,
    },
    NroReferenciaCorto: {
      type: String,
      required: true,
    },
    NroReferencia: {
      type: String,
      required: true,
    },
    HoraMovimiento: {
      type: String, // formato HH:mm:ss
      required: true,
    },
    FechaMovimiento: {
      type: String, // formato YYYY-MM-DD
      required: true,
    },
    Descripcion: {
      type: String,
      default: "",
    },
    Status: {
      type: String,
      required: true,
    },
    Refpk: {
      type: String,
      required: true,
    },
    Ref: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false, // elimina __v
    collection: "BancamigaPagoMovil", // nombre de la colección
  },
);

const BancamigaPagoMovil = model<env.BancamigaPagoMovil>(
  "BancamigaPagoMovil",
  transactionSchema,
);

export default BancamigaPagoMovil;
