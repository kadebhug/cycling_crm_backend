import { Transaction } from 'sequelize';
import { 
  ServiceRepository, 
  ServiceFilters, 
  ServiceCreateData, 
  ServiceUpdateData 
} from '../repositories/service.repository';
import { Service, Store } from '../database/models';
import { PaginationOptions, PaginatedResult } from '../repositories/base.repository';

export interface ServiceListOptions {
  filters?: ServiceFilters;
  pagination?: PaginationOptions;
  includeInactive?: boolean;
}

export interface ServiceValidationError {
  field: string;
  message: string;
}

export class ServiceService {
  private serviceRepository: ServiceRepository;

  constructor() {
    this.serviceRepository = new ServiceRepository();
  }

  /**
   * Get all services for a store with optional filtering and pagination
   */
  async getStoreServices(
    storeId: string,
    options: ServiceListOptions = {}
  ): Promise<PaginatedResult<Service> | Service[]> {
    // Verify store exists
    await this.validateStoreExists(storeId);

    const filters: ServiceFilters = {
      storeId,
      ...options.filters,
    };

    // Set default active filter if not specified
    if (filters.isActive === undefined && !options.includeInactive) {
      filters.isActive = true;
    }

    if (options.pagination) {
      return await this.serviceRepository.findWithFilters(
        filters,
        options.pagination,
        {
          include: [{
            association: 'store',
            attributes: ['id', 'name'],
          }],
        }
      );
    }

    return await this.serviceRepository.findByStore(storeId, filters, {
      include: [{
        association: 'store',
        attributes: ['id', 'name'],
      }],
    });
  }

  /**
   * Get active services for a store
   */
  async getActiveStoreServices(storeId: string): Promise<Service[]> {
    await this.validateStoreExists(storeId);
    return await this.serviceRepository.findActiveByStore(storeId, {
      include: [{
        association: 'store',
        attributes: ['id', 'name'],
      }],
    });
  }

  /**
   * Get services by category
   */
  async getServicesByCategory(storeId: string, category: string): Promise<Service[]> {
    await this.validateStoreExists(storeId);
    return await this.serviceRepository.findByCategory(storeId, category);
  }

  /**
   * Search services by name or description
   */
  async searchServices(storeId: string, searchTerm: string): Promise<Service[]> {
    await this.validateStoreExists(storeId);
    
    if (!searchTerm.trim()) {
      throw new Error('Search term cannot be empty');
    }

    return await this.serviceRepository.searchByName(storeId, searchTerm.trim());
  }

  /**
   * Get a single service by ID
   */
  async getServiceById(serviceId: string, storeId?: string): Promise<Service> {
    const service = await this.serviceRepository.findById(serviceId, {
      include: [{
        association: 'store',
        attributes: ['id', 'name'],
      }],
    });

    if (!service) {
      throw new Error('Service not found');
    }

    // Verify store access if storeId is provided
    if (storeId && service.storeId !== storeId) {
      throw new Error('Service not found in the specified store');
    }

    return service;
  }

  /**
   * Create a new service
   */
  async createService(
    storeId: string,
    serviceData: Omit<ServiceCreateData, 'storeId'>,
    transaction?: Transaction
  ): Promise<Service> {
    // Verify store exists
    await this.validateStoreExists(storeId);

    // Validate service data
    await this.validateServiceData({ ...serviceData, storeId });

    // Check if service name already exists in store
    const nameExists = await this.serviceRepository.isNameTaken(storeId, serviceData.name);
    if (nameExists) {
      throw new Error('A service with this name already exists in the store');
    }

    const createData: ServiceCreateData = {
      ...serviceData,
      storeId,
      isActive: serviceData.isActive ?? true,
    };

    return await this.serviceRepository.createService(createData);
  }

  /**
   * Update an existing service
   */
  async updateService(
    serviceId: string,
    storeId: string,
    updateData: ServiceUpdateData,
    transaction?: Transaction
  ): Promise<Service> {
    // Get existing service and verify it belongs to the store
    const existingService = await this.getServiceById(serviceId, storeId);

    // Validate update data
    if (Object.keys(updateData).length === 0) {
      throw new Error('No update data provided');
    }

    await this.validateServiceUpdateData(updateData);

    // Check if name is being changed and if it conflicts
    if (updateData.name && updateData.name !== existingService.name) {
      const nameExists = await this.serviceRepository.isNameTaken(
        storeId,
        updateData.name,
        serviceId
      );
      if (nameExists) {
        throw new Error('A service with this name already exists in the store');
      }
    }

    const updatedService = await this.serviceRepository.updateService(serviceId, updateData);
    if (!updatedService) {
      throw new Error('Failed to update service');
    }

    return updatedService;
  }

  /**
   * Activate a service
   */
  async activateService(serviceId: string, storeId: string): Promise<Service> {
    // Verify service exists and belongs to store
    await this.getServiceById(serviceId, storeId);

    const service = await this.serviceRepository.activateService(serviceId);
    if (!service) {
      throw new Error('Failed to activate service');
    }

    return service;
  }

  /**
   * Deactivate a service
   */
  async deactivateService(serviceId: string, storeId: string): Promise<Service> {
    // Verify service exists and belongs to store
    await this.getServiceById(serviceId, storeId);

    const service = await this.serviceRepository.deactivateService(serviceId);
    if (!service) {
      throw new Error('Failed to deactivate service');
    }

    return service;
  }

  /**
   * Delete a service (soft delete by deactivating)
   */
  async deleteService(serviceId: string, storeId: string): Promise<void> {
    await this.deactivateService(serviceId, storeId);
  }

  /**
   * Get service categories for a store
   */
  async getStoreCategories(storeId: string): Promise<string[]> {
    await this.validateStoreExists(storeId);
    return await this.serviceRepository.getStoreCategories(storeId);
  }

  /**
   * Get common service categories
   */
  getCommonCategories(): string[] {
    return Service.getCommonCategories();
  }

  /**
   * Get price range for store services
   */
  async getStorePriceRange(storeId: string): Promise<{ min: number; max: number } | null> {
    await this.validateStoreExists(storeId);
    return await this.serviceRepository.getStorePriceRange(storeId);
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
    await this.validateStoreExists(storeId);
    return await this.serviceRepository.getStoreServiceStats(storeId);
  }

  /**
   * Validate that a store exists
   */
  private async validateStoreExists(storeId: string): Promise<void> {
    const store = await Store.findByPk(storeId);
    if (!store) {
      throw new Error('Store not found');
    }
    if (!store.isActive) {
      throw new Error('Store is not active');
    }
  }

  /**
   * Validate service creation data
   */
  private async validateServiceData(data: ServiceCreateData): Promise<void> {
    const errors: ServiceValidationError[] = [];

    // Validate required fields
    if (!data.name || data.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Service name is required' });
    } else if (data.name.length > 255) {
      errors.push({ field: 'name', message: 'Service name must be 255 characters or less' });
    }

    if (data.basePrice === undefined || data.basePrice === null) {
      errors.push({ field: 'basePrice', message: 'Base price is required' });
    } else if (data.basePrice < 0) {
      errors.push({ field: 'basePrice', message: 'Base price must be non-negative' });
    } else if (data.basePrice > 999999.99) {
      errors.push({ field: 'basePrice', message: 'Base price is too large' });
    }

    // Validate optional fields
    if (data.description && data.description.length > 5000) {
      errors.push({ field: 'description', message: 'Description must be 5000 characters or less' });
    }

    if (data.estimatedDuration !== undefined && data.estimatedDuration !== null) {
      if (data.estimatedDuration < 1) {
        errors.push({ field: 'estimatedDuration', message: 'Estimated duration must be at least 1 minute' });
      } else if (data.estimatedDuration > 10080) {
        errors.push({ field: 'estimatedDuration', message: 'Estimated duration cannot exceed 1 week (10080 minutes)' });
      }
    }

    if (data.category && data.category.length > 100) {
      errors.push({ field: 'category', message: 'Category must be 100 characters or less' });
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.map(e => `${e.field}: ${e.message}`).join(', ')}`);
    }
  }

  /**
   * Validate service update data
   */
  private async validateServiceUpdateData(data: ServiceUpdateData): Promise<void> {
    const errors: ServiceValidationError[] = [];

    // Validate fields if they are provided
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        errors.push({ field: 'name', message: 'Service name cannot be empty' });
      } else if (data.name.length > 255) {
        errors.push({ field: 'name', message: 'Service name must be 255 characters or less' });
      }
    }

    if (data.basePrice !== undefined) {
      if (data.basePrice < 0) {
        errors.push({ field: 'basePrice', message: 'Base price must be non-negative' });
      } else if (data.basePrice > 999999.99) {
        errors.push({ field: 'basePrice', message: 'Base price is too large' });
      }
    }

    if (data.description !== undefined && data.description && data.description.length > 5000) {
      errors.push({ field: 'description', message: 'Description must be 5000 characters or less' });
    }

    if (data.estimatedDuration !== undefined && data.estimatedDuration !== null) {
      if (data.estimatedDuration < 1) {
        errors.push({ field: 'estimatedDuration', message: 'Estimated duration must be at least 1 minute' });
      } else if (data.estimatedDuration > 10080) {
        errors.push({ field: 'estimatedDuration', message: 'Estimated duration cannot exceed 1 week (10080 minutes)' });
      }
    }

    if (data.category !== undefined && data.category && data.category.length > 100) {
      errors.push({ field: 'category', message: 'Category must be 100 characters or less' });
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.map(e => `${e.field}: ${e.message}`).join(', ')}`);
    }
  }
}