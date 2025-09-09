/**
 * TypeScript Type Definitions for Role-Based HR Management Frontend
 * 
 * Generated from data-model.md - Feature 004-frontend-now-we
 * These types align with the GraphQL schema and support RBAC filtering
 */

// ============================================================================
// Core Authentication Types
// ============================================================================

export interface UserContext {
  id: string;
  email: string;
  full_name: string;
  roles: Role[];
  permissions: string[];
  department_id?: string;
  is_active: boolean;
  last_login: Date;
}

export interface Role {
  id: string;
  name: 'Employee' | 'Manager' | 'HR_Manager' | 'Admin';
  level: number; // 25=Employee, 50=Manager, 75=HR_Manager, 100=Admin
  description: string;
  inherits_from: string[];
  is_active: boolean;
}

export interface Permission {
  id: string;
  resource: string; // 'employees', 'departments', 'reports', etc.
  action: 'read' | 'write' | 'delete' | '*';
  scope?: 'own' | 'department' | 'all';
  permission_string: string; // 'employees:read:department'
}

// ============================================================================
// Employee & Department Types
// ============================================================================

export interface EmployeeProfile {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone?: string;
  department: Department;
  position: string;
  hire_date: Date;
  manager_id?: string;
  status: 'Active' | 'Inactive' | 'Terminated';
  personal_info?: PersonalInfo; // RBAC restricted
  employment_details?: EmploymentDetails; // RBAC restricted
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  manager_id?: string;
  parent_department_id?: string;
  employee_count: number;
  is_active: boolean;
}

export interface PersonalInfo {
  date_of_birth?: Date;
  address?: string;
  emergency_contact?: string;
}

export interface EmploymentDetails {
  salary?: number;
  benefits?: string[];
  performance_rating?: number; // 1-5 scale
}

// ============================================================================
// Custom Query & Analytics Types
// ============================================================================

export interface CustomQuery {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: Date;
  query_config: QueryConfiguration;
  visualization_type: 'table' | 'bar_chart' | 'line_chart' | 'pie_chart' | 'figure';
  filters: QueryFilter[];
  is_shared: boolean;
  allowed_roles: string[];
}

export interface QueryConfiguration {
  data_source: 'employees' | 'departments' | 'analytics' | 'reports';
  selected_fields: string[];
  aggregation_type?: 'count' | 'sum' | 'average' | 'min' | 'max';
  group_by_fields?: string[];
  sort_by?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  limit?: number;
}

export interface QueryFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
  value: any;
  data_type: 'string' | 'number' | 'date' | 'boolean' | 'array';
}

export interface VisualizationData {
  type: 'table' | 'bar_chart' | 'line_chart' | 'pie_chart' | 'figure';
  title: string;
  data: ChartDataPoint[] | TableRow[] | FigureData;
  metadata: {
    total_records: number;
    query_execution_time: number;
    last_updated: Date;
  };
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface TableRow {
  [key: string]: any;
}

export interface FigureData {
  image_url: string;
  alt_text: string;
  caption?: string;
}

// ============================================================================
// Dashboard & Widget Types
// ============================================================================

export interface DashboardWidget {
  type: string;
  title: string;
  data: any;
  permissions_required?: string[];
}

export interface DashboardData {
  widgets: DashboardWidget[];
  recent_activities: Activity[];
  notifications: Notification[];
}

export interface Activity {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  user_id?: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  count?: number;
  action_required?: boolean;
  created_at: Date;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiError {
  error: string;
  message: string;
  status_code: number;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormValidationResponse {
  valid: boolean;
  errors?: ValidationError[];
}

// ============================================================================
// RBAC Helper Types
// ============================================================================

export interface RBACContext {
  user: UserContext;
  permissions: string[];
  roles: Role[];
}

export interface RouteProtection {
  required_permissions?: string[];
  required_roles?: string[];
  allow_own_resource?: boolean;
}

export interface DataFilter {
  field: string;
  operation: 'equals' | 'in' | 'not_in';
  value: any;
}

// ============================================================================
// Form & UI Types
// ============================================================================

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'textarea' | 'date' | 'number';
  required: boolean;
  validation?: {
    min_length?: number;
    max_length?: number;
    pattern?: string;
    custom?: (value: any) => string | null;
  };
  options?: { label: string; value: any }[];
  placeholder?: string;
  help_text?: string;
}

export interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  submitting: boolean;
}

export interface LoadingState {
  loading: boolean;
  error?: string;
  data?: any;
}

// ============================================================================
// Navigation & Menu Types
// ============================================================================

export interface MenuItem {
  label: string;
  href?: string;
  icon?: string;
  children?: MenuItem[];
  permissions_required?: string[];
  roles_required?: string[];
  badge?: string | number;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// ============================================================================
// Event & Action Types
// ============================================================================

export interface UserAction {
  type: string;
  payload?: any;
  meta?: {
    user_id: string;
    timestamp: Date;
    permissions: string[];
  };
}

export interface QueryExecutionEvent {
  query_id: string;
  user_id: string;
  execution_time: number;
  result_count: number;
  success: boolean;
  error?: string;
}

// ============================================================================
// Store State Types (Svelte 5 Runes)
// ============================================================================

export interface AuthState {
  user: UserContext | null;
  permissions: string[];
  roles: Role[];
  loading: boolean;
  error: string | null;
}

export interface QueryState {
  queries: CustomQuery[];
  current_query: CustomQuery | null;
  execution_result: VisualizationData | null;
  loading: boolean;
  error: string | null;
}

export interface EmployeeState {
  employees: EmployeeProfile[];
  current_employee: EmployeeProfile | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  filters: {
    department_id?: string;
    status?: string;
    search?: string;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> & {
  [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
}[Keys];

export type RoleLevel = 25 | 50 | 75 | 100;
export type RoleName = 'Employee' | 'Manager' | 'HR_Manager' | 'Admin';
export type PermissionAction = 'read' | 'write' | 'delete' | '*';
export type PermissionScope = 'own' | 'department' | 'all';

// ============================================================================
// Component Props Types
// ============================================================================

export interface BaseComponentProps {
  class?: string;
  'data-testid'?: string;
}

export interface TableProps extends BaseComponentProps {
  data: any[];
  columns: {
    key: string;
    label: string;
    sortable?: boolean;
    render?: (value: any, row: any) => string;
  }[];
  loading?: boolean;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  actions?: {
    label: string;
    action: (row: any) => void;
    permissions_required?: string[];
  }[];
}

export interface ChartProps extends BaseComponentProps {
  data: ChartDataPoint[];
  title?: string;
  width?: number;
  height?: number;
  color_scheme?: string[];
  interactive?: boolean;
}

export interface FormProps extends BaseComponentProps {
  fields: FormField[];
  initial_values?: Record<string, any>;
  validation_schema?: any;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  loading?: boolean;
}

// ============================================================================
// HTTP Client Types
// ============================================================================

export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeout?: number;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface ApiClientConfig {
  base_url: string;
  default_headers?: Record<string, string>;
  timeout?: number;
  retry_config?: {
    attempts: number;
    delay: number;
  };
}

// ============================================================================
// Type Guards & Validation
// ============================================================================

export function isUserContext(obj: any): obj is UserContext {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.full_name === 'string' &&
    Array.isArray(obj.roles) &&
    Array.isArray(obj.permissions)
  );
}

export function isRole(obj: any): obj is Role {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    ['Employee', 'Manager', 'HR_Manager', 'Admin'].includes(obj.name) &&
    typeof obj.level === 'number'
  );
}

export function hasPermission(user: UserContext, permission: string): boolean {
  return user.permissions.includes(permission) || user.permissions.includes('*');
}

export function hasRole(user: UserContext, role: RoleName): boolean {
  return user.roles.some(r => r.name === role);
}

export function getRoleLevel(user: UserContext): number {
  return Math.max(...user.roles.map(r => r.level));
}

export function canAccessResource(
  user: UserContext, 
  resource: string, 
  action: PermissionAction = 'read',
  scope: PermissionScope = 'all'
): boolean {
  const permissionString = `${resource}:${action}:${scope}`;
  const wildcardResource = `${resource}:*`;
  const wildcardAction = `${resource}:${action}`;
  
  return (
    hasPermission(user, '*') ||
    hasPermission(user, permissionString) ||
    hasPermission(user, wildcardResource) ||
    hasPermission(user, wildcardAction)
  );
}

// ============================================================================
// Constants
// ============================================================================

export const ROLE_LEVELS: Record<RoleName, RoleLevel> = {
  Employee: 25,
  Manager: 50,
  HR_Manager: 75,
  Admin: 100
} as const;

export const VISUALIZATION_TYPES = [
  'table',
  'bar_chart', 
  'line_chart',
  'pie_chart',
  'figure'
] as const;

export const DATA_SOURCES = [
  'employees',
  'departments',
  'analytics', 
  'reports'
] as const;

export const EMPLOYEE_STATUSES = ['Active', 'Inactive', 'Terminated'] as const;

export const PERMISSION_ACTIONS = ['read', 'write', 'delete', '*'] as const;

export const PERMISSION_SCOPES = ['own', 'department', 'all'] as const;