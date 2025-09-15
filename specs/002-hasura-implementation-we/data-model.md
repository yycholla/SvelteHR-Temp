# Data Model: Hasura GraphQL Implementation

## Overview

The data model leverages the existing PostgreSQL schema optimized for Hasura GraphQL Engine with a user-centric design. All entities are connected through relationships that enable efficient GraphQL queries while maintaining security through Row-Level Security policies.

## Core Entities

### User (Central Hub)
**Purpose**: Central entity representing all system users (employees, managers, administrators)
**PostgreSQL Table**: `users`

**Fields**:
- `id` (UUID, Primary Key): Unique identifier
- `email` (String, Unique): Authentication identifier and contact
- `password_hash` (String): Encrypted authentication credential
- `display_name` (String): Human-readable name for UI display
- `onboarding_status` (Enum): PreHire, Onboarding, Active, Terminated
- `job_title` (String, Optional): Current position title
- `is_active` (Boolean): Account status flag
- `created_at` (Timestamp): Account creation time
- `updated_at` (Timestamp): Last modification time

**Relationships**:
- One-to-One → ContactInformation, PersonalInformation, JobInformation, Compensation
- One-to-Many → UserRoleAssignments, AuthSessions, OAuthConnections
- Many-to-One → Department (through JobInformation)

**Validation Rules**:
- Email must be valid format and unique across system
- Display name required for active users
- Password hash must meet security standards (bcrypt with cost ≥12)

**State Transitions**:
```
PreHire → Onboarding → Active → Terminated
         ↓           ↓
         Terminated  Terminated
```

### Department
**Purpose**: Organizational structure with hierarchical relationships
**PostgreSQL Table**: `departments`

**Fields**:
- `id` (UUID, Primary Key): Unique identifier
- `name` (String, Unique): Department display name
- `description` (Text, Optional): Department purpose and scope
- `budget` (Decimal, Optional): Allocated budget amount
- `is_active` (Boolean): Department operational status
- `parent_department_id` (UUID, Optional): Self-referential hierarchy
- `manager_id` (UUID, Optional): References User who manages department
- `created_at` (Timestamp): Department creation time
- `updated_at` (Timestamp): Last modification time

**Relationships**:
- Self-referential: Parent-Child department hierarchy
- Many-to-One → User (manager)
- One-to-Many → JobInformation (employees in department)

**Computed Properties** (via PostgreSQL views):
- `employee_count`: Total employees in department
- `active_employee_count`: Active employees only
- `subdepartment_count`: Direct child departments
- `budget_per_employee`: Budget allocation per employee

**Validation Rules**:
- Department names must be unique and non-empty
- Budget must be positive if specified
- Manager must be an active user
- Parent department cannot create circular references

### Role
**Purpose**: Permission-based access control definitions
**PostgreSQL Table**: `user_roles`

**Fields**:
- `id` (UUID, Primary Key): Unique identifier
- `name` (String, Unique): Role identifier (Admin, HR Manager, Manager, Employee, Contractor)
- `level` (Integer): Numerical hierarchy level (100=Admin, 80=HR Manager, etc.)
- `description` (Text, Optional): Role purpose and responsibilities
- `created_at` (Timestamp): Role creation time

**Relationships**:
- One-to-Many → UserRoleAssignments

**Validation Rules**:
- Role names must be unique and follow naming convention
- Levels must be positive integers with clear hierarchy
- System roles (Admin, Employee) cannot be deleted

### UserRoleAssignment
**Purpose**: Many-to-many relationship between Users and Roles
**PostgreSQL Table**: `user_role_assignments`

**Fields**:
- `id` (UUID, Primary Key): Unique identifier
- `user_id` (UUID): References User
- `role_id` (UUID): References Role
- `is_active` (Boolean): Assignment status
- `assigned_at` (Timestamp): Assignment time

**Relationships**:
- Many-to-One → User, Role

**Validation Rules**:
- Unique constraint on (user_id, role_id) combination
- Both user and role must exist and be active
- At least one active role required per user

### JobInformation
**Purpose**: Employment details linking users to organizational structure
**PostgreSQL Table**: `job_information`

**Fields**:
- `id` (UUID, Primary Key): Unique identifier
- `employee_id` (UUID, Unique): References User (one-to-one)
- `department_id` (UUID): References Department
- `job_title` (String): Position title
- `hire_date` (Date): Employment start date
- `employment_type` (String): Full-time, Part-time, Contract, etc.
- `work_location` (String): Physical or remote work location
- `work_schedule` (Text): Schedule description
- `manager_id` (UUID, Optional): References User (direct supervisor)
- `termination_date` (Date, Optional): Employment end date
- `is_remote` (Boolean): Remote work flag
- `created_at` (Timestamp): Record creation time
- `updated_at` (Timestamp): Last modification time

**Relationships**:
- One-to-One → User (employee)
- Many-to-One → Department, User (manager)

**Validation Rules**:
- Hire date cannot be in the future
- Termination date must be after hire date if specified
- Manager must be in same or parent department
- Employment type must be from predefined list

### Compensation
**Purpose**: Sensitive salary and payment information
**PostgreSQL Table**: `compensation`

**Fields**:
- `id` (UUID, Primary Key): Unique identifier
- `employee_id` (UUID, Unique): References User (one-to-one)
- `pay_type` (Enum): Hourly, Salary, Commission, Contractor
- `pay_rate` (Decimal): Compensation amount
- `currency` (String): Currency code (default: USD)
- `bank_name` (String, Optional): Banking institution
- `bank_account_type` (Enum): Checking, Savings
- `bank_account_number` (String, Encrypted): Account number
- `bank_routing_number` (String, Encrypted): Routing number
- `direct_deposit_enabled` (Boolean): Direct deposit preference
- `salary_review_date` (Date, Optional): Next review date
- `bonus_eligible` (Boolean): Bonus eligibility flag
- `overtime_eligible` (Boolean): Overtime eligibility flag
- `created_at` (Timestamp): Record creation time
- `updated_at` (Timestamp): Last modification time

**Relationships**:
- One-to-One → User (employee)

**Validation Rules**:
- Pay rate must be positive
- Encrypted fields use AES-256 encryption
- Bank information required if direct deposit enabled
- Salary review date cannot be in the past

**Security Notes**:
- Highest level of access control through RLS policies
- Only HR Admin, Payroll Admin, and employee can access their own data
- All sensitive fields encrypted at rest

### ContactInformation
**Purpose**: Employee contact details and emergency contacts
**PostgreSQL Table**: `contact_information`

**Fields**:
- `id` (UUID, Primary Key): Unique identifier
- `employee_id` (UUID, Unique): References User (one-to-one)
- `email` (String, Unique, Optional): Alternative email
- `phone_number` (String): Primary phone contact
- `work_phone_number` (String, Optional): Work phone extension
- `address_street` (Text): Street address
- `address_city` (String): City
- `address_state` (String): State/Province
- `address_zip` (String): Postal code
- `emergency_contact_name` (String): Emergency contact person
- `emergency_contact_relationship` (String): Relationship type
- `emergency_contact_phone` (String): Emergency contact phone
- `created_at` (Timestamp): Record creation time
- `updated_at` (Timestamp): Last modification time

**Relationships**:
- One-to-One → User (employee)

**Validation Rules**:
- Phone numbers must be valid format
- Address fields required for in-office employees
- Emergency contact information required for all active employees
- Alternative email must be unique if provided

### PersonalInformation
**Purpose**: Private employee data for HR compliance
**PostgreSQL Table**: `personal_information`

**Fields**:
- `id` (UUID, Primary Key): Unique identifier
- `employee_id` (UUID, Unique): References User (one-to-one)
- `date_of_birth` (Date): Birth date for age verification
- `gender` (String, Optional): Gender identity
- `marital_status` (String, Optional): Marital status
- `nationality` (String, Optional): Citizenship information
- `social_security_number` (String, Encrypted): SSN for payroll
- `passport_number` (String, Optional): Passport for travel
- `drivers_license_number` (String, Optional): License for company vehicle
- `created_at` (Timestamp): Record creation time
- `updated_at` (Timestamp): Last modification time

**Relationships**:
- One-to-One → User (employee)

**Validation Rules**:
- Date of birth must indicate minimum age (18+ typically)
- SSN must be valid format and unique
- All PII fields encrypted at rest
- Optional fields can be null for privacy compliance

**Security Notes**:
- Strictest access control - HR Admin only
- All fields encrypted with separate key rotation
- Audit logging required for all access

### AuthSession
**Purpose**: Authentication state management and security tracking
**PostgreSQL Table**: `auth_sessions`

**Fields**:
- `id` (UUID, Primary Key): Unique identifier
- `user_id` (UUID): References User
- `token_hash` (String, Unique): Hashed JWT token
- `expires_at` (Timestamp): Token expiration time
- `refresh_token_hash` (String, Optional): Hashed refresh token
- `user_agent` (Text, Optional): Browser/client information
- `ip_address` (INET, Optional): Client IP address
- `is_active` (Boolean): Session validity flag
- `created_at` (Timestamp): Session start time
- `updated_at` (Timestamp): Last activity time

**Relationships**:
- Many-to-One → User

**Validation Rules**:
- Token expires_at must be future timestamp
- Active sessions limited per user (configurable, default: 5)
- IP address tracking for security monitoring
- Automatic cleanup of expired sessions

**Security Features**:
- Token hashing prevents session hijacking
- IP address validation for suspicious activity detection
- User agent tracking for device management

### AuditLog
**Purpose**: Change tracking for compliance and security monitoring
**PostgreSQL Table**: `audit_log`

**Fields**:
- `id` (UUID, Primary Key): Unique identifier
- `table_name` (String): Affected database table
- `operation` (String): INSERT, UPDATE, DELETE
- `old_data` (JSONB, Optional): Previous values for updates/deletes
- `new_data` (JSONB, Optional): New values for inserts/updates
- `user_id` (UUID, Optional): User who made the change
- `timestamp` (Timestamp): Change timestamp
- `ip_address` (INET, Optional): Client IP address
- `user_agent` (Text, Optional): Client information

**Relationships**:
- Many-to-One → User (optional for system changes)

**Validation Rules**:
- All data changes automatically logged via database triggers
- Immutable records - no updates or deletes allowed
- Retention policy: 7 years for compliance
- Indexed for efficient querying

## GraphQL Schema Relationships

### Query Patterns Optimized for Performance

**Employee Directory Query** (Most Common):
```graphql
query EmployeeDirectory($limit: Int = 50, $offset: Int = 0) {
  users(
    where: { is_active: { _eq: true } }
    order_by: { display_name: asc }
    limit: $limit
    offset: $offset
  ) {
    id
    display_name
    job_information {
      job_title
      department {
        name
      }
    }
    contact_information {
      email
      phone_number
    }
  }
}
```

**Department Hierarchy Query**:
```graphql
query DepartmentHierarchy {
  departments(where: { is_active: { _eq: true } }) {
    id
    name
    budget
    parent_department_id
    manager {
      display_name
    }
    subdepartments: departments {
      id
      name
    }
    employees: job_informations {
      user {
        display_name
        onboarding_status
      }
    }
  }
}
```

**Real-time Subscription Example**:
```graphql
subscription EmployeeStatusUpdates($department_id: uuid!) {
  users(
    where: { 
      job_information: { department_id: { _eq: $department_id } }
      is_active: { _eq: true }
    }
  ) {
    id
    display_name
    onboarding_status
    job_information {
      job_title
    }
  }
}
```

## Performance Considerations

### Indexing Strategy
- Primary indexes on all foreign key relationships
- Composite indexes for common query patterns
- Full-text search indexes for employee/department lookups
- Partial indexes for frequently filtered columns (is_active, onboarding_status)

### Query Optimization
- Limit nested relationship depth (max 5 levels)
- Use pagination for large result sets (50-100 records per page)
- Implement query complexity analysis and limits
- Cache frequently accessed read-only data (departments, roles)

### Security & Access Control
- Row-Level Security policies enforce data isolation
- GraphQL field-level permissions based on user roles
- Sensitive data (compensation, personal info) requires elevated permissions
- Audit logging for all data modifications

This data model provides the foundation for a high-performance, secure HR system with Hasura GraphQL Engine, optimized for sub-200ms response times while maintaining comprehensive data relationships and security controls.