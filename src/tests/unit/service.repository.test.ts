import { ServiceRepository, ServiceFilters } from '../../repositories/service.repository';
import { UserRole } from '../../types/database/database.types';

describe('ServiceRepository', () => {
  let serviceRepository: ServiceRepository;
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
    serviceRepository = new ServiceRepository();

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

  beforeEach(async () => {
    await Service.destroy({ where: {}, force: true });
  });

  describe('createService', () => {
    it('should create a new service', async () => {
      const serviceData = {
        storeId: testStore.id,
        name: 'Basic Tune-up',
        description: 'Basic bike maintenance',
        basePrice: 50.00,
        estimatedDuration: 60,
        category: 'Basic Maintenance',
        isActive: true,
      };

      const service = await serviceRepository.createService(serviceData);

      expect(service).toBeDefined();
      expect(service.name).toBe(serviceData.name);
      expect(service.storeId).toBe(testStore.id);
      expect(service.basePrice).toBe(50.00);
      expect(service.isActive).toBe(true);
    });

    it('should create service with default isActive true', async () => {
      const serviceData = {
        storeId: testStore.id,
        name: 'Brake Service',
        basePrice: 75.00,
      };

      const service = await serviceRepository.createService(serviceData);

      expect(service.isActive).toBe(true);
    });
  });

  describe('findByStore', () => {
    beforeEach(async () => {
      await Service.bulkCreate([
        {
          storeId: testStore.id,
          name: 'Basic Tune-up',
          basePrice: 50.00,
          category: 'Basic Maintenance',
          isActive: true,
        },
        {
          storeId: testStore.id,
          name: 'Brake Service',
          basePrice: 75.00,
          category: 'Brake Service',
          isActive: true,
        },
        {
          storeId: testStore.id,
          name: 'Inactive Service',
          basePrice: 100.00,
          category: 'Custom Work',
          isActive: false,
        },
      ]);
    });

    it('should find all services for a store', async () => {
      const services = await serviceRepository.findByStore(testStore.id);

      expect(services).toHaveLength(3);
      expect(services.every(s => s.storeId === testStore.id)).toBe(true);
    });

    it('should filter by active status', async () => {
      const filters: ServiceFilters = { isActive: true };
      const services = await serviceRepository.findByStore(testStore.id, filters);

      expect(services).toHaveLength(2);
      expect(services.every(s => s.isActive === true)).toBe(true);
    });

    it('should filter by category', async () => {
      const filters: ServiceFilters = { category: 'Basic Maintenance' };
      const services = await serviceRepository.findByStore(testStore.id, filters);

      expect(services).toHaveLength(1);
      expect(services[0].category).toBe('Basic Maintenance');
    });

    it('should filter by price range', async () => {
      const filters: ServiceFilters = { minPrice: 60, maxPrice: 80 };
      const services = await serviceRepository.findByStore(testStore.id, filters);

      expect(services).toHaveLength(1);
      expect(services[0].name).toBe('Brake Service');
    });
  });

  describe('findActiveByStore', () => {
    beforeEach(async () => {
      await Service.bulkCreate([
        {
          storeId: testStore.id,
          name: 'Active Service 1',
          basePrice: 50.00,
          isActive: true,
        },
        {
          storeId: testStore.id,
          name: 'Active Service 2',
          basePrice: 75.00,
          isActive: true,
        },
        {
          storeId: testStore.id,
          name: 'Inactive Service',
          basePrice: 100.00,
          isActive: false,
        },
      ]);
    });

    it('should return only active services', async () => {
      const services = await serviceRepository.findActiveByStore(testStore.id);

      expect(services).toHaveLength(2);
      expect(services.every(s => s.isActive === true)).toBe(true);
    });
  });

  describe('searchByName', () => {
    beforeEach(async () => {
      await Service.bulkCreate([
        {
          storeId: testStore.id,
          name: 'Basic Tune-up',
          description: 'Basic bike maintenance',
          basePrice: 50.00,
          isActive: true,
        },
        {
          storeId: testStore.id,
          name: 'Advanced Tune-up',
          description: 'Comprehensive bike service',
          basePrice: 100.00,
          isActive: true,
        },
        {
          storeId: testStore.id,
          name: 'Brake Service',
          description: 'Brake adjustment and repair',
          basePrice: 75.00,
          isActive: true,
        },
      ]);
    });

    it('should search by service name', async () => {
      const services = await serviceRepository.searchByName(testStore.id, 'tune-up');

      expect(services).toHaveLength(2);
      expect(services.every(s => s.name.toLowerCase().includes('tune-up'))).toBe(true);
    });

    it('should search by description', async () => {
      const services = await serviceRepository.searchByName(testStore.id, 'brake');

      expect(services).toHaveLength(1);
      expect(services[0].name).toBe('Brake Service');
    });

    it('should be case insensitive', async () => {
      const services = await serviceRepository.searchByName(testStore.id, 'BASIC');

      expect(services).toHaveLength(1);
      expect(services[0].name).toBe('Basic Tune-up');
    });
  });

  describe('updateService', () => {
    let testService: Service;

    beforeEach(async () => {
      testService = await Service.create({
        storeId: testStore.id,
        name: 'Test Service',
        basePrice: 50.00,
        isActive: true,
      });
    });

    it('should update service fields', async () => {
      const updateData = {
        name: 'Updated Service',
        basePrice: 75.00,
        description: 'Updated description',
      };

      const updatedService = await serviceRepository.updateService(testService.id, updateData);

      expect(updatedService).toBeDefined();
      expect(updatedService!.name).toBe('Updated Service');
      expect(updatedService!.basePrice).toBe(75.00);
      expect(updatedService!.description).toBe('Updated description');
    });

    it('should return null for non-existent service', async () => {
      const result = await serviceRepository.updateService('non-existent-id', { name: 'Test' });

      expect(result).toBeNull();
    });
  });

  describe('activateService and deactivateService', () => {
    let testService: Service;

    beforeEach(async () => {
      testService = await Service.create({
        storeId: testStore.id,
        name: 'Test Service',
        basePrice: 50.00,
        isActive: false,
      });
    });

    it('should activate a service', async () => {
      const activatedService = await serviceRepository.activateService(testService.id);

      expect(activatedService).toBeDefined();
      expect(activatedService!.isActive).toBe(true);
    });

    it('should deactivate a service', async () => {
      await serviceRepository.activateService(testService.id);
      const deactivatedService = await serviceRepository.deactivateService(testService.id);

      expect(deactivatedService).toBeDefined();
      expect(deactivatedService!.isActive).toBe(false);
    });
  });

  describe('getStoreCategories', () => {
    beforeEach(async () => {
      await Service.bulkCreate([
        {
          storeId: testStore.id,
          name: 'Service 1',
          basePrice: 50.00,
          category: 'Basic Maintenance',
          isActive: true,
        },
        {
          storeId: testStore.id,
          name: 'Service 2',
          basePrice: 75.00,
          category: 'Brake Service',
          isActive: true,
        },
        {
          storeId: testStore.id,
          name: 'Service 3',
          basePrice: 100.00,
          category: 'Basic Maintenance',
          isActive: true,
        },
        {
          storeId: testStore.id,
          name: 'Service 4',
          basePrice: 125.00,
          category: 'Custom Work',
          isActive: false, // Should be excluded
        },
      ]);
    });

    it('should return unique categories for active services', async () => {
      const categories = await serviceRepository.getStoreCategories(testStore.id);

      expect(categories).toHaveLength(2);
      expect(categories).toContain('Basic Maintenance');
      expect(categories).toContain('Brake Service');
      expect(categories).not.toContain('Custom Work'); // Inactive service
    });

    it('should return sorted categories', async () => {
      const categories = await serviceRepository.getStoreCategories(testStore.id);

      expect(categories).toEqual(['Basic Maintenance', 'Brake Service']);
    });
  });

  describe('isNameTaken', () => {
    beforeEach(async () => {
      await Service.create({
        storeId: testStore.id,
        name: 'Existing Service',
        basePrice: 50.00,
        isActive: true,
      });
    });

    it('should return true for existing service name', async () => {
      const isTaken = await serviceRepository.isNameTaken(testStore.id, 'Existing Service');

      expect(isTaken).toBe(true);
    });

    it('should return false for non-existing service name', async () => {
      const isTaken = await serviceRepository.isNameTaken(testStore.id, 'New Service');

      expect(isTaken).toBe(false);
    });

    it('should be case insensitive', async () => {
      const isTaken = await serviceRepository.isNameTaken(testStore.id, 'EXISTING SERVICE');

      expect(isTaken).toBe(true);
    });

    it('should exclude specified service ID', async () => {
      const existingService = await Service.findOne({ where: { name: 'Existing Service' } });
      const isTaken = await serviceRepository.isNameTaken(
        testStore.id,
        'Existing Service',
        existingService!.id
      );

      expect(isTaken).toBe(false);
    });
  });

  describe('getStoreServiceStats', () => {
    beforeEach(async () => {
      await Service.bulkCreate([
        {
          storeId: testStore.id,
          name: 'Service 1',
          basePrice: 50.00,
          category: 'Basic Maintenance',
          isActive: true,
        },
        {
          storeId: testStore.id,
          name: 'Service 2',
          basePrice: 100.00,
          category: 'Brake Service',
          isActive: true,
        },
        {
          storeId: testStore.id,
          name: 'Service 3',
          basePrice: 150.00,
          category: 'Custom Work',
          isActive: false,
        },
      ]);
    });

    it('should return correct service statistics', async () => {
      const stats = await serviceRepository.getStoreServiceStats(testStore.id);

      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.inactive).toBe(1);
      expect(stats.categories).toBe(2); // Only active services count
      expect(stats.averagePrice).toBe(75.00); // (50 + 100) / 2
    });
  });
});