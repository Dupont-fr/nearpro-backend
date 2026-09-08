# Sprint 0 — Analyse et initialisation

## Objectif

Préparer le projet : infrastructure, architecture, montée en charge et connectivité backend ↔ MongoDB, sans fonctionnalité métier.

## Organisation des repos

- Repository indépendant par sous-projet (décision utilisateur) : `backend` et `frontend` sont deux repos Git séparés.

## Fonctionnalités réalisées

- Repository backend initialisé (Git, branche `main`).
- Backend : Node.js + TypeScript + Express + Mongoose.
- Endpoint `GET /api/health` opérationnel.
- Connexion MongoDB Atlas validée (base `Nearpro`).
- **250+ utilisateurs simultanés** : cluster multi-cœurs (`CLUSTER_ENABLED=true` → 4 workers vérifiés), compression gzip, rate limiting par IP, pool MongoDB configurable, garde anti fork-storm.
- Sécurité : Helmet, CORS, sanitize NoSQL, errorHandler standard (Zod → 400).
- Zod pour les variables d'environnement.
- Configuration ESLint + Prettier, `.env.example`, `.gitattributes`, `.gitignore`, README.
- Documentation : `docs/architecture.md`, `docs/scale.md`, `docs/roadmap.md`, `docs/sprints/`.

## Fichiers principaux

- `backend/src/config/{env,database}.ts`, `backend/src/middlewares/{errorHandler,sanitizeNoSql,rateLimiter}.ts`, `backend/src/modules/health/{controller,routes}.ts`, `backend/src/{app,server}.ts`, `backend/tsconfig.json`.

## Base de données

- MongoDB Atlas (`mongodb+srv://.../Nearpro`), connectée via Mongoose.
- Pas encore de schémas : modèles prévus pour le Sprint 1 (User) et Sprint 3 (Business, Service, OpeningHour, BusinessImage).

## API ajoutées

- `GET /api/health` → `{ success, data: { status, service, environment, uptime, timestamp, database, databaseName } }`.

## Design system / responsive

- Hors périmètre backend (voir repo `frontend`).

## Tests

- `npm run typecheck` (backend) — OK.
- `npm run lint` (backend et frontend) — OK.
- `npm run build` (frontend) — OK.
- Vérification manuelle : `/api/health` → `database: connected`.
- Proxy Vite `/api → localhost:5000` vérifié (réponse `connected` via `localhost:5173/api/health`).

## Problèmes rencontrés

1. Le scaffold backend d'origine contenait un mauvais package `Express` (capitalisé) et aucun `src/`.
2. `node_modules` du backend était incomplet (module `express` manquant) après une installation interrompue.
3. `Stop-Process -Name node` tuait l'hôte opencode (lui-même sous Node).
4. `eslint.config.js` (CJS) générait un warning Node.
5. `mongod` non détecté / pas de Docker → choix MongoDB Atlas.

## Solutions

1. Réécriture de `backend/package.json`, suppression du mauvais package, configuration TypeScript complète.
2. `npm install` propre relancé (vérifié par `node -e "require('express')..."`).
3. Ciblage des seuls PID des serveurs (`Win32_Process` filtré par ligne de commande).
4. Renommage en `eslint.config.mjs` (pattern CJS).
5. Atlas retenu, connecté avec succès.

## État

✅ Sprint terminé — frontend démarre, backend démarre, MongoDB accessible, Mongoose connecté, `/api/health` fonctionne, design tokens disponibles.