# Quickstart: Rust GraphQL API Complete Coverage Validation

**Feature**: 031-we-have-recently
**Date**: 2025-10-11
**Purpose**: Validate that all 23 new models are accessible via GraphQL and maintain PostGraphile compatibility

## Prerequisites

- Rust GraphQL server running on `localhost:4001/graphql`
- PostgreSQL database with all migrations applied (43+ tables)
- Valid JWT token for authentication

## Setup

```bash
# 1. Navigate to Rust GraphQL server directory
cd graphql-rust-server

# 2. Ensure database migrations are applied
# (Migrations already exist - no changes needed)

# 3. Start Rust GraphQL server
cargo run --release
# Server should start on http://localhost:4001/graphql

# 4. Obtain authentication token
export AUTH_TOKEN="your-jwt-token-here"
```

## Test Scenario 1: Employee Skills Query (FR-013)

**Requirement**: System MUST implement GraphQL models for employee_skills with proficiency tracking

```bash
# Test: Query employee skills with proficiency levels
curl -X POST http://localhost:4001/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "query": "query GetEmployeeSkills($employeeId: UUID!) {
      employeeSkills(filter: { employeeId: $employeeId }) {
        edges {
          node {
            id
            employeeId
            skillName
            proficiencyLevel
            yearsExperience
            verified
            createdAt
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }",
    "variables": {
      "employeeId": "00000000-0000-0000-0000-000000000001"
    }
  }'
```

**Expected Output**:
```json
{
  "data": {
    "employeeSkills": {
      "edges": [
        {
          "node": {
            "id": "...",
            "employeeId": "00000000-0000-0000-0000-000000000001",
            "skillName": "Python",
            "proficiencyLevel": "ADVANCED",
            "yearsExperience": 5.0,
            "verified": true,
            "createdAt": "2025-01-15T00:00:00Z"
          }
        }
      ],
      "pageInfo": {
        "hasNextPage": false,
        "endCursor": "..."
      }
    }
  }
}
```

**Validation**:
- ✅ Query returns data (not error)
- ✅ Field names are camelCase (`employeeId`, not `employee_id`)
- ✅ Relay pagination structure (`edges`, `node`, `pageInfo`)
- ✅ Proficiency enum values match schema (`ADVANCED`)

---

## Test Scenario 2: Document Management Query (FR-014)

**Requirement**: System MUST implement GraphQL models for document system tables

```bash
# Test: Query documents with categories and versions
curl -X POST http://localhost:4001/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "query": "query GetDocuments($first: Int!) {
      documents(first: $first) {
        edges {
          cursor
          node {
            id
            title
            mimeType
            fileSize
            category {
              name
            }
            uploader {
              firstName
              lastName
            }
            versions {
              versionNumber
              filePath
            }
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
        }
        totalCount
      }
    }",
    "variables": {
      "first": 10
    }
  }'
```

**Expected Output**:
```json
{
  "data": {
    "documents": {
      "edges": [
        {
          "cursor": "...",
          "node": {
            "id": "...",
            "title": "Employee Handbook 2025",
            "mimeType": "application/pdf",
            "fileSize": 1048576,
            "category": {
              "name": "HR Policies"
            },
            "uploader": {
              "firstName": "Jane",
              "lastName": "Doe"
            },
            "versions": [
              {
                "versionNumber": 1,
                "filePath": "/uploads/handbook-v1.pdf"
              }
            ]
          }
        }
      ],
      "pageInfo": {
        "hasNextPage": true,
        "hasPreviousPage": false
      },
      "totalCount": 42
    }
  }
}
```

**Validation**:
- ✅ Document query returns data
- ✅ Relationships resolved (category, uploader, versions)
- ✅ Cursor pagination working
- ✅ `totalCount` returned for UI display

---

## Test Scenario 3: Dashboard Analytics Query (FR-022)

**Requirement**: System MUST implement read-only access to materialized views

```bash
# Test: Query dashboard summaries (materialized view)
curl -X POST http://localhost:4001/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "query": "query GetDashboardSummary {
      dashboardSummaries {
        summaryKey
        totalActiveEmployees
        tasksInProgress
        pendingLeaveRequests
        expiredCertifications
        lastRefreshedAt
      }
    }"
  }'
```

**Expected Output**:
```json
{
  "data": {
    "dashboardSummaries": {
      "summaryKey": "global",
      "totalActiveEmployees": 142,
      "tasksInProgress": 37,
      "pendingLeaveRequests": 8,
      "expiredCertifications": 3,
      "lastRefreshedAt": "2025-10-11T10:30:00Z"
    }
  }
}
```

**Validation**:
- ✅ Materialized view accessible via query
- ✅ `lastRefreshedAt` timestamp present (data freshness tracking)
- ✅ Single record returned (summaryKey = "global")

---

## Test Scenario 4: Materialized View Refresh Mutation (FR-031)

**Requirement**: System MUST refresh materialized views on scheduled basis

```bash
# Test: Manually refresh dashboard summaries
curl -X POST http://localhost:4001/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "query": "mutation RefreshDashboard {
      refreshDashboardSummaries {
        success
        message
        refreshedAt
      }
    }"
  }'
```

**Expected Output**:
```json
{
  "data": {
    "refreshDashboardSummaries": {
      "success": true,
      "message": null,
      "refreshedAt": "2025-10-11T12:00:00Z"
    }
  }
}
```

**Validation**:
- ✅ Refresh mutation executes successfully
- ✅ Returns timestamp for tracking
- ✅ No errors returned

---

## Test Scenario 5: Emergency Contacts Query (FR-011)

**Requirement**: System MUST implement GraphQL models for emergency_contacts table

```bash
# Test: Query emergency contacts for employee
curl -X POST http://localhost:4001/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "query": "query GetEmergencyContacts($employeeId: UUID!) {
      emergencyContacts(employeeId: $employeeId) {
        id
        contactName
        relationship
        phoneNumber
        email
        isPrimary
      }
    }",
    "variables": {
      "employeeId": "00000000-0000-0000-0000-000000000001"
    }
  }'
```

**Expected Output**:
```json
{
  "data": {
    "emergencyContacts": [
      {
        "id": "...",
        "contactName": "John Smith",
        "relationship": "Spouse",
        "phoneNumber": "+1-555-0100",
        "email": "john.smith@example.com",
        "isPrimary": true
      }
    ]
  }
}
```

**Validation**:
- ✅ Emergency contacts returned
- ✅ `isPrimary` boolean field works
- ✅ Phone number format preserved

---

## Test Scenario 6: Event Comments and History (FR-019)

**Requirement**: System MUST implement GraphQL models for extended event management

```bash
# Test: Query event with comments and history
curl -X POST http://localhost:4001/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "query": "query GetEventDetails($eventId: UUID!) {
      event(id: $eventId) {
        id
        title
        comments {
          id
          commentText
          user {
            firstName
            lastName
          }
          replies {
            id
            commentText
          }
        }
        history {
          changeType
          changedBy {
            firstName
            lastName
          }
          oldValue
          newValue
          createdAt
        }
        waitlist {
          position
          user {
            firstName
            lastName
          }
          promoted
        }
      }
    }",
    "variables": {
      "eventId": "..."
    }
  }'
```

**Validation**:
- ✅ Event comments retrieved with nested replies
- ✅ Event history tracks changes with before/after values
- ✅ Waitlist shows position and promotion status

---

## Test Scenario 7: Rollback System Query (FR-018)

**Requirement**: System MUST implement GraphQL models for rollback system tables

```bash
# Test: Query rollback requests and batches
curl -X POST http://localhost:4001/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "query": "query GetRollbackRequests($status: RollbackStatus) {
      rollbackRequests(status: $status) {
        id
        resourceType
        resourceId
        status
        requester {
          firstName
          lastName
        }
        approver {
          firstName
          lastName
        }
        rollbackToTimestamp
        createdAt
      }
    }",
    "variables": {
      "status": "PENDING"
    }
  }'
```

**Validation**:
- ✅ Rollback requests filtered by status
- ✅ Requester and approver relationships resolved
- ✅ Status enum values match schema

---

## Test Scenario 8: Cursor Pagination Validation (FR-009)

**Requirement**: System MUST maintain cursor-based pagination following Relay spec

```bash
# Test: Forward pagination with first/after
curl -X POST http://localhost:4001/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "query": "query PaginateSkills($first: Int!, $after: String) {
      employeeSkills(first: $first, after: $after) {
        edges {
          cursor
          node {
            skillName
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
      }
    }",
    "variables": {
      "first": 5,
      "after": null
    }
  }'

# Then use endCursor from response for next page
# variables: { "first": 5, "after": "<endCursor>" }
```

**Validation**:
- ✅ `hasNextPage` correctly indicates more pages
- ✅ `endCursor` can be used for next page query
- ✅ Cursor format is base64-encoded string

---

## Test Scenario 9: Schema Introspection Validation

**Requirement**: Validate all 23 new types exist in schema

```bash
# Test: Introspect schema for new types
curl -X POST http://localhost:4001/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{
      __schema {
        types {
          name
        }
      }
    }"
  }' | jq '.data.__schema.types[] | select(.name | startswith("Employee"))'
```

**Expected Types**:
- EmployeeSkill
- EmployeeCertification
- EmployeeVehicle
- EmployeeGoal
- EmergencyContact
- Document
- DocumentVersion
- DocumentCategory
- TimeOffPolicy
- AttendanceRecord
- DashboardSummary
- DepartmentMetric
- EventComment
- EventHistory
- TaskType
- ReviewTemplate
- RollbackRequest
- ActivityLog
- (and 5 more...)

**Validation**:
- ✅ All 23 new types present in schema
- ✅ Type names follow PascalCase convention
- ✅ No duplicate type definitions

---

## Test Scenario 10: Error Handling Validation (FR-023)

**Requirement**: System MUST provide detailed error messages when queries fail

```bash
# Test: Query non-existent field
curl -X POST http://localhost:4001/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "query": "query InvalidField {
      employeeSkills {
        nonExistentField
      }
    }"
  }'
```

**Expected Error**:
```json
{
  "errors": [
    {
      "message": "Cannot query field \"nonExistentField\" on type \"EmployeeSkill\"",
      "locations": [{"line": 3, "column": 9}],
      "extensions": {
        "code": "GRAPHQL_VALIDATION_FAILED"
      }
    }
  ]
}
```

**Validation**:
- ✅ Error message specifies field name and type
- ✅ Location information included (line/column)
- ✅ Error code provided for frontend handling

---

## Success Criteria

All 10 test scenarios MUST pass with:

1. ✅ **Schema Completeness**: All 23 new types queryable
2. ✅ **PostGraphile Compatibility**: camelCase fields, Relay pagination
3. ✅ **Relationship Resolution**: Foreign keys resolved via DataLoader
4. ✅ **Materialized Views**: Read-only access with refresh mutations
5. ✅ **Error Handling**: Detailed error messages with field/type info
6. ✅ **Performance**: Queries complete in <200ms
7. ✅ **Type Safety**: SQLx compile-time validation (no runtime SQL errors)
8. ✅ **Authentication**: JWT tokens validated for all queries

---

## Debugging

If any test fails:

1. **Check GraphQL server logs**: `tail -f graphql-rust-server/server.log`
2. **Verify database connection**: `psql -d hr_db -c "SELECT COUNT(*) FROM hr_public.employee_skills"`
3. **Inspect SQLx metadata**: `ls -la .sqlx/`
4. **Run schema introspection**: Use GraphQL Playground at `http://localhost:4001/graphql`

---

## Cleanup

No cleanup required - tests are read-only queries that don't modify data.

---

**Validation Time**: ~5 minutes for all 10 scenarios
**Total API Endpoints Tested**: 23 new models + 4 materialized views + refresh mutations = 30+ endpoints
