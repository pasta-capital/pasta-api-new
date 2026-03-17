import { Schema, model, Types } from "mongoose";

const usersGroupSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
    ],
  },
  {
    timestamps: true,
    strict: true,
    collection: "UsersGroup",
  },
);

usersGroupSchema.index({ title: 1 }, { unique: false });

const UsersGroup = model("UsersGroup", usersGroupSchema);

export default UsersGroup;
