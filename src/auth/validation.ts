import { z, ZodError } from 'zod';

export const APP_ROLES = [
  'gerente', 'administracion', 'supervisor',
  'vendedor', 'reclutadora', 'seguimiento',
] as const;

export type AppRole = typeof APP_ROLES[number];

const strongPassword = z
  .string()
  .min(8,   'Mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Debe tener al menos una mayúscula')
  .regex(/[0-9]/, 'Debe tener al menos un número');

export const loginSchema = z.object({
  email:    z.string().email('Email inválido').toLowerCase(),
  password: z.string().min(1, 'Contraseña requerida'),
});

export const registerSchema = z.object({
  inviteToken:     z.string().min(10, 'Token de invitación inválido'),
  password:        strongPassword,
  nombres:         z.string().min(2, 'Nombre requerido').trim(),
  apellidoPaterno: z.string().min(2, 'Apellido requerido').trim(),
  usuario:         z.string().min(3).trim().optional(),
});

export const inviteSchema = z.object({
  email:   z.string().email('Email inválido').toLowerCase(),
  role:    z.enum(APP_ROLES, { message: 'Rol inválido' }),
  nombres: z.string().trim().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     strongPassword,
});

/** Extrae el primer mensaje de error de un resultado ZodError */
export const zodError = (e: ZodError): string =>
  e.issues[0]?.message ?? 'Datos inválidos';
