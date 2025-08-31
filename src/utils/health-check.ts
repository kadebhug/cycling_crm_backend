import { Request, Response } from 'express';
import { checkDatabaseHealth } from './database';
import { logger } from './logger';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: {
      status: 'up' | 'down';
      responseTime?: number;
    };
    api: {
      status: 'up';
      uptime: number;
    };
  };
}

/**
 * Health check endpoint handler
 */
export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    // Check database health
    const isDatabaseHealthy = await checkDatabaseHealth();
    const dbResponseTime = Date.now() - startTime;
    
    const healthStatus: HealthStatus = {
      status: isDatabaseHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: isDatabaseHealthy ? 'up' : 'down',
          responseTime: dbResponseTime,
        },
        api: {
          status: 'up',
          uptime: process.uptime(),
        },
      },
    };
    
    const statusCode = isDatabaseHealthy ? 200 : 503;
    res.status(statusCode).json(healthStatus);
    
  } catch (error) {
    logger.error('Health check failed:', error);
    
    const healthStatus: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: 'down',
        },
        api: {
          status: 'up',
          uptime: process.uptime(),
        },
      },
    };
    
    res.status(503).json(healthStatus);
  }
};

export default healthCheck;