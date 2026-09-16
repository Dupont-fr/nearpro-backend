# Sprint 2 — Catégories

## Objectif (prompt.md §30)

Système de catégories avec sous-catégories (`parentId`), CRUD réservé à l'ADMIN,
lecture publique, et préchargement des catégories de référence.

## Module `categories`

`src/modules/categories/{model,repository,service,controller,routes,schema,types}.ts`
suivant le pipeline Route → Middleware → Controller → Service → Repository → Modèle.

### Routes

| Méthode | Route | Protection | Description |
| --- | --- | --- | --- |
| GET | `/api/categories` | publique | Arbre des catégories actives (enfants imbriqués) |
| GET | `/api/categories/:slug` | publique | Catégorie + sous-catégories |
| POST | `/api/categories` | ADMIN | Créer (slug auto, accents translittérés) |
| PATCH | `/api/categories/:id` | ADMIN | Modifier (recalcul du slug, hiérarchie) |
| DELETE | `/api/categories/:id` | ADMIN | Supprimer (refus si enfants) |

### Règles métier

- **Slug** : généré depuis le nom (accent-libre : `Beauté` → `beaute`), unique.
- **Hiérarchie** : sous-catégories via `parentId`, **2 niveaux maximum** ; une
  catégorie ne peut pas être son propre parent ni re-créer une boucle
  (parent interdit s'il descend de la catégorie).
- **Suppression** : interdite si des sous-catégories existent (409).
- **Désactivation** (`isActive`) : rend une catégorie invisible en public sans la détruire.
- **Duplicatas** : index uniques Mongoose (`slug`, `name`) + interception E11000 → 409.
- Identifiants invalides (`parentId`, `:id`) → 400 ; inexistants → 404.

## Seed (`npm run seed`)

- Compte **ADMIN** (impossible à créer via `/register`), identifiants depuis
  `ADMIN_EMAIL` / `ADMIN_PASSWORD` (défauts : `admin@nearpro.cm`,
  `AdminNearPro!2026` — à changer hors dev).
- 8 catégories de référence (Automobile, Beauté, Alimentation, Maison,
  Technologie, Commerce, Mode, Services) + leurs sous-catégories.
- Idempotent (upsert par slug).

## Tests

`tests/categories.test.ts` (17 tests) — lecture publique, création/rôles
(401 invité, 403 CUSTOMER), hiérarchie (enfants, parent introuvable, 3ᵉ niveau refusé,
boucle refusée), modification (slug recalculé, désactivation), suppression
(409 avec enfants, 200 feuille, 404 inconnue/inexistante).

`vitest.config.ts` : `fileParallelism: false` — les suites partagent la base
`Nearpro_test` et se vident (`dropDatabase`), l'exécution doit être séquentielle.

**Résultat : 30/30 tests verts** (13 auth + 17 catégories).

## Démarrage

```bash
npm run seed   # un coup, après installation
```

- Comptes-rendus précédents : [`sprint-1.md`](sprint-1.md)
- Sprint suivant : `Sprint 3 — Création d'activité` (voir `docs/roadmap.md`).