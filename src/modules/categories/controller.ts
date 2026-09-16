import type { Request, Response } from 'express';
import {
  categoryIdParamsSchema,
  categorySlugParamsSchema,
  createCategorySchema,
  updateCategorySchema,
} from './schema';
import { categoryService } from './service';

export const categoryController = {
  async list(_req: Request, res: Response): Promise<void> {
    const categories = await categoryService.list();
    res.status(200).json({ success: true, data: { categories } });
  },

  async getBySlug(req: Request, res: Response): Promise<void> {
    const { slug } = categorySlugParamsSchema.parse(req.params);
    const category = await categoryService.getBySlug(slug);
    res.status(200).json({ success: true, data: { category } });
  },

  async create(req: Request, res: Response): Promise<void> {
    const input = createCategorySchema.parse(req.body);
    const category = await categoryService.create(input);
    res.status(201).json({ success: true, data: { category } });
  },

  async update(req: Request, res: Response): Promise<void> {
    const { id } = categoryIdParamsSchema.parse(req.params);
    const input = updateCategorySchema.parse(req.body);
    const category = await categoryService.update(id, input);
    res.status(200).json({ success: true, data: { category } });
  },

  async remove(req: Request, res: Response): Promise<void> {
    const { id } = categoryIdParamsSchema.parse(req.params);
    await categoryService.remove(id);
    res.status(200).json({ success: true, data: null });
  },
};