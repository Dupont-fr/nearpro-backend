import { Types } from 'mongoose';
import { ApiError } from '../../middlewares/errorHandler';
import type { CategoryDoc } from './model';
import { categoryRepository } from './repository';
import type { CreateCategoryInput, UpdateCategoryInput } from './schema';
import type { CategoryDTO } from './types';

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function assertObjectId(id: string, message = 'Identifiant invalide'): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(400, message);
  }
  return new Types.ObjectId(id);
}

function buildTree(docs: CategoryDoc[]): CategoryDTO[] {
  const byId = new Map<string, CategoryDTO>();
  for (const doc of docs) {
    byId.set(doc._id.toString(), { ...doc.toDTO(), children: [] });
  }

  const roots: CategoryDTO[] = [];
  for (const dto of byId.values()) {
    if (dto.parentId && byId.has(dto.parentId)) {
      byId.get(dto.parentId)?.children.push(dto);
    } else {
      roots.push(dto);
    }
  }
  return roots;
}

async function validateParent(parentId: string): Promise<Types.ObjectId> {
  const objectId = assertObjectId(parentId, 'Catégorie parente invalide');
  const parent = await categoryRepository.findById(parentId);
  if (!parent) {
    throw new ApiError(400, 'Catégorie parente introuvable');
  }
  if (parent.parentId) {
    throw new ApiError(400, 'Impossible de créer plus de deux niveaux de catégories');
  }
  return objectId;
}

function isDescendant(id: string, parentId: string, docs: CategoryDoc[]): boolean {
  const target = id;
  let current: string | null | undefined = parentId;
  const visited = new Set<string>();
  while (current && !visited.has(current)) {
    visited.add(current);
    if (current === target) {
      return true;
    }
    const parent = docs.find((doc) => doc._id.toString() === current);
    current = parent?.parentId?.toString() ?? null;
  }
  return false;
}

export const categoryService = {
  async list(): Promise<CategoryDTO[]> {
    const docs = await categoryRepository.findAllActive();
    return buildTree(docs);
  },

  async getBySlug(slug: string): Promise<CategoryDTO> {
    const doc = await categoryRepository.findBySlug(slug);
    if (!doc || !doc.isActive) {
      throw new ApiError(404, 'Catégorie introuvable');
    }
    const tree = buildTree(await categoryRepository.findAllActive());
    const stack = [...tree];
    while (stack.length > 0) {
      const current = stack.pop();
      if (current?.id === doc._id.toString()) {
        return current;
      }
      if (current?.children) {
        stack.push(...current.children);
      }
    }
    throw new ApiError(404, 'Catégorie introuvable');
  },

  async create(input: CreateCategoryInput): Promise<CategoryDTO> {
    const name = input.name.trim();
    const slug = slugify(name);
    if (await categoryRepository.findBySlug(slug)) {
      throw new ApiError(409, 'Une catégorie avec un nom similaire existe déjà');
    }

    const parentId = input.parentId ? await validateParent(input.parentId) : null;
    try {
      const doc = await categoryRepository.create({
        name,
        slug,
        parentId,
        order: input.order ?? 0,
        isActive: input.isActive ?? true,
      });
      return { ...doc.toDTO(), children: [] };
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        throw new ApiError(409, 'Une catégorie avec ce nom existe déjà');
      }
      throw err;
    }
  },

  async update(id: string, input: UpdateCategoryInput): Promise<CategoryDTO> {
    assertObjectId(id);
    const existing = await categoryRepository.findById(id);
    if (!existing) {
      throw new ApiError(404, 'Catégorie introuvable');
    }

    const patch: { name?: string; slug?: string; parentId?: Types.ObjectId | null; order?: number; isActive?: boolean } = {};

    if (input.name !== undefined && input.name.trim() !== existing.name) {
      patch.name = input.name.trim();
      patch.slug = slugify(patch.name);
      if (patch.slug !== existing.slug) {
        const taken = await categoryRepository.findBySlug(patch.slug);
        if (taken && taken._id.toString() !== existing._id.toString()) {
          throw new ApiError(409, 'Un nom similaire existe déjà');
        }
      }
    }

    if (input.order !== undefined) {
      patch.order = input.order;
    }
    if (input.isActive !== undefined) {
      patch.isActive = input.isActive;
    }
    if (input.parentId !== undefined) {
      if (input.parentId === null) {
        patch.parentId = null;
      } else {
        const objectId = assertObjectId(input.parentId, 'Catégorie parente invalide');
        if (objectId.toString() === existing._id.toString()) {
          throw new ApiError(400, 'Une catégorie ne peut pas être son propre parent');
        }
        const all = await categoryRepository.findAllActive();
        if (isDescendant(existing._id.toString(), objectId.toString(), all)) {
          throw new ApiError(400, 'Impossible de créer une boucle dans la hiérarchie');
        }
        patch.parentId = await validateParent(input.parentId);
      }
    }

    const updated = await categoryRepository.update(id, patch);
    if (!updated) {
      throw new ApiError(404, 'Catégorie introuvable');
    }
    return { ...updated.toDTO(), children: [] };
  },

  async remove(id: string): Promise<void> {
    assertObjectId(id);
    const existing = await categoryRepository.findById(id);
    if (!existing) {
      throw new ApiError(404, 'Catégorie introuvable');
    }
    const children = await categoryRepository.childCount(id);
    if (children > 0) {
      throw new ApiError(409, 'Supprimez d\'abord les sous-catégories');
    }
    await categoryRepository.remove(id);
  },
};