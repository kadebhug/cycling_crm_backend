import { Transaction } from 'sequelize';
import { Store } from '../database/models/Store';
import { User } from '../database/models/User';
import { StaffStorePermission } from '../database/models/StaffStorePermission';
import { BaseRepository, BaseRepositoryOptions } from './base.repository';
import { BusinessHours, Permission, UserRole } from '../types/database/database.types';

export interface StoreCreateData {
  ownerId: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  businessHours?: BusinessHours;
  isActive?: boolean;
}

export interface StoreUpdateData {
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  businessHours?: BusinessHours;
  isActive?: boolean;
}

export interface StaffAssignmentData {
  userId: string;
  storeId: string;
  permissions: Permission[];
  isActive?: boolean;
}

export interface StoreFilterOptions {
  ownerId?: string;
  isActive?: boolean;
  hasStaff?: boolean;
}

export class StoreRepository extends BaseRepository<Store> {
  constructor() {
    super(Store);
  }

  /**
   * Create a new store with owner validation
   */
  async createStore(storeData: StoreCreateData, options: BaseRepositoryOptions = {}): Promise<Store> {
    return await this.create(storeData, { transaction: options.transaction });
  }

  /**
   * Find stores by owner ID
   */
  async findByOwner(ownerId: string, options: BaseRepositoryOptions = {}): Promise<Store[]> {
    return await this.findAll({
      ...options,
      where: { ownerId, ...(options.where || {}) },
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'email', 'firstName', 'lastName', 'role'],
        },
        ...(options.include || [])
      ]
    });
  }

  /**
   * Find store with owner details
   */
  async findWithOwner(storeId: string, options: BaseRepositoryOptions = {}): Promise<Store | null> {
    return await this.findById(storeId, {
      ...options,
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive'],
        },
        ...(options.include || [])
      ]
    });
  }

  /**
   * Find store with staff details
   */
  async findWithStaff(storeId: string, options: BaseRepositoryOptions = {}): Promise<Store | null> {
    return await this.findById(storeId, {
      ...options,
      include: [
        {
          model: User,
          as: 'staff',
          attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive'],
          through: {
            attributes: ['permissions', 'isActive', 'createdAt'],
            where: { isActive: true }
          }
        },
        ...(options.include || [])
      ]
    });
  }

  /**
   * Find store with complete details (owner and staff)
   */
  async findWithDetails(storeId: string, options: BaseRepositoryOptions = {}): Promise<Store | null> {
    return await this.findById(storeId, {
      ...options,
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive'],
        },
        {
          model: User,
          as: 'staff',
          attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive'],
          through: {
            attributes: ['permissions', 'isActive', 'createdAt'],
            where: { isActive: true }
          }
        },
        ...(options.include || [])
      ]
    });
  }

  /**
   * Add staff member to store with permissions
   */
  async addStaffMember(
    storeId: string, 
    userId: string, 
    permissions: Permission[], 
    options: BaseRepositoryOptions = {}
  ): Promise<StaffStorePermission> {
    // First verify the store exists and user is staff
    const store = await this.findById(storeId);
    if (!store) {
      throw new Error('Store not found');
    }

    // Check if staff assignment already exists
    const existingAssignment = await StaffStorePermission.findOne({
      where: { userId, storeId },
      transaction: options.transaction
    });

    if (existingAssignment) {
      // Update existing assignment
      return await existingAssignment.update({
        permissions,
        isActive: true
      }, { transaction: options.transaction });
    }

    // Create new staff assignment
    return await StaffStorePermission.create({
      userId,
      storeId,
      permissions,
      isActive: true
    }, { transaction: options.transaction });
  }

  /**
   * Update staff member permissions
   */
  async updateStaffPermissions(
    storeId: string, 
    userId: string, 
    permissions: Permission[], 
    options: BaseRepositoryOptions = {}
  ): Promise<StaffStorePermission | null> {
    const staffPermission = await StaffStorePermission.findOne({
      where: { userId, storeId },
      transaction: options.transaction
    });

    if (!staffPermission) {
      return null;
    }

    return await staffPermission.update({
      permissions,
      isActive: true
    }, { transaction: options.transaction });
  }

  /**
   * Remove staff member from store
   */
  async removeStaffMember(
    storeId: string, 
    userId: string, 
    options: BaseRepositoryOptions = {}
  ): Promise<boolean> {
    const affectedRows = await StaffStorePermission.update(
      { isActive: false },
      {
        where: { userId, storeId },
        transaction: options.transaction
      }
    );

    return affectedRows[0] > 0;
  }

  /**
   * Get staff members for a store
   */
  async getStaffMembers(storeId: string, options: BaseRepositoryOptions = {}): Promise<User[]> {
    const store = await this.findById(storeId, {
      ...options,
      include: [
        {
          model: User,
          as: 'staff',
          attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive'],
          through: {
            attributes: ['permissions', 'isActive', 'createdAt', 'updatedAt'],
            where: { isActive: true }
          }
        }
      ]
    });

    return store?.staff || [];
  }

  /**
   * Get staff member permissions for a store
   */
  async getStaffPermissions(
    storeId: string, 
    userId: string, 
    options: BaseRepositoryOptions = {}
  ): Promise<Permission[]> {
    const staffPermission = await StaffStorePermission.findOne({
      where: { userId, storeId, isActive: true },
      transaction: options.transaction
    });

    return staffPermission?.permissions || [];
  }

  /**
   * Check if user is staff member of store
   */
  async isStaffMember(
    storeId: string, 
    userId: string, 
    options: BaseRepositoryOptions = {}
  ): Promise<boolean> {
    const count = await StaffStorePermission.count({
      where: { userId, storeId, isActive: true },
      transaction: options.transaction
    });

    return count > 0;
  }

  /**
   * Find active stores
   */
  async findActiveStores(options: BaseRepositoryOptions = {}): Promise<Store[]> {
    return await this.findAll({
      ...options,
      where: { isActive: true, ...(options.where || {}) }
    });
  }

  /**
   * Find stores accessible by user (owned or staff)
   */
  async findAccessibleStores(userId: string, options: BaseRepositoryOptions = {}): Promise<Store[]> {
    // Get user to check role
    const user = await User.findByPk(userId, { transaction: options.transaction });
    if (!user) return [];

    // Admin can access all stores
    if (user.role === UserRole.ADMIN) {
      return await this.findAll(options);
    }

    // Store owners can access their own stores
    if (user.role === UserRole.STORE_OWNER) {
      return await this.findByOwner(userId, options);
    }

    // Staff can access stores they work at
    if (user.role === UserRole.STAFF) {
      return await this.findAll({
        ...options,
        include: [
          {
            model: User,
            as: 'staff',
            where: { id: userId },
            through: {
              where: { isActive: true }
            },
            required: true,
            attributes: []
          },
          ...(options.include || [])
        ]
      });
    }

    return [];
  }

  /**
   * Transfer store ownership
   */
  async transferOwnership(
    storeId: string, 
    newOwnerId: string, 
    options: BaseRepositoryOptions = {}
  ): Promise<Store | null> {
    // Verify new owner exists and is a store owner
    const newOwner = await User.findByPk(newOwnerId, { transaction: options.transaction });
    if (!newOwner || newOwner.role !== UserRole.STORE_OWNER) {
      throw new Error('New owner must be a valid store owner');
    }

    return await this.update(storeId, { ownerId: newOwnerId }, { transaction: options.transaction });
  }

  /**
   * Deactivate store and all staff assignments
   */
  async deactivateStore(storeId: string, options: BaseRepositoryOptions = {}): Promise<Store | null> {
    const transaction = options.transaction;

    // Deactivate the store
    const store = await this.update(storeId, { isActive: false }, { transaction });

    // Deactivate all staff assignments
    await StaffStorePermission.update(
      { isActive: false },
      {
        where: { storeId },
        transaction
      }
    );

    return store;
  }

  /**
   * Activate store
   */
  async activateStore(storeId: string, options: BaseRepositoryOptions = {}): Promise<Store | null> {
    return await this.update(storeId, { isActive: true }, { transaction: options.transaction });
  }

  /**
   * Find stores with filters
   */
  async findWithFilters(filters: StoreFilterOptions, options: BaseRepositoryOptions = {}): Promise<Store[]> {
    const where: any = { ...(options.where || {}) };

    if (filters.ownerId) {
      where.ownerId = filters.ownerId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    let include = options.include || [];

    // Add owner details
    include = [
      {
        model: User,
        as: 'owner',
        attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive'],
      },
      ...include
    ];

    // If filtering by hasStaff, add staff include
    if (filters.hasStaff !== undefined) {
      include.push({
        model: User,
        as: 'staff',
        attributes: ['id'],
        through: {
          where: { isActive: true }
        },
        required: filters.hasStaff
      });
    }

    return await this.findAll({
      ...options,
      where,
      include,
    });
  }

  /**
   * Get store statistics
   */
  async getStoreStats(storeId: string, options: BaseRepositoryOptions = {}): Promise<{
    totalStaff: number;
    activeStaff: number;
    totalServices: number;
    activeServices: number;
  }> {
    const store = await this.findById(storeId, {
      ...options,
      include: [
        {
          model: User,
          as: 'staff',
          attributes: ['id', 'isActive'],
          through: {
            attributes: ['isActive']
          }
        }
      ]
    });

    if (!store) {
      return { totalStaff: 0, activeStaff: 0, totalServices: 0, activeServices: 0 };
    }

    const totalStaff = store.staff?.length || 0;
    const activeStaff = store.staff?.filter(staff => 
      staff.isActive && (staff as any).StaffStorePermission?.isActive
    ).length || 0;

    // Note: Service counts would require Service model import and relationship
    // For now, returning 0 as services will be implemented in later tasks
    return {
      totalStaff,
      activeStaff,
      totalServices: 0,
      activeServices: 0
    };
  }
}