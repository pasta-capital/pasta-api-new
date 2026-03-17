import { Schema, model } from "mongoose";
import * as env from "../config/env.config";
import slugify from "slugify";

const roleSchema = new Schema<env.Role>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    code: {
      type: String,
      // required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    modules: [{ type: Schema.Types.ObjectId, ref: "Module" }],
  },
  {
    timestamps: true,
    strict: true,
    collection: "Role",
  },
);

roleSchema.pre("save", async function (next) {
  this.code = slugify(this.name, { lower: true });
  next();
});

const Role = model<env.Role>("Role", roleSchema);

export default Role;
