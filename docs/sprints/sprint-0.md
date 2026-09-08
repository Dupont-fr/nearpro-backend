# Sprint 0 — Analyse et initialisation

## Objectif

Préparer le projet : infrastructure, architecture, design system de base, connectivité frontend ↔ backend ↔ MongoDB, sans fonctionnalité métier.

## Fonctionnalités réalisées

- Repository initialisé (Git, branche `main`).
- `frontend/` : Vite + React 19 + TypeScript + Tailwind CSS v4.
- `backend/` : Node.js + TypeScript + Express + Mongoose.
- Endpoint `GET /api/health` opérationnel.
- Connexion MongoDB Atlas validée (base `Nearpro`).
- Design tokens (`src/styles/tokens.css`) et mapping Tailwind (`@theme inline`).
- Base du design system (`components/ui/`) : Button, Input, Textarea, Select, Badge, Card, Spinner, Skeleton.
- Configuration ESLint + Prettier (frontend et backend).
- `.env.example`, `.gitignore`, `README.md`, `docs/` (architecture, design-system, roadmap).

## Fichiers principaux

- `backend/src/config/{env,database}.ts`, `backend/src/middlewares/{errorHandler,sanitizeNoSql}.ts`, `backend/src/modules/health/{controller,routes}.ts`, `backend/src/{app,server}.ts`, `backend/tsconfig.json`.
- `frontend/src/styles/tokens.css`, `frontend/src/index.css`, `frontend/src/routes/index.tsx`, `frontend/src/main.tsx`, `frontend/src/layouts/PublicLayout/index.tsx`, `frontend/src/pages/HomePage.tsx`, `frontend/src/components/ui/*`.
- Racine : `.gitignore`, `README.md`, `docs/*`.

## Base de données

- MongoDB Atlas (`mongodb+srv://.../Nearpro`), connectée via Mongoose.
- Pas encore de schémas : modèles prévus pour le Sprint 1 (User) et Sprint 3 (Business, Service, OpeningHour, BusinessImage).

## API ajoutées

- `GET /api/health` → `{ success, data: { status, service, environment, uptime, timestamp, database, databaseName } }`.

## Design system / responsive

- Tokens complétés et mappés Tailwind : palette, ombres, rayons, espacements, typographie.
- Composants de base développés dans `components/ui/` (aucun style ad hoc).
- Page d'accueil Sprint 0 conçue mobile-first et vérifiée en build (320px → 2560px à repasser en Sprint 7).

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