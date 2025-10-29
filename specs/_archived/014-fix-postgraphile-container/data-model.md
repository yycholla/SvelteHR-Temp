# Data Model: PostgreSQL Container Schema Initialization

## Core Entities

### Database Schemas

- **hr_public**: Main schema exposed through PostGraphile GraphQL interface
  - Contains all user-facing tables and data
  - Accessible by all authenticated roles
  - RLS policies enforced for data security

- **hr_private**: Private schema for sensitive operations
  - Authentication and audit data
  - Admin-only access
  - Contains password hashes and sensitive configuration

- **hr_hidden**: Internal schema for functions and utilities
  - Stored procedures and triggers
  - System maintenance functions
  - Backend automation logic

### User Management

- **users**: Core user entity with authentication and profile data
  - Fields: id (UUID), email, first_name, last_name, password_hash, role, department_id, is_active
  - Relationships: belongs_to department, has_many leave_requests, performance_reviews
  - Constraints: unique email, valid role enum

- **departments**: Organizational structure
  - Fields: id (UUID), name, description, manager_id, created_at, updated_at
  - Relationships: has_many users, belongs_to manager (users)
  - Constraints: unique department name

### HR Operations

- **leave_requests**: Employee leave management
  - Fields: id (UUID), employee_id, leave_type, start_date, end_date, status, manager_id, days_requested
  - Relationships: belongs_to employee (users), belongs_to manager (users)
  - State transitions: pending → approved/rejected/cancelled
  - Constraints: no self-approval, valid date ranges

- **performance_reviews**: Employee evaluation system
  - Fields: id, employee_id, reviewer_id, review_period, status, overall_rating, goals, achievements
  - Relationships: belongs_to employee (users), belongs_to reviewer (users)
  - State transitions: not_started → in_progress → completed
  - Constraints: rating 1.0-5.0, no self-review

### Security Model

- **user_role_assignments**: RBAC role mapping
  - Fields: id (UUID), user_id, role_name, assigned_by, created_at
  - Relationships: belongs_to user, belongs_to assigner (users)
  - Constraints: unique user-role pairs

### Supporting Entities

- **time_off_balances**: Leave balance tracking
- **time_off_policies**: Leave policy definitions
- **employee_goals**: Goal setting and tracking
- **audit_log**: Security audit trail
- **access_log**: System access tracking

## Initialization File Categories

### 01-roles.sql

- PostgreSQL roles: hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin, postgraphile_app
- Extensions: uuid-ossp, pgcrypto
- Basic permissions and schema creation

### 02-schema.sql

- All table definitions
- Foreign key relationships
- Basic constraints and indexes
- RLS policy definitions

### 03-data.sql

- Default admin user
- Basic seed data for development
- Reference data (leave types, departments)

### 04-indexes.sql

- Performance optimization indexes
- Complex constraints
- Stored procedures and triggers

## Validation Rules

### User Data

- Email format validation
- Password strength requirements (handled by pgcrypto)
- Role hierarchy enforcement

### Leave Requests

- Date range validation (end_date >= start_date)
- Business day calculations
- Manager approval workflow
- Balance checking against policies

### Performance Reviews

- Rating scale validation (1.0-5.0)
- Review period format validation
- Completion workflow enforcement

## State Transitions

### Leave Request Lifecycle

```
pending → approved (by manager)
pending → rejected (by manager)
pending → cancelled (by employee)
approved → cancelled (exceptional cases)
```

### Performance Review Lifecycle

```
not_started → in_progress (reviewer begins)
in_progress → completed (final submission)
completed → [archived after period]
```

## Security Considerations

### Row-Level Security

- Users can only see their own data unless they have management roles
- Managers can see subordinate data based on department hierarchy
- HR roles have broad access within their functional scope
- Admin roles have system-wide access

### Data Protection

- Password hashes only, never plain text
- Audit logging for all sensitive operations
- Access logs for compliance tracking

### Role Hierarchy (Descending Privilege)

1. **hr_super_admin** (Level 100): Full system access
2. **hr_admin** (Level 75): HR department operations
3. **hr_manager** (Level 50): Team management functions
4. **hr_employee** (Level 25): Personal data access
5. **hr_guest** (Level 0): Public/unauthenticated access

## Container Integration

### Volume Persistence

- PostgreSQL data directory: `/var/lib/postgresql/data`
- Named volume: `sveltehr_postgres_dev_data`
- Preserves all data including temporary debugging information

### Health Checks

- Container readiness validation via `pg_isready`
- Schema validation through PostGraphile connection test
- Performance validation: startup within 30 seconds

### Error Handling

- Initialization failures cause container startup failure
- Clear error messages logged to container output
- No automatic recovery - requires manual intervention
