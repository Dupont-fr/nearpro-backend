import { Router } from 'express';
import { getHealth } from './controller';

const healthRouter = Router();

healthRouter.get('/', getHealth);

export { healthRouter };