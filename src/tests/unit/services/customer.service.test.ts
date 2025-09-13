import { CustomerService } from '../../../services/customer.service';
import { BikeRepository } from '../../../repositories/bike.repository';
import { UserRepository } from '../../../repositories/user.repository';
import { Bike } from '../../../database/models/Bike';
import { User } from '../../../database/models/User';
import { UserRole } from '../../../types/database/database.types';
import { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError,
  ConflictError 
} from '../../../utils/errors';

// Mock the repositories
jest.mock('../../../repositories/bike.repository');
jest.mock('../../../repositories/user.repository');

describe('CustomerService', () => {
  let customerService: CustomerService;
  let mockBikeRepository: jest.Mocked<BikeRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockCustomer: Partial<User>;
  let mockBike: Partial<Bike>;

  beforeEach(() => {
    customerService = new CustomerService();
    mockBikeRepository = new BikeRepository() as jest.Mocked<BikeRepository>;
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;

    // Replace the repositories with mocks
    (customerService as any).bikeRepository = mockBikeRepository;
    (customerService as any).userRepository = mockUserRepository;

    mockCustomer = {
      id: 'customer-id-1',
      email: 'customer@example.com',
      role: UserRole.CUSTOMER,
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
    };

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
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('registerBike', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockCustomer as User);
      mockBikeRepository.findBySerialNumber.mockResolvedValue([]);
      mockBikeRepository.createForCustomer.mockResolvedValue(mockBike as Bike);
    });

    it('should register a new bike successfully', async () => {
      const bikeData = {
        brand: 'Trek',
        model: 'Domane SL 7',
        year: 2023,
        serialNumber: 'WTU123456789',
      };

      const result = await customerService.registerBike('customer-id-1', bikeData);

      expect(mockUserRepository.findById).toHaveBeenCalledWith('customer-id-1');
      expect(mockBikeRepository.findBySerialNumber).toHaveBeenCalledWith('WTU123456789');
      expect(mockBikeRepository.createForCustomer).toHaveBeenCalledWith('customer-id-1', bikeData, undefined);
      expect(result).toEqual(mockBike);
    });

    it('should throw NotFoundError if customer does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        customerService.registerBike('non-existent-customer', {})
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user is not a customer', async () => {
      const nonCustomer = { ...mockCustomer, role: UserRole.STAFF };
      mockUserRepository.findById.mockResolvedValue(nonCustomer as User);

      await expect(
        customerService.registerBike('customer-id-1', {})
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError if customer is inactive', async () => {
      const inactiveCustomer = { ...mockCustomer, isActive: false };
      mockUserRepository.findById.mockResolvedValue(inactiveCustomer as User);

      await expect(
        customerService.registerBike('customer-id-1', {})
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ValidationError if no identifying information provided', async () => {
      await expect(
        customerService.registerBike('customer-id-1', {})
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ConflictError if serial number already exists', async () => {
      const existingBike = { id: 'existing-bike-id', serialNumber: 'WTU123456789' };
      mockBikeRepository.findBySerialNumber.mockResolvedValue([existingBike as Bike]);

      const bikeData = {
        brand: 'Trek',
        serialNumber: 'WTU123456789',
      };

      await expect(
        customerService.registerBike('customer-id-1', bikeData)
      ).rejects.toThrow(ConflictError);
    });

    it('should register bike with only brand provided', async () => {
      const bikeData = { brand: 'Trek' };

      const result = await customerService.registerBike('customer-id-1', bikeData);

      expect(mockBikeRepository.createForCustomer).toHaveBeenCalledWith('customer-id-1', bikeData, undefined);
      expect(result).toEqual(mockBike);
    });
  });

  describe('getCustomerBikes', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockCustomer as User);
    });

    it('should get all bikes without pagination', async () => {
      const mockBikes = [mockBike];
      mockBikeRepository.findByCustomerId.mockResolvedValue(mockBikes as Bike[]);

      const result = await customerService.getCustomerBikes('customer-id-1');

      expect(mockUserRepository.findById).toHaveBeenCalledWith('customer-id-1');
      expect(mockBikeRepository.findByCustomerId).toHaveBeenCalledWith('customer-id-1');
      expect(result).toEqual({ bikes: mockBikes });
    });

    it('should get bikes with pagination', async () => {
      const mockPaginatedResult = {
        data: [mockBike],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
      mockBikeRepository.findWithPagination.mockResolvedValue(mockPaginatedResult as any);

      const result = await customerService.getCustomerBikes('customer-id-1', {
        page: 1,
        limit: 10,
      });

      expect(mockBikeRepository.findWithPagination).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
        },
        {
          where: { customerId: 'customer-id-1' },
        }
      );
      expect(result).toEqual({
        bikes: mockPaginatedResult.data,
        pagination: mockPaginatedResult.pagination,
      });
    });
  });

  describe('getBikeById', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockCustomer as User);
    });

    it('should get bike by ID successfully', async () => {
      mockBikeRepository.findByIdForCustomer.mockResolvedValue(mockBike as Bike);

      const result = await customerService.getBikeById('customer-id-1', 'bike-id-1');

      expect(mockUserRepository.findById).toHaveBeenCalledWith('customer-id-1');
      expect(mockBikeRepository.findByIdForCustomer).toHaveBeenCalledWith(
        'bike-id-1',
        'customer-id-1'
      );
      expect(result).toEqual(mockBike);
    });

    it('should throw NotFoundError if bike not found', async () => {
      mockBikeRepository.findByIdForCustomer.mockResolvedValue(null);

      await expect(
        customerService.getBikeById('customer-id-1', 'non-existent-bike')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateBike', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockCustomer as User);
      mockBikeRepository.findBySerialNumber.mockResolvedValue([]);
      mockBikeRepository.updateForCustomer.mockResolvedValue(mockBike as Bike);
    });

    it('should update bike successfully', async () => {
      const updateData = { brand: 'Specialized' };

      const result = await customerService.updateBike('customer-id-1', 'bike-id-1', updateData);

      expect(mockUserRepository.findById).toHaveBeenCalledWith('customer-id-1');
      expect(mockBikeRepository.updateForCustomer).toHaveBeenCalledWith(
        'bike-id-1',
        'customer-id-1',
        updateData,
        undefined
      );
      expect(result).toEqual(mockBike);
    });

    it('should throw ConflictError if serial number already exists', async () => {
      const existingBike = { id: 'other-bike-id', serialNumber: 'EXISTING123' };
      mockBikeRepository.findBySerialNumber.mockResolvedValue([existingBike as Bike]);

      const updateData = { serialNumber: 'EXISTING123' };

      await expect(
        customerService.updateBike('customer-id-1', 'bike-id-1', updateData)
      ).rejects.toThrow(ConflictError);
    });

    it('should throw NotFoundError if bike not found or not owned', async () => {
      mockBikeRepository.updateForCustomer.mockResolvedValue(null);

      const updateData = { brand: 'Specialized' };

      await expect(
        customerService.updateBike('customer-id-1', 'bike-id-1', updateData)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteBike', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockCustomer as User);
    });

    it('should delete bike successfully', async () => {
      mockBikeRepository.deleteForCustomer.mockResolvedValue(true);

      await customerService.deleteBike('customer-id-1', 'bike-id-1');

      expect(mockUserRepository.findById).toHaveBeenCalledWith('customer-id-1');
      expect(mockBikeRepository.deleteForCustomer).toHaveBeenCalledWith(
        'bike-id-1',
        'customer-id-1',
        undefined
      );
    });

    it('should throw NotFoundError if bike not found or not owned', async () => {
      mockBikeRepository.deleteForCustomer.mockResolvedValue(false);

      await expect(
        customerService.deleteBike('customer-id-1', 'bike-id-1')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('searchBikes', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockCustomer as User);
    });

    it('should search bikes without pagination', async () => {
      const mockBikes = [mockBike];
      const searchCriteria = { brand: 'Trek' };
      mockBikeRepository.searchBikes.mockResolvedValue(mockBikes as Bike[]);

      const result = await customerService.searchBikes('customer-id-1', searchCriteria);

      expect(mockUserRepository.findById).toHaveBeenCalledWith('customer-id-1');
      expect(mockBikeRepository.searchBikes).toHaveBeenCalledWith(
        'customer-id-1',
        searchCriteria
      );
      expect(result).toEqual({ bikes: mockBikes });
    });

    it('should search bikes with pagination', async () => {
      const mockBikes = [mockBike, { ...mockBike, id: 'bike-id-2' }];
      const searchCriteria = { brand: 'Trek' };
      mockBikeRepository.searchBikes.mockResolvedValue(mockBikes as Bike[]);

      const result = await customerService.searchBikes('customer-id-1', searchCriteria, {
        page: 1,
        limit: 1,
      });

      expect(result).toEqual({
        bikes: [mockBike],
        pagination: {
          page: 1,
          limit: 1,
          total: 2,
          totalPages: 2,
          hasNext: true,
          hasPrev: false,
        },
      });
    });
  });

  describe('getCustomerBikeStats', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockCustomer as User);
    });

    it('should get bike statistics', async () => {
      const mockStats = {
        totalBikes: 3,
        bikesByType: { 'Road Bike': 2, 'Mountain Bike': 1 },
        bikesByBrand: { 'Trek': 2, 'Specialized': 1 },
      };
      mockBikeRepository.getCustomerBikeStats.mockResolvedValue(mockStats);

      const result = await customerService.getCustomerBikeStats('customer-id-1');

      expect(mockUserRepository.findById).toHaveBeenCalledWith('customer-id-1');
      expect(mockBikeRepository.getCustomerBikeStats).toHaveBeenCalledWith('customer-id-1');
      expect(result).toEqual(mockStats);
    });
  });

  describe('verifyBikeOwnership', () => {
    beforeEach(() => {
      mockUserRepository.findById.mockResolvedValue(mockCustomer as User);
    });

    it('should verify bike ownership', async () => {
      mockBikeRepository.verifyOwnership.mockResolvedValue(true);

      const result = await customerService.verifyBikeOwnership('customer-id-1', 'bike-id-1');

      expect(mockUserRepository.findById).toHaveBeenCalledWith('customer-id-1');
      expect(mockBikeRepository.verifyOwnership).toHaveBeenCalledWith('bike-id-1', 'customer-id-1');
      expect(result).toBe(true);
    });
  });

  describe('getCustomerProfile', () => {
    it('should get customer profile', async () => {
      mockUserRepository.findById.mockResolvedValue(mockCustomer as User);

      const result = await customerService.getCustomerProfile('customer-id-1');

      expect(mockUserRepository.findById).toHaveBeenCalledWith('customer-id-1');
      expect(result).toEqual(mockCustomer);
    });
  });
});