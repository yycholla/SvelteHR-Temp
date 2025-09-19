export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  retryDelayOnFailover?: number;
  enableReadyCheck?: boolean;
  maxRetriesPerRequest?: number | null;
}
export interface JWTConfig {
  secret: string;
  refreshSecret: string;
  expirySeconds: number;
  refreshExpirySeconds: number;
}
export interface ServerConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  graphqlEndpoint: string;
  graphiqlEnabled: boolean;
  maxRequestSize: string;
  corsOrigins: string[];
}
export interface CacheConfig {
  defaultTTL: number;
  memoryCacheTTL: number;
  redisCacheTTL: number;
  enableCompression: boolean;
  maxKeys: number;
}
export interface PerformanceConfig {
  slowQueryThreshold: number;
  highConnectionThreshold: number;
  lowCacheHitRateThreshold: number;
  highMemoryThreshold: number;
  enableAutomaticOptimization: boolean;
}
export interface AppConfig {
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: JWTConfig;
  server: ServerConfig;
  cache: CacheConfig;
  performance: PerformanceConfig;
}
export interface User {
  id: number;
  email: string;
  role: string;
  roleLevel: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface Employee {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: number;
  managerId?: number;
  hireDate: Date;
  terminationDate?: Date;
  isOnLeave?: boolean;
  leaveUntil?: Date;
}
export interface AuthContext {
  isAuthenticated: boolean;
  user?: User;
  pgSettings: Record<string, string>;
}
export interface JWTPayload {
  user_id: number;
  employee_id?: number;
  role: string;
  role_level: number;
  email: string;
  department_id?: number;
  exp: number;
  iat: number;
}
export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, any>;
}
export interface GraphQLContext {
  pgSettings: Record<string, string>;
  user?: User;
  requestId?: string;
  authContext?: AuthContext;
}
