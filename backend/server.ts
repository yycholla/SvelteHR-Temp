import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createProxyMiddleware } from 'http-proxy-middleware';
import authRoutes from './routes/auth';
import { redisClient } from './lib/redis';

/**
 * Express.js Backend Server for HR System
 * Provides authentication services and proxies GraphQL requests to Hasura
 */

const app = express();
const PORT = process.env.PORT || 3001;
const HASURA_URL = process.env.HASURA_GRAPHQL_URL || 'http://localhost:8080';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", HASURA_URL],
      },
    },
    crossOriginEmbedderPolicy: false, // Needed for GraphQL playground in development
  })
);

// Compression middleware
app.use(
  compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: [
      'http://localhost:5173', // SvelteKit dev server
      'http://localhost:5174', // Alternative SvelteKit port
      'http://localhost:8080', // Hasura console
      ...(process.env.CORS_ORIGINS?.split(',') || []),
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Device-Info',
      'X-Hasura-Role',
      'X-Hasura-User-Id',
    ],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging middleware (development only)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const redisStatus = redisClient.getConnectionStatus();
    const startTime = Date.now();

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        redis: redisStatus ? 'connected' : 'disconnected',
        hasura: 'checking...',
      },
    };

    // Quick Hasura health check
    try {
      const hasuraHealthResponse = await fetch(`${HASURA_URL}/healthz`);
      health.services.hasura = hasuraHealthResponse.ok
        ? 'healthy'
        : 'unhealthy';
    } catch {
      health.services.hasura = 'unreachable';
    }

    const responseTime = Date.now() - startTime;

    res.set('X-Response-Time', `${responseTime}ms`);
    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// Authentication routes
app.use('/auth', authRoutes);

// GraphQL proxy to Hasura with authentication injection
app.use(
  '/graphql',
  createProxyMiddleware({
    target: HASURA_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/graphql': '/v1/graphql',
    },
    onProxyReq: async (proxyReq, req, res) => {
      // Inject Hasura headers from JWT if present
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const { JWTMiddleware } = await import('./auth/jwt-middleware');
          const token = authHeader.substring(7);

          // Validate token and extract Hasura headers
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'fallback-secret'
          );

          if (decoded.hasura) {
            // Set Hasura session variables
            proxyReq.setHeader('X-Hasura-User-Id', decoded.hasura.user_id);
            proxyReq.setHeader('X-Hasura-Role', decoded.hasura.default_role);
            proxyReq.setHeader(
              'X-Hasura-Allowed-Roles',
              decoded.hasura.allowed_roles.join(',')
            );

            if (decoded.hasura.user_email) {
              proxyReq.setHeader(
                'X-Hasura-User-Email',
                decoded.hasura.user_email
              );
            }

            if (decoded.hasura.user_department_id) {
              proxyReq.setHeader(
                'X-Hasura-User-Department-Id',
                decoded.hasura.user_department_id
              );
            }

            if (decoded.hasura.user_manager_id) {
              proxyReq.setHeader(
                'X-Hasura-User-Manager-Id',
                decoded.hasura.user_manager_id
              );
            }

            if (decoded.hasura.user_role_level) {
              proxyReq.setHeader(
                'X-Hasura-User-Role-Level',
                decoded.hasura.user_role_level
              );
            }
          }
        } catch (error) {
          console.error('JWT validation error in GraphQL proxy:', error);
          // Continue without headers - let Hasura handle the invalid token
        }
      }

      // Set admin secret for internal requests
      if (req.headers['x-hasura-admin-secret']) {
        proxyReq.setHeader(
          'X-Hasura-Admin-Secret',
          req.headers['x-hasura-admin-secret'] as string
        );
      }
    },
    onError: (err, req, res) => {
      console.error('GraphQL proxy error:', err);
      res.status(500).json({
        error: 'GraphQL service unavailable',
        message: 'Unable to connect to GraphQL endpoint',
      });
    },
  })
);

// Admin GraphQL endpoint with admin secret
app.use(
  '/admin/graphql',
  createProxyMiddleware({
    target: HASURA_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/admin/graphql': '/v1/graphql',
    },
    onProxyReq: (proxyReq, req, res) => {
      // Always use admin secret for admin requests
      proxyReq.setHeader(
        'X-Hasura-Admin-Secret',
        process.env.HASURA_GRAPHQL_ADMIN_SECRET || 'admin-secret'
      );

      // Remove any user-specific headers
      proxyReq.removeHeader('authorization');
      proxyReq.removeHeader('x-hasura-user-id');
      proxyReq.removeHeader('x-hasura-role');
    },
  })
);

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error('Unhandled error:', err);

    res.status(500).json({
      error: 'Internal server error',
      message:
        NODE_ENV === 'development' ? err.message : 'Something went wrong',
      timestamp: new Date().toISOString(),
    });
  }
);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');

  try {
    await redisClient.disconnect();
    console.log('Redis connection closed');
  } catch (error) {
    console.error('Error closing Redis connection:', error);
  }

  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');

  try {
    await redisClient.disconnect();
    console.log('Redis connection closed');
  } catch (error) {
    console.error('Error closing Redis connection:', error);
  }

  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 HR Backend Server running on port ${PORT}`);
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🔗 Hasura URL: ${HASURA_URL}`);
  console.log(`🍪 CORS Origins: ${process.env.CORS_ORIGINS || 'localhost'}`);

  if (NODE_ENV === 'development') {
    console.log(`\n📋 Available endpoints:`);
    console.log(`   GET  /health           - Health check`);
    console.log(`   POST /auth/login       - User login`);
    console.log(`   POST /auth/refresh     - Refresh token`);
    console.log(`   POST /auth/logout      - User logout`);
    console.log(`   GET  /auth/me          - Current user info`);
    console.log(`   POST /graphql          - GraphQL API (authenticated)`);
    console.log(`   POST /admin/graphql    - GraphQL API (admin)`);
  }
});

export default app;
