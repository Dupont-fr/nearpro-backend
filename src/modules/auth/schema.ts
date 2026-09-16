import { z } from 'zod';

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
    .regex(/^\+?[0-9 ]{9,20}$/, 'Numéro de téléphone invalide')
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