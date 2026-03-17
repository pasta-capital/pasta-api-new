import { Schema, model } from "mongoose";

export type NotificationUserStatus = "queued" | "sent" | "failed" | "read";
export type RecipientType = "USER" | "ADMIN";

const notificationUsersSchema = new Schema(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Notifications",
      index: true,
      required: true,
    },
    recipientType: {
      type: String,
      enum: ["USER", "ADMIN"],
      required: [true, "RecipientType is required"],
      index: true,
    },
    type: {
      type: String,
      enum: ["MOBILE", "EMAIL", "INTERNAL", "SMS"],
      required: [true, "Type is required"],
      index: true,
    },
    infoType: {
      type: String,
      enum: ["NEUTRAL", "SUCCESS", "WARNING", "ERROR", "BAN"],
      default: "NEUTRAL",
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    link: {
      type: String,
      default: null,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: false,
      index: true,
    },
    status: {
      type: String,
      enum: ["queued", "sent", "failed", "read"],
      default: "queued",
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: "NotificationUsers",
  },
);

notificationUsersSchema.index({ userId: 1, createdAt: -1 });

const NotificationUsers = model("NotificationUsers", notificationUsersSchema);

export default NotificationUsers;
