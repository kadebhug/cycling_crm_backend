import { Transaction } from 'sequelize';
import { User } from '../database/models/User';
import { Store } from '../database/models/Store';
import { StaffStorePermission } from '../database/models/StaffStorePermission';
import { UserRepository } from '../repositories/user.repository';
import { StoreRepository } from '../repositories/store.repository';
import { UserRole, Permission } from '../types/database/database.types';
import { PasswordUtils } from '../utils/password';
import { logger } from '../utils/logger';

export interface CreateStaffData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  permissions: Permission[];
}

export interface UpdateStaffData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive?: boolean;
}

export interface UpdateStaffPermissionsData {
  permissions: Permission[];
}

export interface StaffWithPermissions extends User {
  storePermissions?: StaffStorePermission;
}

export class StaffService {
  private userRepository: UserRepository;
  private storeRepository: StoreRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.storeRepository = new StoreRepository();
  }

  /**
   * Create a new staff member and assign them to a store with permissions
   */
  async createStaff(
    storeId: string,
    staffData: CreateStaffData,
    transaction?: Transaction
  ): Promise<StaffWithPermissions> {
    try {
      // Check if store exists and is active
      const store = await this.storeRepository.findById(storeId, { transaction });
      if (!store) {
        throw new Error('Store not found');
      }

      if (!store.isActive) {
        throw new Error('Cannot add staff to inactive store');
      }

      // Check if email is already in use
      const existingUser = await this.userRepository.findByEmail(staffData.email, { transaction });
      if (existingUser) {
        throw new Error('Email address is already in use');
      }

      // Validate permissions
      this.validatePermissions(staffData.permissions);

      // Hash password
      const passwordHash = await PasswordUtils.hashPassword(staffData.password);

      // Create staff user
      const staffUser = await this.userRepository.createUser({
        email: staffData.email,
        passwordHash,
        role: UserRole.STAFF,
        firstName: staffData.firstName,
        lastName: staffData.lastName,
        phone: staffData.phone,
        isActive: true,
        emailVerified: false, // Staff will need to verify their email
      }, { transaction });

      // Create staff store permissions
      const staffPermission = await StaffStorePermission.create({
        userId: staffUser.id,
        storeId: storeId,
        permissions: staffData.permissions,
        isActive: true,
      }, { transaction });

      // Return staff with permissions
      const staffWithPermissions = staffUser as StaffWithPermissions;
      staffWithPermissions.storePermissions = staffPermission;

      logger.info(`Staff member created: ${staffUser.email} for store ${storeId}`, {
        staffId: staffUser.id,
        storeId,
        permissions: staffData.permissions,
      });

      return staffWithPermissions;
    } catch (error) {
      logger.error('Error creating staff member:', error);
      throw error;
    }
  }

  /**
   * Get all staff members for a store
   */
  async getStoreStaff(storeId: string, transaction?: Transaction): Promise<StaffWithPermissions[]> {
    try {
      const staff = await this.userRepository.findStaffByStore(storeId, {
        transaction,
        include: [
          {
            model: StaffStorePermission,
            as: 'staffPermissions',
            where: { storeId, isActive: true },
            required: true,
          }
        ]
      });

      return staff.map(staffMember => {
        const staffWithPermissions = staffMember as StaffWithPermissions;
        staffWithPermissions.storePermissions = staffMember.staffPermissions?.[0];
        return staffWithPermissions;
      });
    } catch (error) {
      logger.error('Error fetching store staff:', error);
      throw error;
    }
  }

  /**
   * Get a specific staff member by ID for a store
   */
  async getStaffById(
    storeId: string,
    staffId: string,
    transaction?: Transaction
  ): Promise<StaffWithPermissions | null> {
    try {
      const staffMember = await this.userRepository.findById(staffId, {
        transaction,
        include: [
          {
            model: StaffStorePermission,
            as: 'staffPermissions',
            where: { storeId, isActive: true },
            required: true,
          }
        ]
      });

      if (!staffMember || staffMember.role !== UserRole.STAFF) {
        return null;
      }

      const staffWithPermissions = staffMember as StaffWithPermissions;
      staffWithPermissions.storePermissions = staffMember.staffPermissions?.[0];

      return staffWithPermissions;
    } catch (error) {
      logger.error('Error fetching staff member:', error);
      throw error;
    }
  }

  /**
   * Update staff member information
   */
  async updateStaff(
    storeId: string,
    staffId: string,
    updateData: UpdateStaffData,
    transaction?: Transaction
  ): Promise<StaffWithPermissions | null> {
    try {
      // Verify staff member exists and belongs to the store
      const existingStaff = await this.getStaffById(storeId, staffId, transaction);
      if (!existingStaff) {
        throw new Error('Staff member not found or does not belong to this store');
      }

      // Update user information
      const updatedUser = await this.userRepository.update(staffId, updateData, { transaction });
      if (!updatedUser) {
        throw new Error('Failed to update staff member');
      }

      // Get updated staff with permissions
      const updatedStaff = await this.getStaffById(storeId, staffId, transaction);

      logger.info(`Staff member updated: ${updatedUser.email}`, {
        staffId,
        storeId,
        updateData,
      });

      return updatedStaff;
    } catch (error) {
      logger.error('Error updating staff member:', error);
      throw error;
    }
  }

  /**
   * Update staff member permissions for a store
   */
  async updateStaffPermissions(
    storeId: string,
    staffId: string,
    permissionsData: UpdateStaffPermissionsData,
    transaction?: Transaction
  ): Promise<StaffWithPermissions | null> {
    try {
      // Verify staff member exists and belongs to the store
      const existingStaff = await this.getStaffById(storeId, staffId, transaction);
      if (!existingStaff) {
        throw new Error('Staff member not found or does not belong to this store');
      }

      // Validate permissions
      this.validatePermissions(permissionsData.permissions);

      // Update permissions
      const staffPermission = await StaffStorePermission.findOne({
        where: {
          userId: staffId,
          storeId: storeId,
          isActive: true,
        },
        transaction,
      });

      if (!staffPermission) {
        throw new Error('Staff store permissions not found');
      }

      staffPermission.permissions = permissionsData.permissions;
      await staffPermission.save({ transaction });

      // Get updated staff with permissions
      const updatedStaff = await this.getStaffById(storeId, staffId, transaction);

      logger.info(`Staff permissions updated: ${existingStaff.email}`, {
        staffId,
        storeId,
        permissions: permissionsData.permissions,
      });

      return updatedStaff;
    } catch (error) {
      logger.error('Error updating staff permissions:', error);
      throw error;
    }
  }

  /**
   * Remove staff member from a store (deactivate their permissions)
   */
  async removeStaffFromStore(
    storeId: string,
    staffId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    try {
      // Verify staff member exists and belongs to the store
      const existingStaff = await this.getStaffById(storeId, staffId, transaction);
      if (!existingStaff) {
        throw new Error('Staff member not found or does not belong to this store');
      }

      // Deactivate staff store permissions
      const staffPermission = await StaffStorePermission.findOne({
        where: {
          userId: staffId,
          storeId: storeId,
          isActive: true,
        },
        transaction,
      });

      if (!staffPermission) {
        throw new Error('Staff store permissions not found');
      }

      staffPermission.isActive = false;
      await staffPermission.save({ transaction });

      // Check if staff member has permissions for other stores
      const otherPermissions = await StaffStorePermission.findAll({
        where: {
          userId: staffId,
          isActive: true,
        },
        transaction,
      });

      // If no other store permissions, deactivate the user account
      if (otherPermissions.length === 0) {
        await this.userRepository.deactivateUser(staffId, { transaction });
      }

      logger.info(`Staff member removed from store: ${existingStaff.email}`, {
        staffId,
        storeId,
        userDeactivated: otherPermissions.length === 0,
      });

      return true;
    } catch (error) {
      logger.error('Error removing staff from store:', error);
      throw error;
    }
  }

  /**
   * Add existing staff member to another store
   */
  async addStaffToStore(
    storeId: string,
    staffId: string,
    permissions: Permission[],
    transaction?: Transaction
  ): Promise<StaffWithPermissions | null> {
    try {
      // Check if store exists and is active
      const store = await this.storeRepository.findById(storeId, { transaction });
      if (!store) {
        throw new Error('Store not found');
      }

      if (!store.isActive) {
        throw new Error('Cannot add staff to inactive store');
      }

      // Check if user exists and is a staff member
      const user = await this.userRepository.findById(staffId, { transaction });
      if (!user || user.role !== UserRole.STAFF) {
        throw new Error('User not found or is not a staff member');
      }

      // Check if staff member is already assigned to this store
      const existingPermission = await StaffStorePermission.findOne({
        where: {
          userId: staffId,
          storeId: storeId,
        },
        transaction,
      });

      if (existingPermission) {
        if (existingPermission.isActive) {
          throw new Error('Staff member is already assigned to this store');
        } else {
          // Reactivate existing permission
          existingPermission.isActive = true;
          existingPermission.permissions = permissions;
          await existingPermission.save({ transaction });
        }
      } else {
        // Create new permission
        await StaffStorePermission.create({
          userId: staffId,
          storeId: storeId,
          permissions: permissions,
          isActive: true,
        }, { transaction });
      }

      // Activate user if they were deactivated
      if (!user.isActive) {
        await this.userRepository.activateUser(staffId, { transaction });
      }

      // Get updated staff with permissions
      const updatedStaff = await this.getStaffById(storeId, staffId, transaction);

      logger.info(`Staff member added to store: ${user.email}`, {
        staffId,
        storeId,
        permissions,
      });

      return updatedStaff;
    } catch (error) {
      logger.error('Error adding staff to store:', error);
      throw error;
    }
  }

  /**
   * Get all stores where a staff member works
   */
  async getStaffStores(staffId: string, transaction?: Transaction): Promise<Store[]> {
    try {
      const user = await this.userRepository.findById(staffId, {
        transaction,
        include: [
          {
            model: StaffStorePermission,
            as: 'staffPermissions',
            where: { isActive: true },
            required: false,
            include: [
              {
                model: Store,
                as: 'store',
                where: { isActive: true },
                required: true,
              }
            ]
          }
        ]
      });

      if (!user || user.role !== UserRole.STAFF) {
        return [];
      }

      return user.staffPermissions?.map(permission => permission.store).filter(Boolean) || [];
    } catch (error) {
      logger.error('Error fetching staff stores:', error);
      throw error;
    }
  }

  /**
   * Get staff member permissions for a specific store
   */
  async getStaffPermissions(
    storeId: string,
    staffId: string,
    transaction?: Transaction
  ): Promise<Permission[]> {
    try {
      const staffPermission = await StaffStorePermission.findOne({
        where: {
          userId: staffId,
          storeId: storeId,
          isActive: true,
        },
        transaction,
      });

      return staffPermission ? staffPermission.permissions : [];
    } catch (error) {
      logger.error('Error fetching staff permissions:', error);
      throw error;
    }
  }

  /**
   * Validate permissions array
   */
  private validatePermissions(permissions: Permission[]): void {
    if (!Array.isArray(permissions)) {
      throw new Error('Permissions must be an array');
    }

    if (permissions.length === 0) {
      throw new Error('At least one permission is required');
    }

    const validPermissions = Object.values(Permission);
    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));

    if (invalidPermissions.length > 0) {
      throw new Error(`Invalid permissions: ${invalidPermissions.join(', ')}`);
    }

    // Remove duplicates
    const uniquePermissions = [...new Set(permissions)];
    if (uniquePermissions.length !== permissions.length) {
      throw new Error('Duplicate permissions are not allowed');
    }
  }

  /**
   * Get default permissions for new staff members
   */
  static getDefaultStaffPermissions(): Permission[] {
    return StaffStorePermission.getDefaultStaffPermissions();
  }

  /**
   * Get default permissions for senior staff members
   */
  static getDefaultSeniorStaffPermissions(): Permission[] {
    return StaffStorePermission.getDefaultSeniorStaffPermissions();
  }

  /**
   * Get all available permissions
   */
  static getAllPermissions(): Permission[] {
    return StaffStorePermission.getAllPermissions();
  }
}