import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware } from '../middleware/validation.middleware';

const router = Router();

/**
 * @route POST /auth/login
 * @desc User login
 * @access Public
 */
router.post(
  '/login',
  ValidationMiddleware.sanitize,
  ValidationMiddleware.validate(ValidationMiddleware.schemas.login),
  AuthController.login
);

/**
 * @route POST /auth/register
 * @desc User registration
 * @access Public
 */
router.post(
  '/register',
  ValidationMiddleware.sanitize,
  ValidationMiddleware.validate(ValidationMiddleware.schemas.register),
  AuthController.register
);

/**
 * @route POST /auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post(
  '/refresh',
  ValidationMiddleware.validate(ValidationMiddleware.schemas.refreshToken),
  AuthController.refreshToken
);

/**
 * @route POST /auth/password-reset/request
 * @desc Request password reset
 * @access Public
 */
router.post(
  '/password-reset/request',
  ValidationMiddleware.sanitize,
  ValidationMiddleware.validate(ValidationMiddleware.schemas.passwordResetRequest),
  AuthController.requestPasswordReset
);

/**
 * @route POST /auth/password-reset/confirm
 * @desc Confirm password reset
 * @access Public
 */
router.post(
  '/password-reset/confirm',
  ValidationMiddleware.validate(ValidationMiddleware.schemas.passwordResetConfirm),
  AuthController.confirmPasswordReset
);

/**
 * @route POST /auth/verify-email
 * @desc Verify email address
 * @access Public
 */
router.post(
  '/verify-email',
  ValidationMiddleware.validate(ValidationMiddleware.schemas.emailVerification),
  AuthController.verifyEmail
);

/**
 * @route POST /auth/change-password
 * @desc Change password (requires authentication)
 * @access Private
 */
router.post(
  '/change-password',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validate(ValidationMiddleware.schemas.changePassword),
  AuthController.changePassword
);

/**
 * @route GET /auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get(
  '/profile',
  AuthMiddleware.authenticate,
  AuthController.getProfile
);

/**
 * @route POST /auth/logout
 * @desc User logout
 * @access Private
 */
router.post(
  '/logout',
  AuthMiddleware.authenticate,
  AuthController.logout
);

export { router as authRoutes };