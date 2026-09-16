import { Schema, model, type Document, type Types } from 'mongoose';
import type { CategoryDTO } from './types';

export interface CategoryDoc extends Document {
  name: string;
  slug: string;
  parentId?: Types.ObjectId | null;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  toDTO(): Omit<CategoryDTO, 'children'>;
}

const categorySchema = new Schema<CategoryDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 100 },
    parentId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    order: { type: Number, default: 0, min: 0, max: 9999 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ name: 1 }, { unique: true });
categorySchema.index({ parentId: 1 });

categorySchema.methods.toDTO = function toDTO(this: CategoryDoc): Omit<CategoryDTO, 'children'> {
  return {
    id: this._id.toString(),
    name: this.name,
    slug: this.slug,
    parentId: this.parentId ? this.parentId.toString() : null,
    order: this.order,
    isActive: this.isActive,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

export const Category = model<CategoryDoc>('Category', categorySchema);