import bcrypt from 'bcryptjs';
import { ApiError } from '../../middlewares/errorHandler';
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { authRepository } from './repository';
import type { LoginInput, RegisterInput } from './schema';
import type { AuthUserDTO, TokenPair, UserRole } from './types';

async function issueTokens(userId: string, role: UserRole): Promise<TokenPair> {
  const tokens: TokenPair = {
    accessToken: signAccessToken({ id: userId, role }),
    refreshToken: signRefreshToken(userId),
  };
  await authRepository.setRefreshTokenHash(userId, hashToken(tokens.refreshToken));
  return tokens;
}

export const authService = {
  async register(input: RegisterInput): Promise<{ user: AuthUserDTO; tokens: TokenPair }> {
    const existing = await authRepository.findByEmail(input.email);
    if (existing) {
      throw new ApiError(409, 'Un compte existe déjà avec cet email');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    try {
      const user = await authRepository.create({ ...input, passwordHash });
      const tokens = await issueTokens(user.id, user.role);
      return { user: user.toDTO(), tokens };
    } catch (err) {
      // Course : deux inscriptions simultanées sur le même email
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code?: number }).code === 11000
      ) {
        throw new ApiError(409, 'Un compte existe déjà avec cet email');
      }
      throw err;
    }
  },

  async login(input: LoginInput): Promise<{ user: AuthUserDTO; tokens: TokenPair }> {
    const user = await authRepository.findByEmail(input.email);
    const passwordOk =
      user && input.password.length > 0
        ? await bcrypt.compare(input.password, user.passwordHash)
        : false;

    if (!user || !passwordOk) {
      throw new ApiError(401, 'Email ou mot de passe incorrect');
    }

    const tokens = await issueTokens(user.id, user.role);
    return { user: user.toDTO(), tokens };
  },

  async refresh(refreshToken: string): Promise<{ user: AuthUserDTO; tokens: TokenPair }> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new ApiError(401, 'Session expirée, veuillez vous reconnecter');
    }

    const user = await authRepository.findByIdForAuth(payload.sub);
    if (!user || user.refreshTokenHash !== hashToken(refreshToken)) {
      throw new ApiError(401, 'Session expirée, veuillez vous reconnecter');
    }

    const tokens = await issueTokens(user.id, user.role);
    return { user: user.toDTO(), tokens };
  },

  async logout(userId?: string): Promise<void> {
    if (userId) {
      await authRepository.clearRefreshTokenHash(userId);
    }
  },

  async me(userId: string): Promise<AuthUserDTO> {
    const user = await authRepository.findByIdForAuth(userId);
    if (!user) {
      throw new ApiError(401, 'Non authentifié');
    }
    return user.toDTO();
  },
};