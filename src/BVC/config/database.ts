import mongoose from "mongoose";
import { MONGO_URI } from "./env.config";
import { BankLog } from "../models/logs";
import { BankOperation } from "../models/operation";
import { Bank } from "../models/banks";

export const connectDB = async () => {
  try {
    mongoose.set("bufferCommands", false);

    await mongoose.connect(MONGO_URI);

    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve, reject) => {
        mongoose.connection.once("connected", resolve);
        mongoose.connection.once("error", reject);
      });
    }

    const models = [BankLog, BankOperation, Bank];
    await Promise.all(models.map((model) => model.syncIndexes()));

    console.log("MongoDB connected and indexes synchronized.");
  } catch (error) {
    console.error("MongoDB Error:", error);
    process.exit(1);
  }
};
