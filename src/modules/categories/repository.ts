import type { Types } from 'mongoose';
import { Category, type CategoryDoc } from './model';

interface CategoryWriteData {
  name: string;
  slug: string;
  parentId?: Types.ObjectId | null;
  order: number;
  isActive: boolean;
}

type CategoryPatch = Partial<Omit<CategoryWriteData, 'name'>> & { name?: string; slug?: string };

export const categoryRepository = {
  async findAllActive(): Promise<CategoryDoc[]> {
    return Category.find({ isActive: true }).sort({ order: 1, name: 1 }).exec();
  },

  async findById(id: string): Promise<CategoryDoc | null> {
    return Category.findById(id).exec();
  },

  async findBySlug(slug: string): Promise<CategoryDoc | null> {
    return Category.findOne({ slug }).exec();
  },

  async childCount(parentId: string): Promise<number> {
    return Category.countDocuments({ parentId }).exec();
  },

  async create(data: CategoryWriteData): Promise<CategoryDoc> {
    return Category.create(data);
  },

  async update(id: string, data: CategoryPatch): Promise<CategoryDoc | null> {
    return Category.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).exec();
  },

  async remove(id: string): Promise<CategoryDoc | null> {
    return Category.findByIdAndDelete(id).exec();
  },
};