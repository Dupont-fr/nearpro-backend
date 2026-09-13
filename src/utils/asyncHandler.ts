import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Enveloppe les contrôleurs async : les erreurs partent vers next() → errorHandler. */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}