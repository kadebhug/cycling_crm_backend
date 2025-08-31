import { User, StaffStorePermission } from '../database/models';
import { JWTUtils, TokenPayload } from '../utils/jwt';
import { PasswordUtils } from '../utils/password';
import { 
  LoginCredentials, 
  RegisterData, 
  AuthResult, 
  AuthenticatedUser,
  PasswordResetRequest,
  PasswordResetConfirm,
  ChangePasswordRequest,
  TokenValidationResult,
  AuthenticationError,
  AuthorizationError,
  PasswordValidationError
} from '../types/auth.types';
import { UserRole, Permission } from '../types/database/database.types';

export class AuthService {
  /**
   * Authenticate user with email and password
   */
  static async login(credentials: LoginCredentials): Promise<AuthResult> {
    const { email, password } = credentials;

    if (!email || !password) {
      throw new AuthenticationError('Email and password are required', 'MISSING_CREDENTIALS');
    }

    // Find user by email
    const user = await User.findOne({
      where: { email: email.toLowerCase() },
      include: [
        {
          association: 'ownedStores',
          required: false,
        },
        {
          association: 'staffPermissions',
          required: false,
          where: { isActive: true },
          include: [{
            association: 'store',
            required: false,
          }],
        },
      ],
    });

    if (!user) {
      throw new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AuthenticationError('Account is deactivated', 'ACCOUNT_DEACTIVATED');
    }

    // Verify password
    const isPasswordValid = await PasswordUtils.verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Generate tokens
    const tokenPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    // Add store context for staff
    if (user.role === UserRole.STAFF && user.staffPermissions && user.staffPermissions.length > 0) {
      // For staff with multiple stores, we'll use the first one as default
      // In a real application, you might want to handle this differently
      tokenPayload.storeId = user.staffPermissions[0].storeId;
    }

    const tokens = JWTUtils.generateTokens(tokenPayload);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  /**
   * Register a new user
   */
  static async register(userData: RegisterData): Promise<AuthResult> {
    const { email, password, firstName, lastName, phone, role } = userData;

    if (!email || !password) {
      throw new AuthenticationError('Email and password are required', 'MISSING_CREDENTIALS');
    }

    // Validate password strength
    const passwordValidation = PasswordUtils.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new PasswordValidationError('Password does not meet requirements', passwordValidation.errors);
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new AuthenticationError('User with this email already exists', 'EMAIL_ALREADY_EXISTS');
    }

    // Hash password
    const passwordHash = await PasswordUtils.hashPassword(password);

    // Generate email verification token
    const emailVerificationToken = JWTUtils.generateEmailVerificationToken('temp', email);

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      role,
      firstName: firstName || null,
      lastName: lastName || null,
      phone: phone || null,
      isActive: true,
      emailVerified: false,
      emailVerificationToken,
    });

    // Generate tokens
    const tokenPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const tokens = JWTUtils.generateTokens(tokenPayload);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<AuthResult> {
    if (!refreshToken) {
      throw new AuthenticationError('Refresh token is required', 'MISSING_REFRESH_TOKEN');
    }

    // Verify refresh token
    const decoded = JWTUtils.verifyRefreshToken(refreshToken);

    // Find user
    const user = await User.findByPk(decoded.userId, {
      include: [
        {
          association: 'staffPermissions',
          required: false,
          where: { isActive: true },
        },
      ],
    });

    if (!user) {
      throw new AuthenticationError('User not found', 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account is deactivated', 'ACCOUNT_DEACTIVATED');
    }

    // Generate new tokens
    const tokenPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    // Add store context for staff
    if (user.role === UserRole.STAFF && user.staffPermissions && user.staffPermissions.length > 0) {
      tokenPayload.storeId = user.staffPermissions[0].storeId;
    }

    const tokens = JWTUtils.generateTokens(tokenPayload);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  /**
   * Validate access token and return user information
   */
  static async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      const decoded = JWTUtils.verifyAccessToken(token);
      
      const user = await User.findByPk(decoded.userId);
      if (!user || !user.isActive) {
        return {
          isValid: false,
          error: 'User not found or inactive',
        };
      }

      return {
        isValid: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
        },
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Token validation failed',
      };
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(request: PasswordResetRequest): Promise<void> {
    const { email } = request;

    const user = await User.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists or not
      return;
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account is deactivated', 'ACCOUNT_DEACTIVATED');
    }

    // Generate password reset token
    const resetToken = JWTUtils.generatePasswordResetToken(user.id, user.email);
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update user with reset token
    await user.update({
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
    });

    // In a real application, you would send an email here
    // For now, we'll just log the token (remove in production)
    console.log(`Password reset token for ${email}: ${resetToken}`);
  }

  /**
   * Confirm password reset with token
   */
  static async confirmPasswordReset(request: PasswordResetConfirm): Promise<void> {
    const { token, newPassword } = request;

    // Validate new password
    const passwordValidation = PasswordUtils.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new PasswordValidationError('Password does not meet requirements', passwordValidation.errors);
    }

    // Verify reset token
    const decoded = JWTUtils.verifyPasswordResetToken(token);

    // Find user and verify token matches
    const user = await User.findOne({
      where: {
        id: decoded.userId,
        email: decoded.email,
        passwordResetToken: token,
      },
    });

    if (!user) {
      throw new AuthenticationError('Invalid or expired reset token', 'INVALID_RESET_TOKEN');
    }

    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new AuthenticationError('Reset token has expired', 'RESET_TOKEN_EXPIRED');
    }

    // Hash new password
    const passwordHash = await PasswordUtils.hashPassword(newPassword);

    // Update user password and clear reset token
    await user.update({
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
    });
  }

  /**
   * Change user password (requires current password)
   */
  static async changePassword(userId: string, request: ChangePasswordRequest): Promise<void> {
    const { currentPassword, newPassword } = request;

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AuthenticationError('User not found', 'USER_NOT_FOUND');
    }

    // Verify current password
    const isCurrentPasswordValid = await PasswordUtils.verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new AuthenticationError('Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
    }

    // Validate new password
    const passwordValidation = PasswordUtils.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new PasswordValidationError('Password does not meet requirements', passwordValidation.errors);
    }

    // Check if new password is different from current
    const isSamePassword = await PasswordUtils.verifyPassword(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new AuthenticationError('New password must be different from current password', 'SAME_PASSWORD');
    }

    // Hash new password
    const passwordHash = await PasswordUtils.hashPassword(newPassword);

    // Update user password
    await user.update({ passwordHash });
  }

  /**
   * Verify email with verification token
   */
  static async verifyEmail(token: string): Promise<void> {
    try {
      const decoded = JWTUtils.verifyEmailVerificationToken(token);

      const user = await User.findOne({
        where: {
          id: decoded.userId,
          email: decoded.email,
          emailVerificationToken: token,
        },
      });

      if (!user) {
        throw new AuthenticationError('Invalid verification token', 'INVALID_VERIFICATION_TOKEN');
      }

      if (user.emailVerified) {
        throw new AuthenticationError('Email is already verified', 'EMAIL_ALREADY_VERIFIED');
      }

      // Update user as verified
      await user.update({
        emailVerified: true,
        emailVerificationToken: null,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('expired')) {
        throw new AuthenticationError('Verification token has expired', 'VERIFICATION_TOKEN_EXPIRED');
      }
      throw error;
    }
  }

  /**
   * Get user permissions for a specific store
   */
  static async getUserStorePermissions(userId: string, storeId: string): Promise<Permission[]> {
    const user = await User.findByPk(userId, {
      include: [
        {
          association: 'ownedStores',
          where: { id: storeId },
          required: false,
        },
        {
          association: 'staffPermissions',
          where: { storeId, isActive: true },
          required: false,
        },
      ],
    });

    if (!user) {
      return [];
    }

    // Admin has all permissions
    if (user.role === UserRole.ADMIN) {
      return Object.values(Permission);
    }

    // Store owners have all permissions for their stores
    if (user.role === UserRole.STORE_OWNER && user.ownedStores && user.ownedStores.length > 0) {
      return Object.values(Permission);
    }

    // Staff have specific permissions
    if (user.role === UserRole.STAFF && user.staffPermissions && user.staffPermissions.length > 0) {
      return user.staffPermissions[0].permissions;
    }

    return [];
  }
}