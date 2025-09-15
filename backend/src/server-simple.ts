/**
 * Minimal PostGraphile Server Implementation
 * 
 * Basic Express.js server with PostGraphile middleware.
 * This is a minimal version to get the service running.
 */

import express from 'express';
import { postgraphile } from 'postgraphile';
import { Pool } from 'pg';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// Environment configuration
const PORT = parseInt(process.env.PORT || '3001', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres123@localhost:5432/hr_system';

// Create Express app
const app = express();

// PostgreSQL connection pool
const pgPool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  min: 4,
  idleTimeoutMillis: 60000,
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
} as any));

// CORS configuration
app.use(cors({
  origin: NODE_ENV === 'production' 
    ? ['https://your-production-domain.com'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

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

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbResult = await pgPool.query('SELECT 1');
    const dbHealthy = dbResult.rowCount > 0;

    res.status(dbHealthy ? 200 : 503).json({
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbHealthy ? 'healthy' : 'unhealthy',
          details: dbHealthy ? 'Connected' : 'Disconnected'
        },
        graphql: {
          status: 'healthy',
          details: 'PostGraphile middleware active'
        }
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Metrics endpoint (basic)
app.get('/metrics', (req, res) => {
  res.json({
    status: 'minimal',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// PostGraphile middleware configuration
const postgraphileOptions = {
  // Schema configuration
  schema: 'hr_public',
  jwtSecret: process.env.JWT_SECRET || 'development-jwt-secret',
  jwtRole: ['role'],
  defaultRole: 'hr_guest',
  
  // Development features
  watchPg: NODE_ENV === 'development',
  showErrorStack: NODE_ENV === 'development',
  extendedErrors: NODE_ENV === 'development' 
    ? ['hint', 'detail', 'errcode'] 
    : ['errcode'],
  
  // Query configuration
  dynamicJson: true,
  ignoreRBAC: false,
  ignoreIndexes: false,
  includeExtensionResources: false,
  
  // Performance and caching
  enableCors: false, // We handle CORS above
  legacyRelations: 'omit' as any,
  setofFunctionsContainNulls: false,
  
  // GraphiQL configuration
  graphiql: true,
  enhanceGraphiql: true,
  
  // Additional options
  allowExplain: NODE_ENV === 'development',
  
  // Production settings
  ...(NODE_ENV === 'production' ? {
    retryOnInitFail: true,
  } : {}),
};

// Apply PostGraphile middleware
app.use(
  postgraphile(pgPool, 'hr_public', postgraphileOptions)
);

// Basic request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${req.ip}`);
  next();
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 PostGraphile Server Started`);
  console.log(`📊 GraphQL API:     http://localhost:${PORT}/graphql`);
  console.log(`🔧 GraphiQL IDE:    http://localhost:${PORT}/graphiql`);
  console.log(`❤️ Health Check:    http://localhost:${PORT}/health`);
  console.log(`📈 Metrics:         http://localhost:${PORT}/metrics`);
  console.log(`🌍 Environment:     ${NODE_ENV}`);
  console.log(`🗄️ Database:        ${DATABASE_URL.split('@')[1] || DATABASE_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    pgPool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    pgPool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // It's not safe to continue after an uncaught exception
  process.exit(1);
});

export default app;