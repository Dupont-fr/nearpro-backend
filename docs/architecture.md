# Architecture — Backend

## Structure

```
src/
├── config/          # env (Zod) + connexion MongoDB
├── middlewares/     # errorHandler, sanitizeNoSql, rateLimiter
├── utils/
├── modules/         # un dossier par domaine
│   └── health/
│       ├── controller.ts
│       └── routes.ts
├── app.ts           # création de l'app Express (helmet, cors, json, compression)
└── server.ts        # démarrage : connexion DB puis listen (+ cluster en prod)
```

Pipeline d'une requête :

```
HTTP Request → Route → Middleware → Controller → Service → Repository → Mongoose Model → MongoDB
```

Le découpage Service/Repository est introduit dès le premier module métier (Sprint 1+).

## Modules métier prévus

```
modules/
├── auth/            # inscription, connexion, JWT, refresh
├── users/
├── businesses/
├── categories/
├── services/
├── opening-hours/
├── reviews/
├── subscriptions/
├── analytics/
├── admin/
└── health/
```

Chaque module suit autant que possible : `controller.ts / service.ts / repository.ts / model.ts / routes.ts / schema.ts / types.ts`.

## Configuration

- `config/env.ts` : variables d'environnement validées avec Zod (échec rapide si manquantes).
- `config/database.ts` : connexion Mongoose + options de pool (voir `docs/scale.md`).

## Conventions

- Réponses API au format standard : `{ success, data }` / `{ success: false, message, errors }`, pagination standardisée.
- Erreurs gérées via `middlewares/errorHandler.ts` (ZodError → 400, ApiError → code dédié, défaut → 500).
- Protection NoSQL (`sanitizeNoSql`) activée globalement.