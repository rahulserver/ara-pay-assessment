import { HydratedDocument, Schema, model } from "mongoose";

export interface User {
  email: string;
  passwordHash: string;
  role: "owner" | "analyst";
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;

const userSchema = new Schema<User>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["owner", "analyst"],
      default: "analyst"
    }
  },
  {
    timestamps: true
  }
);

export const UserModel = model<User>("User", userSchema);
