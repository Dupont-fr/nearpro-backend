# Montée en charge — 250+ utilisateurs simultanés

Objectif : tenir **250 utilisateurs simultanés** (voire davantage) avec la stack Node/Express/MongoDB Atlas, à faible coût.

## Pourquoi Node.js suffit ici

Node.js est monothread mais asynchrone : il gère des milliers de connexions **concurrentes** (la grande majorité est en attente réseau, non bloquée). Le goulet n'est pas le nombre de connexions, mais :
- le temps CPU par requête (critique si du calcul lourd par requête → à éviter) ;
- les requêtes MongoDB non indexées/pagées ;
- la latence réseau (Mobile money / GSM Cameroon).

Le vrai levier est : **indexes + pagination + cache + streaming**, puis **multi-cœurs** si le CPU devient le facteur limitant.

## Mesures implémentées

| Levier | Implémentation |
| --- | --- |
| Multi-cœurs | `cluster` (Node.js natif, `src/server.ts`) — un worker par CPU en production (`CLUSTER_ENABLED=true`). Dev monoprocessus. Respawn avec garde anti fork-storm. |
| Compression | `compression` (gzip) sur toutes les réponses `/api`. |
| Rate limiting | `express-rate-limit` par IP sur `/api` (seuils configurables via env). Auth (Sprint 1) aura une limite plus stricte. |
| Pool MongoDB | `maxPoolSize` configurable (`MONGODB_POOL_SIZE`, défaut 50) par worker. |
| Index | Prévoir dès maintenant : `Business.location` (2dsphere), `slug` (unique), `categoryId`, `city`, `status`. |
| Pagination | Toutes les listes paginées (standard `pagination` dans la réponse API). Jamais de listes non bornées. |
| Projections | Agréger `$geoNear` avec projections minimales sur les cartes de recherche. |
| Cache côté client | TanStack Query (déduplication, staleTime) → moins d'appels réseau. |
| Build prod | `NODE_ENV=production`, `npm run build && npm start`. |

## Arithmétique pour 250 utilisateurs simultanés

Scénario moyen : chaque utilisateur actif émet ~1 requête/10 s pendant l'usage.
- 250 utilisateurs ≈ **25 à 50 requêtes/s** en pic.
- Express + MongoDB bien indexé tient ce régime sur **1 worker** typiquement ; le cluster (2–4 workers) apporte la marge et la résilience.
- Atlas : cluster M10+ recommandé en prod (ou un petit cluster dédié) ; M0/M2 suffisent en développement.

Red flag à surveiller (tests de charge plus tard, Sprint 16) :
- `dbOps` élevés, `response` longue → vérifier les indexes et les projections.
- CPU à 100 % sur un worker → augmenter les workers / vérifier le code chaud.

## Configuration recommandée en production

```env
NODE_ENV=production
CLUSTER_ENABLED=true
CLUSTER_WORKERS=0        # 0 = auto (nb de CPU)
MONGODB_POOL_SIZE=50     # par worker
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=1000
```

## Limites connues / évolutions

- Rate limiter en mémoire = **par worker**. En multi-instance (plusieurs machines), passer à un store partagé (Redis) — prévu si nécessaire.
- Le cluster Node ne répartit pas la charge entre machines ; pour >1 machine, mettre un reverse proxy (Nginx) devant les instances.
- Stockage images : utiliser Cloudinary (CDN) et non le serveur app — jamais de gros fichiers via l'API.
- Serveur statique frontend : servir via CDN/Nginx en production.

## Validation future

Au Sprint 16 (tests) / Sprint 17 (déploiement) : test de charge avec **k6 or artillery** :
- 250 utilisateurs virtuels, 10 min ;
- seuils : p95 < 500 ms pour `/api/businesses/search`, 0 % d'erreurs 5xx, taux d'erreur < 0,1 %.