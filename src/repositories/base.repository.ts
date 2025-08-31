import { Model, ModelStatic, FindOptions, CreateOptions, UpdateOptions, DestroyOptions, CountOptions, Transaction } from 'sequelize';

export interface BaseRepositoryOptions {
  include?: any[];
  where?: any;
  order?: any;
  limit?: number;
  offset?: number;
  transaction?: Transaction;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export abstract class BaseRepository<T extends Model> {
  protected model: ModelStatic<T>;

  constructor(model: ModelStatic<T>) {
    this.model = model;
  }

  /**
   * Find all records with optional filtering and pagination
   */
  async findAll(options: BaseRepositoryOptions = {}): Promise<T[]> {
    const findOptions: FindOptions = {
      where: options.where,
      include: options.include,
      order: options.order,
      limit: options.limit,
      offset: options.offset,
      transaction: options.transaction,
    };

    return await this.model.findAll(findOptions);
  }

  /**
   * Find a single record by ID
   */
  async findById(id: string, options: BaseRepositoryOptions = {}): Promise<T | null> {
    const findOptions: FindOptions = {
      where: { id },
      include: options.include,
      transaction: options.transaction,
    };

    return await this.model.findByPk(id, findOptions);
  }

  /**
   * Find a single record by criteria
   */
  async findOne(where: any, options: BaseRepositoryOptions = {}): Promise<T | null> {
    const findOptions: FindOptions = {
      where,
      include: options.include,
      transaction: options.transaction,
    };

    return await this.model.findOne(findOptions);
  }

  /**
   * Create a new record
   */
  async create(data: any, options: CreateOptions = {}): Promise<T> {
    return await this.model.create(data, options);
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: any, options: BaseRepositoryOptions = {}): Promise<T | null> {
    const updateOptions: UpdateOptions = {
      where: { id },
      transaction: options.transaction,
    };

    const [affectedCount] = await this.model.update(data, updateOptions);

    if (affectedCount === 0) {
      return null;
    }

    return await this.findById(id, { transaction: options.transaction });
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string, options: DestroyOptions = {}): Promise<boolean> {
    const affectedCount = await this.model.destroy({
      where: { id },
      ...options,
    });

    return affectedCount > 0;
  }

  /**
   * Count records with optional filtering
   */
  async count(where: any = {}, options: CountOptions = {}): Promise<number> {
    return await this.model.count({
      where,
      ...options,
    });
  }

  /**
   * Check if a record exists
   */
  async exists(where: any, options: BaseRepositoryOptions = {}): Promise<boolean> {
    const count = await this.model.count({
      where,
      transaction: options.transaction,
    });

    return count > 0;
  }

  /**
   * Find records with pagination
   */
  async findWithPagination(
    paginationOptions: PaginationOptions,
    repositoryOptions: BaseRepositoryOptions = {}
  ): Promise<PaginatedResult<T>> {
    const { page, limit, sortBy, sortOrder } = paginationOptions;
    const offset = (page - 1) * limit;

    // Build order clause
    let order: any = undefined;
    if (sortBy) {
      order = [[sortBy, sortOrder || 'ASC']];
    } else if (repositoryOptions.order) {
      order = repositoryOptions.order;
    }

    const findOptions: FindOptions = {
      where: repositoryOptions.where,
      include: repositoryOptions.include,
      order,
      limit,
      offset,
      transaction: repositoryOptions.transaction,
    };

    const { rows: data, count: total } = await this.model.findAndCountAll(findOptions);

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  /**
   * Bulk create records
   */
  async bulkCreate(data: any[], options: any = {}): Promise<T[]> {
    return await this.model.bulkCreate(data, options);
  }

  /**
   * Bulk update records
   */
  async bulkUpdate(data: any, where: any, options: BaseRepositoryOptions = {}): Promise<number> {
    const updateOptions: UpdateOptions = {
      where,
      transaction: options.transaction,
    };

    const [affectedCount] = await this.model.update(data, updateOptions);

    return affectedCount;
  }

  /**
   * Bulk delete records
   */
  async bulkDelete(where: any, options: DestroyOptions = {}): Promise<number> {
    return await this.model.destroy({
      where,
      ...options,
    });
  }
}