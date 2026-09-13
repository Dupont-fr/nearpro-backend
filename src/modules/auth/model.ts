import { Schema, model, type Document } from 'mongoose';
import type { AuthUserDTO, UserRole } from './types';

export interface UserDoc extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  refreshTokenHash?: string;
  createdAt: Date;
  updatedAt: Date;
  toDTO(): AuthUserDTO;
}

const userSchema = new Schema<UserDoc>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    phone: { type: String, trim: true, maxlength: 20 },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['CUSTOMER', 'PROFESSIONAL', 'ADMIN'],
      default: 'CUSTOMER',
    },
    refreshTokenHash: { type: String, select: false },
  },
  { timestamps: true, versionKey: false },
);

userSchema.methods.toDTO = function toDTO(this: UserDoc): AuthUserDTO {
  return {
    id: this._id.toString(),
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    phone: this.phone ?? null,
    role: this.role,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

export const User = model<UserDoc>('User', userSchema);