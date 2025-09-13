import { Transaction } from 'sequelize';
import { BikeRepository } from '../repositories/bike.repository';
import { UserRepository } from '../repositories/user.repository';
import { Bike } from '../database/models/Bike';
import { User } from '../database/models/User';
import { UserRole } from '../types/database/database.types';
import { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError,
  ConflictError 
} from '../utils/errors';

export interface CreateBikeData {
  brand?: string;
  model?: string;
  year?: number;
  serialNumber?: string;
  color?: string;
  bikeType?: string;
  notes?: string;
}

export interface UpdateBikeData {
  brand?: string;
  model?: string;
  year?: number;
  serialNumber?: string;
  color?: string;
  bikeType?: string;
  notes?: string;
}

export interface BikeSearchCriteria {
  brand?: string;
  model?: string;
  year?: number;
  bikeType?: string;
  serialNumber?: string;
}

export interface BikeSearchOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export class CustomerService {
  private bikeRepository: BikeRepository;
  private userRepository: UserRepository;

  constructor() {
    this.bikeRepository = new BikeRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * Verify that a user is a customer
   */
  private async verifyCustomerRole(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new NotFoundError('Customer not found');
    }

    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenError('User is not a customer');
    }

    if (!user.isActive) {
      throw new ForbiddenError('Customer account is inactive');
    }

    return user;
  }

  /**
   * Register a new bike for a customer
   */
  async registerBike(
    customerId: string,
    bikeData: CreateBikeData,
    transaction?: Transaction
  ): Promise<Bike> {
    // Verify customer exists and has correct role
    await this.verifyCustomerRole(customerId);

    // Validate bike data
    if (!bikeData.brand && !bikeData.model && !bikeData.serialNumber) {
      throw new ValidationError(
        'At least one of brand, model, or serial number must be provided'
      );
    }

    // Check for duplicate serial number if provided
    if (bikeData.serialNumber) {
      const existingBikes = await this.bikeRepository.findBySerialNumber(
        bikeData.serialNumber
      );
      
      if (existingBikes.length > 0) {
        throw new ConflictError(
          `A bike with serial number "${bikeData.serialNumber}" already exists`
        );
      }
    }

    // Create the bike
    const bike = await this.bikeRepository.createForCustomer(
      customerId,
      bikeData,
      transaction
    );

    return bike;
  }

  /**
   * Get all bikes for a customer
   */
  async getCustomerBikes(
    customerId: string,
    options: BikeSearchOptions = {}
  ): Promise<{
    bikes: Bike[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    // Verify customer exists and has correct role
    await this.verifyCustomerRole(customerId);

    if (options.page && options.limit) {
      // Use pagination
      const result = await this.bikeRepository.findWithPagination(
        {
          page: options.page,
          limit: options.limit,
          sortBy: options.sortBy || 'createdAt',
          sortOrder: options.sortOrder || 'DESC',
        },
        {
          where: { customerId },
        }
      );

      return {
        bikes: result.data,
        pagination: result.pagination,
      };
    } else {
      // Return all bikes without pagination
      const bikes = await this.bikeRepository.findByCustomerId(customerId);

      return { bikes };
    }
  }

  /**
   * Get a specific bike by ID for a customer
   */
  async getBikeById(customerId: string, bikeId: string): Promise<Bike> {
    // Verify customer exists and has correct role
    await this.verifyCustomerRole(customerId);

    const bike = await this.bikeRepository.findByIdForCustomer(
      bikeId,
      customerId
    );

    if (!bike) {
      throw new NotFoundError('Bike not found or does not belong to customer');
    }

    return bike;
  }

  /**
   * Update a bike for a customer
   */
  async updateBike(
    customerId: string,
    bikeId: string,
    updateData: UpdateBikeData,
    transaction?: Transaction
  ): Promise<Bike> {
    // Verify customer exists and has correct role
    await this.verifyCustomerRole(customerId);

    // Check for duplicate serial number if being updated
    if (updateData.serialNumber) {
      const existingBikes = await this.bikeRepository.findBySerialNumber(
        updateData.serialNumber,
        bikeId
      );
      
      if (existingBikes.length > 0) {
        throw new ConflictError(
          `A bike with serial number "${updateData.serialNumber}" already exists`
        );
      }
    }

    const updatedBike = await this.bikeRepository.updateForCustomer(
      bikeId,
      customerId,
      updateData,
      transaction
    );

    if (!updatedBike) {
      throw new NotFoundError('Bike not found or does not belong to customer');
    }

    return updatedBike;
  }

  /**
   * Delete a bike for a customer
   */
  async deleteBike(
    customerId: string,
    bikeId: string,
    transaction?: Transaction
  ): Promise<void> {
    // Verify customer exists and has correct role
    await this.verifyCustomerRole(customerId);

    const deleted = await this.bikeRepository.deleteForCustomer(
      bikeId,
      customerId,
      transaction
    );

    if (!deleted) {
      throw new NotFoundError('Bike not found or does not belong to customer');
    }
  }

  /**
   * Search bikes for a customer
   */
  async searchBikes(
    customerId: string,
    searchCriteria: BikeSearchCriteria,
    options: BikeSearchOptions = {}
  ): Promise<{
    bikes: Bike[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    // Verify customer exists and has correct role
    await this.verifyCustomerRole(customerId);

    const bikes = await this.bikeRepository.searchBikes(
      customerId,
      searchCriteria
    );

    // Apply pagination if requested
    if (options.page && options.limit) {
      const startIndex = (options.page - 1) * options.limit;
      const endIndex = startIndex + options.limit;
      const paginatedBikes = bikes.slice(startIndex, endIndex);
      
      const total = bikes.length;
      const totalPages = Math.ceil(total / options.limit);
      
      return {
        bikes: paginatedBikes,
        pagination: {
          page: options.page,
          limit: options.limit,
          total,
          totalPages,
          hasNext: options.page < totalPages,
          hasPrev: options.page > 1,
        },
      };
    }

    return { bikes };
  }

  /**
   * Get bike statistics for a customer
   */
  async getCustomerBikeStats(customerId: string): Promise<{
    totalBikes: number;
    bikesByType: { [key: string]: number };
    bikesByBrand: { [key: string]: number };
  }> {
    // Verify customer exists and has correct role
    await this.verifyCustomerRole(customerId);

    return await this.bikeRepository.getCustomerBikeStats(customerId);
  }

  /**
   * Verify bike ownership
   */
  async verifyBikeOwnership(customerId: string, bikeId: string): Promise<boolean> {
    // Verify customer exists and has correct role
    await this.verifyCustomerRole(customerId);

    return await this.bikeRepository.verifyOwnership(bikeId, customerId);
  }

  /**
   * Get customer profile information
   */
  async getCustomerProfile(customerId: string): Promise<User> {
    const customer = await this.verifyCustomerRole(customerId);
    return customer;
  }

  /**
   * Get service record by service request ID (customer view)
   */
  async getServiceRecordByRequestId(
    customerId: string,
    serviceRequestId: string
  ): Promise<any | null> {
    // Verify customer role
    await this.verifyCustomerRole(customerId);

    // This would need to be implemented with the service record repository
    // For now, return null as this is a placeholder
    // In a real implementation, you would:
    // 1. Verify the service request belongs to the customer
    // 2. Get the associated service record
    // 3. Return only customer-appropriate information
    return null;
  }

  /**
   * Get customer-visible service updates for a service request
   */
  async getServiceUpdates(
    customerId: string,
    serviceRequestId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{
    updates: any[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    // Verify customer role
    await this.verifyCustomerRole(customerId);

    // This would need to be implemented with the service update repository
    // For now, return empty array as this is a placeholder
    // In a real implementation, you would:
    // 1. Verify the service request belongs to the customer
    // 2. Get the associated service record
    // 3. Get only customer-visible service updates
    // 4. Apply pagination if requested
    return { updates: [] };
  }
}