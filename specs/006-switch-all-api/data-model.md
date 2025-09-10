# Data Model & Entity Design: GraphQL API Migration

**Project**: GraphQL API Migration  
**Date**: 2025-09-09  
**Phase**: 1 - Design & Contracts

## Core Entity Mapping

### Employee Entity

**GraphQL Schema**:
```graphql
type Employee {
  id: ID!
  employee_id: String!
  first_name: String!
  last_name: String!
  full_name: String!
  email: String!
  phone: String
  address: String
  position: String!
  department: Department!
  manager: Employee
  status: EmployeeStatus!
  hire_date: Date!
  salary: Float
  currency: String
  employment_type: EmploymentType!
  benefits: Benefits
  performance_reviews: [PerformanceReview!]!
  emergency_contacts: [EmergencyContact!]!
  created_at: DateTime!
  updated_at: DateTime!
}

enum EmployeeStatus {
  ACTIVE
  INACTIVE
  TERMINATED
  ON_LEAVE
}

enum EmploymentType {
  FULL_TIME
  PART_TIME
  CONTRACT
  INTERN
}

type Benefits {
  health_plan: String
  dental_plan: String
  retirement_contribution: Float
  vacation_days: Int
}

type EmergencyContact {
  name: String!
  relationship: String!
  phone: String!
  email: String
}
```

**Validation Rules**:
- `email` must be unique across all active employees
- `employee_id` must be unique and follow format `EMP-XXXX`
- `hire_date` cannot be in the future
- `salary` must be positive number when provided
- `phone` must match valid phone number format

**State Transitions**:
- ACTIVE → INACTIVE (temporary leave)
- ACTIVE → TERMINATED (permanent)
- INACTIVE → ACTIVE (return from leave)
- TERMINATED → no valid transitions

### Department Entity

**GraphQL Schema**:
```graphql
type Department {
  id: ID!
  name: String!
  description: String
  budget_code: String!
  manager: Employee
  parent: Department
  children: [Department!]!
  employees: EmployeeConnection!
  employee_count: Int!
  total_budget: Float
  is_active: Boolean!
  created_at: DateTime!
  updated_at: DateTime!
}

type EmployeeConnection {
  nodes: [Employee!]!
  total_count: Int!
  has_next_page: Boolean!
  has_previous_page: Boolean!
}
```

**Validation Rules**:
- `name` must be unique across all active departments
- `budget_code` must follow format `DEPT-XXX`
- `manager` must be an active employee within the department
- Circular parent-child relationships not allowed

### User & Authentication Entity

**GraphQL Schema**:
```graphql
type User {
  id: ID!
  email: String!
  name: String!
  role: String!
  roles: [Role!]!
  department_id: ID
  permissions: [String!]!
  created_at: DateTime!
  updated_at: DateTime!
  last_login: DateTime
}

type AuthResponse {
  user: User
  authenticated: Boolean!
  permissions: [String!]!
  roles: [Role!]!
  session: Session
}

type Session {
  id: ID!
  expires_at: DateTime!
  last_accessed: DateTime!
}
```

**Validation Rules**:
- `email` must be valid email format and unique
- User must have at least one role assigned
- Permissions derived from role hierarchy

### Dashboard & Widgets Entity

**GraphQL Schema**:
```graphql
type DashboardWidget {
  id: ID!
  type: WidgetType!
  title: String!
  data: JSON!
  accessible: Boolean!
  priority: Int!
  requires_action: Boolean!
  sensitive_data: Boolean!
  last_updated: DateTime!
}

enum WidgetType {
  EMPLOYEE_COUNT
  DEPARTMENT_STATS
  PERFORMANCE_METRICS
  COMPLIANCE_STATUS
  NOTIFICATIONS
  RECENT_ACTIVITY
}

type DashboardData {
  widgets: [DashboardWidget!]!
  user_role: String!
  access_scope: String!
  permissions: [String!]!
  metadata: DashboardMetadata!
}

type DashboardMetadata {
  last_updated: DateTime!
  refresh_interval: Int!
  realtime_enabled: Boolean!
}
```

**Validation Rules**:
- Widget `priority` must be positive integer
- `sensitive_data` widgets require appropriate permissions
- Widget data must conform to type-specific schema

### RBAC (Roles & Permissions) Entity

**GraphQL Schema**:
```graphql
type Role {
  id: ID!
  name: String!
  description: String!
  level: Int!
  permissions: [Permission!]!
  created_at: DateTime!
  updated_at: DateTime!
}

type Permission {
  id: ID!
  name: String!
  resource: String!
  action: String!
  description: String!
}

type UserPermissions {
  user: User!
  effective_permissions: [Permission!]!
  role_permissions: [RolePermission!]!
}

type RolePermission {
  role: Role!
  permissions: [Permission!]!
}
```

**Validation Rules**:
- Role `name` must be unique
- Permission `name` follows format `resource:action` (e.g., `employees:read`)
- Role hierarchy enforced through `level` field
- Higher level roles inherit lower level permissions

## Data Relationships

### Primary Relationships

1. **Employee ↔ Department**: Many-to-One
   - Each employee belongs to exactly one department
   - Department can have multiple employees
   - Manager relationship within department constraints

2. **Employee ↔ Employee**: Manager hierarchy
   - Self-referencing relationship for reporting structure
   - One manager can have multiple direct reports
   - Circular reporting chains prevented

3. **User ↔ Role**: Many-to-Many
   - Users can have multiple roles
   - Roles can be assigned to multiple users
   - Effective permissions calculated from all roles

4. **Department ↔ Department**: Hierarchical
   - Tree structure with parent-child relationships
   - Root departments have no parent
   - Infinite nesting supported

### Derived Relationships

1. **User permissions** calculated from role hierarchy and explicit assignments
2. **Department metrics** aggregated from employee data
3. **Dashboard widgets** filtered by user permissions and role
4. **Employee counts** derived from active employee status

## Query Patterns

### Basic Entity Queries
```graphql
# Single employee with full details
query GetEmployee($id: ID!) {
  employee(id: $id) {
    ...EmployeeFull
  }
}

# Paginated employee list with filtering
query GetEmployees($page: Int, $limit: Int, $search: String, $department_id: String) {
  employees(page: $page, limit: $limit, search: $search, department_id: $department_id) {
    data { ...EmployeeBasic }
    pagination { ...PaginationInfo }
  }
}
```

### Complex Relationship Queries
```graphql
# Department with employees and metrics
query GetDepartmentDetails($id: ID!) {
  department(id: $id) {
    ...DepartmentInfo
    employees(first: 20) {
      nodes { ...EmployeeBasic }
      totalCount
    }
    metrics {
      total_employees
      avg_performance_score
      total_payroll
    }
  }
}
```

### Permission-Aware Queries
```graphql
# Dashboard data filtered by user permissions
query GetDashboard($role: String) {
  dashboardData(role: $role) {
    widgets {
      ...DashboardWidget
    }
    permissions
    access_scope
  }
}
```

## Migration Mapping

### REST → GraphQL Endpoint Mapping

| REST Endpoint | GraphQL Operation | Notes |
|---------------|-------------------|-------|
| `GET /api/v2/employees` | `query employees` | Pagination preserved |
| `GET /api/v2/employees/{id}` | `query employee(id)` | Full entity fetch |
| `POST /api/v2/employees` | `mutation createEmployee` | Input validation |
| `PUT /api/v2/employees/{id}` | `mutation updateEmployee` | Partial updates |
| `DELETE /api/v2/employees/{id}` | `mutation deleteEmployee` | Soft delete |
| `GET /api/v2/departments` | `query departments` | Hierarchical data |
| `GET /api/v2/auth/verify` | `query verifyToken` | Authentication |
| `POST /api/v2/auth/login` | `mutation login` | Session management |

### Data Structure Compatibility

**Employee REST vs GraphQL**:
- REST `full_name` → GraphQL computed field from `first_name` + `last_name`
- REST `department` object → GraphQL `Department` type with resolver
- REST `manager` ID → GraphQL `Employee` type with resolver
- REST pagination → GraphQL Connection pattern

**Department REST vs GraphQL**:
- REST `employee_count` → GraphQL computed field
- REST nested employees → GraphQL `EmployeeConnection` type
- REST parent/children → GraphQL recursive `Department` type

## Performance Considerations

### Query Optimization

**N+1 Problem Prevention**:
- Department employees resolved with single query
- Employee managers batched with DataLoader pattern
- Permission checks cached per request

**Complexity Analysis**:
- Maximum query depth: 10 levels
- Field count limits based on user role
- Complexity scoring for nested relationships

### Caching Strategy

**Query-level Caching**:
- Employee lists: 5 minutes TTL
- Department hierarchies: 30 minutes TTL
- User permissions: Session-based TTL
- Dashboard widgets: 2 minutes TTL

**Entity-level Caching**:
- Individual employee records: 10 minutes TTL
- Department metadata: 15 minutes TTL
- Role definitions: 1 hour TTL

---

**Data Model Status**: ✅ **COMPLETE**  
**All entities mapped from REST to GraphQL with validation rules and relationships defined**

**Next**: Contract/API specification generation