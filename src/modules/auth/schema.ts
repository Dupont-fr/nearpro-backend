import { z } from 'zod';

const CAMEROON_MOBILE_REGEX = /^6[5-9]\d{7}$/;

// Accepte "+237 690 00 00 00" ou "6 90 00 00 00" ; refuse 6 11 11 11 11, 7 00 00 00 00, 6 22 22 99 99…
function isCameroonMobile(value: string): boolean {
  const digits = value.replace(/[\s+]/g, '');
  const local = digits.startsWith('237') ? digits.slice(3) : digits;
  return CAMEROON_MOBILE_REGEX.test(local);
}

export const registerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(60, 'Le prénom est trop long'),
  lastName: z
    .string()
    .trim()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(60, 'Le nom est trop long'),
  email: z.string().trim().toLowerCase().email("L'adresse email est invalide").max(254),
  phone: z
    .string()
    .refine(isCameroonMobile, 'Numéro de mobile camerounais invalide (ex : 6 90 00 00 00)')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(72, 'Le mot de passe est trop long')
    .superRefine((value, ctx) => {
      if (!/[A-Z]/.test(value)) {
        ctx.addIssue({
          code: 'custom',
          path: ['password'],
          message: 'Le mot de passe doit contenir une majuscule',
        });
      }
      if (!/[a-z]/.test(value)) {
        ctx.addIssue({
          code: 'custom',
          path: ['password'],
          message: 'Le mot de passe doit contenir une minuscule',
        });
      }
      if (!(/\d/.test(value) || /[^A-Za-z0-9]/.test(value))) {
        ctx.addIssue({
          code: 'custom',
          path: ['password'],
          message: 'Le mot de passe doit contenir un chiffre ou un caractère spécial',
        });
      }
    }),
  role: z.enum(['CUSTOMER', 'PROFESSIONAL']).default('CUSTOMER'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("L'adresse email est invalide"),
  password: z.string().min(1, 'Le mot de passe est requis').max(72),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;