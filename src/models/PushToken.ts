import { Schema, model, Types } from "mongoose";

export type PushTokenStatus = "active" | "inactive" | "revoked";

interface IPushToken {
  token: string;
  ownerType: "USER" | "ADMIN";
  userId?: Types.ObjectId | null;
  adminId?: Types.ObjectId | null;
  status: PushTokenStatus;
  lastUsedAt?: Date | null;
}

const pushTokenSchema = new Schema<IPushToken>(
  {
    token: { type: String, required: true, index: true, unique: true },
    ownerType: { type: String, enum: ["USER", "ADMIN"], required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    adminId: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    status: {
      type: String,
      enum: ["active", "inactive", "revoked"],
      default: "active",
    },
    lastUsedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "PushToken",
    strict: true,
  },
);

// Ensure a fast filter by owner and status
pushTokenSchema.index({ ownerType: 1, userId: 1, adminId: 1, status: 1 });

const PushToken = model<IPushToken>("PushToken", pushTokenSchema);

export default PushToken;
