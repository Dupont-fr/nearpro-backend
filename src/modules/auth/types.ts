export const USER_ROLES = ['CUSTOMER', 'PROFESSIONAL', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SELF_REGISTER_ROLES: readonly UserRole[] = ['CUSTOMER', 'PROFESSIONAL'];

export interface AuthUserPayload {
  id: string;
  role: UserRole;
}

export interface AuthUserDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}