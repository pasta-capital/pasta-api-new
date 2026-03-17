import { Schema, model, Types, Document } from "mongoose";

interface UserAddress extends Document {
  user: Types.ObjectId;
  country: Types.ObjectId;
  state?: Types.ObjectId;
  municipality?: Types.ObjectId;
  parish?: Types.ObjectId;
  street?: string;
  housingType?: string;
  housingName?: string;
  zipCode?: string;
}

const userAddressSchema = new Schema<UserAddress>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    country: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    state: { type: Schema.Types.ObjectId, ref: "Location" },
    municipality: { type: Schema.Types.ObjectId, ref: "Location" },
    parish: { type: Schema.Types.ObjectId, ref: "Location" },
    street: { type: String },
    housingType: { type: String },
    housingName: { type: String },
    zipCode: { type: String },
  },
  {
    timestamps: true,
    collection: "UserAddress",
  },
);

const UserAddressModel = model<UserAddress>("UserAddress", userAddressSchema);

export default UserAddressModel;
