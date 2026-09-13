import type { NextFunction, Request, Response } from 'express';

/**
 * Protection NoSQL : interdit les opérateurs MongoDB (clés `$...`) dans
 * body/query/params. Seules les CLÉS commençant par `$` sont bloquées :
 * un caractère `$` à l'intérieur d'une valeur (ex. mot de passe « a$b »,
 * prix « 5 $ ») est une donnée légitime et n'est pas inspecté.
 */
function scan(node: unknown): boolean {
  if (Array.isArray(node)) {
    return node.some(scan);
  }
  if (typeof node === 'object' && node !== null) {
    return Object.keys(node as Record<string, unknown>).some(
      (key) => key.startsWith('$') || scan((node as Record<string, unknown>)[key]),
    );
  }
  return false;
}

export function sanitizeNoSql(req: Request, _res: Response, next: NextFunction): void {
  const payload = { body: req.body ?? {}, query: req.query ?? {}, params: req.params ?? {} };

  if (scan(payload)) {
    const error = new Error('Payload invalide');
    (error as { statusCode?: number }).statusCode = 400;
    throw error;
  }

  next();
}