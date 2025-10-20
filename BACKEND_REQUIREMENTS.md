# Backend Requirements for Migration Completion

## Overview

To complete the GraphQL migration, the following queries and relationship resolvers need to be implemented in the Rust GraphQL backend (async-graphql).

## Required Queries

### 1. Emergency Contacts Query

**Current Need**: Files #24, #25 (employee detail and edit pages)

```rust
// Query signature needed:
emergencyContacts(employeeId: UUID, limit: Int, offset: Int): [EmergencyContact!]!
```

**Fields Required**:
```graphql
type EmergencyContact {
  id: UUID!
  employeeId: UUID!
  fullName: String!
  relationship: String!
  phoneNumber: String!
  alternatePhone: String
  email: String
  addressLine1: String
  addressLine2: String
  city: String
  stateProvince: String
  postalCode: String
  country: String
  isPrimary: Boolean!
  notes: String
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### 2. Employee Vehicles Query

**Current Need**: Files #24, #25 (employee detail and edit pages)

```rust
// Query signature needed:
employeeVehicles(employeeId: UUID, limit: Int, offset: Int): [EmployeeVehicle!]!
```

**Fields Required**:
```graphql
type EmployeeVehicle {
  id: UUID!
  employeeId: UUID!
  make: String!
  model: String!
  year: Int!
  color: String
  licensePlate: String!
  stateProvince: String!
  parkingSpot: String
  insuranceCompany: String
  insurancePolicyNumber: String
  insuranceExpiry: Date
  isPrimary: Boolean!
  notes: String
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### 3. Compensation Records Query

**Current Need**: File #25 (employee edit page)

```rust
// Query signature needed:
compensationRecords(employeeId: UUID, limit: Int, offset: Int): [CompensationRecord!]!
```

**Fields Required**:
```graphql
type CompensationRecord {
  id: UUID!
  employeeId: UUID!
  effectiveDate: Date!
  salaryAmount: Decimal!
  currency: String!
  compensationType: String! # SALARY, HOURLY, CONTRACT
  payFrequency: String! # WEEKLY, BIWEEKLY, MONTHLY, ANNUAL
  notes: String
  createdAt: DateTime!
  updatedAt: DateTime!
  createdBy: UUID!
}
```

### 4. Leave Balances Query

**Current Need**: Files #24, #26 (employee detail and leave requests pages)

```rust
// Query signature needed:
leaveBalances(employeeId: UUID, limit: Int, offset: Int): [LeaveBalance!]!
```

**Fields Required**:
```graphql
type LeaveBalance {
  id: UUID!
  employeeId: UUID!
  leaveTypeId: UUID!
  year: Int!
  balanceDays: Decimal!
  usedDays: Decimal!
  carryoverDays: Decimal!
  createdAt: DateTime!
  updatedAt: DateTime!

  # Relationship resolver needed:
  leaveType: LeaveType
}
```

### 5. Leave Types Query

**Current Need**: File #26 (leave requests page)

```rust
// Query signature needed:
leaveTypes(limit: Int, offset: Int): [LeaveType!]!
```

**Fields Required**:
```graphql
type LeaveType {
  id: UUID!
  name: String!
  description: String
  defaultDays: Decimal!
  requiresApproval: Boolean!
  isPaid: Boolean!
  maxConsecutiveDays: Int
  isActive: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

## Required Relationship Resolvers

### 1. User.department → Department

**Current Implementation**: ✅ Already works in some files
**Status**: Verify it works consistently across all files

```graphql
type User {
  # ... other fields ...
  department: Department
}
```

### 2. LeaveRequest.leaveType → LeaveType

**Current Need**: Files #24, #26

```graphql
type LeaveRequest {
  # ... other fields ...
  leaveTypeId: UUID!
  leaveType: LeaveType  # Relationship resolver needed
}
```

**Implementation Pattern**:
```rust
#[Object]
impl LeaveRequest {
    async fn leave_type(&self, ctx: &Context<'_>) -> Result<Option<LeaveType>> {
        let pool = ctx.data::<PgPool>()?;

        sqlx::query_as!(
            LeaveType,
            "SELECT * FROM hr_public.leave_types WHERE id = $1",
            self.leave_type_id
        )
        .fetch_optional(pool)
        .await
        .map_err(|e| e.into())
    }
}
```

### 3. LeaveRequest.manager → User

**Current Need**: File #26 (leave requests page)

```graphql
type LeaveRequest {
  # ... other fields ...
  managerId: UUID
  manager: User  # Relationship resolver needed
}
```

### 4. LeaveBalance.leaveType → LeaveType

**Current Need**: Files #24, #26

```graphql
type LeaveBalance {
  # ... other fields ...
  leaveTypeId: UUID!
  leaveType: LeaveType  # Relationship resolver needed
}
```

## Required Mutations

### Emergency Contacts

```rust
createEmergencyContact(input: CreateEmergencyContactInput!): EmergencyContactPayload!
updateEmergencyContact(id: UUID!, input: UpdateEmergencyContactInput!): EmergencyContactPayload!
deleteEmergencyContact(id: UUID!): DeletePayload!
```

### Employee Vehicles

```rust
createEmployeeVehicle(input: CreateEmployeeVehicleInput!): EmployeeVehiclePayload!
updateEmployeeVehicle(id: UUID!, input: UpdateEmployeeVehicleInput!): EmployeeVehiclePayload!
deleteEmployeeVehicle(id: UUID!): DeletePayload!
```

### Compensation Records

```rust
createCompensationRecord(input: CreateCompensationRecordInput!): CompensationRecordPayload!
updateCompensationRecord(id: UUID!, input: UpdateCompensationRecordInput!): CompensationRecordPayload!
deleteCompensationRecord(id: UUID!): DeletePayload!
```

## Database Tables Required

All tables should already exist in the database schema. Verify the following tables:

- ✅ `hr_public.emergency_contacts`
- ✅ `hr_public.employee_vehicles`
- ✅ `hr_public.compensation_records` (or `hr_public.payroll_records`)
- ✅ `hr_public.leave_balances`
- ✅ `hr_public.leave_types`

## Implementation Priority

### High Priority (Required for File #24, #25, #26)

1. **leaveTypes query** - Simple, no filtering needed
2. **leaveBalances query** - With employeeId filter
3. **LeaveRequest.leaveType resolver** - Relationship
4. **LeaveRequest.manager resolver** - Relationship
5. **emergencyContacts query** - With employeeId filter
6. **employeeVehicles query** - With employeeId filter

### Medium Priority (File #25 edit functionality)

7. **compensationRecords query** - With employeeId filter
8. All mutation operations for CRUD

### Low Priority (Can be added later)

9. Additional relationship resolvers
10. Advanced filtering and sorting

## Implementation Example

Here's a complete example for the `emergencyContacts` query:

```rust
// In query.rs

#[derive(Default)]
pub struct QueryRoot;

#[Object]
impl QueryRoot {
    /// Get emergency contacts for an employee
    async fn emergency_contacts(
        &self,
        ctx: &Context<'_>,
        employee_id: Uuid,
        #[graphql(default = 50)] limit: i64,
        #[graphql(default = 0)] offset: i64,
    ) -> Result<Vec<EmergencyContact>> {
        let pool = ctx.data::<PgPool>()?;

        sqlx::query_as!(
            EmergencyContact,
            r#"
            SELECT
                id, employee_id, full_name, relationship, phone_number,
                alternate_phone, email, address_line1, address_line2,
                city, state_province, postal_code, country,
                is_primary, notes, created_at, updated_at
            FROM hr_public.emergency_contacts
            WHERE employee_id = $1
            ORDER BY is_primary DESC, created_at DESC
            LIMIT $2 OFFSET $3
            "#,
            employee_id,
            limit,
            offset
        )
        .fetch_all(pool)
        .await
        .map_err(|e| e.into())
    }
}
```

## Migration Steps After Backend Implementation

Once the backend queries are implemented:

1. **Update File #24**: `/src/routes/dashboard/employees/[id]/+page.server.ts`
   - Change `emergencyContacts(filter:...)` → `emergencyContacts(employeeId:)`
   - Change `employeeVehicles(filter:...)` → `employeeVehicles(employeeId:)`
   - Change `timeOffBalances(filter:...)` → `leaveBalances(employeeId:)`
   - Update `leaveType` scalar → nested object with resolver

2. **Update File #25**: `/src/routes/dashboard/employees/[id]/edit/+page.server.ts`
   - Same as File #24, plus:
   - Change `compensationRecords(filter:...)` → `compensationRecords(employeeId:)`

3. **Update File #26**: `/src/routes/dashboard/users/[id]/leave/requests/+page.server.ts`
   - Add `leaveBalances(employeeId:)` query
   - Add `leaveTypes(limit:)` query
   - Update `leaveType` scalar → nested object
   - Add `manager` relationship resolver usage

## Testing Checklist

After implementation, verify:

- [ ] Emergency contacts can be queried by employeeId
- [ ] Employee vehicles can be queried by employeeId
- [ ] Compensation records can be queried by employeeId
- [ ] Leave balances can be queried by employeeId
- [ ] Leave types can be queried (all active types)
- [ ] LeaveRequest.leaveType resolver returns correct data
- [ ] LeaveRequest.manager resolver returns correct data
- [ ] All CRUD mutations work for emergency contacts
- [ ] All CRUD mutations work for employee vehicles
- [ ] All CRUD mutations work for compensation records

## Completion Status

Once all queries and resolvers are implemented, the final 3 paused files can be migrated, bringing the total to:

**26 of 26 files migrated = 100% completion** 🎉
