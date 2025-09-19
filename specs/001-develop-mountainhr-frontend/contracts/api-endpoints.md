# REST API Endpoints

**Date**: 2025-09-10  
**Feature**: MountainHR Frontend Development  
**Purpose**: Define REST endpoints for non-GraphQL operations and integrations

## Authentication Endpoints

### POST /api/auth/login

**Purpose**: Initial user authentication  
**Access**: Public

```json
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "roles": ["employee"]
  }
}

Errors:
400 - Invalid credentials
429 - Too many attempts
500 - Server error
```

### POST /api/auth/refresh

**Purpose**: Refresh access token  
**Access**: Requires refresh token

```json
Request:
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}

Errors:
401 - Invalid refresh token
500 - Server error
```

### POST /api/auth/logout

**Purpose**: Invalidate tokens  
**Access**: Requires access token

```json
Request:
{} // Empty body

Response:
{
  "success": true
}
```

## File Upload Endpoints

### POST /api/files/upload

**Purpose**: Upload files for change requests, documents  
**Access**: Authenticated users  
**Content-Type**: multipart/form-data

```json
Request:
- file: [File]
- type: "profile_photo" | "document" | "attachment"
- relatedId?: string (optional)

Response:
{
  "id": "uuid",
  "filename": "document.pdf",
  "size": 1024000,
  "mimeType": "application/pdf",
  "url": "/api/files/uuid",
  "uploadedAt": "2025-09-10T10:30:00Z"
}

Errors:
400 - Invalid file type/size
413 - File too large
500 - Upload failed
```

### GET /api/files/{fileId}

**Purpose**: Download/view uploaded files  
**Access**: Authenticated users with permission

```json
Response:
Binary file content with appropriate headers:
- Content-Type: [mime-type]
- Content-Disposition: attachment; filename="[filename]"

Errors:
404 - File not found
403 - Access denied
410 - File expired/deleted
```

## Export Endpoints

### POST /api/exports/create

**Purpose**: Initiate data export job  
**Access**: HR Admin or Manager with appropriate permissions

```json
Request:
{
  "type": "employees" | "attendance" | "leave_requests",
  "format": "csv" | "xlsx" | "pdf",
  "filter": {
    "departmentIds": ["uuid1", "uuid2"],
    "dateRange": {
      "start": "2025-01-01",
      "end": "2025-12-31"
    }
  },
  "columns": ["name", "email", "department", "hire_date"]
}

Response:
{
  "jobId": "uuid",
  "status": "queued",
  "estimatedDuration": 30,
  "createdAt": "2025-09-10T10:30:00Z"
}

Errors:
400 - Invalid export parameters
403 - Insufficient permissions
429 - Export quota exceeded
```

### GET /api/exports/{jobId}/status

**Purpose**: Check export job status  
**Access**: Job creator

```json
Response:
{
  "jobId": "uuid",
  "status": "queued" | "processing" | "completed" | "failed",
  "progress": 75,
  "downloadUrl": "/api/exports/uuid/download",
  "expiresAt": "2025-09-11T10:30:00Z",
  "createdAt": "2025-09-10T10:30:00Z"
}
```

### GET /api/exports/{jobId}/download

**Purpose**: Download completed export  
**Access**: Job creator, expires after 24 hours

```json
Response:
Binary file content (CSV, XLSX, or PDF)

Headers:
- Content-Type: application/octet-stream
- Content-Disposition: attachment; filename="export-2025-09-10.xlsx"

Errors:
404 - Export not found/expired
403 - Access denied
410 - Export expired
```

## Integration Endpoints

### POST /api/integrations/doppler/webhook

**Purpose**: Receive configuration updates from Doppler  
**Access**: Doppler webhook signature validation

```json
Request:
{
  "event": "config.updated",
  "project": "mountainhr",
  "config": "production",
  "changes": [
    {
      "name": "DATABASE_URL",
      "action": "updated"
    }
  ]
}

Response:
{
  "received": true,
  "processed": true,
  "restartRequired": false
}
```

### GET /api/health

**Purpose**: Health check for monitoring  
**Access**: Public

```json
Response:
{
  "status": "healthy",
  "timestamp": "2025-09-10T10:30:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "graphql": "healthy"
  },
  "uptime": 86400
}

Status Codes:
200 - All services healthy
503 - One or more services unhealthy
```

## Admin Endpoints

### GET /api/admin/metrics

**Purpose**: System metrics for monitoring dashboard  
**Access**: Admin role required

```json
Response:
{
  "users": {
    "total": 150,
    "active": 142,
    "newThisMonth": 5
  },
  "performance": {
    "avgResponseTime": 120,
    "requestsPerMinute": 45,
    "errorRate": 0.02
  },
  "storage": {
    "totalFiles": 1247,
    "storageUsed": "2.3GB",
    "storageLimit": "10GB"
  }
}
```

### POST /api/admin/maintenance

**Purpose**: Trigger maintenance operations  
**Access**: Admin role required

```json
Request:
{
  "operation": "clear_cache" | "rebuild_indexes" | "cleanup_exports",
  "dryRun": false
}

Response:
{
  "jobId": "uuid",
  "operation": "clear_cache",
  "status": "started",
  "estimatedDuration": 60
}
```

## Notification Endpoints

### POST /api/notifications/send

**Purpose**: Send notification to user(s)  
**Access**: HR Admin or system service

```json
Request:
{
  "userIds": ["uuid1", "uuid2"],
  "type": "info" | "warning" | "success" | "error",
  "title": "Leave Request Approved",
  "message": "Your leave request for Dec 25-26 has been approved.",
  "actionUrl": "/leave-requests/uuid",
  "metadata": {
    "leaveRequestId": "uuid"
  }
}

Response:
{
  "notificationId": "uuid",
  "recipientCount": 2,
  "sentAt": "2025-09-10T10:30:00Z"
}
```

### GET /api/notifications

**Purpose**: Get user notifications  
**Access**: Authenticated user (own notifications)

```json
Query Parameters:
- limit: number (default: 20, max: 100)
- offset: number (default: 0)
- unreadOnly: boolean (default: false)

Response:
{
  "notifications": [
    {
      "id": "uuid",
      "type": "info",
      "title": "Leave Request Approved",
      "message": "Your leave request has been approved.",
      "isRead": false,
      "actionUrl": "/leave-requests/uuid",
      "createdAt": "2025-09-10T09:00:00Z"
    }
  ],
  "totalCount": 15,
  "unreadCount": 3
}
```

### PATCH /api/notifications/{id}/read

**Purpose**: Mark notification as read  
**Access**: Notification recipient

```json
Response:
{
  "success": true,
  "readAt": "2025-09-10T10:30:00Z"
}
```

## Error Response Format

All endpoints use consistent error response format:

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Invalid email address",
		"field": "email",
		"details": {
			"provided": "invalid-email",
			"expected": "valid email format"
		}
	},
	"timestamp": "2025-09-10T10:30:00Z",
	"path": "/api/auth/login"
}
```

## Common Error Codes

- `VALIDATION_ERROR` - Invalid input data
- `UNAUTHORIZED` - Missing or invalid authentication
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `RATE_LIMITED` - Too many requests
- `SERVER_ERROR` - Internal server error
- `SERVICE_UNAVAILABLE` - Dependent service down

## Rate Limiting

- Authentication: 5 requests/minute per IP
- File uploads: 10 requests/minute per user
- Exports: 5 requests/hour per user
- General APIs: 100 requests/minute per user
- Admin APIs: 50 requests/minute per admin

Rate limit headers included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1641576000
```

## Security Headers

All responses include security headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

This REST API specification complements the GraphQL API for operations that are better suited to REST patterns, such as file uploads, exports, webhooks, and simple CRUD operations that don't benefit from GraphQL's flexibility.
