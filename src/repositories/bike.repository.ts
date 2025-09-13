import { Op, Transaction } from 'sequelize';
import { BaseRepository, BaseRepositoryOptions } from './base.repository';
import { Bike } from '../database/models/Bike';
import { User } from '../database/models/User';

export interface BikeRepositoryOptions extends BaseRepositoryOptions {
  includeCustomer?: boolean;
  includeServiceRequests?: boolean;
}

export class BikeRepository extends BaseRepository<Bike> {
  constructor() {
    super(Bike);
  }

  /**
   * Find all bikes for a specific customer
   */
  async findByCustomerId(
    customerId: string,
    options: BikeRepositoryOptions = {}
  ): Promise<Bike[]> {
    const include = [];
    
    if (options.includeCustomer) {
      include.push({
        model: User,
        as: 'customer',
        attributes: ['id', 'firstName', 'lastName', 'email'],
      });
    }

    if (options.includeServiceRequests) {
      // Note: ServiceRequest model will be imported when available
      // include.push({
      //   model: ServiceRequest,
      //   as: 'serviceRequests',
      // });
    }

    return await this.findAll({
      where: { customerId },
      include,
      order: [['createdAt', 'DESC']],
      ...options,
    });
  }

  /**
   * Find bike by ID with customer ownership verification
   */
  async findByIdForCustomer(
    bikeId: string,
    customerId: string,
    options: BikeRepositoryOptions = {}
  ): Promise<Bike | null> {
    const include = [];
    
    if (options.includeCustomer) {
      include.push({
        model: User,
        as: 'customer',
        attributes: ['id', 'firstName', 'lastName', 'email'],
      });
    }

    return await this.findOne(
      {
        id: bikeId,
        customerId,
      },
      {
        include,
        ...options,
      }
    );
  }

  /**
   * Search bikes by various criteria
   */
  async searchBikes(
    customerId: string,
    searchCriteria: {
      brand?: string;
      model?: string;
      year?: number;
      bikeType?: string;
      serialNumber?: string;
    },
    options: BikeRepositoryOptions = {}
  ): Promise<Bike[]> {
    const whereClause: any = { customerId };

    if (searchCriteria.brand) {
      whereClause.brand = {
        [Op.iLike]: `%${searchCriteria.brand}%`,
      };
    }

    if (searchCriteria.model) {
      whereClause.model = {
        [Op.iLike]: `%${searchCriteria.model}%`,
      };
    }

    if (searchCriteria.year) {
      whereClause.year = searchCriteria.year;
    }

    if (searchCriteria.bikeType) {
      whereClause.bikeType = {
        [Op.iLike]: `%${searchCriteria.bikeType}%`,
      };
    }

    if (searchCriteria.serialNumber) {
      whereClause.serialNumber = {
        [Op.iLike]: `%${searchCriteria.serialNumber}%`,
      };
    }

    const include = [];
    
    if (options.includeCustomer) {
      include.push({
        model: User,
        as: 'customer',
        attributes: ['id', 'firstName', 'lastName', 'email'],
      });
    }

    return await this.findAll({
      where: whereClause,
      include,
      order: [['createdAt', 'DESC']],
      ...options,
    });
  }

  /**
   * Check if a bike belongs to a specific customer
   */
  async verifyOwnership(bikeId: string, customerId: string): Promise<boolean> {
    return await this.exists({
      id: bikeId,
      customerId,
    });
  }

  /**
   * Find bikes by serial number (for duplicate checking)
   */
  async findBySerialNumber(
    serialNumber: string,
    excludeBikeId?: string
  ): Promise<Bike[]> {
    const whereClause: any = {
      serialNumber: {
        [Op.iLike]: serialNumber,
      },
    };

    if (excludeBikeId) {
      whereClause.id = {
        [Op.ne]: excludeBikeId,
      };
    }

    return await this.findAll({
      where: whereClause,
    });
  }

  /**
   * Get bike statistics for a customer
   */
  async getCustomerBikeStats(customerId: string): Promise<{
    totalBikes: number;
    bikesByType: { [key: string]: number };
    bikesByBrand: { [key: string]: number };
  }> {
    const bikes = await this.findByCustomerId(customerId);
    
    const stats = {
      totalBikes: bikes.length,
      bikesByType: {} as { [key: string]: number },
      bikesByBrand: {} as { [key: string]: number },
    };

    bikes.forEach((bike) => {
      // Count by type
      const bikeType = bike.bikeType || 'Unknown';
      stats.bikesByType[bikeType] = (stats.bikesByType[bikeType] || 0) + 1;

      // Count by brand
      const brand = bike.brand || 'Unknown';
      stats.bikesByBrand[brand] = (stats.bikesByBrand[brand] || 0) + 1;
    });

    return stats;
  }

  /**
   * Create bike with customer association validation
   */
  async createForCustomer(
    customerId: string,
    bikeData: Partial<Bike>,
    transaction?: Transaction
  ): Promise<Bike> {
    return await this.create(
      {
        ...bikeData,
        customerId,
      },
      { transaction }
    );
  }

  /**
   * Update bike with ownership verification
   */
  async updateForCustomer(
    bikeId: string,
    customerId: string,
    updateData: Partial<Bike>,
    transaction?: Transaction
  ): Promise<Bike | null> {
    // First verify ownership
    const ownershipVerified = await this.verifyOwnership(bikeId, customerId);
    if (!ownershipVerified) {
      return null;
    }

    return await this.update(bikeId, updateData, { transaction });
  }

  /**
   * Delete bike with ownership verification
   */
  async deleteForCustomer(
    bikeId: string,
    customerId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    // First verify ownership
    const ownershipVerified = await this.verifyOwnership(bikeId, customerId);
    if (!ownershipVerified) {
      return false;
    }

    return await this.delete(bikeId, { transaction });
  }
}