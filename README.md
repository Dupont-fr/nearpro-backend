# NearPro API

Backend de la plateforme **NearPro** — découverte de professionnels locaux (Cameroun).

## Stack

- Node.js + TypeScript
- Express.js (REST API)
- MongoDB + Mongoose (index géospatial `2dsphere`)
- Zod (validation API + env)
- JWT (Sprint 1), rate limiting, Helmet, anti-injection NoSQL

## Architecture modulaire

```
src/
├── config/          # env (Zod) + connexion MongoDB
├── middlewares/     # errorHandler, sanitizeNoSql, rateLimiter...
├── modules/         # un dossier par domaine (health, puis auth, businesses, ...)
├── app.ts           # création de l'app Express
└── server.ts        # démarrage : connexion DB puis listen (+ cluster en prod)
```

Pipeline : `Route → Middleware → Controller → Service → Repository → Modèle Mongoose → MongoDB`

## Démarrage

```bash
npm install
cp .env.example .env   # renseigner MONGODB_URI, JWT_SECRET, etc.
npm run dev            # tsx watch (développement, mono-processus)
npm run build && npm start   # production (tsc + cluster multi-cœurs)
```

Vérification : `GET http://localhost:5000/api/health`

## Scripts

- `npm run dev` — serveur de dev avec rechargement
- `npm run build` — compilation TypeScript
- `npm start` — serveur de production (utilise les workers cluster)
- `npm run typecheck` — vérification TypeScript
- `npm run lint` — ESLint
- `npm run format` — Prettier

## Montée en charge

Objectif : **250 utilisateurs simultanés** et plus. Stratégie détaillée dans [`docs/scale.md`](docs/scale.md) : cluster Node.js, compression, rate limiting, pool MongoDB, index, pagination, cache.

## Documentation

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/scale.md`](docs/scale.md) — stratégie 250+ utilisateurs simultanés
- [`docs/roadmap.md`](docs/roadmap.md)
- [`docs/sprints/`](docs/sprints) — comptes-rendus de sprints