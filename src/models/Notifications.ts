import { Schema, model, Types } from "mongoose";

export type NotificationType = "MOBILE" | "EMAIL" | "INTERNAL" | "SMS";
export type NotificationAudience = "USER" | "ADMIN";
export type NotificationInfoType =
  | "NEUTRAL"
  | "SUCCESS"
  | "WARNING"
  | "ERROR"
  | "BAN";
export type NotificationStatus =
  | "draft"
  | "scheduled"
  | "processing"
  | "sent"
  | "failed"
  | "cancelled";

const notificationsSchema = new Schema(
  {
    audience: {
      type: String,
      enum: ["USER", "ADMIN"],
      required: [true, "Audience is required"],
      default: "USER",
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
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
    ],
    group: {
      type: Schema.Types.ObjectId,
      ref: "UsersGroup",
      default: null,
      index: true,
    },
    sendAt: {
      type: Date,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "processing", "sent", "failed", "cancelled"],
      default: "draft",
      index: true,
    },
    isPromotional: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: "Notifications",
  },
);

const Notifications = model("Notifications", notificationsSchema);

export default Notifications;
