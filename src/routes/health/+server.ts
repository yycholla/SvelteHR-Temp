import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Health Check Endpoint
 * Provides system health status for monitoring and load balancers
 */

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: 'healthy' | 'degraded' | 'unhealthy';
    hasura: 'healthy' | 'degraded' | 'unhealthy';
    redis: 'healthy' | 'degraded' | 'unhealthy';
    auth: 'healthy' | 'degraded' | 'unhealthy';
  };
  metrics: {
    memoryUsage: number;
    responseTime: number;
  };
}

// Store startup time for uptime calculation
const startupTime = Date.now();

async function checkServiceHealth(url: string, timeout = 5000): Promise<'healthy' | 'degraded' | 'unhealthy'> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      signal: controller.signal,
      method: 'GET',
      headers: { 'User-Agent': 'SvelteHR-HealthCheck/1.0' }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return 'healthy';
    } else if (response.status >= 500) {
      return 'unhealthy';
    } else {
      return 'degraded';
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return 'degraded'; // Timeout
    }
    return 'unhealthy';
  }
}

export const GET: RequestHandler = async () => {
  const startTime = Date.now();
  
  try {
    // Check all external services
    const [databaseStatus, hasuraStatus, authStatus] = await Promise.allSettled([
      checkServiceHealth('http://postgres:5432'), // Basic TCP check would be better
      checkServiceHealth('http://hasura:8080/healthz'),
      checkServiceHealth('http://auth-service:3001/health')
    ]);

    // Redis check (simplified - in production use Redis client)
    const redisStatus = 'healthy'; // Placeholder

    // Calculate memory usage (Node.js specific)
    const memUsage = process.memoryUsage();
    const memoryUsage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Determine overall status
    const services = {
      database: databaseStatus.status === 'fulfilled' ? databaseStatus.value : 'unhealthy',
      hasura: hasuraStatus.status === 'fulfilled' ? hasuraStatus.value : 'unhealthy',
      redis: redisStatus,
      auth: authStatus.status === 'fulfilled' ? authStatus.value : 'unhealthy'
    };

    const serviceStatuses = Object.values(services);
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';

    if (serviceStatuses.every(status => status === 'healthy')) {
      overallStatus = 'healthy';
    } else if (serviceStatuses.some(status => status === 'unhealthy')) {
      overallStatus = 'unhealthy';
    } else {
      overallStatus = 'degraded';
    }

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startupTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      services,
      metrics: {
        memoryUsage,
        responseTime
      }
    };

    // Return appropriate HTTP status based on health
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    return json(healthStatus, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    
    const healthStatus: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startupTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'unhealthy',
        hasura: 'unhealthy',
        redis: 'unhealthy',
        auth: 'unhealthy'
      },
      metrics: {
        memoryUsage: 0,
        responseTime: Date.now() - startTime
      }
    };

    return json(healthStatus, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
  }
};