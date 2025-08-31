import { StoreRepository, StoreCreateData } from '../../../repositories/store.repository';
import { UserRole, Permission, BusinessHours } from '../../../types/database/database.types';

// Mock the models
jest.mock('../../../database/models/User');
jest.mock('../../../database/models/Store');
jest.mock('../../../database/models/StaffStorePermission');

describe('StoreRepository', () => {
  let storeRepository: StoreRepository;

  beforeEach(() => {
    storeRepository = new StoreRepository();
    jest.clearAllMocks();
  });

  describe('createStore', () => {
    it('should create a new store', async () => {
      const businessHours: BusinessHours = {
        monday: { open: '09:00', close: '17:00' },
        tuesday: { open: '09:00', close: '17:00' },
        wednesday: { open: '09:00', close: '17:00' },
        thursday: { open: '09:00', close: '17:00' },
        friday: { open: '09:00', close: '17:00' },
        saturday: { open: '10:00', close: '16:00' },
        sunday: { open: '00:00', close: '00:00', closed: true },
      };

      const storeData: StoreCreateData = {
        ownerId: 'owner-123',
        name: 'Test Bike Shop',
        description: 'A test bike shop',
        address: '123 Test Street',
        phone: '555-0123',
        email: 'shop@example.com',
        businessHours,
      };

      const mockStore = { id: 'store-123', ...storeData };
      const createSpy = jest.spyOn(storeRepository, 'create').mockResolvedValue(mockStore as any);

      const store = await storeRepository.createStore(storeData);

      expect(createSpy).toHaveBeenCalledWith(storeData, { transaction: undefined });
      expect(store).toEqual(mockStore);
    });
  });

  describe('findByOwner', () => {
    it('should call findAll with owner filter and include owner', async () => {
      const mockStores = [
        { id: 'store-1', name: 'Store 1', ownerId: 'owner-123' },
        { id: 'store-2', name: 'Store 2', ownerId: 'owner-123' },
      ];
      const findAllSpy = jest.spyOn(storeRepository, 'findAll').mockResolvedValue(mockStores as any);

      const stores = await storeRepository.findByOwner('owner-123');

      expect(findAllSpy).toHaveBeenCalledWith({
        where: { ownerId: 'owner-123' },
        include: expect.arrayContaining([
          expect.objectContaining({
            as: 'owner',
            attributes: ['id', 'email', 'firstName', 'lastName', 'role'],
          })
        ])
      });
      expect(stores).toEqual(mockStores);
    });
  });

  describe('findWithOwner', () => {
    it('should call findById with owner include', async () => {
      const mockStore = { 
        id: 'store-123', 
        name: 'Test Store',
        owner: { id: 'owner-123', email: 'owner@example.com' }
      };
      const findByIdSpy = jest.spyOn(storeRepository, 'findById').mockResolvedValue(mockStore as any);

      const store = await storeRepository.findWithOwner('store-123');

      expect(findByIdSpy).toHaveBeenCalledWith('store-123', {
        include: expect.arrayContaining([
          expect.objectContaining({
            as: 'owner',
            attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive'],
          })
        ])
      });
      expect(store).toEqual(mockStore);
    });
  });

  describe('findActiveStores', () => {
    it('should call findAll with isActive filter', async () => {
      const mockStores = [{ id: 'store-1', name: 'Active Store', isActive: true }];
      const findAllSpy = jest.spyOn(storeRepository, 'findAll').mockResolvedValue(mockStores as any);

      const stores = await storeRepository.findActiveStores();

      expect(findAllSpy).toHaveBeenCalledWith({
        where: { isActive: true }
      });
      expect(stores).toEqual(mockStores);
    });
  });

  describe('deactivateStore', () => {
    it('should call update with isActive false', async () => {
      const mockStore = { id: 'store-123', isActive: false };
      const updateSpy = jest.spyOn(storeRepository, 'update').mockResolvedValue(mockStore as any);

      const deactivated = await storeRepository.deactivateStore('store-123');

      expect(updateSpy).toHaveBeenCalledWith('store-123', { isActive: false }, { transaction: undefined });
      expect(deactivated).toEqual(mockStore);
    });
  });

  describe('activateStore', () => {
    it('should call update with isActive true', async () => {
      const mockStore = { id: 'store-123', isActive: true };
      const updateSpy = jest.spyOn(storeRepository, 'update').mockResolvedValue(mockStore as any);

      const activated = await storeRepository.activateStore('store-123');

      expect(updateSpy).toHaveBeenCalledWith('store-123', { isActive: true }, { transaction: undefined });
      expect(activated).toEqual(mockStore);
    });
  });
});