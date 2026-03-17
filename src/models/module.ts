import { Schema, model } from "mongoose";
import * as env from "../config/env.config";

const moduleSchema = new Schema<env.Module>(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
  },
  {
    // timestamps: true,
    // strict: true,
    collection: "Module",
  },
);

moduleSchema.pre("save", async function (next) {
  if (!this.isModified("name") && !this.isModified("code")) {
    next();
  } else {
    const module = await this.model("Module").findOne({
      $or: [{ name: this.name }, { code: this.code }],
    });
    if (module) {
      next(new Error("Module already exists"));
    } else {
      next();
    }
  }
});

const Module = model<env.Module>("Module", moduleSchema);

export default Module;
