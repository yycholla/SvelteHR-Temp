/**
 * PostGraphile Server Implementation
 *
 * Complete Express.js server with PostGraphile middleware integration.
 * Implements JWT authentication, role switching, caching, and monitoring.
 */

import express from 'express';
import { postgraphile } from 'postgraphile';
import { Pool } from 'pg';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import Redis from 'ioredis';
import cookieParser from 'cookie-parser';
import winston from 'winston';
import jwt from 'jsonwebtoken';
import { hrPlugins } from './plugins/hr-graphql-plugins';
import { HRValidationPlugin } from './plugins/hr-validation-plugin';
import {
  HRMetricsCollector,
  createHRRateLimitingMiddleware,
  getHealthCheckData
} from './plugins/hr-monitoring-plugin';

// Environment configuration
const PORT = parseInt(process.env.PORT || '4000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres123@localhost:5432/hr_system';
const JWT_SECRET =
  process.env.JWT_SECRET || 'development-jwt-secret-change-in-production';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Configure Winston logger
const logger = winston.createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'postgraphile-server' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Create Express app
const app = express();

// PostgreSQL connection pool
const pgPool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  min: 4,
  idleTimeoutMillis: 60000,
});

// Redis client for caching
const redis = new Redis(REDIS_URL);

// Initialize HR metrics collector
const metricsCollector = new HRMetricsCollector(redis);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  } as any)
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);

      const allowedOrigins =
        NODE_ENV === 'production'
          ? ['https://your-production-domain.com']
          : [
              'http://localhost:5173',
              'http://localhost:5174',
              'http://localhost:3000',
              'http://localhost:4000',
            ];

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS origin not allowed', { origin, allowedOrigins });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Client-Name',
      'X-Client-Version',
    ],
    exposedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === 'production' ? 100 : 1000, // requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/graphql', limiter);

// Body parsing and compression
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// HR Monitoring and Rate Limiting Middleware
app.use(createHRRateLimitingMiddleware(redis, metricsCollector));

// Request logging
app.use((req, res, next) => {
  logger.info('Request received', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// Enhanced health check endpoint with monitoring data
app.get('/health', async (req, res) => {
  try {
    const healthCheckFn = getHealthCheckData(metricsCollector, redis, pgPool);
    const healthData = await healthCheckFn();

    // Determine overall status
    const isHealthy = healthData.services?.database?.status === 'up' &&
                      healthData.services?.redis?.status === 'up';

    const statusCode = isHealthy ? 200 : 503;
    const overallStatus = isHealthy ? 'healthy' : 'unhealthy';

    res.status(statusCode).json({
      status: overallStatus,
      ...healthData
    });
  } catch (error: any) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        database: 'unknown',
        redis: 'unknown'
      }
    });
  }
});

// Enhanced metrics endpoint with HR-specific data
app.get('/metrics', (req, res) => {
  const systemHealth = metricsCollector.getSystemHealth();
  res.json(systemHealth);
});

// JWT authentication middleware - simplified for built-in JWT handling
// PostGraphile handles JWT authentication automatically with jwtSecret option
// This plugin adds additional context processing
const jwtAuthMiddleware: any = (builder) => {
  // Hook into the GraphQL context to add HR-specific JWT claims
  builder.hook('build', (build) => {
    // Add JWT claim processing to the build context
    build.pgJwtClaims = (token: string) => {
      if (!token) return null;

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        return {
          user_id: decoded.user_id,
          employee_id: decoded.employee_id,
          role: decoded.role || 'hr_guest',
          role_level: decoded.role_level || 0,
          department_id: decoded.department_id,
          email: decoded.email,
        };
      } catch (error) {
        logger.warn('JWT verification failed', { error: error.message });
        return null;
      }
    };

    return build;
  });

  return builder;
};

// Custom PostGraphile plugins - using built-in JWT support
const customPlugins = [
  jwtAuthMiddleware,
  HRValidationPlugin,
  ...hrPlugins
];

// PostGraphile options
const postgraphileOptions = {
  // Schema configuration
  schema: 'hr_public',

  // Authentication and security
  jwtSecret: JWT_SECRET,
  defaultRole: 'hr_guest',
  jwtPgTypeIdentifier: 'hr_public.jwt_token',

  // GraphQL configuration
  graphiql: NODE_ENV === 'development',
  enhanceGraphiql: NODE_ENV === 'development',
  allowExplain: NODE_ENV === 'development',

  // Performance and caching
  enableCors: false, // We handle CORS above
  legacyRelations: 'omit' as any,
  setofFunctionsContainNulls: false,

  // Plugin configuration
  appendPlugins: customPlugins,

  // Development features
  watchPg: NODE_ENV === 'development',
  showErrorStack: NODE_ENV === 'development',
  extendedErrors:
    NODE_ENV === 'development' ? ['hint', 'detail', 'errcode'] : ['errcode'],

  // Query configuration
  dynamicJson: true,
  ignoreRBAC: false,
  ignoreIndexes: false,
  includeExtensionResources: false,

  // Basic configuration without custom plugins for now
  // pluginHook will be added back once plugin system is stabilized

  // Additional options for production
  ...(NODE_ENV === 'production'
    ? {
        retryOnInitFail: true,
        ownerConnectionString: DATABASE_URL,
      }
    : {}),
};

// Add PostGraphile middleware
app.use(postgraphile(pgPool, 'hr_public', postgraphileOptions));

// Error handling middleware
app.use(
  (
    error: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error('Unhandled error', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
    });

    res.status(500).json({
      error:
        NODE_ENV === 'production' ? 'Internal server error' : error.message,
      timestamp: new Date().toISOString(),
    });
  }
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');

  try {
    await pgPool.end();
    await redis.quit();
    logger.info('Services shutdown complete');
    process.exit(0);
  } catch (error: any) {
    logger.error('Error during shutdown', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');

  try {
    await pgPool.end();
    await redis.quit();
    logger.info('Services shutdown complete');
    process.exit(0);
  } catch (error: any) {
    logger.error('Error during shutdown', error);
    process.exit(1);
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`PostGraphile server started`, {
    port: PORT,
    environment: NODE_ENV,
    graphiql:
      NODE_ENV === 'development' ? `http://localhost:${PORT}/graphiql` : false,
    endpoint: `http://localhost:${PORT}/graphql`,
    health_endpoint: `http://localhost:${PORT}/health`,
  });

  logger.info('All services started successfully');
});

export default app;
