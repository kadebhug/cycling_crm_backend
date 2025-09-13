import { Request, Response } from 'express';
import { ServiceService } from '../services/service.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { PaginationOptions } from '../repositories/base.repository';

export class ServiceController {
  private serviceService: ServiceService;

  constructor() {
    this.serviceService = new ServiceService();
  }

  /**
   * Get all services for a store
   * GET /api/stores/:storeId/services
   */
  getStoreServices = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId } = req.params;
      const {
        page = '1',
        limit = '20',
        sortBy = 'name',
        sortOrder = 'ASC',
        category,
        name,
        minPrice,
        maxPrice,
        includeInactive = 'false',
      } = req.query;

      // Build pagination options
      const pagination: PaginationOptions = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        sortBy: sortBy as string,
        sortOrder: (sortOrder as string).toUpperCase() as 'ASC' | 'DESC',
      };

      // Build filters
      const filters: any = {};
      if (category) filters.category = category as string;
      if (name) filters.name = name as string;
      if (minPrice) filters.minPrice = parseFloat(minPrice as string);
      if (maxPrice) filters.maxPrice = parseFloat(maxPrice as string);

      const services = await this.serviceService.getStoreServices(storeId, {
        filters,
        pagination,
        includeInactive: includeInactive === 'true',
      });

      res.status(200).json({
        success: true,
        data: services,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error getting store services:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_SERVICES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get services',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Get active services for a store (simplified endpoint)
   * GET /api/stores/:storeId/services/active
   */
  getActiveStoreServices = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId } = req.params;

      const services = await this.serviceService.getActiveStoreServices(storeId);

      res.status(200).json({
        success: true,
        data: services,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error getting active store services:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_ACTIVE_SERVICES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get active services',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Get a single service by ID
   * GET /api/stores/:storeId/services/:serviceId
   */
  getServiceById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId, serviceId } = req.params;

      const service = await this.serviceService.getServiceById(serviceId, storeId);

      res.status(200).json({
        success: true,
        data: service,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error getting service:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 404 ? 'SERVICE_NOT_FOUND' : 'GET_SERVICE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get service',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Create a new service
   * POST /api/stores/:storeId/services
   */
  createService = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId } = req.params;
      const serviceData = req.body;

      const service = await this.serviceService.createService(storeId, serviceData);

      res.status(201).json({
        success: true,
        data: service,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error creating service:', error);
      const statusCode = error instanceof Error && 
        (error.message.includes('already exists') || error.message.includes('Validation failed')) ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 400 ? 'SERVICE_CREATION_FAILED' : 'CREATE_SERVICE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create service',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Update an existing service
   * PUT /api/stores/:storeId/services/:serviceId
   */
  updateService = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId, serviceId } = req.params;
      const updateData = req.body;

      const service = await this.serviceService.updateService(serviceId, storeId, updateData);

      res.status(200).json({
        success: true,
        data: service,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error updating service:', error);
      let statusCode = 500;
      let errorCode = 'UPDATE_SERVICE_ERROR';

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          statusCode = 404;
          errorCode = 'SERVICE_NOT_FOUND';
        } else if (error.message.includes('already exists') || error.message.includes('Validation failed')) {
          statusCode = 400;
          errorCode = 'SERVICE_UPDATE_FAILED';
        }
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: error instanceof Error ? error.message : 'Failed to update service',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Activate a service
   * POST /api/stores/:storeId/services/:serviceId/activate
   */
  activateService = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId, serviceId } = req.params;

      const service = await this.serviceService.activateService(serviceId, storeId);

      res.status(200).json({
        success: true,
        data: service,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error activating service:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 404 ? 'SERVICE_NOT_FOUND' : 'ACTIVATE_SERVICE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to activate service',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Deactivate a service
   * POST /api/stores/:storeId/services/:serviceId/deactivate
   */
  deactivateService = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId, serviceId } = req.params;

      const service = await this.serviceService.deactivateService(serviceId, storeId);

      res.status(200).json({
        success: true,
        data: service,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error deactivating service:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 404 ? 'SERVICE_NOT_FOUND' : 'DEACTIVATE_SERVICE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to deactivate service',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Delete a service (soft delete)
   * DELETE /api/stores/:storeId/services/:serviceId
   */
  deleteService = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId, serviceId } = req.params;

      await this.serviceService.deleteService(serviceId, storeId);

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting service:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 404 ? 'SERVICE_NOT_FOUND' : 'DELETE_SERVICE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete service',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Search services by name or description
   * GET /api/stores/:storeId/services/search
   */
  searchServices = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId } = req.params;
      const { q: searchTerm } = req.query;

      if (!searchTerm || typeof searchTerm !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'SEARCH_TERM_REQUIRED',
            message: 'Search term (q) is required',
            timestamp: new Date().toISOString(),
            path: req.path,
          },
        });
        return;
      }

      const services = await this.serviceService.searchServices(storeId, searchTerm);

      res.status(200).json({
        success: true,
        data: services,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error searching services:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_SERVICES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to search services',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Get services by category
   * GET /api/stores/:storeId/services/category/:category
   */
  getServicesByCategory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId, category } = req.params;

      const services = await this.serviceService.getServicesByCategory(storeId, category);

      res.status(200).json({
        success: true,
        data: services,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error getting services by category:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_SERVICES_BY_CATEGORY_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get services by category',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Get store service categories
   * GET /api/stores/:storeId/services/categories
   */
  getStoreCategories = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId } = req.params;

      const categories = await this.serviceService.getStoreCategories(storeId);

      res.status(200).json({
        success: true,
        data: categories,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error getting store categories:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_CATEGORIES_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get categories',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Get common service categories
   * GET /api/services/categories/common
   */
  getCommonCategories = async (req: Request, res: Response): Promise<void> => {
    try {
      const categories = this.serviceService.getCommonCategories();

      res.status(200).json({
        success: true,
        data: categories,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error getting common categories:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_COMMON_CATEGORIES_FAILED',
          message: 'Failed to get common categories',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Get store service statistics
   * GET /api/stores/:storeId/services/stats
   */
  getStoreServiceStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId } = req.params;

      const stats = await this.serviceService.getStoreServiceStats(storeId);

      res.status(200).json({
        success: true,
        data: stats,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error getting store service stats:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_SERVICE_STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get service statistics',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };

  /**
   * Get store price range
   * GET /api/stores/:storeId/services/price-range
   */
  getStorePriceRange = async (req: Request, res: Response): Promise<void> => {
    try {
      const { storeId } = req.params;

      const priceRange = await this.serviceService.getStorePriceRange(storeId);

      res.status(200).json({
        success: true,
        data: priceRange,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error getting store price range:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_PRICE_RANGE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get price range',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
    }
  };
}