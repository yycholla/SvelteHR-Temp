# Data Model: Comprehensive Sample Data System

**Date**: 2025-10-01
**Feature**: Comprehensive Sample Data System
**Branch**: 018-please-put-10

## Core Entities

### 1. SampleDataConfig

Configuration for sample data generation across all tables.

**Fields**:
- `seed: number` - Fixed seed for deterministic generation (default: 12345)
- `tableConfigs: TableConfig[]` - Configuration for each database table
- `batchSize: number` - Number of records to insert per batch (default: 100)
- `progressReporting: boolean` - Enable progress reporting during generation

**Validation Rules**:
- Seed must be positive integer
- Batch size must be between 10 and 1000
- All referenced tables must exist in schema

### 2. TableConfig

Configuration for individual table sample data generation.

**Fields**:
- `tableName: string` - Database table name (e.g., 'employees', 'departments')
- `recordCount: number` - Number of sample records to generate
- `priority: TablePriority` - Processing priority for dependency ordering
- `namingPattern: string` - Pattern for sample identification (e.g., 'Sample Employee {id:3}')
- `customFields: Record<string, any>` - Custom field overrides for specific data
- `skipIfExists: boolean` - Skip generation if sample data already exists

**Validation Rules**:
- Table name must exist in database schema
- Record count must be between 10 and 50
- Naming pattern must include {id} placeholder
- Priority must be valid enum value

### 3. TablePriority

Enum defining table processing priority for dependency management.

**Values**:
- `CORE = 1` - Core tables (users, departments, roles) - 50 records
- `SECONDARY = 2` - Related tables (employees, permissions) - 30 records
- `AUXILIARY = 3` - Feature tables (reviews, goals, leave) - 20 records
- `SUPPORTING = 4` - Metadata tables (templates, policies) - 10 records

### 4. DatabaseSchema

Runtime representation of discovered database schema.

**Fields**:
- `tables: TableSchema[]` - All discovered tables
- `relationships: ForeignKeyRelation[]` - Foreign key relationships
- `constraints: TableConstraint[]` - Database constraints
- `enums: EnumDefinition[]` - Custom enum types

### 5. TableSchema

Schema information for individual database table.

**Fields**:
- `name: string` - Table name
- `columns: ColumnSchema[]` - Column definitions
- `primaryKey: string[]` - Primary key column names
- `foreignKeys: ForeignKeyDefinition[]` - Foreign key definitions
- `constraints: string[]` - Table constraint names

### 6. ColumnSchema

Schema information for table columns.

**Fields**:
- `name: string` - Column name
- `type: string` - PostgreSQL data type
- `nullable: boolean` - Can accept null values
- `defaultValue: any` - Default value if specified
- `isEnum: boolean` - Is custom enum type
- `enumValues?: string[]` - Enum values if applicable

### 7. ForeignKeyRelation

Represents foreign key relationships between tables.

**Fields**:
- `fromTable: string` - Source table name
- `fromColumn: string` - Source column name
- `toTable: string` - Target table name
- `toColumn: string` - Target column name
- `onDelete: string` - Delete cascade behavior
- `onUpdate: string` - Update cascade behavior

### 8. SampleDataResult

Result of sample data generation operation.

**Fields**:
- `success: boolean` - Overall operation success
- `tablesProcessed: string[]` - Successfully processed tables
- `recordsCreated: number` - Total records created
- `recordsUpdated: number` - Total records updated
- `errors: GenerationError[]` - Any errors encountered
- `duration: number` - Operation duration in milliseconds
- `timestamp: Date` - Operation completion time

### 9. GenerationError

Error information for failed operations.

**Fields**:
- `table: string` - Table where error occurred
- `operation: string` - Operation that failed (insert/update/validate)
- `message: string` - Human-readable error message
- `sqlError?: string` - Original SQL error if applicable
- `recordData?: any` - Record data that caused error

## Data Generation Patterns

### Employee Data Pattern

```typescript
{
  firstName: "Sample Employee",
  lastName: faker.number.int({ min: 1, max: 50 }).toString().padStart(3, '0'),
  email: `sample.employee.${id:3}@example.com`,
  phoneNumber: faker.phone.number('555-0###'),
  address: faker.location.streetAddress(),
  city: faker.location.city(),
  state: faker.location.state({ abbreviated: true }),
  zipCode: faker.location.zipCode(),
  ssn: `999-${faker.number.int({ min: 10, max: 99 })}-${faker.number.int({ min: 1000, max: 9999 })}`,
  dateOfBirth: faker.date.between({ from: '1970-01-01', to: '2000-12-31' }),
  hireDate: faker.date.between({ from: '2020-01-01', to: '2024-12-31' })
}
```

### Department Data Pattern

```typescript
{
  name: `Sample Department ${['Alpha', 'Beta', 'Gamma', 'Delta'][index]}`,
  description: `Sample department for testing purposes - ${faker.company.buzzPhrase()}`,
  budget: faker.number.int({ min: 100000, max: 1000000 }),
  managerId: randomSampleManagerId()
}
```

### Time Off Request Pattern

```typescript
{
  requestType: faker.helpers.arrayElement(['VACATION', 'SICK_LEAVE', 'PERSONAL']),
  startDate: faker.date.future({ years: 1 }),
  endDate: /* calculated from start date + 1-10 days */,
  reason: `Sample ${requestType.toLowerCase()} request for testing`,
  status: faker.helpers.arrayElement(['PENDING', 'APPROVED', 'REJECTED'])
}
```

## State Transitions

### Sample Data Generation Workflow

```
[Start] → [Discover Schema] → [Build Dependency Graph] → [Generate Config]
    ↓
[Validate Config] → [Process Core Tables] → [Process Secondary Tables]
    ↓
[Process Auxiliary Tables] → [Process Supporting Tables] → [Verify Integrity]
    ↓
[Report Results] → [Complete]
```

### Table Processing States

- `PENDING` - Waiting to be processed
- `IN_PROGRESS` - Currently generating data
- `COMPLETED` - Successfully processed
- `FAILED` - Error during processing
- `SKIPPED` - Skipped due to dependencies or configuration

### Record Merge States

- `CREATED` - New record inserted
- `UPDATED` - Existing record updated
- `SKIPPED` - Record already exists and skip flag set
- `FAILED` - Error during insert/update operation

## Relationships and Dependencies

### Table Dependency Graph

```
users (CORE)
├── employees (SECONDARY)
│   ├── performance_reviews (AUXILIARY)
│   ├── employee_goals (AUXILIARY)
│   ├── time_off_requests (AUXILIARY)
│   └── time_off_balances (AUXILIARY)
├── departments (CORE)
│   └── employees (SECONDARY)
└── user_role_assignments (SECONDARY)
    └── employees (SECONDARY)

review_templates (SUPPORTING)
└── performance_reviews (AUXILIARY)

time_off_policies (SUPPORTING)
└── time_off_balances (AUXILIARY)

compensation_bands (SUPPORTING)
└── employees (SECONDARY)
```

### Foreign Key Constraints

All generated data must respect existing foreign key constraints:
- Employee records reference valid department IDs
- Performance reviews reference valid employee and reviewer IDs
- Time off requests reference valid employee IDs
- User role assignments reference valid user and role IDs

## Validation Rules

### Data Integrity

- All primary keys must be unique
- Foreign key references must exist
- Enum values must match defined types
- Date ranges must be logical (start <= end)
- Numeric values must be within reasonable ranges

### Sample Data Identification

- All sample records must use obvious naming patterns
- Email addresses must use `@example.com` domain
- Phone numbers must use `555-0###` pattern
- SSNs must start with `999-` prefix (invalid SSN range)
- Addresses should use clearly fake patterns

### Performance Constraints

- Batch processing in chunks of 100 records
- Total generation time must be under 5 seconds
- Memory usage must remain under 100MB
- Database connection pool properly managed

---

**Data Model Complete**: All entities, relationships, and validation rules defined for implementation.