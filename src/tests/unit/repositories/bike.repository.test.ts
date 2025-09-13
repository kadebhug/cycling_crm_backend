import { Op } from 'sequelize';
import { BikeRepository } from '../../../repositories/bike.repository';
import { Bike } from '../../../database/models/Bike';
import { User } from '../../../database/models/User';
import { UserRole } from '../../../types/database/database.types';

// Mock the models
jest.mock('../../../database/models/Bike');
jest.mock('../../../database/models/User');

describe('BikeRepository', () => {
  let bikeRepository: BikeRepository;
  let mockBike: Partial<Bike>;
  let mockUser: Partial<User>;

  beforeEach(() => {
    bikeRepository = new BikeRepository();
    
    mockBike = {
      id: 'bike-id-1',
      customerId: 'customer-id-1',
      brand: 'Trek',
      model: 'Domane SL 7',
      year: 2023,
      serialNumber: 'WTU123456789',
      color: 'Matte Black',
      bikeType: 'Road Bike',
      notes: 'Carbon frame with Ultegra groupset',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUser = {
      id: 'customer-id-1',
      email: 'customer@example.com',
      role: UserRole.CUSTOMER,
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('findByCustomerId', () => {
    it('should find all bikes for a customer', async () => {
      const mockBikes = [mockBike];
      const mockFindAll = jest.spyOn(bikeRepository, 'findAll').mockResolvedValue(mockBikes as Bike[]);

      const result = await bikeRepository.findByCustomerId('customer-id-1');

      expect(mockFindAll).toHaveBeenCalledWith({
        where: { customerId: 'customer-id-1' },
        include: [],
        order: [['createdAt', 'DESC']],
      });
      expect(result).toEqual(mockBikes);
    });

    it('should include customer when requested', async () => {
      const mockBikes = [mockBike];
      const mockFindAll = jest.spyOn(bikeRepository, 'findAll').mockResolvedValue(mockBikes as Bike[]);

      await bikeRepository.findByCustomerId('customer-id-1', { includeCustomer: true });

      expect(mockFindAll).toHaveBeenCalledWith({
        where: { customerId: 'customer-id-1' },
        include: [{
          model: User,
          as: 'customer',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        }],
        order: [['createdAt', 'DESC']],
        includeCustomer: true,
      });
    });
  });

  describe('findByIdForCustomer', () => {
    it('should find bike by ID for specific customer', async () => {
      const mockFindOne = jest.spyOn(bikeRepository, 'findOne').mockResolvedValue(mockBike as Bike);

      const result = await bikeRepository.findByIdForCustomer('bike-id-1', 'customer-id-1');

      expect(mockFindOne).toHaveBeenCalledWith(
        {
          id: 'bike-id-1',
          customerId: 'customer-id-1',
        },
        {
          include: [],
        }
      );
      expect(result).toEqual(mockBike);
    });

    it('should return null if bike not found or does not belong to customer', async () => {
      const mockFindOne = jest.spyOn(bikeRepository, 'findOne').mockResolvedValue(null);

      const result = await bikeRepository.findByIdForCustomer('bike-id-1', 'wrong-customer-id');

      expect(result).toBeNull();
    });
  });

  describe('searchBikes', () => {
    it('should search bikes by brand', async () => {
      const mockBikes = [mockBike];
      const mockFindAll = jest.spyOn(bikeRepository, 'findAll').mockResolvedValue(mockBikes as Bike[]);

      const result = await bikeRepository.searchBikes('customer-id-1', { brand: 'Trek' });

      expect(mockFindAll).toHaveBeenCalledWith({
        where: {
          customerId: 'customer-id-1',
          brand: { [Op.iLike]: '%Trek%' },
        },
        include: [],
        order: [['createdAt', 'DESC']],
      });
      expect(result).toEqual(mockBikes);
    });

    it('should search bikes by multiple criteria', async () => {
      const mockBikes = [mockBike];
      const mockFindAll = jest.spyOn(bikeRepository, 'findAll').mockResolvedValue(mockBikes as Bike[]);

      const result = await bikeRepository.searchBikes('customer-id-1', {
        brand: 'Trek',
        model: 'Domane',
        year: 2023,
        bikeType: 'Road',
      });

      expect(mockFindAll).toHaveBeenCalledWith({
        where: {
          customerId: 'customer-id-1',
          brand: { [Op.iLike]: '%Trek%' },
          model: { [Op.iLike]: '%Domane%' },
          year: 2023,
          bikeType: { [Op.iLike]: '%Road%' },
        },
        include: [],
        order: [['createdAt', 'DESC']],
      });
      expect(result).toEqual(mockBikes);
    });
  });

  describe('verifyOwnership', () => {
    it('should return true if bike belongs to customer', async () => {
      const mockExists = jest.spyOn(bikeRepository, 'exists').mockResolvedValue(true);

      const result = await bikeRepository.verifyOwnership('bike-id-1', 'customer-id-1');

      expect(mockExists).toHaveBeenCalledWith({
        id: 'bike-id-1',
        customerId: 'customer-id-1',
      });
      expect(result).toBe(true);
    });

    it('should return false if bike does not belong to customer', async () => {
      const mockExists = jest.spyOn(bikeRepository, 'exists').mockResolvedValue(false);

      const result = await bikeRepository.verifyOwnership('bike-id-1', 'wrong-customer-id');

      expect(result).toBe(false);
    });
  });

  describe('findBySerialNumber', () => {
    it('should find bikes by serial number', async () => {
      const mockBikes = [mockBike];
      const mockFindAll = jest.spyOn(bikeRepository, 'findAll').mockResolvedValue(mockBikes as Bike[]);

      const result = await bikeRepository.findBySerialNumber('WTU123456789');

      expect(mockFindAll).toHaveBeenCalledWith({
        where: {
          serialNumber: { [Op.iLike]: 'WTU123456789' },
        },
      });
      expect(result).toEqual(mockBikes);
    });

    it('should exclude specific bike ID when provided', async () => {
      const mockBikes: Bike[] = [];
      const mockFindAll = jest.spyOn(bikeRepository, 'findAll').mockResolvedValue(mockBikes);

      const result = await bikeRepository.findBySerialNumber('WTU123456789', 'bike-id-1');

      expect(mockFindAll).toHaveBeenCalledWith({
        where: {
          serialNumber: { [Op.iLike]: 'WTU123456789' },
          id: { [Op.ne]: 'bike-id-1' },
        },
      });
      expect(result).toEqual(mockBikes);
    });
  });

  describe('getCustomerBikeStats', () => {
    it('should return bike statistics for customer', async () => {
      const mockBikes = [
        { ...mockBike, bikeType: 'Road Bike', brand: 'Trek' },
        { ...mockBike, id: 'bike-id-2', bikeType: 'Mountain Bike', brand: 'Specialized' },
        { ...mockBike, id: 'bike-id-3', bikeType: 'Road Bike', brand: 'Trek' },
      ];
      const mockFindByCustomerId = jest.spyOn(bikeRepository, 'findByCustomerId').mockResolvedValue(mockBikes as Bike[]);

      const result = await bikeRepository.getCustomerBikeStats('customer-id-1');

      expect(mockFindByCustomerId).toHaveBeenCalledWith('customer-id-1');
      expect(result).toEqual({
        totalBikes: 3,
        bikesByType: {
          'Road Bike': 2,
          'Mountain Bike': 1,
        },
        bikesByBrand: {
          'Trek': 2,
          'Specialized': 1,
        },
      });
    });

    it('should handle bikes with null values', async () => {
      const mockBikes = [
        { ...mockBike, bikeType: null, brand: null },
        { ...mockBike, id: 'bike-id-2', bikeType: 'Road Bike', brand: 'Trek' },
      ];
      const mockFindByCustomerId = jest.spyOn(bikeRepository, 'findByCustomerId').mockResolvedValue(mockBikes as Bike[]);

      const result = await bikeRepository.getCustomerBikeStats('customer-id-1');

      expect(result).toEqual({
        totalBikes: 2,
        bikesByType: {
          'Unknown': 1,
          'Road Bike': 1,
        },
        bikesByBrand: {
          'Unknown': 1,
          'Trek': 1,
        },
      });
    });
  });

  describe('createForCustomer', () => {
    it('should create bike with customer ID', async () => {
      const bikeData = {
        brand: 'Trek',
        model: 'Domane SL 7',
        year: 2023,
      };
      const mockCreate = jest.spyOn(bikeRepository, 'create').mockResolvedValue(mockBike as Bike);

      const result = await bikeRepository.createForCustomer('customer-id-1', bikeData);

      expect(mockCreate).toHaveBeenCalledWith(
        {
          ...bikeData,
          customerId: 'customer-id-1',
        },
        { transaction: undefined }
      );
      expect(result).toEqual(mockBike);
    });
  });

  describe('updateForCustomer', () => {
    it('should update bike if ownership is verified', async () => {
      const updateData = { brand: 'Specialized' };
      const mockVerifyOwnership = jest.spyOn(bikeRepository, 'verifyOwnership').mockResolvedValue(true);
      const mockUpdate = jest.spyOn(bikeRepository, 'update').mockResolvedValue(mockBike as Bike);

      const result = await bikeRepository.updateForCustomer('bike-id-1', 'customer-id-1', updateData);

      expect(mockVerifyOwnership).toHaveBeenCalledWith('bike-id-1', 'customer-id-1');
      expect(mockUpdate).toHaveBeenCalledWith('bike-id-1', updateData, { transaction: undefined });
      expect(result).toEqual(mockBike);
    });

    it('should return null if ownership is not verified', async () => {
      const updateData = { brand: 'Specialized' };
      const mockVerifyOwnership = jest.spyOn(bikeRepository, 'verifyOwnership').mockResolvedValue(false);
      const mockUpdate = jest.spyOn(bikeRepository, 'update');

      const result = await bikeRepository.updateForCustomer('bike-id-1', 'wrong-customer-id', updateData);

      expect(mockVerifyOwnership).toHaveBeenCalledWith('bike-id-1', 'wrong-customer-id');
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('deleteForCustomer', () => {
    it('should delete bike if ownership is verified', async () => {
      const mockVerifyOwnership = jest.spyOn(bikeRepository, 'verifyOwnership').mockResolvedValue(true);
      const mockDelete = jest.spyOn(bikeRepository, 'delete').mockResolvedValue(true);

      const result = await bikeRepository.deleteForCustomer('bike-id-1', 'customer-id-1');

      expect(mockVerifyOwnership).toHaveBeenCalledWith('bike-id-1', 'customer-id-1');
      expect(mockDelete).toHaveBeenCalledWith('bike-id-1', { transaction: undefined });
      expect(result).toBe(true);
    });

    it('should return false if ownership is not verified', async () => {
      const mockVerifyOwnership = jest.spyOn(bikeRepository, 'verifyOwnership').mockResolvedValue(false);
      const mockDelete = jest.spyOn(bikeRepository, 'delete');

      const result = await bikeRepository.deleteForCustomer('bike-id-1', 'wrong-customer-id');

      expect(mockVerifyOwnership).toHaveBeenCalledWith('bike-id-1', 'wrong-customer-id');
      expect(mockDelete).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
});