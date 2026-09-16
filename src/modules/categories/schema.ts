import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(80, 'Le nom est trop long'),
  parentId: z.string().trim().min(1).nullable().optional(),
  order: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const categorySlugParamsSchema = z.object({
  slug: z.string().trim().min(1).max(100),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;