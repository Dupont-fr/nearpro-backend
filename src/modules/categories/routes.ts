import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { requireRole } from '../../middlewares/requireRole';
import { asyncHandler } from '../../utils/asyncHandler';
import { categoryController } from './controller';

const categoriesRouter = Router();

// Lecture publique
categoriesRouter.get('/', asyncHandler(categoryController.list));
categoriesRouter.get('/:slug', asyncHandler(categoryController.getBySlug));

// Administration (réservé ADMIN)
categoriesRouter.post('/', requireAuth, requireRole('ADMIN'), asyncHandler(categoryController.create));
categoriesRouter.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(categoryController.update),
);
categoriesRouter.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(categoryController.remove),
);

export { categoriesRouter };