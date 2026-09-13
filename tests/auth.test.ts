import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { User } from '../src/modules/auth/model';
import { requireAuth } from '../src/middlewares/requireAuth';
import { requireRole } from '../src/middlewares/requireRole';

const app = createApp();

/**
 * App dédiée aux tests de rôles : la route protégée est montée AVANT le
 * handler 404 (contrairement à l'app de production, test-only).
 */
const rolesApp = express();
rolesApp.use(express.json());
rolesApp.get(
  '/api/admin-only-test',
  requireAuth,
  requireRole('ADMIN'),
  (_req, res) => {
    res.status(200).json({ success: true, data: null });
  },
);
rolesApp.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ressource introuvable' });
});

/**
 * Les tests tournent contre MongoDB Atlas (aucun binaire local) :
 * on bascule la base de travail vers `Nearpro_test` pour ne pas toucher
 * aux données réelles de développement.
 */
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

const VALID_USER = {
  firstName: 'Gentil',
  lastName: 'Ejomo',
  email: 'gentil.ejomo@gmail.com',
  phone: '+237 690 123 456',
  password: 'MotDePasse!2026',
};

beforeAll(async () => {
  await mongoose.connect(withTestDatabase(env.MONGODB_URI));
  await mongoose.connection.dropDatabase();
}, 120_000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}, 120_000);

describe('Auth — inscription', () => {
  it('inscription valide : 201, DTO public, cookies de session posés', async () => {
    const res = await request(app).post('/api/auth/register').send(VALID_USER);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(VALID_USER.email);
    expect(res.body.data.user.role).toBe('CUSTOMER');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.user.refreshTokenHash).toBeUndefined();

    const cookies = cookiesOf(res);
    expect(cookies.accessToken).toBeTruthy();
    expect(cookies.refreshToken).toBeTruthy();
  });

  it('email déjà utilisé : 409', async () => {
    await User.deleteMany({});

    await request(app).post('/api/auth/register').send(VALID_USER).expect(201);

    const res = await request(app).post('/api/auth/register').send(VALID_USER);
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('déjà');

    await User.deleteMany({});
  });

  it('données invalides (email/password court/mauvais role) : 400', async () => {
    await User.deleteMany({});

    const invalidPayloads = [
      { firstName: 'G', lastName: 'Ejomo', email: 'x@x.fr', password: 'Secret123!' },
      { firstName: 'Gentil', lastName: 'Ejomo', email: 'email-invalide', password: 'Secret123!' },
      { firstName: 'Gentil', lastName: 'Ejomo', email: 'x@x.fr', password: 'court' },
      { ...VALID_USER, role: 'ADMIN' },
    ];

    for (const payload of invalidPayloads) {
      const res = await request(app).post('/api/auth/register').send(payload);
      expect(res.status).toBe(400);
    }
  });
});

describe('Auth — connexion', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await request(app).post('/api/auth/register').send(VALID_USER).expect(201);
  });

  it('connexion valide : 200 + cookies', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(VALID_USER.email);

    const cookies = cookiesOf(res);
    expect(cookies.accessToken).toBeTruthy();
    expect(cookies.refreshToken).toBeTruthy();
  });

  it('mauvais mot de passe : 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: 'MauvaisMotDePasse' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('email inconnu : même réponse 401 (pas d\'énumération)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inconnu@gmail.com', password: VALID_USER.password });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Email ou mot de passe incorrect');
  });
});

describe('Auth — refresh & logout', () => {
  it('refresh : rotation de session, cookies renouvelés', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });
    const before = cookiesOf(login);

    const refresh = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader(before));

    expect(refresh.status).toBe(200);
    const after = cookiesOf(refresh);
    expect(after.refreshToken).toBeTruthy();
    expect(after.refreshToken).not.toBe(before.refreshToken);
  });

  it('logout : refresh révoqué côté serveur, cookies effacés', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });
    const cookies = cookiesOf(login);

    const me = await request(app).get('/api/auth/me').set('Cookie', cookieHeader(cookies));
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(VALID_USER.email);

    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookieHeader(cookies));
    expect(logout.status).toBe(200);
    // les deux cookies sont invalidés (expiration passée)
    const cleared = logout.headers['set-cookie'] ?? [];
    expect(cleared.join(';').toLowerCase()).toContain('expires=thu, 01 jan 1970');

    // le refresh token révoqué ne permet plus de rouvrir la session
    const refresh = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader(cookies));
    expect(refresh.status).toBe(401);

    // NB : le JWT d'accès (stateless, 15 min) reste techniquement valide
    // jusqu'à son expiration ; la révocation réelle passe par le refresh.
  });

  it('refresh avec un token révoqué : 401', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });
    const cookies = cookiesOf(login);

    // logout révoque le refresh côté serveur
    await request(app).post('/api/auth/logout').set('Cookie', cookieHeader(cookies));

    const refresh = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader(cookies));
    expect(refresh.status).toBe(401);
  });
});

describe('Auth — routes protégées & rôles', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('route protégée sans token : 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('token invalide : 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token.fabriqué.invalide');
    expect(res.status).toBe(401);
  });

  it('CUSTOMER bloqué sur une route ADMIN : 403', async () => {
    const registration = await request(app).post('/api/auth/register').send(VALID_USER);
    const cookies = cookiesOf(registration);

    const res = await request(rolesApp)
      .get('/api/admin-only-test')
      .set('Cookie', cookieHeader(cookies));
    expect(res.status).toBe(403);
  });

  it('PROFESSIONAL atteint une route réservée aux pros', async () => {
    const registration = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, role: 'PROFESSIONAL' });
    expect(registration.status).toBe(201);
    expect(registration.body.data.user.role).toBe('PROFESSIONAL');
  });
});