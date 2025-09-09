# Data Model: Role-Based HR Management Frontend

**Feature**: 004-frontend-now-we  
**Phase**: 1 (Design & Contracts)  
**Created**: 2025-09-09

## Entity Overview

This data model defines the frontend-specific entities and their relationships for the role-based HR management system. These entities represent the data structures that will be used in SvelteKit components and API interactions.

## Core Entities

### User Context
**Description**: Represents the authenticated user and their session context
**Purpose**: RBAC enforcement and user-specific data filtering

```typescript
interface UserContext {
  id: string;
  email: string;
  full_name: string;
  roles: Role[];
  permissions: Permission[];
  department_id?: string;
  is_active: boolean;
  last_login: Date;
}
```

**Relationships**:
- Has many: Role (many-to-many)
- Has many: Permission (derived from roles)
- Belongs to: Department (optional)

**Validation Rules**:
- `id` must be non-empty string
- `email` must be valid email format
- `roles` array must contain at least one role
- `permissions` computed from role hierarchy

### Employee Profile
**Description**: Employee information displayed based on user's access level
**Purpose**: Role-based employee data presentation

```typescript
interface EmployeeProfile {
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
  personal_info?: PersonalInfo; // Restricted by RBAC
  employment_details?: EmploymentDetails; // Restricted by RBAC
}
```

**Relationships**:
- Belongs to: Department
- Belongs to: Employee (manager, optional)
- Has one: PersonalInfo (RBAC restricted)
- Has one: EmploymentDetails (RBAC restricted)

**RBAC Filtering**:
- Employee role: Can only see own profile
- Manager role: Can see direct reports
- HR Manager role: Can see all employees in authorized departments
- Admin role: Can see all employee data

### Department
**Description**: Organizational structure for employee grouping
**Purpose**: RBAC scoping and organizational hierarchy

```typescript
interface Department {
  id: string;
  name: string;
  description?: string;
  manager_id?: string;
  parent_department_id?: string;
  employee_count: number;
  is_active: boolean;
}
```

**Relationships**:
- Has many: Employee
- Belongs to: Employee (manager, optional)
- Belongs to: Department (parent, optional)
- Has many: Department (children)

### Custom Query
**Description**: User-defined data queries with visualization preferences
**Purpose**: Customizable reporting and data visualization

```typescript
interface CustomQuery {
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
```

**Relationships**:
- Belongs to: UserContext (created_by)
- Has many: QueryFilter
- Has one: QueryConfiguration

**RBAC Rules**:
- Users can only create queries for data they have permission to access
- Shared queries require explicit role-based permissions
- Query results filtered by user's data access permissions

### Query Configuration
**Description**: Technical configuration for custom queries
**Purpose**: Define data sources and query parameters

```typescript
interface QueryConfiguration {
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
```

### Query Filter
**Description**: Individual filter conditions for custom queries
**Purpose**: Data filtering and query refinement

```typescript
interface QueryFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
  value: any;
  data_type: 'string' | 'number' | 'date' | 'boolean' | 'array';
}
```

### Visualization Data
**Description**: Processed data for chart and graph rendering
**Purpose**: Frontend data visualization components

```typescript
interface VisualizationData {
  type: 'table' | 'bar_chart' | 'line_chart' | 'pie_chart' | 'figure';
  title: string;
  data: ChartDataPoint[] | TableRow[] | FigureData;
  metadata: {
    total_records: number;
    query_execution_time: number;
    last_updated: Date;
  };
}
```

## RBAC-Specific Entities

### Role
**Description**: User authorization levels with hierarchical permissions
**Purpose**: RBAC enforcement and permission inheritance

```typescript
interface Role {
  id: string;
  name: 'Employee' | 'Manager' | 'HR_Manager' | 'Admin';
  level: number; // 25, 50, 75, 100 for hierarchy
  description: string;
  inherits_from: string[]; // Parent role IDs
  is_active: boolean;
}
```

### Permission
**Description**: Granular access control for specific operations
**Purpose**: Fine-grained RBAC enforcement

```typescript
interface Permission {
  id: string;
  resource: string; // 'employees', 'departments', 'reports', etc.
  action: 'read' | 'write' | 'delete' | '*';
  scope?: 'own' | 'department' | 'all';
  permission_string: string; // 'employees:read:department'
}
```

## State Transitions

### Employee Status Transitions
```
Active → Inactive (temporary leave)
Active → Terminated (permanent separation)
Inactive → Active (return from leave)
Terminated → (no transitions allowed)
```

### Query Status Transitions
```
Draft → Active (published query)
Active → Archived (deprecated query)
Archived → Active (reactivated query)
```

## Validation Rules

### User Context Validation
- All users must have at least one active role
- Email must be unique across the system
- Permissions computed dynamically from role hierarchy
- Session context refreshed on role changes

### Employee Profile Validation
- Employee ID must be unique and follow company format
- Hire date cannot be in the future
- Manager cannot be self-referential
- Department assignment required for active employees

### Custom Query Validation
- Query name must be unique per user
- Selected fields must exist in the specified data source
- Filters must match field data types
- Visualization type must be compatible with data structure

### RBAC Validation
- User can only access data within their permission scope
- Query results automatically filtered by user's access level
- Shared queries validated against recipient roles
- Administrative actions require explicit admin permissions

## Data Flow Patterns

### Server-Side Data Loading
```
1. User requests page
2. Server validates JWT token
3. Server determines user's roles and permissions
4. Server fetches data filtered by permissions
5. Server returns role-appropriate data to client
6. Client renders based on received data
```

### Custom Query Execution
```
1. User creates query with visualization preferences
2. Client validates query against user's permissions
3. Server validates and executes query with RBAC filtering
4. Server returns processed visualization data
5. Client renders chart/table with D3.js/Chart.js
```

### Role-Based Page Access
```
1. User navigates to protected route
2. SvelteKit load function checks user permissions
3. Server allows/denies access based on RBAC rules
4. Appropriate page components rendered for user role
5. UI elements conditionally displayed based on permissions
```

## Integration Points

### GraphQL Schema Alignment
- Frontend entities align with existing GraphQL types
- Custom resolvers for role-based data filtering
- Query complexity analysis for performance optimization
- Real-time subscriptions for data updates

### SvelteKit Store Integration
- User context stored in writable store
- Permission checks via derived stores
- Department and employee data cached in stores
- Query results cached with TTL expiration

### Component Data Binding
- TypeScript interfaces for component props
- Zod schemas for runtime validation
- Error boundaries for data loading failures
- Loading states for async operations