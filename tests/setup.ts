// Avant tout import du backend : NODE_ENV=test pour un comportement connu,
// et les variables réelles (MONGODB_URI, JWT…) sont lues depuis backend/.env
// par src/config/env.ts (dotenv). Sans .env, le backend refuse de démarrer.
process.env.NODE_ENV = 'test';