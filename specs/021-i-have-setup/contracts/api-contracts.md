# REST API Contracts: Audit Log Export

**Feature**: 021-i-have-setup | **Date**: 2025-10-02

## Export Endpoint

### POST /api/audit/export

**Purpose**: Generate audit log export in CSV, JSON, or PDF format (FR-017)

**Authentication**: Required (Bearer token)
**Authorization**: admin, hr_admin, super_admin roles only

**Request Body**:
```json
{
  "format": "csv" | "json" | "pdf",
  "filters": {
    "dateFrom": "2025-01-01T00:00:00Z",
    "dateTo": "2025-12-31T23:59:59Z",
    "resourceTypes": ["employees", "departments"],
    "actions": ["CREATE", "UPDATE", "DELETE"],
    "employeeIds": ["uuid-1", "uuid-2"]
  },
  "pagination": {
    "limit": 10000
  }
}
```

**Response (202 Accepted)**:
```json
{
  "jobId": "export-job-uuid",
  "status": "processing",
  "estimatedCompletionTime": "2025-10-02T12:35:00Z"
}
```

**Poll Status**: GET /api/audit/export/{jobId}
```json
{
  "jobId": "export-job-uuid",
  "status": "complete",
  "downloadUrl": "/api/audit/export/{jobId}/download",
  "expiresAt": "2025-10-02T13:00:00Z",
  "fileSize": 2048576
}
```

**Download**: GET /api/audit/export/{jobId}/download
- Returns file with appropriate Content-Type
- Content-Disposition: attachment; filename="audit-log-2025-10-02.csv"

## Contract Tests

**Test 1: CSV Export Generation**
- Request CSV export with filters
- Assert 202 response with jobId
- Poll until status=complete
- Download file and verify CSV format

**Test 2: PDF Export with Large Dataset**
- Request PDF export for 1000+ logs
- Verify streaming response (not blocking)
- Assert PDF contains all expected logs with formatting

**Test 3: Permission Enforcement**
- Request export as employee role (insufficient permissions)
- Assert 403 Forbidden response

Test files: `tests/e2e/api/export.spec.ts`
