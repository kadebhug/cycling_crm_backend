import { Op, WhereOptions } from 'sequelize';
import { BaseRepository, BaseRepositoryOptions, PaginatedResult, PaginationOptions } from './base.repository';
import { Service } from '../database/models';

export interface ServiceFilters {
  storeId?: string;
  isActive?: boolean;
  category?: string;
  name?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface ServiceCreateData {
  storeId: string;
  name: string;
  description?: string;
  basePrice: number;
  estimatedDuration?: number;
  category?: string;
  isActive?: boolean;
}

export interface ServiceUpdateData {
  name?: string;
  description?: string;
  basePrice?: number;
  estimatedDuration?: number;
  category?: string;
  isActive?: boolean;
}

export class ServiceRepository extends BaseRepository<Service> {
  constructor() {
    super(Service);
  }

  /**
   * Find services by store ID with optional filters
   */
  async findByStore(
    storeId: string,
    filters: ServiceFilters = {},
    options: BaseRepositoryOptions = {}
  ): Promise<Service[]> {
    const whereClause: WhereOptions = {
      storeId,
      ...this.buildWhereClause(filters),
    };

    return await this.findAll({
      ...options,
      where: whereClause,
      order: options.order || [['name', 'ASC']],
    });
  }

  /**
   * Find active services by store ID
   */
  async findActiveByStore(
    storeId: string,
    options: BaseRepositoryOptions = {}
  ): Promise<Service[]> {
    return await this.findByStore(storeId, { isActive: true }, options);
  }

  /**
   * Find services by category
   */
  async findByCategory(
    storeId: string,
    category: string,
    options: BaseRepositoryOptions = {}
  ): Promise<Service[]> {
    return await this.findByStore(storeId, { category, isActive: true }, options);
  }

  /**
   * Search services by name
   */
  async searchByName(
    storeId: string,
    searchTerm: string,
    options: BaseRepositoryOptions = {}
  ): Promise<Service[]> {
    const whereClause: any = {
      storeId,
      isActive: true,
      [Op.or]: [
        { name: { [Op.iLike]: `%${searchTerm}%` } },
        { description: { [Op.iLike]: `%${searchTerm}%` } },
      ],
    };

    return await this.findAll({
      ...options,
      where: whereClause,
      order: [['name', 'ASC']],
    });
  }

  /**
   * Find services with pagination and filters
   */
  async findWithFilters(
    filters: ServiceFilters,
    paginationOptions: PaginationOptions,
    repositoryOptions: BaseRepositoryOptions = {}
  ): Promise<PaginatedResult<Service>> {
    const whereClause = this.buildWhereClause(filters);

    return await this.findWithPagination(paginationOptions, {
      ...repositoryOptions,
      where: whereClause,
      order: repositoryOptions.order || [['name', 'ASC']],
    });
  }

  /**
   * Create a new service
   */
  async createService(data: ServiceCreateData): Promise<Service> {
    return await this.create(data);
  }

  /**
   * Update a service
   */
  async updateService(id: string, data: ServiceUpdateData): Promise<Service | null> {
    return await this.update(id, data);
  }

  /**
   * Activate a service
   */
  async activateService(id: string): Promise<Service | null> {
    return await this.update(id, { isActive: true });
  }

  /**
   * Deactivate a service
   */
  async deactivateService(id: string): Promise<Service | null> {
    return await this.update(id, { isActive: false });
  }

  /**
   * Get service categories for a store
   */
  async getStoreCategories(storeId: string): Promise<string[]> {
    const services = await Service.findAll({
      where: {
        storeId,
        isActive: true,
        category: { [Op.not]: null },
      },
      attributes: ['category'],
      group: ['category'],
      raw: true,
    });

    return services
      .map(service => service.category)
      .filter((category): category is string => category !== null)
      .sort();
  }

  /**
   * Get price range for store services
   */
  async getStorePriceRange(storeId: string): Promise<{ min: number; max: number } | null> {
    const result = await Service.findOne({
      where: {
        storeId,
        isActive: true,
      },
      attributes: [
        [Service.sequelize!.fn('MIN', Service.sequelize!.col('base_price')), 'minPrice'],
        [Service.sequelize!.fn('MAX', Service.sequelize!.col('base_price')), 'maxPrice'],
      ],
      raw: true,
    }) as any;

    if (!result || result.minPrice === null) {
      return null;
    }

    return {
      min: parseFloat(result.minPrice),
      max: parseFloat(result.maxPrice),
    };
  }

  /**
   * Check if service name exists in store
   */
  async isNameTaken(storeId: string, name: string, excludeId?: string): Promise<boolean> {
    const whereClause: WhereOptions = {
      storeId,
      name: { [Op.iLike]: name },
    };

    if (excludeId) {
      whereClause.id = { [Op.ne]: excludeId };
    }

    return await this.exists(whereClause);
  }

  /**
   * Get service statistics for a store
   */
  async getStoreServiceStats(storeId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    categories: number;
    averagePrice: number;
  }> {
    const [total, active, categories, priceStats] = await Promise.all([
      this.count({ storeId }),
      this.count({ storeId, isActive: true }),
      this.getStoreCategories(storeId),
      Service.findOne({
        where: { storeId, isActive: true },
        attributes: [
          [Service.sequelize!.fn('AVG', Service.sequelize!.col('base_price')), 'avgPrice'],
        ],
        raw: true,
      }) as Promise<{ avgPrice: string } | null>,
    ]);

    return {
      total,
      active,
      inactive: total - active,
      categories: categories.length,
      averagePrice: priceStats ? parseFloat(priceStats.avgPrice) : 0,
    };
  }

  /**
   * Build where clause from filters
   */
  private buildWhereClause(filters: ServiceFilters): any {
    const whereClause: any = {};

    if (filters.storeId) {
      whereClause.storeId = filters.storeId;
    }

    if (filters.isActive !== undefined) {
      whereClause.isActive = filters.isActive;
    }

    if (filters.category) {
      whereClause.category = { [Op.iLike]: filters.category };
    }

    if (filters.name) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${filters.name}%` } },
        { description: { [Op.iLike]: `%${filters.name}%` } },
      ];
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const priceConditions: any = {};
      if (filters.minPrice !== undefined) {
        priceConditions[Op.gte] = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        priceConditions[Op.lte] = filters.maxPrice;
      }
      whereClause.basePrice = priceConditions;
    }

    return whereClause;
  }
}