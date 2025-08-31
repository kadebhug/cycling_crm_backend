// Authentication validation schemas

import Joi from 'joi';
import { passwordSchema, emailSchema } from './common.validators';

export const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required(),
});

export const registerSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  role: Joi.string().valid('customer', 'staff', 'manager', 'admin').default('customer'),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: passwordSchema,
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
});
