import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../modules/auth/model';
import { Category, type CategoryDoc } from '../modules/categories/model';

/**
 * Précharge un compte ADMIN (impossible à créer via /register) et les
 * catégories de référence (prompt.md §30), avec leurs sous-catégories.
 */
const CATEGORIES: Array<{ name: string; order: number; sub: string[] }> = [
  { name: 'Automobile', order: 1, sub: ['Mécanique', 'Lavage auto'] },
  { name: 'Beauté', order: 2, sub: ['Coiffure', 'Salon de beauté', 'Manucure'] },
  { name: 'Alimentation', order: 3, sub: ['Restauration', 'Traiteur'] },
  { name: 'Maison', order: 4, sub: ['Bricolage', 'Plomberie', 'Électricité'] },
  { name: 'Technologie', order: 5, sub: ['Réparation téléphone', 'Développement web'] },
  { name: 'Commerce', order: 6, sub: [] },
  { name: 'Mode', order: 7, sub: ['Couture', 'Tailleur'] },
  { name: 'Services', order: 8, sub: ['Nettoyage', "Garde d'enfants"] },
];

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

interface CategorySeedData {
  name: string;
  slug: string;
  order: number;
  parentId?: mongoose.Types.ObjectId | null;
}

async function upsertCategory(data: CategorySeedData): Promise<CategoryDoc> {
  return Category.findOneAndUpdate(
    { slug: data.slug },
    { $set: { ...data, isActive: true } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).exec();
}

export async function runSeed(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
  await User.findOneAndUpdate(
    { email: env.ADMIN_EMAIL },
    {
      $set: {
        firstName: 'Admin',
        lastName: 'NearPro',
        email: env.ADMIN_EMAIL,
        passwordHash,
        role: 'ADMIN',
      },
    },
    { new: true, upsert: true },
  ).exec();

  for (const category of CATEGORIES) {
    const parent = await upsertCategory({
      name: category.name,
      slug: slugify(category.name),
      order: category.order,
    });
    for (const sub of category.sub) {
      await upsertCategory({
        name: sub,
        slug: slugify(sub),
        order: 0,
        parentId: parent._id,
      });
    }
  }

  await mongoose.disconnect();
}

async function main(): Promise<void> {
  try {
    await runSeed();
    console.log('[seed] OK — compte admin (« ' + env.ADMIN_EMAIL + ' ») et catégories prêts.');
    process.exit(0);
  } catch (err) {
    console.error('[seed] Échec :', err);
    process.exit(1);
  }
}

void main();