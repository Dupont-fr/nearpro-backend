import type { FilterQuery } from 'mongoose';
import { User, type UserDoc } from './model';
import type { RegisterInput } from './schema';

export const authRepository = {
  async findByEmail(email: string): Promise<UserDoc | null> {
    return User.findOne({ email }).select('+passwordHash +refreshTokenHash').exec();
  },

  async findByIdForAuth(id: string): Promise<UserDoc | null> {
    return User.findById(id).select('+refreshTokenHash').exec();
  },

  async existsByFilter(filter: FilterQuery<UserDoc>): Promise<boolean> {
    return User.exists(filter).then(Boolean);
  },

  async create(data: RegisterInput & { passwordHash: string }): Promise<UserDoc> {
    return User.create(data);
  },

  async setRefreshTokenHash(id: string, refreshTokenHash: string): Promise<void> {
    await User.updateOne({ _id: id }, { $set: { refreshTokenHash } }).exec();
  },

  async clearRefreshTokenHash(id: string): Promise<void> {
    await User.updateOne({ _id: id }, { $unset: { refreshTokenHash: 1 } }).exec();
  },
};