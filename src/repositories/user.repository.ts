import { Transaction } from 'sequelize';
import { User } from '../database/models/User';
import { Store } from '../database/models/Store';
import { StaffStorePermission } from '../database/models/StaffStorePermission';
import { BaseRepository, BaseRepositoryOptions } from './base.repository';
import { UserRole, Permission } from '../types/database/database.types';

export interface UserCreateData {
  email: string;
  passwordHash: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive?: boolean;
  emailVerified?: boolean;
}

export interface UserUpdateData {
  email?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
}

export interface UserFilterOptions {
  role?: UserRole;
  isActive?: boolean;
  emailVerified?: boolean;
  storeId?: string; // For filtering staff by store
}

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super(User);
  }

  /**
   * Find user by email (for authentication)
   */
  async findByEmail(email: string, options: BaseRepositoryOptions = {}): Promise<User | null> {
    return await this.findOne({ email: email.toLowerCase() }, options);
  }

  /**
   * Find user by email verification token
   */
  async findByEmailVerificationToken(token: string, options: BaseRepositoryOptions = {}): Promise<User | null> {
    return await this.findOne({ emailVerificationToken: token }, options);
  }

  /**
   * Find user by password reset token
   */
  async findByPasswordResetToken(token: string, options: BaseRepositoryOptions = {}): Promise<User | null> {
    return await this.findOne({ 
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    }, options);
  }

  /**
   * Create a new user with email normalization
   */
  async createUser(userData: UserCreateData, options: BaseRepositoryOptions = {}): Promise<User> {
    const normalizedData = {
      ...userData,
      email: userData.email.toLowerCase(),
    };

    return await this.create(normalizedData, { transaction: options.transaction });
  }

  /**
   * Update user password hash
   */
  async updatePassword(userId: string, passwordHash: string, options: BaseRepositoryOptions = {}): Promise<User | null> {
    return await this.update(userId, { passwordHash }, { transaction: options.transaction });
  }

  /**
   * Set email verification token
   */
  async setEmailVerificationToken(userId: string, token: string, options: BaseRepositoryOptions = {}): Promise<User | null> {
    return await this.update(userId, { emailVerificationToken: token }, { transaction: options.transaction });
  }

  /**
   * Verify user email
   */
  async verifyEmail(userId: string, options: BaseRepositoryOptions = {}): Promise<User | null> {
    return await this.update(userId, { 
      emailVerified: true, 
      emailVerificationToken: null 
    }, { transaction: options.transaction });
  }

  /**
   * Set password reset token
   */
  async setPasswordResetToken(
    userId: string, 
    token: string, 
    expiresAt: Date, 
    options: BaseRepositoryOptions = {}
  ): Promise<User | null> {
    return await this.update(userId, { 
      passwordResetToken: token,
      passwordResetExpires: expiresAt
    }, { transaction: options.transaction });
  }

  /**
   * Clear password reset token
   */
  async clearPasswordResetToken(userId: string, options: BaseRepositoryOptions = {}): Promise<User | null> {
    return await this.update(userId, { 
      passwordResetToken: null,
      passwordResetExpires: null
    }, { transaction: options.transaction });
  }

  /**
   * Find users by role
   */
  async findByRole(role: UserRole, options: BaseRepositoryOptions = {}): Promise<User[]> {
    return await this.findAll({
      ...options,
      where: { role, ...(options.where || {}) }
    });
  }

  /**
   * Find active users
   */
  async findActiveUsers(options: BaseRepositoryOptions = {}): Promise<User[]> {
    return await this.findAll({
      ...options,
      where: { isActive: true, ...(options.where || {}) }
    });
  }

  /**
   * Find store owners with their stores
   */
  async findStoreOwners(options: BaseRepositoryOptions = {}): Promise<User[]> {
    return await this.findAll({
      ...options,
      where: { role: UserRole.STORE_OWNER, ...(options.where || {}) },
      include: [
        {
          model: Store,
          as: 'ownedStores',
          required: false,
        },
        ...(options.include || [])
      ]
    });
  }

  /**
   * Find staff members for a specific store
   */
  async findStaffByStore(storeId: string, options: BaseRepositoryOptions = {}): Promise<User[]> {
    return await this.findAll({
      ...options,
      where: { role: UserRole.STAFF, ...(options.where || {}) },
      include: [
        {
          model: StaffStorePermission,
          as: 'staffPermissions',
          where: { storeId, isActive: true },
          required: true,
          include: [
            {
              model: Store,
              as: 'store',
            }
          ]
        },
        ...(options.include || [])
      ]
    });
  }

  /**
   * Find stores accessible by a user (for staff and store owners)
   */
  async findUserStores(userId: string, options: BaseRepositoryOptions = {}): Promise<Store[]> {
    const user = await this.findById(userId, {
      ...options,
      include: [
        {
          model: Store,
          as: 'ownedStores',
          required: false,
        },
        {
          model: Store,
          as: 'workStores',
          through: {
            where: { isActive: true }
          },
          required: false,
        }
      ]
    });

    if (!user) return [];

    const stores: Store[] = [];
    
    // Add owned stores
    if (user.ownedStores) {
      stores.push(...user.ownedStores);
    }

    // Add work stores
    if (user.workStores) {
      stores.push(...user.workStores);
    }

    // Remove duplicates
    const uniqueStores = stores.filter((store, index, self) => 
      index === self.findIndex(s => s.id === store.id)
    );

    return uniqueStores;
  }

  /**
   * Get user permissions for a specific store
   */
  async getUserStorePermissions(userId: string, storeId: string, options: BaseRepositoryOptions = {}): Promise<Permission[]> {
    const user = await this.findById(userId, {
      ...options,
      include: [
        {
          model: StaffStorePermission,
          as: 'staffPermissions',
          where: { storeId, isActive: true },
          required: false,
        },
        {
          model: Store,
          as: 'ownedStores',
          where: { id: storeId },
          required: false,
        }
      ]
    });

    if (!user) return [];

    // Admin has all permissions
    if (user.role === UserRole.ADMIN) {
      return Object.values(Permission);
    }

    // Store owner has all permissions for their stores
    if (user.role === UserRole.STORE_OWNER && user.ownedStores && user.ownedStores.length > 0) {
      return Object.values(Permission);
    }

    // Staff permissions are defined in StaffStorePermission
    if (user.role === UserRole.STAFF && user.staffPermissions && user.staffPermissions.length > 0) {
      return user.staffPermissions[0].permissions || [];
    }

    return [];
  }

  /**
   * Check if user can access a specific store
   */
  async canAccessStore(userId: string, storeId: string, options: BaseRepositoryOptions = {}): Promise<boolean> {
    const user = await this.findById(userId, {
      ...options,
      include: [
        {
          model: Store,
          as: 'ownedStores',
          where: { id: storeId },
          required: false,
        },
        {
          model: StaffStorePermission,
          as: 'staffPermissions',
          where: { storeId, isActive: true },
          required: false,
        }
      ]
    });

    if (!user) return false;

    // Admin can access all stores
    if (user.role === UserRole.ADMIN) return true;

    // Store owner can access their own stores
    if (user.role === UserRole.STORE_OWNER && user.ownedStores && user.ownedStores.length > 0) {
      return true;
    }

    // Staff can access stores they work at
    if (user.role === UserRole.STAFF && user.staffPermissions && user.staffPermissions.length > 0) {
      return true;
    }

    return false;
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(userId: string, options: BaseRepositoryOptions = {}): Promise<User | null> {
    return await this.update(userId, { isActive: false }, { transaction: options.transaction });
  }

  /**
   * Activate user account
   */
  async activateUser(userId: string, options: BaseRepositoryOptions = {}): Promise<User | null> {
    return await this.update(userId, { isActive: true }, { transaction: options.transaction });
  }

  /**
   * Check if user has a specific permission for a store
   */
  async hasStorePermission(userId: string, storeId: string, permission: Permission, options: BaseRepositoryOptions = {}): Promise<boolean> {
    const permissions = await this.getUserStorePermissions(userId, storeId, options);
    return permissions.includes(permission);
  }

  /**
   * Find users with filters
   */
  async findWithFilters(filters: UserFilterOptions, options: BaseRepositoryOptions = {}): Promise<User[]> {
    const where: any = { ...(options.where || {}) };

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.emailVerified !== undefined) {
      where.emailVerified = filters.emailVerified;
    }

    let include = options.include || [];

    // If filtering by store, add the appropriate include
    if (filters.storeId) {
      if (filters.role === UserRole.STAFF) {
        include = [
          {
            model: StaffStorePermission,
            as: 'staffPermissions',
            where: { storeId: filters.storeId, isActive: true },
            required: true,
          },
          ...include
        ];
      } else if (filters.role === UserRole.STORE_OWNER) {
        include = [
          {
            model: Store,
            as: 'ownedStores',
            where: { id: filters.storeId },
            required: true,
          },
          ...include
        ];
      }
    }

    return await this.findAll({
      ...options,
      where,
      include,
    });
  }
}