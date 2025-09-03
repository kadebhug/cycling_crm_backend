import { StaffService } from '../services/staff.service';
import { UserRepository } from '../repositories/user.repository';
import { StoreRepository } from '../repositories/store.repository';
import { User } from '../database/models/User';
import { Store } from '../database/models/Store';
import { StaffStorePermission } from '../database/models/StaffStorePermission';
import { UserRole, Permission } from '../types/database/database.types';
import { PasswordUtils } from '../utils/password';

// Mock dependencies
jest.mock('../repositories/user.repository');
jest.mock('../repositories/store.repository');
jest.mock('../database/models/User');
jest.mock('../database/models/Store');
jest.mock('../database/models/StaffStorePermission');
jest.mock('../utils/password');
jest.mock('../utils/logger');

describe('StaffService', () => {
  let staffService: StaffService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockStoreRepository: jest.Mocked<StoreRepository>;

  const mockStore = {
    id: 'store-123',
    name: 'Test Store',
    isActive: true,
    ownerId: 'owner-123',
  } as any;

  const mockStaffUser = {
    id: 'staff-123',
    email: 'staff@test.com',
    role: UserRole.STAFF,
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    isActive: true,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockStaffPermission = {
    id: 'permission-123',
    userId: 'staff-123',
    storeId: 'store-123',
    permissions: [Permission.VIEW_SERVICES, Permission.VIEW_SERVICE_REQUESTS],
    isActive: true,
    hasPermission: jest.fn(),
    save: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    mockStoreRepository = new StoreRepository() as jest.Mocked<StoreRepository>;
    
    staffService = new StaffService();
    (staffService as any).userRepository = mockUserRepository;
    (staffService as any).storeRepository = mockStoreRepository;
  });

  describe('createStaff', () => {
    const createStaffData = {
      email: 'newstaff@test.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+1987654321',
      permissions: [Permission.VIEW_SERVICES, Permission.VIEW_SERVICE_REQUESTS],
    };

    beforeEach(() => {
      mockStoreRepository.findById.mockResolvedValue(mockStore);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      (PasswordUtils.hashPassword as jest.Mock).mockResolvedValue('hashedPassword');
      mockUserRepository.createUser.mockResolvedValue(mockStaffUser);
      (StaffStorePermission.create as jest.Mock).mockResolvedValue(mockStaffPermission);
    });

    it('should create a new staff member successfully', async () => {
      const result = await staffService.createStaff('store-123', createStaffData);

      expect(mockStoreRepository.findById).toHaveBeenCalledWith('store-123', { transaction: undefined });
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('newstaff@test.com', { transaction: undefined });
      expect(PasswordUtils.hashPassword).toHaveBeenCalledWith('password123');
      expect(mockUserRepository.createUser).toHaveBeenCalledWith({
        email: 'newstaff@test.com',
        passwordHash: 'hashedPassword',
        role: UserRole.STAFF,
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1987654321',
        isActive: true,
        emailVerified: false,
      }, { transaction: undefined });
      expect(StaffStorePermission.create).toHaveBeenCalledWith({
        userId: 'staff-123',
        storeId: 'store-123',
        permissions: createStaffData.permissions,
        isActive: true,
      }, { transaction: undefined });
      expect(result.storePermissions).toBe(mockStaffPermission);
    });

    it('should throw error if store not found', async () => {
      mockStoreRepository.findById.mockResolvedValue(null);

      await expect(staffService.createStaff('store-123', createStaffData))
        .rejects.toThrow('Store not found');
    });

    it('should throw error if store is inactive', async () => {
      mockStoreRepository.findById.mockResolvedValue({ ...mockStore, isActive: false } as any);

      await expect(staffService.createStaff('store-123', createStaffData))
        .rejects.toThrow('Cannot add staff to inactive store');
    });

    it('should throw error if email already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockStaffUser as any);

      await expect(staffService.createStaff('store-123', createStaffData))
        .rejects.toThrow('Email address is already in use');
    });

    it('should throw error for invalid permissions', async () => {
      const invalidData = { ...createStaffData, permissions: ['invalid_permission' as any] };

      await expect(staffService.createStaff('store-123', invalidData))
        .rejects.toThrow('Invalid permissions');
    });

    it('should throw error for empty permissions', async () => {
      const invalidData = { ...createStaffData, permissions: [] };

      await expect(staffService.createStaff('store-123', invalidData))
        .rejects.toThrow('At least one permission is required');
    });
  });

  describe('getStoreStaff', () => {
    beforeEach(() => {
      const staffWithPermissions = {
        ...mockStaffUser,
        staffPermissions: [mockStaffPermission],
      } as any;
      mockUserRepository.findStaffByStore.mockResolvedValue([staffWithPermissions]);
    });

    it('should return staff members for a store', async () => {
      const result = await staffService.getStoreStaff('store-123');

      expect(mockUserRepository.findStaffByStore).toHaveBeenCalledWith('store-123', {
        transaction: undefined,
        include: [
          {
            model: StaffStorePermission,
            as: 'staffPermissions',
            where: { storeId: 'store-123', isActive: true },
            required: true,
          }
        ]
      });
      expect(result).toHaveLength(1);
      expect(result[0].storePermissions).toBe(mockStaffPermission);
    });
  });

  describe('getStaffById', () => {
    beforeEach(() => {
      const staffWithPermissions = {
        ...mockStaffUser,
        staffPermissions: [mockStaffPermission],
      } as any;
      mockUserRepository.findById.mockResolvedValue(staffWithPermissions);
    });

    it('should return staff member by ID', async () => {
      const result = await staffService.getStaffById('store-123', 'staff-123');

      expect(mockUserRepository.findById).toHaveBeenCalledWith('staff-123', {
        transaction: undefined,
        include: [
          {
            model: StaffStorePermission,
            as: 'staffPermissions',
            where: { storeId: 'store-123', isActive: true },
            required: true,
          }
        ]
      });
      expect(result?.storePermissions).toBe(mockStaffPermission);
    });

    it('should return null if staff not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await staffService.getStaffById('store-123', 'staff-123');

      expect(result).toBeNull();
    });

    it('should return null if user is not staff', async () => {
      const nonStaffUser = { ...mockStaffUser, role: UserRole.CUSTOMER } as any;
      mockUserRepository.findById.mockResolvedValue(nonStaffUser);

      const result = await staffService.getStaffById('store-123', 'staff-123');

      expect(result).toBeNull();
    });
  });

  describe('updateStaff', () => {
    const updateData = {
      firstName: 'Updated',
      lastName: 'Name',
      phone: '+1111111111',
      isActive: true,
    };

    beforeEach(() => {
      const staffWithPermissions = {
        ...mockStaffUser,
        storePermissions: mockStaffPermission,
      } as any;
      jest.spyOn(staffService, 'getStaffById')
        .mockResolvedValueOnce(staffWithPermissions)
        .mockResolvedValueOnce({ ...staffWithPermissions, ...updateData } as any);
      mockUserRepository.update.mockResolvedValue({ ...mockStaffUser, ...updateData } as any);
    });

    it('should update staff member successfully', async () => {
      const result = await staffService.updateStaff('store-123', 'staff-123', updateData);

      expect(mockUserRepository.update).toHaveBeenCalledWith('staff-123', updateData, { transaction: undefined });
      expect(result?.firstName).toBe('Updated');
      expect(result?.lastName).toBe('Name');
    });

    it('should throw error if staff not found', async () => {
      jest.spyOn(staffService, 'getStaffById').mockResolvedValueOnce(null);

      await expect(staffService.updateStaff('store-123', 'staff-123', updateData))
        .rejects.toThrow('Staff member not found or does not belong to this store');
    });
  });

  describe('updateStaffPermissions', () => {
    const permissionsData = {
      permissions: [Permission.VIEW_SERVICES, Permission.CREATE_QUOTATIONS],
    };

    beforeEach(() => {
      const staffWithPermissions = {
        ...mockStaffUser,
        storePermissions: mockStaffPermission,
      } as any;
      jest.spyOn(staffService, 'getStaffById')
        .mockResolvedValueOnce(staffWithPermissions)
        .mockResolvedValueOnce(staffWithPermissions);
      (StaffStorePermission.findOne as jest.Mock).mockResolvedValue(mockStaffPermission);
    });

    it('should update staff permissions successfully', async () => {
      const result = await staffService.updateStaffPermissions('store-123', 'staff-123', permissionsData);

      expect(StaffStorePermission.findOne).toHaveBeenCalledWith({
        where: {
          userId: 'staff-123',
          storeId: 'store-123',
          isActive: true,
        },
        transaction: undefined,
      });
      expect(mockStaffPermission.permissions).toBe(permissionsData.permissions);
      expect(mockStaffPermission.save).toHaveBeenCalledWith({ transaction: undefined });
      expect(result).toBeDefined();
    });

    it('should throw error if staff not found', async () => {
      jest.spyOn(staffService, 'getStaffById').mockResolvedValueOnce(null);

      await expect(staffService.updateStaffPermissions('store-123', 'staff-123', permissionsData))
        .rejects.toThrow('Staff member not found or does not belong to this store');
    });

    it('should throw error if permissions not found', async () => {
      const staffWithPermissions = {
        ...mockStaffUser,
        storePermissions: mockStaffPermission,
      } as any;
      jest.spyOn(staffService, 'getStaffById').mockResolvedValueOnce(staffWithPermissions);
      (StaffStorePermission.findOne as jest.Mock).mockResolvedValue(null);

      await expect(staffService.updateStaffPermissions('store-123', 'staff-123', permissionsData))
        .rejects.toThrow('Staff store permissions not found');
    });
  });

  describe('removeStaffFromStore', () => {
    beforeEach(() => {
      const staffWithPermissions = {
        ...mockStaffUser,
        storePermissions: mockStaffPermission,
      } as any;
      jest.spyOn(staffService, 'getStaffById').mockResolvedValueOnce(staffWithPermissions);
      (StaffStorePermission.findOne as jest.Mock).mockResolvedValue(mockStaffPermission);
      (StaffStorePermission.findAll as jest.Mock).mockResolvedValue([]);
      mockUserRepository.deactivateUser.mockResolvedValue(mockStaffUser as any);
    });

    it('should remove staff from store successfully', async () => {
      const result = await staffService.removeStaffFromStore('store-123', 'staff-123');

      expect(mockStaffPermission.isActive).toBe(false);
      expect(mockStaffPermission.save).toHaveBeenCalledWith({ transaction: undefined });
      expect(mockUserRepository.deactivateUser).toHaveBeenCalledWith('staff-123', { transaction: undefined });
      expect(result).toBe(true);
    });

    it('should not deactivate user if they have other store permissions', async () => {
      (StaffStorePermission.findAll as jest.Mock).mockResolvedValue([mockStaffPermission]);

      const result = await staffService.removeStaffFromStore('store-123', 'staff-123');

      expect(mockUserRepository.deactivateUser).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should throw error if staff not found', async () => {
      jest.spyOn(staffService, 'getStaffById').mockResolvedValueOnce(null);

      await expect(staffService.removeStaffFromStore('store-123', 'staff-123'))
        .rejects.toThrow('Staff member not found or does not belong to this store');
    });
  });

  describe('addStaffToStore', () => {
    const permissions = [Permission.VIEW_SERVICES, Permission.VIEW_SERVICE_REQUESTS];

    beforeEach(() => {
      mockStoreRepository.findById.mockResolvedValue(mockStore);
      mockUserRepository.findById.mockResolvedValue(mockStaffUser);
      (StaffStorePermission.findOne as jest.Mock).mockResolvedValue(null);
      (StaffStorePermission.create as jest.Mock).mockResolvedValue(mockStaffPermission);
      const staffWithPermissions = {
        ...mockStaffUser,
        storePermissions: mockStaffPermission,
      } as any;
      jest.spyOn(staffService, 'getStaffById').mockResolvedValueOnce(staffWithPermissions);
    });

    it('should add existing staff to store successfully', async () => {
      const result = await staffService.addStaffToStore('store-123', 'staff-123', permissions);

      expect(mockStoreRepository.findById).toHaveBeenCalledWith('store-123', { transaction: undefined });
      expect(mockUserRepository.findById).toHaveBeenCalledWith('staff-123', { transaction: undefined });
      expect(StaffStorePermission.create).toHaveBeenCalledWith({
        userId: 'staff-123',
        storeId: 'store-123',
        permissions: permissions,
        isActive: true,
      }, { transaction: undefined });
      expect(result?.storePermissions).toBe(mockStaffPermission);
    });

    it('should reactivate existing inactive permission', async () => {
      const inactivePermission = { ...mockStaffPermission, isActive: false, save: jest.fn() };
      (StaffStorePermission.findOne as jest.Mock).mockResolvedValue(inactivePermission);

      const result = await staffService.addStaffToStore('store-123', 'staff-123', permissions);

      expect(inactivePermission.isActive).toBe(true);
      expect(inactivePermission.permissions).toBe(permissions);
      expect(inactivePermission.save).toHaveBeenCalledWith({ transaction: undefined });
      expect(result).toBeDefined();
    });

    it('should throw error if store not found', async () => {
      mockStoreRepository.findById.mockResolvedValue(null);

      await expect(staffService.addStaffToStore('store-123', 'staff-123', permissions))
        .rejects.toThrow('Store not found');
    });

    it('should throw error if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(staffService.addStaffToStore('store-123', 'staff-123', permissions))
        .rejects.toThrow('User not found or is not a staff member');
    });

    it('should throw error if user is not staff', async () => {
      const nonStaffUser = { ...mockStaffUser, role: UserRole.CUSTOMER } as any;
      mockUserRepository.findById.mockResolvedValue(nonStaffUser);

      await expect(staffService.addStaffToStore('store-123', 'staff-123', permissions))
        .rejects.toThrow('User not found or is not a staff member');
    });

    it('should throw error if staff already assigned to store', async () => {
      (StaffStorePermission.findOne as jest.Mock).mockResolvedValue(mockStaffPermission);

      await expect(staffService.addStaffToStore('store-123', 'staff-123', permissions))
        .rejects.toThrow('Staff member is already assigned to this store');
    });
  });

  describe('getStaffStores', () => {
    beforeEach(() => {
      const userWithStores = {
        ...mockStaffUser,
        staffPermissions: [
          {
            ...mockStaffPermission,
            store: mockStore,
          }
        ],
      } as any;
      mockUserRepository.findById.mockResolvedValue(userWithStores);
    });

    it('should return stores where staff works', async () => {
      const result = await staffService.getStaffStores('staff-123');

      expect(mockUserRepository.findById).toHaveBeenCalledWith('staff-123', {
        transaction: undefined,
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
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockStore);
    });

    it('should return empty array if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await staffService.getStaffStores('staff-123');

      expect(result).toEqual([]);
    });

    it('should return empty array if user is not staff', async () => {
      const nonStaffUser = { ...mockStaffUser, role: UserRole.CUSTOMER } as any;
      mockUserRepository.findById.mockResolvedValue(nonStaffUser);

      const result = await staffService.getStaffStores('staff-123');

      expect(result).toEqual([]);
    });
  });

  describe('getStaffPermissions', () => {
    beforeEach(() => {
      (StaffStorePermission.findOne as jest.Mock).mockResolvedValue(mockStaffPermission);
    });

    it('should return staff permissions for a store', async () => {
      const result = await staffService.getStaffPermissions('store-123', 'staff-123');

      expect(StaffStorePermission.findOne).toHaveBeenCalledWith({
        where: {
          userId: 'staff-123',
          storeId: 'store-123',
          isActive: true,
        },
        transaction: undefined,
      });
      expect(result).toBe(mockStaffPermission.permissions);
    });

    it('should return empty array if permissions not found', async () => {
      (StaffStorePermission.findOne as jest.Mock).mockResolvedValue(null);

      const result = await staffService.getStaffPermissions('store-123', 'staff-123');

      expect(result).toEqual([]);
    });
  });

  describe('static methods', () => {
    it('should return default staff permissions', () => {
      const permissions = StaffService.getDefaultStaffPermissions();
      expect(permissions).toContain(Permission.VIEW_SERVICES);
      expect(permissions).toContain(Permission.VIEW_SERVICE_REQUESTS);
    });

    it('should return default senior staff permissions', () => {
      const permissions = StaffService.getDefaultSeniorStaffPermissions();
      expect(permissions).toContain(Permission.VIEW_SERVICES);
      expect(permissions).toContain(Permission.CREATE_QUOTATIONS);
    });

    it('should return all permissions', () => {
      const permissions = StaffService.getAllPermissions();
      expect(permissions).toEqual(Object.values(Permission));
    });
  });
});