import { Schema, model, Document, Types } from "mongoose";

export interface ICustomerHistory extends Document {
  user: Types.ObjectId;
  year: number;
  month: number;
  status: "inactive" | "active" | "expired" | "delinquent";
  createdAt: Date;
  updatedAt: Date;
}

const customerHistorySchema = new Schema<ICustomerHistory>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
    },
    month: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["inactive", "active", "expired", "in_arrears"],
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "CustomerHistory",
  }
);

// Unique compound index to prevent duplicate records for the same user per month
customerHistorySchema.index({ user: 1, year: 1, month: 1 }, { unique: true });

const CustomerHistory = model<ICustomerHistory>("CustomerHistory", customerHistorySchema);

export default CustomerHistory;
