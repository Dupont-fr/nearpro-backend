import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { User } from '../src/modules/auth/model';
import { Category } from '../src/modules/categories/model';

const app = createApp();

function withTestDatabase(uri: string): string {
  const queryIndex = uri.indexOf('?');
  const base = queryIndex === -1 ? uri : uri.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : uri.slice(queryIndex);
  const segments = base.split('/');
  segments[segments.length - 1] = 'Nearpro_test';
  return segments.join('/') + query;
}

function cookiesOf(res: request.Response): Record<string, string> {
  const out: Record<string, string> = {};
  const setCookies: string[] = res.headers['set-cookie'] ?? [];
  for (const cookie of setCookies) {
    const pair = cookie.split(';')[0];
    const sep = pair.indexOf('=');
    if (sep === -1) continue;
    out[pair.slice(0, sep).trim()] = pair.slice(sep + 1).trim();
  }
  return out;
}

function cookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

interface LoginResult {
  status: number;
  cookies: Record<string, string>;
}

async function login(email: string, password: string): Promise<LoginResult> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return { status: res.status, cookies: cookiesOf(res) };
}

async function loginAdmin(): Promise<string> {
  const { status, cookies } = await login('admin@nearpro.test', 'AdminSprint2!2026');
  if (status !== 200) {
    throw new Error('Connexion admin impossible pour les tests');
  }
  return cookieHeader(cookies);
}

const ADMIN = {
  email: 'admin@nearpro.test',
  password: 'AdminSprint2!2026',
  firstName: 'Admin',
  lastName: 'Test',
};

let adminCookie: string;

beforeAll(async () => {
  await mongoose.connect(withTestDatabase(env.MONGODB_URI));
  await mongoose.connection.dropDatabase();
  const passwordHash = await bcrypt.hash(ADMIN.password, 4);
  await User.create({ ...ADMIN, role: 'ADMIN', passwordHash });
}, 120_000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}, 120_000);

beforeEach(async () => {
  await Category.deleteMany({});
  adminCookie = await loginAdmin();
}, 30_000);

interface CategoryResponse {
  name: string;
  slug: string;
  parentId: string | null;
  order: number;
  isActive: boolean;
  children: CategoryResponse[];
}

async function createAsAdmin(payload: unknown): Promise<request.Response> {
  return request(app).post('/api/categories').set('Cookie', adminCookie).send(payload);
}

function bodyCategory(res: request.Response): CategoryResponse {
  return res.body.data.category as CategoryResponse;
}

describe('Catégories — lecture publique', () => {
  it('liste vide initiale : 200 []', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.data.categories).toEqual([]);
  });

  it('GET par slug : 200 avec DTO attendu', async () => {
    const created = await createAsAdmin({ name: 'Automobile' });
    expect(created.status).toBe(201);
    const dto = bodyCategory(created);
    expect(dto.slug).toBe('automobile');
    expect(dto.id).toBeTruthy();
    expect(dto.parentId).toBeNull();
    expect(dto.children).toEqual([]);

    const res = await request(app).get('/api/categories/automobile');
    expect(res.status).toBe(200);
    expect(res.body.data.category.name).toBe('Automobile');
  });

  it('slug inconnu : 404', async () => {
    const res = await request(app).get('/api/categories/inconnue');
    expect(res.status).toBe(404);
  });
});

describe('Catégories — création', () => {
  it('création admin : 201, slug accent-libre', async () => {
    const res = await createAsAdmin({ name: 'Beauté et Bien-être' });
    expect(res.status).toBe(201);
    expect(bodyCategory(res).slug).toBe('beaute-et-bien-etre');
  });

  it('nom dupliqué : 409', async () => {
    const first = await createAsAdmin({ name: 'Technologie' });
    expect(first.status).toBe(201);
    const res = await createAsAdmin({ name: 'Technologie' });
    expect(res.status).toBe(409);
  });

  it('données invalides (nom trop court) : 400', async () => {
    const res = await createAsAdmin({ name: 'A' });
    expect(res.status).toBe(400);
  });

  it('invité : 401', async () => {
    const res = await request(app).post('/api/categories').send({ name: 'Commerce' });
    expect(res.status).toBe(401);
  });

  it('CUSTOMER : 403', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Client',
        lastName: 'Test',
        email: 'client@nearpro.test',
        password: 'ClientTest!2026',
      });
    expect(reg.status).toBe(201);
    const res = await request(app)
      .post('/api/categories')
      .set('Cookie', cookieHeader(cookiesOf(reg)))
      .send({ name: 'Mode' });
    expect(res.status).toBe(403);
  });
});

describe('Catégories — hiérarchie', () => {
  it('sous-catégorie via parentId : arbre rempli côté public', async () => {
    const parent = bodyCategory(await createAsAdmin({ name: 'Automobile' }));
    const child = await createAsAdmin({ name: 'Mécanique', parentId: parent.id });
    expect(child.status).toBe(201);

    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    const auto = res.body.data.categories.find((c: CategoryResponse) => c.slug === 'automobile');
    expect(auto.children).toHaveLength(1);
    expect(auto.children[0]).toMatchObject({ name: 'Mécanique', parentId: parent.id });
  });

  it('parent introuvable : 400', async () => {
    const res = await createAsAdmin({
      name: 'Orpheline',
      parentId: '000000000000000000000000',
    });
    expect(res.status).toBe(400);
  });

  it('troisième niveau refusé : 400', async () => {
    const parent = bodyCategory(await createAsAdmin({ name: 'Maison' }));
    const child = bodyCategory(await createAsAdmin({ name: 'Bricolage', parentId: parent.id }));
    const res = await createAsAdmin({ name: 'Peinture', parentId: child.id });
    expect(res.status).toBe(400);
  });

  it('boucle refusée : une catégorie ne peut pas devenir enfant de sa propre sous-catégorie', async () => {
    const parent = bodyCategory(await createAsAdmin({ name: 'Mode' }));
    const child = bodyCategory(await createAsAdmin({ name: 'Couture', parentId: parent.id }));

    const res = await request(app)
      .patch(`/api/categories/${parent.id}`)
      .set('Cookie', adminCookie)
      .send({ parentId: child.id });
    expect(res.status).toBe(400);
  });
});

describe('Catégories — modification & suppression', () => {
  it('renommage : recalcule le slug', async () => {
    const created = bodyCategory(await createAsAdmin({ name: 'Technologie' }));

    const res = await request(app)
      .patch(`/api/categories/${created.id}`)
      .set('Cookie', adminCookie)
      .send({ name: 'Informatique' });
    expect(res.status).toBe(200);
    expect(bodyCategory(res).slug).toBe('informatique');
  });

  it('désactivation : invisible en public', async () => {
    const created = bodyCategory(await createAsAdmin({ name: 'Services' }));

    await request(app)
      .patch(`/api/categories/${created.id}`)
      .set('Cookie', adminCookie)
      .send({ isActive: false })
      .expect(200);

    const res = await request(app).get('/api/categories');
    expect(res.body.data.categories.some((c: CategoryResponse) => c.id === created.id)).toBe(false);
  });

  it('suppression avec enfants : 409', async () => {
    const parent = bodyCategory(await createAsAdmin({ name: 'Beauté' }));
    const child = await createAsAdmin({ name: 'Coiffure', parentId: parent.id });
    expect(child.status).toBe(201);

    const res = await request(app)
      .delete(`/api/categories/${parent.id}`)
      .set('Cookie', adminCookie);
    expect(res.status).toBe(409);

    const savedChild = await Category.findOne({ slug: 'coiffure' }).exec();
    expect(savedChild).not.toBeNull();
  });

  it('suppression feuille : 200 puis 404 en lecture', async () => {
    const created = bodyCategory(await createAsAdmin({ name: 'Commerce' }));

    const res = await request(app)
      .delete(`/api/categories/${created.id}`)
      .set('Cookie', adminCookie);
    expect(res.status).toBe(200);

    const gone = await request(app).get('/api/categories/commerce');
    expect(gone.status).toBe(404);
  });

  it('catégorie inconnue : 404 en PATCH/DELETE', async () => {
    const id = '000000000000000000000000';
    const patch = await request(app)
      .patch(`/api/categories/${id}`)
      .set('Cookie', adminCookie)
      .send({ name: 'Nouveau' });
    expect(patch.status).toBe(404);

    const del = await request(app).delete(`/api/categories/${id}`).set('Cookie', adminCookie);
    expect(del.status).toBe(404);
  });
});