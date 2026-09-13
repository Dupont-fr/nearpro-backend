# Sprint 1 — Authentification

## Objectif

Créer le système utilisateur : compte, connexion, session JWT sécurisée avec refresh token et contrôle d'accès par rôle.

## Fonctionnalités réalisées (API)

- Modèle Mongoose `User` (`firstName`, `lastName`, `email` unique, `phone`, `passwordHash`, `role`, timestamps).
- `passwordHash` et `refreshTokenHash` stockés avec `select: false` — jamais exposés (spécification §27).
- **Register** : `POST /api/auth/register` (rôles auto-attribuables `CUSTOMER` / `PROFESSIONAL` ; email normalisé).
- **Login** : `POST /api/auth/login` (message générique anti-énumération).
- **Logout** : `POST /api/auth/logout` (protégé) — révoque le refresh côté serveur + efface les cookies.
- **Refresh** : `POST /api/auth/refresh` — rotation du refresh token (`jti` UUID), hash SHA-256 comparé au stockage.
- **Me** : `GET /api/auth/me` (protégé).
- Middlewares : `requireAuth` (cookie HttpOnly ou Bearer), `requireRole(...)` (403 par défaut).
- Cookies **HttpOnly + SameSite=Lax + Secure en prod** : accès 15 min, refresh 7 jours.
- Validation Zod de tous les payloads (registre, connexion) ; réponse d'erreur standard `{success:false,message,errors}`.

## Tests (Vitest + Supertest contre MongoDB Atlas, base dédiée `Nearpro_test`)

- inscription valide : 201, DTO public sans `passwordHash`, cookies posés ;
- email déjà utilisé : 409 ;
- données invalides (email, mot de passe court, rôle `ADMIN` bloqué) : 400 ;
- connexion valide : 200 + cookies ;
- mauvais mot de passe : 401 ;
- email inconnu : 401 avec le même message (pas d'énumération) ;
- refresh : rotation effective des cookies ;
- logout : côtes invalides (expiration 1970) + refresh révoqué → 401 ;
- route protégée sans token : 401 ;
- token invalide : 401 ;
- `CUSTOMER` sur route `ADMIN` : 403.

Résultat : **13/13 verts**, aucun binaire MongoDB téléchargé (Atlas uniquement).

## Choix techniques

- `bcryptjs` (coût 10) — pas de compilation native, compatible Windows/Atlas.
- Le refresh token n'est **jamais stocké en clair** (empreinte SHA-256), rotation à chaque usage.
- `sanitizeNoSql` corrigé : seules les **clés** `$...` sont bloquées ; un caractère `$` dans une valeur (mot de passe, prix) reste une donnée légitime.

## Fichiers principaux

- `src/modules/auth/{model,repository,service,controller,routes,schema,types}.ts`
- `src/middlewares/{requireAuth,requireRole}.ts`
- `src/utils/{jwt,cookies,asyncHandler}.ts`
- `src/types/express.d.ts`
- `tests/auth.test.ts`, `tests/setup.ts`, `vitest.config.ts`

## À noter

- Le JWT d'accès est **stateless** (validité 15 min) : après logout, la révocation réelle passe par le refresh token. Une blacklist d'access tokens pourra être ajoutée si la révocation instantanée devient nécessaire (voir `docs/scale.md`).
- `passwordHash` et refresh token restent à l'écart des réponses API : vérifié par les tests.

## Rapports suivants

- [`sprint-0.md`](sprint-0.md)
- Sprint 2 : catalogue de l'annuaire (voir `docs/roadmap.md`).