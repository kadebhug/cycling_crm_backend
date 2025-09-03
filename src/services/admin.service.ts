import { Transaction } from 'sequelize';
import { UserRepository } from '../repositories/user.repository';
import { StoreRepository } from '../repositories/store.repository';
import { User } from '../database/models/User';
import { Store } from '../database/models/Store';
import { UserRole } from '../types/database/database.types';
import { PasswordUtils } from '../utils/password';
import { sequelize } from '../config/database';

export interface CreateStoreOwnerData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  storeName: string;
  storeDescription?: string;
  storeAddress?: string;
  storePhone?: string;
  storeEmail?: string;
}

export interface UpdateStoreOwnerData {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive?: boolean;
  storeName?: string;
  storeDescription?: string;
  storeAddress?: string;
  storePhone?: string;
  storeEmail?: string;
}

export interface StoreOwnerWithStore {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  store: {
    id: string;
    name: string;
    description: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

export class AdminService {
  private userRepository: UserRepository;
  private storeRepository: StoreRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.storeRepository = new StoreRepository();
  }

  /**
   * Create a new store owner with associated store
   */
  async createStoreOwner(data: CreateStoreOwnerData): Promise<StoreOwnerWithStore> {
    const transaction = await sequelize.transaction();

    try {
      // Check if email already exists
      const existingUser = await this.userRepository.findByEmail(data.email, { transaction });
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const passwordHash = await PasswordUtils.hashPassword(data.password);

      // Create store owner user
      const storeOwner = await this.userRepository.createUser({
        email: data.email,
        passwordHash,
        role: UserRole.STORE_OWNER,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        isActive: true,
        emailVerified: false, // Will need email verification
      }, { transaction });

      // Create associated store
      const store = await this.storeRepository.createStore({
        ownerId: storeOwner.id,
        name: data.storeName,
        description: data.storeDescription,
        address: data.storeAddress,
        phone: data.storePhone,
        email: data.storeEmail,
        isActive: true,
      }, { transaction });

      await transaction.commit();

      return {
        id: storeOwner.id,
        email: storeOwner.email,
        firstName: storeOwner.firstName,
        lastName: storeOwner.lastName,
        phone: storeOwner.phone,
        isActive: storeOwner.isActive,
        emailVerified: storeOwner.emailVerified,
        createdAt: storeOwner.createdAt,
        updatedAt: storeOwner.updatedAt,
        store: {
          id: store.id,
          name: store.name,
          description: store.description,
          address: store.address,
          phone: store.phone,
          email: store.email,
          isActive: store.isActive,
          createdAt: store.createdAt,
          updatedAt: store.updatedAt,
        },
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get all store owners with their stores
   */
  async getAllStoreOwners(): Promise<StoreOwnerWithStore[]> {
    const storeOwners = await this.userRepository.findStoreOwners({
      include: [
        {
          model: Store,
          as: 'ownedStores',
          required: false,
        }
      ]
    });

    return storeOwners.map(owner => ({
      id: owner.id,
      email: owner.email,
      firstName: owner.firstName,
      lastName: owner.lastName,
      phone: owner.phone,
      isActive: owner.isActive,
      emailVerified: owner.emailVerified,
      createdAt: owner.createdAt,
      updatedAt: owner.updatedAt,
      store: owner.ownedStores && owner.ownedStores.length > 0 ? {
        id: owner.ownedStores[0].id,
        name: owner.ownedStores[0].name,
        description: owner.ownedStores[0].description,
        address: owner.ownedStores[0].address,
        phone: owner.ownedStores[0].phone,
        email: owner.ownedStores[0].email,
        isActive: owner.ownedStores[0].isActive,
        createdAt: owner.ownedStores[0].createdAt,
        updatedAt: owner.ownedStores[0].updatedAt,
      } : null,
    }));
  }

  /**
   * Get a specific store owner by ID with their store
   */
  async getStoreOwnerById(id: string): Promise<StoreOwnerWithStore | null> {
    const storeOwner = await this.userRepository.findById(id, {
      include: [
        {
          model: Store,
          as: 'ownedStores',
          required: false,
        }
      ]
    });

    if (!storeOwner || storeOwner.role !== UserRole.STORE_OWNER) {
      return null;
    }

    return {
      id: storeOwner.id,
      email: storeOwner.email,
      firstName: storeOwner.firstName,
      lastName: storeOwner.lastName,
      phone: storeOwner.phone,
      isActive: storeOwner.isActive,
      emailVerified: storeOwner.emailVerified,
      createdAt: storeOwner.createdAt,
      updatedAt: storeOwner.updatedAt,
      store: storeOwner.ownedStores && storeOwner.ownedStores.length > 0 ? {
        id: storeOwner.ownedStores[0].id,
        name: storeOwner.ownedStores[0].name,
        description: storeOwner.ownedStores[0].description,
        address: storeOwner.ownedStores[0].address,
        phone: storeOwner.ownedStores[0].phone,
        email: storeOwner.ownedStores[0].email,
        isActive: storeOwner.ownedStores[0].isActive,
        createdAt: storeOwner.ownedStores[0].createdAt,
        updatedAt: storeOwner.ownedStores[0].updatedAt,
      } : null,
    };
  }

  /**
   * Update a store owner and their store information
   */
  async updateStoreOwner(id: string, data: UpdateStoreOwnerData): Promise<StoreOwnerWithStore | null> {
    const transaction = await sequelize.transaction();

    try {
      // Check if store owner exists
      const existingStoreOwner = await this.userRepository.findById(id, { transaction });
      if (!existingStoreOwner || existingStoreOwner.role !== UserRole.STORE_OWNER) {
        await transaction.rollback();
        return null;
      }

      // Check if email is being changed and if it's already taken
      if (data.email && data.email !== existingStoreOwner.email) {
        const emailExists = await this.userRepository.findByEmail(data.email, { transaction });
        if (emailExists) {
          throw new Error('Email is already in use by another user');
        }
      }

      // Update user data
      const userUpdateData: any = {};
      if (data.email) userUpdateData.email = data.email;
      if (data.firstName !== undefined) userUpdateData.firstName = data.firstName;
      if (data.lastName !== undefined) userUpdateData.lastName = data.lastName;
      if (data.phone !== undefined) userUpdateData.phone = data.phone;
      if (data.isActive !== undefined) userUpdateData.isActive = data.isActive;

      let updatedUser = existingStoreOwner;
      if (Object.keys(userUpdateData).length > 0) {
        const updateResult = await this.userRepository.update(id, userUpdateData, { transaction });
        if (!updateResult) {
          throw new Error('Failed to update store owner');
        }
        updatedUser = updateResult;
      }

      // Update store data if provided
      let updatedStore = null;
      const storeUpdateData: any = {};
      if (data.storeName) storeUpdateData.name = data.storeName;
      if (data.storeDescription !== undefined) storeUpdateData.description = data.storeDescription;
      if (data.storeAddress !== undefined) storeUpdateData.address = data.storeAddress;
      if (data.storePhone !== undefined) storeUpdateData.phone = data.storePhone;
      if (data.storeEmail !== undefined) storeUpdateData.email = data.storeEmail;

      if (Object.keys(storeUpdateData).length > 0) {
        // Find the store owned by this user
        const stores = await this.storeRepository.findByOwner(id, { transaction });
        if (stores.length > 0) {
          updatedStore = await this.storeRepository.update(stores[0].id, storeUpdateData, { transaction });
        }
      } else {
        // Get existing store data
        const stores = await this.storeRepository.findByOwner(id, { transaction });
        if (stores.length > 0) {
          updatedStore = stores[0];
        }
      }

      await transaction.commit();

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        isActive: updatedUser.isActive,
        emailVerified: updatedUser.emailVerified,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        store: updatedStore ? {
          id: updatedStore.id,
          name: updatedStore.name,
          description: updatedStore.description,
          address: updatedStore.address,
          phone: updatedStore.phone,
          email: updatedStore.email,
          isActive: updatedStore.isActive,
          createdAt: updatedStore.createdAt,
          updatedAt: updatedStore.updatedAt,
        } : null,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Deactivate a store owner and their store
   */
  async deactivateStoreOwner(id: string): Promise<StoreOwnerWithStore | null> {
    const transaction = await sequelize.transaction();

    try {
      // Check if store owner exists
      const existingStoreOwner = await this.userRepository.findById(id, { transaction });
      if (!existingStoreOwner || existingStoreOwner.role !== UserRole.STORE_OWNER) {
        await transaction.rollback();
        return null;
      }

      // Deactivate the user
      const updatedUser = await this.userRepository.deactivateUser(id, { transaction });
      if (!updatedUser) {
        throw new Error('Failed to deactivate store owner');
      }

      // Deactivate their store(s)
      const stores = await this.storeRepository.findByOwner(id, { transaction });
      let updatedStore = null;
      if (stores.length > 0) {
        updatedStore = await this.storeRepository.deactivateStore(stores[0].id, { transaction });
      }

      await transaction.commit();

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        isActive: updatedUser.isActive,
        emailVerified: updatedUser.emailVerified,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        store: updatedStore ? {
          id: updatedStore.id,
          name: updatedStore.name,
          description: updatedStore.description,
          address: updatedStore.address,
          phone: updatedStore.phone,
          email: updatedStore.email,
          isActive: updatedStore.isActive,
          createdAt: updatedStore.createdAt,
          updatedAt: updatedStore.updatedAt,
        } : null,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Activate a store owner and their store
   */
  async activateStoreOwner(id: string): Promise<StoreOwnerWithStore | null> {
    const transaction = await sequelize.transaction();

    try {
      // Check if store owner exists
      const existingStoreOwner = await this.userRepository.findById(id, { transaction });
      if (!existingStoreOwner || existingStoreOwner.role !== UserRole.STORE_OWNER) {
        await transaction.rollback();
        return null;
      }

      // Activate the user
      const updatedUser = await this.userRepository.activateUser(id, { transaction });
      if (!updatedUser) {
        throw new Error('Failed to activate store owner');
      }

      // Activate their store(s)
      const stores = await this.storeRepository.findByOwner(id, { transaction });
      let updatedStore = null;
      if (stores.length > 0) {
        updatedStore = await this.storeRepository.activateStore(stores[0].id, { transaction });
      }

      await transaction.commit();

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        isActive: updatedUser.isActive,
        emailVerified: updatedUser.emailVerified,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        store: updatedStore ? {
          id: updatedStore.id,
          name: updatedStore.name,
          description: updatedStore.description,
          address: updatedStore.address,
          phone: updatedStore.phone,
          email: updatedStore.email,
          isActive: updatedStore.isActive,
          createdAt: updatedStore.createdAt,
          updatedAt: updatedStore.updatedAt,
        } : null,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete a store owner and their store (soft delete by deactivation)
   */
  async deleteStoreOwner(id: string): Promise<boolean> {
    // For safety, we'll use deactivation instead of hard delete
    const result = await this.deactivateStoreOwner(id);
    return result !== null;
  }

  /**
   * Get store owner statistics
   */
  async getStoreOwnerStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    withStores: number;
    withoutStores: number;
  }> {
    const allStoreOwners = await this.userRepository.findByRole(UserRole.STORE_OWNER);
    const activeStoreOwners = allStoreOwners.filter(owner => owner.isActive);
    const inactiveStoreOwners = allStoreOwners.filter(owner => !owner.isActive);

    // Get store owners with stores
    const storeOwnersWithStores = await this.userRepository.findStoreOwners({
      include: [
        {
          model: Store,
          as: 'ownedStores',
          required: true,
        }
      ]
    });

    return {
      total: allStoreOwners.length,
      active: activeStoreOwners.length,
      inactive: inactiveStoreOwners.length,
      withStores: storeOwnersWithStores.length,
      withoutStores: allStoreOwners.length - storeOwnersWithStores.length,
    };
  }
}