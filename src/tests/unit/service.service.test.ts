import { ServiceService } from '../../services/service.service';
import { ServiceRepository } from '../../repositories/service.repository';
import { UserRole } from '../../types/database/database.types';

// Mock the repository
jest.mock('../../repositories/service.repository');

describe('ServiceService', () => {
  let serviceService: ServiceService;
  let mockServiceRepository: jest.Mocked<ServiceRepository>;
  let testStore: any;
  let testUser: any;
  let sequelize: any;
  let Service: any;
  let Store: any;
  let User: any;

  beforeAll(async () => {
    // Import after environment is set up
    const { sequelize: seq } = await import('../../config/database');
    const models = await import('../../database/models');
    
    sequelize = seq;
    Service = models.Service;
    Store = models.Store;
    User = models.User;
    
    await sequelize.sync({ force: true });

    // Create test user and store
    testUser = await User.create({
      email: 'testowner@example.com',
      passwordHash: 'hashedpassword',
      role: UserRole.STORE_OWNER,
      firstName: 'Test',
      lastName: 'Owner',
      isActive: true,
      emailVerified: true,
    });

    testStore = await Store.create({
      ownerId: testUser.id,
      name: 'Test Bike Shop',
      description: 'A test bike shop',
      isActive: true,
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    serviceService = new ServiceService();
    mockServiceRepository = serviceService['serviceRepository'] as jest.Mocked<ServiceRepository>;
  });

  describe('getStoreServices', () => {
    it('should get store services with default active filter', async () => {
      const mockServices = [
        { id: '1', name: 'Service 1', isActive: true, storeId: testStore.id },
        { id: '2', name: 'Service 2', isActive: true, storeId: testStore.id },
      ];

      mockServiceRepository.findByStore.mockResolvedValue(mockServices as any);

      const result = await serviceService.getStoreServices(testStore.id);

      expect(mockServiceRepository.findByStore).toHaveBeenCalledWith(
        testStore.id,
        { storeId: testStore.id, isActive: true },
        expect.any(Object)
      );
      expect(result).toEqual(mockServices);
    });

    it('should include inactive services when specified', async () => {
      const mockServices = [
        { id: '1', name: 'Service 1', isActive: true, storeId: testStore.id },
        { id: '2', name: 'Service 2', isActive: false, storeId: testStore.id },
      ];

      mockServiceRepository.findByStore.mockResolvedValue(mockServices as any);

      await serviceService.getStoreServices(testStore.id, { includeInactive: true });

      expect(mockServiceRepository.findByStore).toHaveBeenCalledWith(
        testStore.id,
        { storeId: testStore.id },
        expect.any(Object)
      );
    });

    it('should throw error for non-existent store', async () => {
      await expect(
        serviceService.getStoreServices('non-existent-store-id')
      ).rejects.toThrow('Store not found');
    });
  });

  describe('createService', () => {
    const validServiceData = {
      name: 'Test Service',
      description: 'Test description',
      basePrice: 50.00,
      estimatedDuration: 60,
      category: 'Basic Maintenance',
    };

    it('should create a service successfully', async () => {
      const mockService = { id: '1', ...validServiceData, storeId: testStore.id };

      mockServiceRepository.isNameTaken.mockResolvedValue(false);
      mockServiceRepository.createService.mockResolvedValue(mockService as any);

      const result = await serviceService.createService(testStore.id, validServiceData);

      expect(mockServiceRepository.isNameTaken).toHaveBeenCalledWith(testStore.id, validServiceData.name);
      expect(mockServiceRepository.createService).toHaveBeenCalledWith({
        ...validServiceData,
        storeId: testStore.id,
        isActive: true,
      });
      expect(result).toEqual(mockService);
    });

    it('should throw error if service name already exists', async () => {
      mockServiceRepository.isNameTaken.mockResolvedValue(true);

      await expect(
        serviceService.createService(testStore.id, validServiceData)
      ).rejects.toThrow('A service with this name already exists in the store');
    });

    it('should validate required fields', async () => {
      const invalidData = { ...validServiceData, name: '' };

      await expect(
        serviceService.createService(testStore.id, invalidData)
      ).rejects.toThrow('Validation failed');
    });

    it('should validate base price', async () => {
      const invalidData = { ...validServiceData, basePrice: -10 };

      await expect(
        serviceService.createService(testStore.id, invalidData)
      ).rejects.toThrow('Base price must be non-negative');
    });

    it('should validate estimated duration', async () => {
      const invalidData = { ...validServiceData, estimatedDuration: 0 };

      await expect(
        serviceService.createService(testStore.id, invalidData)
      ).rejects.toThrow('Estimated duration must be at least 1 minute');
    });

    it('should validate name length', async () => {
      const invalidData = { ...validServiceData, name: 'a'.repeat(256) };

      await expect(
        serviceService.createService(testStore.id, invalidData)
      ).rejects.toThrow('Service name must be 255 characters or less');
    });
  });

  describe('updateService', () => {
    const mockService = {
      id: 'service-1',
      name: 'Existing Service',
      storeId: testStore.id,
      isActive: true,
    };

    beforeEach(() => {
      mockServiceRepository.findById.mockResolvedValue(mockService as any);
    });

    it('should update service successfully', async () => {
      const updateData = { name: 'Updated Service', basePrice: 75.00 };
      const updatedService = { ...mockService, ...updateData };

      mockServiceRepository.isNameTaken.mockResolvedValue(false);
      mockServiceRepository.updateService.mockResolvedValue(updatedService as any);

      const result = await serviceService.updateService('service-1', testStore.id, updateData);

      expect(mockServiceRepository.updateService).toHaveBeenCalledWith('service-1', updateData);
      expect(result).toEqual(updatedService);
    });

    it('should check for name conflicts when updating name', async () => {
      const updateData = { name: 'New Service Name' };

      mockServiceRepository.isNameTaken.mockResolvedValue(false);
      mockServiceRepository.updateService.mockResolvedValue({ ...mockService, ...updateData } as any);

      await serviceService.updateService('service-1', testStore.id, updateData);

      expect(mockServiceRepository.isNameTaken).toHaveBeenCalledWith(
        testStore.id,
        'New Service Name',
        'service-1'
      );
    });

    it('should throw error if new name already exists', async () => {
      const updateData = { name: 'Existing Name' };

      mockServiceRepository.isNameTaken.mockResolvedValue(true);

      await expect(
        serviceService.updateService('service-1', testStore.id, updateData)
      ).rejects.toThrow('A service with this name already exists in the store');
    });

    it('should throw error for empty update data', async () => {
      await expect(
        serviceService.updateService('service-1', testStore.id, {})
      ).rejects.toThrow('No update data provided');
    });

    it('should throw error if service not found', async () => {
      mockServiceRepository.findById.mockResolvedValue(null);

      await expect(
        serviceService.updateService('non-existent', testStore.id, { name: 'Test' })
      ).rejects.toThrow('Service not found');
    });
  });

  describe('activateService', () => {
    const mockService = {
      id: 'service-1',
      name: 'Test Service',
      storeId: testStore.id,
      isActive: false,
    };

    it('should activate service successfully', async () => {
      const activatedService = { ...mockService, isActive: true };

      mockServiceRepository.findById.mockResolvedValue(mockService as any);
      mockServiceRepository.activateService.mockResolvedValue(activatedService as any);

      const result = await serviceService.activateService('service-1', testStore.id);

      expect(mockServiceRepository.activateService).toHaveBeenCalledWith('service-1');
      expect(result).toEqual(activatedService);
    });

    it('should throw error if service not found', async () => {
      mockServiceRepository.findById.mockResolvedValue(null);

      await expect(
        serviceService.activateService('non-existent', testStore.id)
      ).rejects.toThrow('Service not found');
    });
  });

  describe('deactivateService', () => {
    const mockService = {
      id: 'service-1',
      name: 'Test Service',
      storeId: testStore.id,
      isActive: true,
    };

    it('should deactivate service successfully', async () => {
      const deactivatedService = { ...mockService, isActive: false };

      mockServiceRepository.findById.mockResolvedValue(mockService as any);
      mockServiceRepository.deactivateService.mockResolvedValue(deactivatedService as any);

      const result = await serviceService.deactivateService('service-1', testStore.id);

      expect(mockServiceRepository.deactivateService).toHaveBeenCalledWith('service-1');
      expect(result).toEqual(deactivatedService);
    });
  });

  describe('searchServices', () => {
    it('should search services successfully', async () => {
      const mockServices = [
        { id: '1', name: 'Brake Service', storeId: testStore.id },
      ];

      mockServiceRepository.searchByName.mockResolvedValue(mockServices as any);

      const result = await serviceService.searchServices(testStore.id, 'brake');

      expect(mockServiceRepository.searchByName).toHaveBeenCalledWith(testStore.id, 'brake');
      expect(result).toEqual(mockServices);
    });

    it('should throw error for empty search term', async () => {
      await expect(
        serviceService.searchServices(testStore.id, '   ')
      ).rejects.toThrow('Search term cannot be empty');
    });
  });

  describe('getServiceById', () => {
    const mockService = {
      id: 'service-1',
      name: 'Test Service',
      storeId: testStore.id,
    };

    it('should get service by ID successfully', async () => {
      mockServiceRepository.findById.mockResolvedValue(mockService as any);

      const result = await serviceService.getServiceById('service-1', testStore.id);

      expect(result).toEqual(mockService);
    });

    it('should throw error if service not found', async () => {
      mockServiceRepository.findById.mockResolvedValue(null);

      await expect(
        serviceService.getServiceById('non-existent', testStore.id)
      ).rejects.toThrow('Service not found');
    });

    it('should throw error if service not in specified store', async () => {
      const serviceInDifferentStore = { ...mockService, storeId: 'different-store' };
      mockServiceRepository.findById.mockResolvedValue(serviceInDifferentStore as any);

      await expect(
        serviceService.getServiceById('service-1', testStore.id)
      ).rejects.toThrow('Service not found in the specified store');
    });
  });

  describe('getCommonCategories', () => {
    it('should return common categories', () => {
      const categories = serviceService.getCommonCategories();

      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toContain('Basic Maintenance');
      expect(categories).toContain('Brake Service');
    });
  });
});