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

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbResult = await pgPool.query('SELECT 1');

    // Check Redis connection
    const redisResult = await redis.ping();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbResult.rows.length > 0 ? 'up' : 'down',
        redis: redisResult === 'PONG' ? 'up' : 'down',
      },
    });
  } catch (error: any) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Basic metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

// JWT authentication middleware
const jwtAuthMiddleware: any = (build) => {
  build.hook('postgraphile:http:handler', (req, { pgSettings }) => {
    const authHeader = req.get('Authorization');
    const token =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        // Set PostgreSQL session variables from JWT claims
        pgSettings['jwt.claims.user_id'] = decoded.user_id?.toString() || '';
        pgSettings['jwt.claims.employee_id'] =
          decoded.employee_id?.toString() || '';
        pgSettings['jwt.claims.role'] = decoded.role || 'hr_guest';
        pgSettings['jwt.claims.role_level'] =
          decoded.role_level?.toString() || '0';
        pgSettings['jwt.claims.department_id'] =
          decoded.department_id?.toString() || '';
        pgSettings['jwt.claims.email'] = decoded.email || '';
        pgSettings['jwt.claims.exp'] = decoded.exp?.toString() || '';

        // Set the database role
        pgSettings.role = decoded.role || 'hr_guest';

        logger.debug('JWT authentication successful', {
          user_id: decoded.user_id,
          role: decoded.role,
          role_level: decoded.role_level,
        });
      } catch (error) {
        logger.warn('JWT authentication failed', { error: error.message });
        // Fall back to guest role
        pgSettings.role = 'hr_guest';
        pgSettings['jwt.claims.role'] = 'hr_guest';
        pgSettings['jwt.claims.role_level'] = '0';
      }
    } else {
      // No token provided, use guest role
      pgSettings.role = 'hr_guest';
      pgSettings['jwt.claims.role'] = 'hr_guest';
      pgSettings['jwt.claims.role_level'] = '0';
    }

    return req;
  });

  return build;
};

// Custom PostGraphile plugins - simplified for now
const customPlugins = [
  // jwtAuthMiddleware will be added back once authentication is stabilized
  // ...hrPlugins(redis) will be added back once HR plugins are stabilized
  // ...securityPlugins(redis) will be added back once security plugins are stabilized
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
