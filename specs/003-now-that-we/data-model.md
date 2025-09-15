# Data Model: PostGraphile HR System

## Entity Definitions

### Authentication Token
**Purpose**: Secure JWT token containing user identity and authorization claims  
**Schema**: hr_public  
**PostgreSQL Type**: Composite type for JWT generation

**Attributes**:
- `role`: PostgreSQL role name (hr_employee, hr_manager, hr_admin, hr_super_admin)
- `exp`: Token expiration timestamp (Unix epoch)
- `employee_id`: Primary key reference to employees table
- `department_id`: Department context for authorization
- `role_level`: Numeric permission level (20=Employee, 60=Manager, 80=HR Admin, 100=Super Admin)
- `is_admin`: Boolean flag for administrative privileges
- `permissions`: Array of specific permission strings

**Validation Rules**:
- Token expiry must be <= 15 minutes from issue time
- Role must match employee's actual role level
- Department ID must match employee's current department
- Permissions array must be subset of role's allowed permissions

**State Transitions**:
- `issued` → `active` (on successful validation)
- `active` → `expired` (after 15 minutes)
- `active` → `revoked` (on logout or security event)

### User Role
**Purpose**: Hierarchical permission system for HR operations  
**Schema**: PostgreSQL native roles with inheritance  
**Authorization**: Row-Level Security integration

**Role Hierarchy**:
```
hr_super_admin (100)
├── hr_admin (80)
│   ├── hr_manager (60)
│   │   └── hr_employee (20)
│   └── hr_guest (0)
```

**Attributes**:
- `role_name`: PostgreSQL role identifier
- `role_level`: Numeric hierarchy position
- `department_scope`: Department access restrictions
- `data_permissions`: CRUD operation permissions per entity
- `functional_permissions`: Business operation permissions

**Validation Rules**:
- Role level must be consistent with PostgreSQL role grants
- Department scope cannot exceed manager's department tree
- Data permissions must align with RLS policy definitions
- Functional permissions validated against business logic functions

### Security Policy
**Purpose**: Row-Level Security rules governing data access  
**Schema**: PostgreSQL RLS policies  
**Integration**: Automatic enforcement by PostGraphile

**Policy Types**:

**Employee Data Access**:
- `employee_self_access`: Employees can view/edit own data
- `manager_department_access`: Managers can view direct reports
- `hr_admin_full_access`: HR admins can view all employee data
- `super_admin_all_access`: Super admins can perform all operations

**Time-Off Request Access**:
- `employee_own_requests`: Employees manage own requests
- `manager_department_approval`: Managers approve department requests  
- `hr_admin_all_requests`: HR admins can view/modify all requests

**Compensation Data Access**:
- `salary_self_view`: Employees can view own salary data
- `hr_admin_compensation`: HR admins can manage all compensation
- `manager_no_salary`: Managers cannot view salary information

**Validation Rules**:
- All policies must have corresponding unit tests
- Policy predicates must use `current_setting()` for user context
- Policies must handle null user context gracefully
- Performance impact must be validated for large datasets

### Query Cache
**Purpose**: Redis-based performance optimization for GraphQL queries  
**Schema**: External Redis key-value store  
**Integration**: Middleware layer above PostGraphile

**Cache Structure**:
- `key`: MD5 hash of (query + variables + user_context)
- `value`: JSON-serialized GraphQL response
- `ttl`: Time-to-live based on data sensitivity
- `invalidation_tags`: Tags for selective cache clearing

**TTL Strategy**:
- Employee directory data: 300 seconds (5 minutes)
- Time-off balances: 60 seconds (1 minute)  
- Salary information: 10 seconds (high sensitivity)
- Department structure: 900 seconds (15 minutes)
- Performance reviews: 0 seconds (no caching)

**Validation Rules**:
- Cache keys must include user role context
- Sensitive data must have short TTL
- Cache invalidation must trigger on data mutations
- Cache hit ratio target: >95% for read operations

**State Transitions**:
- `miss` → `populate` → `active`
- `active` → `expired` (after TTL)
- `active` → `invalidated` (on data change)

### Business Logic Function
**Purpose**: Custom PostgreSQL functions for complex HR operations  
**Schema**: hr_public (exposed) and hr_hidden (internal)  
**Integration**: Automatic GraphQL mutation/query generation

**Function Categories**:

**Authentication Functions** (hr_public):
- `authenticate(email, password)`: Returns JWT token
- `refresh_token(refresh_token)`: Issues new access token
- `logout(employee_id)`: Revokes active tokens

**Employee Management** (hr_public):
- `create_employee(employee_data)`: Creates new employee record
- `update_employee_role(employee_id, new_role)`: Changes role with validation
- `terminate_employee(employee_id, termination_date)`: Employee termination workflow

**Time-Off Management** (hr_public):
- `submit_time_off_request(employee_id, request_data)`: Creates time-off request
- `approve_time_off(request_id, manager_id)`: Manager approval workflow
- `calculate_time_off_balance(employee_id)`: Real-time balance calculation

**Reporting Functions** (hr_hidden):
- `generate_department_report(department_id)`: Department analytics
- `audit_employee_changes(date_range)`: Change tracking for compliance
- `calculate_payroll_summary(pay_period)`: Payroll calculations

**Validation Rules**:
- All functions must use SECURITY DEFINER for privilege escalation
- Input parameters must be validated and sanitized
- Functions must respect RLS policies through SET LOCAL
- Error handling must prevent information leakage
- Performance must be optimized with appropriate indexes

**Return Types**:
- VOLATILE functions: GraphQL mutations
- STABLE/IMMUTABLE functions: GraphQL queries
- Composite types: Structured GraphQL objects
- Table functions: GraphQL connection types

## Entity Relationships

### Core Relationships
```
jwt_token.employee_id → employees.id
employees.department_id → departments.id
employees.manager_id → employees.id (self-referential)
time_off_requests.employee_id → employees.id
time_off_requests.approved_by → employees.id
performance_reviews.employee_id → employees.id
performance_reviews.reviewer_id → employees.id
employee_compensation.employee_id → employees.id
```

### Security Context Flow
```
JWT Token → PostgreSQL Role → RLS Policies → Data Access
     ↓
User Context Variables (employee_id, department_id, role_level)
     ↓
Business Logic Functions → Validated Operations
```

### Cache Invalidation Dependencies
```
employees.* → invalidate: employee_directory, department_structure
time_off_requests.* → invalidate: time_off_balances, manager_dashboards
employee_compensation.* → invalidate: payroll_summaries
departments.* → invalidate: department_structure, reporting_hierarchies
```

## Data Consistency Requirements

### Transactional Boundaries
- Employee role changes must update PostgreSQL grants atomically
- Time-off approval must update balances and notifications together
- Employee termination must handle dependent data cleanup
- Salary changes must maintain audit trail integrity

### Referential Integrity
- All foreign keys must have corresponding indexes for PostGraphile performance
- Cascade deletes must be carefully controlled to prevent data loss
- Soft deletes preferred for audit compliance (status flags vs hard deletes)

### Temporal Consistency
- Employee effective dates must be handled consistently across all related entities
- Time-off accruals must be calculated based on employment dates
- Performance review cycles must align with employment periods

This data model provides the foundation for PostGraphile schema generation, RLS policy enforcement, and business logic implementation while maintaining security and performance requirements for the HR system.