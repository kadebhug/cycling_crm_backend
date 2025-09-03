import { AdminService, CreateStoreOwnerData, UpdateStoreOwnerData } from '../services/admin.service';
import { UserRepository } from '../repositories/user.repository';
import { StoreRepository } from '../repositories/store.repository';
import { UserRole } from '../types/database/database.types';
import { PasswordUtils } from '../utils/password';

// Mock the repositories
jest.mock('../repositories/user.repository');
jest.mock('../repositories/store.repository');
jest.mock('../utils/password', () => ({
  PasswordUtils: {
    hashPassword: jest.fn(),
  },
}));
jest.mock('../config/database', () => ({
  sequelize: {
    transaction: jest.fn(() => ({
      commit: jest.fn(),
      rollback: jest.fn(),
    })),
  },
}));

const MockedUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;
const MockedStoreRepository = StoreRepository as jest.MockedClass<typeof StoreRepository>;

describe('Admin Service', () => {
  let adminService: AdminService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockStoreRepository: jest.Mocked<StoreRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instances
    mockUserRepository = new MockedUserRepository() as jest.Mocked<UserRepository>;
    mockStoreRepository = new MockedStoreRepository() as jest.Mocked<StoreRepository>;
    
    // Mock the constructor calls
    MockedUserRepository.mockImplementation(() => mockUserRepository);
    MockedStoreRepository.mockImplementation(() => mockStoreRepository);
    
    adminService = new AdminService();
  });

  describe('createStoreOwner', () => {
    it('should create a new store owner with store', async () => {
      const storeOwnerData: CreateStoreOwnerData = {
        email: 'owner@test.com',
        password: 'password123',
        firstName: 'Store',
        lastName: 'Owner',
        phone: '123-456-7890',
        storeName: 'Test Bike Shop',
        storeDescription: 'A test bike shop',
        storeAddress: '123 Test St',
        storePhone: '098-765-4321',
        storeEmail: 'shop@test.com',
      };

      const mockUser = {
        id: 'user-id',
        email: 'owner@test.com',
        firstName: 'Store',
        lastName: 'Owner',
        phone: '123-456-7890',
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockStore = {
        id: 'store-id',
        name: 'Test Bike Shop',
        description: 'A test bike shop',
        address: '123 Test St',
        phone: '098-765-4321',
        email: 'shop@test.com',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock repository methods
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.createUser.mockResolvedValue(mockUser as any);
      mockStoreRepository.createStore.mockResolvedValue(mockStore as any);
      (PasswordUtils.hashPassword as jest.Mock).mockResolvedValue('hashed-password');

      const result = await adminService.createStoreOwner(storeOwnerData);

      expect(result.email).toBe(storeOwnerData.email);
      expect(result.firstName).toBe(storeOwnerData.firstName);
      expect(result.store?.name).toBe(storeOwnerData.storeName);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('owner@test.com', expect.any(Object));
      expect(mockUserRepository.createUser).toHaveBeenCalled();
      expect(mockStoreRepository.createStore).toHaveBeenCalled();
    });

    it('should throw error for duplicate email', async () => {
      const storeOwnerData: CreateStoreOwnerData = {
        email: 'owner@test.com',
        password: 'password123',
        storeName: 'Test Shop',
      };

      const existingUser = { id: 'existing-id', email: 'owner@test.com' };
      mockUserRepository.findByEmail.mockResolvedValue(existingUser as any);

      await expect(adminService.createStoreOwner(storeOwnerData)).rejects.toThrow('User with this email already exists');
    });
  });

  describe('getAllStoreOwners', () => {
    it('should return all store owners', async () => {
      const mockStoreOwners = [
        {
          id: 'owner1-id',
          email: 'owner1@test.com',
          firstName: 'Owner',
          lastName: 'One',
          phone: null,
          isActive: true,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          ownedStores: [{
            id: 'store1-id',
            name: 'Shop One',
            description: null,
            address: null,
            phone: null,
            email: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }],
        },
        {
          id: 'owner2-id',
          email: 'owner2@test.com',
          firstName: 'Owner',
          lastName: 'Two',
          phone: null,
          isActive: true,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          ownedStores: [],
        },
      ];

      mockUserRepository.findStoreOwners.mockResolvedValue(mockStoreOwners as any);

      const result = await adminService.getAllStoreOwners();

      expect(result).toHaveLength(2);
      expect(result[0].store).toBeTruthy();
      expect(result[0].store?.name).toBe('Shop One');
      expect(result[1].store).toBeNull();
      expect(mockUserRepository.findStoreOwners).toHaveBeenCalled();
    });
  });

  describe('getStoreOwnerById', () => {
    it('should return specific store owner', async () => {
      const mockStoreOwner = {
        id: 'owner-id',
        email: 'owner@test.com',
        firstName: 'Store',
        lastName: 'Owner',
        phone: null,
        role: UserRole.STORE_OWNER,
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ownedStores: [{
          id: 'store-id',
          name: 'Test Shop',
          description: 'A test shop',
          address: null,
          phone: null,
          email: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      };

      mockUserRepository.findById.mockResolvedValue(mockStoreOwner as any);

      const result = await adminService.getStoreOwnerById('owner-id');

      expect(result).toBeTruthy();
      expect(result?.id).toBe('owner-id');
      expect(result?.email).toBe('owner@test.com');
      expect(result?.store?.name).toBe('Test Shop');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('owner-id', expect.any(Object));
    });

    it('should return null for non-existent store owner', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await adminService.getStoreOwnerById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return null for non-store-owner user', async () => {
      const mockUser = {
        id: 'user-id',
        role: UserRole.CUSTOMER,
      };

      mockUserRepository.findById.mockResolvedValue(mockUser as any);

      const result = await adminService.getStoreOwnerById('user-id');

      expect(result).toBeNull();
    });
  });

  describe('updateStoreOwner', () => {
    it('should update store owner and store information', async () => {
      const existingOwner = {
        id: 'owner-id',
        email: 'owner@test.com',
        role: UserRole.STORE_OWNER,
        firstName: 'Store',
        lastName: 'Owner',
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedOwner = {
        ...existingOwner,
        firstName: 'Updated',
        lastName: 'Owner',
      };

      const existingStore = {
        id: 'store-id',
        name: 'Old Shop Name',
        description: 'Old description',
        address: null,
        phone: null,
        email: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedStore = {
        ...existingStore,
        name: 'New Shop Name',
        description: 'New description',
      };

      const updateData: UpdateStoreOwnerData = {
        firstName: 'Updated',
        lastName: 'Owner',
        storeName: 'New Shop Name',
        storeDescription: 'New description',
      };

      mockUserRepository.findById.mockResolvedValue(existingOwner as any);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.update.mockResolvedValue(updatedOwner as any);
      mockStoreRepository.findByOwner.mockResolvedValue([existingStore] as any);
      mockStoreRepository.update.mockResolvedValue(updatedStore as any);

      const result = await adminService.updateStoreOwner('owner-id', updateData);

      expect(result).toBeTruthy();
      expect(result?.firstName).toBe('Updated');
      expect(result?.store?.name).toBe('New Shop Name');
      expect(result?.store?.description).toBe('New description');
    });

    it('should return null for non-existent store owner', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await adminService.updateStoreOwner('non-existent-id', {});

      expect(result).toBeNull();
    });

    it('should throw error for duplicate email', async () => {
      const existingOwner = {
        id: 'owner-id',
        email: 'owner@test.com',
        role: UserRole.STORE_OWNER,
      };

      const existingEmailUser = {
        id: 'other-id',
        email: 'other@test.com',
      };

      mockUserRepository.findById.mockResolvedValue(existingOwner as any);
      mockUserRepository.findByEmail.mockResolvedValue(existingEmailUser as any);

      await expect(adminService.updateStoreOwner('owner-id', { email: 'other@test.com' }))
        .rejects.toThrow('Email is already in use by another user');
    });
  });

  describe('deactivateStoreOwner', () => {
    it('should deactivate store owner and their store', async () => {
      const existingOwner = {
        id: 'owner-id',
        email: 'owner@test.com',
        role: UserRole.STORE_OWNER,
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const deactivatedOwner = {
        ...existingOwner,
        isActive: false,
      };

      const existingStore = {
        id: 'store-id',
        name: 'Test Shop',
        description: null,
        address: null,
        phone: null,
        email: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const deactivatedStore = {
        ...existingStore,
        isActive: false,
      };

      mockUserRepository.findById.mockResolvedValue(existingOwner as any);
      mockUserRepository.deactivateUser.mockResolvedValue(deactivatedOwner as any);
      mockStoreRepository.findByOwner.mockResolvedValue([existingStore] as any);
      mockStoreRepository.deactivateStore.mockResolvedValue(deactivatedStore as any);

      const result = await adminService.deactivateStoreOwner('owner-id');

      expect(result).toBeTruthy();
      expect(result?.isActive).toBe(false);
      expect(result?.store?.isActive).toBe(false);
    });
  });

  describe('activateStoreOwner', () => {
    it('should activate store owner and their store', async () => {
      const existingOwner = {
        id: 'owner-id',
        email: 'owner@test.com',
        role: UserRole.STORE_OWNER,
        isActive: false,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const activatedOwner = {
        ...existingOwner,
        isActive: true,
      };

      const existingStore = {
        id: 'store-id',
        name: 'Test Shop',
        description: null,
        address: null,
        phone: null,
        email: null,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const activatedStore = {
        ...existingStore,
        isActive: true,
      };

      mockUserRepository.findById.mockResolvedValue(existingOwner as any);
      mockUserRepository.activateUser.mockResolvedValue(activatedOwner as any);
      mockStoreRepository.findByOwner.mockResolvedValue([existingStore] as any);
      mockStoreRepository.activateStore.mockResolvedValue(activatedStore as any);

      const result = await adminService.activateStoreOwner('owner-id');

      expect(result).toBeTruthy();
      expect(result?.isActive).toBe(true);
      expect(result?.store?.isActive).toBe(true);
    });
  });

  describe('getStoreOwnerStats', () => {
    it('should return store owner statistics', async () => {
      const allStoreOwners = [
        { id: '1', isActive: true },
        { id: '2', isActive: false },
        { id: '3', isActive: true },
      ];

      const storeOwnersWithStores = [
        { id: '1' },
      ];

      mockUserRepository.findByRole.mockResolvedValue(allStoreOwners as any);
      mockUserRepository.findStoreOwners.mockResolvedValue(storeOwnersWithStores as any);

      const result = await adminService.getStoreOwnerStats();

      expect(result.total).toBe(3);
      expect(result.active).toBe(2);
      expect(result.inactive).toBe(1);
      expect(result.withStores).toBe(1);
      expect(result.withoutStores).toBe(2);
    });
  });
});