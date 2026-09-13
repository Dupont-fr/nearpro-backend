import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  handleLogin,
  handleLogout,
  handleMe,
  handleRefresh,
  handleRegister,
} from './controller';

const authRouter = Router();

authRouter.post('/register', asyncHandler(handleRegister));
authRouter.post('/login', asyncHandler(handleLogin));
authRouter.post('/logout', requireAuth, asyncHandler(handleLogout));
authRouter.post('/refresh', asyncHandler(handleRefresh));
authRouter.get('/me', requireAuth, asyncHandler(handleMe));

export { authRouter };