import type { NextFunction, Request, Response } from 'express';

/**
 * Protection NoSQL : interdit les opérateurs MongoDB ($) dans body/query/params.
 * Voir section 27 du cahier des charges (protection contre les injections).
 */
function containsNoSqlOperators(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.includes('$'); // escape simple et robuste
  return false;
}

function scan(node: unknown): boolean {
  if (Array.isArray(node)) {
    return node.some(scan);
  }
  if (typeof node === 'object') {
    return Object.keys(node as Record<string, unknown>).some((key) => {
      if (key.startsWith('$')) return true;
      return scan((node as Record<string, unknown>)[key]);
    });
  }
  return containsNoSqlOperators(node);
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