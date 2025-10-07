# Implementation Plan: Secure Employee Document Management

**Branch**: `024-we-need-to` | **Date**: 2025-10-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/yycholla/Documents/SvelteHR/specs/024-we-need-to/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → ✅ Loaded spec with 53 functional requirements
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ Project Type: web application (SvelteKit frontend + PostGraphile backend)
   → ✅ Structure Decision: Option 2 (frontend + backend)
3. Fill the Constitution Check section
   → ✅ Constitution v1.1.0 analyzed
4. Evaluate Constitution Check section
   → ✅ No constitutional violations - full alignment
   → ✅ Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → ✅ Research document generated
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → ✅ Design artifacts generated
7. Re-evaluate Constitution Check section
   → ✅ Post-design check: PASS
   → ✅ Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Task generation approach described
   → ✅ Ready for /tasks command
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:

- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

This feature implements a secure, enterprise-grade document management system for HR employment documents with end-to-end encryption, granular RBAC access control, document preview capabilities, audit logging, and 3-year retention compliance. The system handles sensitive PII (social security cards, I-9 forms, background checks) with client-side encryption before upload, server-side AES-256 storage encryption, and TLS 1.3 transport security.

**Technical Approach**:
- **Storage**: PostgreSQL with encrypted BYTEA columns + object storage reference for large files
- **Encryption**: Client-side Web Crypto API (AES-GCM 256-bit) before upload, server-side at-rest encryption
- **Preview**: Server-side document conversion to PDF for Office docs, native PDF/image rendering
- **Access Control**: PostgreSQL RLS policies enforcing 4-tier RBAC + direct report hierarchy validation
- **File Handling**: Multipart upload with chunking for 50MB limit, MIME type validation

## Technical Context

**Language/Version**: TypeScript 5.0 (frontend + backend), PostgreSQL 15
**Primary Dependencies**:
- Frontend: SvelteKit 2.22.0, Svelte 5.0, Web Crypto API, PDF.js for preview
- Backend: PostGraphile, LibreOffice (headless) for Office doc conversion, pg-crypto for encryption
**Storage**: PostgreSQL (metadata + encrypted file chunks), optional S3-compatible object storage for scalability
**Testing**:
- Frontend: Vitest (unit), Playwright (E2E with file upload scenarios)
- Backend: Vitest + Supertest (API contract tests)
**Target Platform**: Linux server (Ubuntu 22.04+), browsers with Web Crypto API support (Chrome 60+, Firefox 75+, Safari 11+)
**Project Type**: web (SvelteKit frontend + PostGraphile backend)
**Performance Goals**:
- Upload: <30s for 50MB file (including encryption)
- Preview generation: <3s for PDF, <5s for Office docs
- Access control check: <50ms per document
- Search/filter: <500ms for 10K documents
**Constraints**:
- End-to-end encryption requirement adds 15-20% upload time overhead
- Client-side encryption requires modern browser (no IE11 support)
- Office doc preview requires LibreOffice server installation
- 50MB file size limit per document
- Direct report hierarchy must be validated against PostgreSQL org chart
**Scale/Scope**:
- Initial: 1K employees, 50K documents, 500K access log entries/year
- Growth: 10K employees, 500K documents, 5M access log entries/year

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Test-First Development ✅
- **Contract tests** generated from OpenAPI schemas before implementation (Phase 1)
- **E2E tests** from user acceptance scenarios (upload, preview, access control)
- **Unit tests** for encryption utilities, file validation, RBAC checks
- **Target coverage**: >90% for all security-critical code paths
- **MCP Integration**: Serena MCP tools for semantic analysis and test adherence validation

### II. Type Safety First ✅
- **Strict TypeScript** throughout with no `any` types
- **Zod schemas** for all document upload/metadata validation
- **GraphQL code generation** from PostGraphile schema for type-safe queries
- **Type definitions** for Web Crypto API encryption keys and file streams

### III. Security by Design ✅
- **Row-Level Security (RLS)** on documents table enforcing RBAC + direct report checks
- **JWT authentication** with 4-tier RBAC (Admin 100, HR 80, Manager 60, Employee 20)
- **End-to-end encryption**: Client-side (Web Crypto API) + server-side (pg_crypto AES-256)
- **Input validation**: Zod schemas for metadata, MIME type verification, file size limits
- **Audit logging**: All document access, modifications logged with user identity + IP + timestamp
- **No sensitive data in logs**: Only document IDs logged, never file contents or encryption keys

### IV. Performance Standards ✅
- **GraphQL queries**: Document list <200ms (with proper indexing on employee_id, category, sensitivity)
- **Page load**: Document dashboard <1s with pagination (20 docs/page)
- **Database indexing**: Composite indexes on (employee_id, category), (department_id, is_active)
- **Redis caching**: Document metadata cached for 5 minutes, invalidated on updates
- **Performance tests**: Upload 100 x 10MB files in parallel, measure p95 latency

### V. Component Architecture ✅
- **Svelte 5 runes**: `$state` for upload progress, `$derived` for permission checks, `$props` for document viewer
- **Shadcn/ui patterns**: FileUpload, DocumentCard, PreviewModal components following existing patterns
- **No client-side API calls**: All document operations via server-side `+page.server.ts` load functions
- **Consistent error handling**: DocumentError type with user-friendly messages + technical logging
- **Storybook documentation**: DocumentViewer, FileUploader, DocumentTable components with all states
- **MCP refactoring**: Use Serena MCP `replace_symbol_body` for safe component updates

### VI. MCP-First Development ✅
- **Onboarding**: Check `mcp__serena__check_onboarding_performed()` before task execution
- **Task Management**: Use Archon MCP as primary task system per CLAUDE.md
- **Code Discovery**: `mcp__serena__list_dir()` to locate existing document/upload components
- **Implementation**: `mcp__serena__replace_symbol_body()` for surgical modifications to auth/upload logic
- **Verification**: `mcp__serena__find_referencing_symbols()` to validate encryption key management impact

**Constitution Compliance**: ✅ PASS - All constitutional principles satisfied

## Project Structure

### Documentation (this feature)

```
specs/024-we-need-to/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── documents-api.yaml          # OpenAPI schema for document operations
│   ├── encryption-api.yaml         # OpenAPI schema for key management
│   └── preview-api.yaml            # OpenAPI schema for preview generation
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
# SvelteKit Web Application Structure
src/
├── lib/
│   ├── components/
│   │   ├── documents/               # NEW: Document management components
│   │   │   ├── FileUploader.svelte
│   │   │   ├── DocumentCard.svelte
│   │   │   ├── DocumentTable.svelte
│   │   │   ├── PreviewModal.svelte
│   │   │   └── DocumentMetadataForm.svelte
│   │   └── ui/                      # Existing shadcn/ui components
│   ├── services/
│   │   ├── encryption.ts            # NEW: Web Crypto API client-side encryption
│   │   ├── documentService.ts       # NEW: Document upload/download logic
│   │   └── previewService.ts        # NEW: Preview generation requests
│   ├── schemas/
│   │   ├── documentSchemas.ts       # NEW: Zod schemas for validation
│   │   └── encryptionSchemas.ts     # NEW: Encryption key validation
│   ├── stores/
│   │   └── documentStore.ts         # NEW: Document state management
│   └── types/
│       ├── document.ts              # NEW: Document, Assignment, AccessLog types
│       └── encryption.ts            # NEW: EncryptionKey, KeyMetadata types
├── routes/
│   ├── dashboard/
│   │   └── documents/               # NEW: Document management UI
│   │       ├── +page.svelte
│   │       ├── +page.server.ts      # Server-side document loading
│   │       ├── [id]/                # Document detail/preview
│   │       │   ├── +page.svelte
│   │       │   └── +page.server.ts
│   │       └── upload/              # Document upload page
│   │           ├── +page.svelte
│   │           └── +page.server.ts
│   └── api/
│       └── documents/               # NEW: Document API routes
│           ├── upload/+server.ts    # Multipart upload handler
│           ├── preview/+server.ts   # Preview generation endpoint
│           └── download/+server.ts  # Encrypted file download
└── hooks.server.ts                  # Existing auth middleware

migrations/
├── 20251007_001_create_documents_table.sql
├── 20251007_002_create_document_assignments.sql
├── 20251007_003_create_access_logs.sql
├── 20251007_004_create_document_categories.sql
├── 20251007_005_add_encryption_keys.sql
└── 20251007_006_add_rls_policies.sql

tests/
├── unit/
│   ├── encryption.spec.ts           # Web Crypto API tests
│   ├── documentValidation.spec.ts   # Zod schema tests
│   └── rbacChecks.spec.ts           # Permission logic tests
├── integration/
│   ├── documentUpload.spec.ts       # Upload flow tests
│   ├── documentPreview.spec.ts      # Preview generation tests
│   └── accessControl.spec.ts        # RBAC enforcement tests
└── e2e/
    ├── document-lifecycle.spec.ts   # Full upload → preview → delete flow
    ├── document-permissions.spec.ts # Multi-role access tests
    └── document-retention.spec.ts   # 3-year retention validation
```

**Structure Decision**: Option 2 (web application) - SvelteKit handles both frontend UI and API routes, PostGraphile provides GraphQL schema, PostgreSQL stores encrypted documents + metadata

## Phase 0: Outline & Research

**Objective**: Resolve all remaining NEEDS CLARIFICATION and research technical unknowns for document management implementation.

### Research Tasks

1. **End-to-End Encryption Architecture**
   - Research: Web Crypto API best practices for file encryption in browser
   - Research: Key management strategies (user-specific vs document-specific keys)
   - Research: Encrypted file chunking for large files (50MB)
   - Decision needed: Key derivation (PBKDF2 vs Argon2), key storage (IndexedDB vs server-managed)

2. **Office Document Preview Conversion**
   - Research: LibreOffice headless mode for DOCX/XLSX → PDF conversion
   - Research: Alternative: Gotenberg, Apache POI, OnlyOffice
   - Research: Conversion performance for 10MB XLSX files
   - Decision needed: Self-hosted vs cloud service (AWS Textract, Google Docs API)

3. **File Upload Handling**
   - Research: SvelteKit multipart form data handling for 50MB files
   - Research: Chunked upload with progress tracking (tus protocol vs custom)
   - Research: S3-compatible storage (MinIO, Cloudflare R2) vs PostgreSQL BYTEA
   - Decision needed: Direct database storage vs object storage reference

4. **PostgreSQL Encryption at Rest**
   - Research: pg_crypto extension for AES-256 column encryption
   - Research: pgcrypto vs application-level encryption trade-offs
   - Research: Performance impact of encrypted BYTEA columns vs pgcrypto functions
   - Decision needed: Column-level encryption vs full table encryption

5. **RBAC + Direct Report Hierarchy Validation**
   - Research: Recursive CTE queries for manager → direct reports tree
   - Research: PostgreSQL RLS policy complexity limits (max depth)
   - Research: Caching strategies for org chart traversal
   - Decision needed: Materialized path vs adjacency list for org structure

6. **Document Preview Security**
   - Research: Signed URL generation for time-limited preview access
   - Research: Watermarking PDFs with user identity (to prevent screenshots sharing)
   - Research: Content Security Policy (CSP) for iframe preview isolation
   - Decision needed: Server-side rendering vs client-side PDF.js

7. **Soft Delete + 3-Year Retention**
   - Research: PostgreSQL partitioning by deletion date for retention enforcement
   - Research: Automated cleanup jobs (pg_cron vs application-level scheduler)
   - Research: Audit log retention separate from document retention
   - Decision needed: Archive to cheaper storage vs hard delete after 3 years

8. **Compliance Logging (Deferred)**
   - Note: Specific compliance standards (GDPR, HIPAA, SOC2) marked as low-priority
   - Research: Audit log format for compliance tools (Splunk, ELK)
   - Research: Anonymization requirements for EU GDPR compliance
   - Decision: Generic audit logging sufficient for now, compliance-specific later

**Output**: See `research.md` for consolidated findings with decisions, rationale, and alternatives considered.

## Phase 1: Design & Contracts

_Prerequisites: research.md complete_

### 1. Data Model (`data-model.md`)

**Entities Extracted from Spec**:

- **documents** table:
  - `id` UUID PRIMARY KEY
  - `filename` VARCHAR(255) NOT NULL
  - `file_type` VARCHAR(50) NOT NULL CHECK (file_type IN ('PDF', 'JPEG', 'PNG', 'GIF', 'DOCX', 'XLSX', 'TXT', 'CSV'))
  - `file_size_bytes` INTEGER NOT NULL CHECK (file_size_bytes <= 52428800) -- 50 MB
  - `storage_path` TEXT NOT NULL -- Reference to encrypted file location
  - `encryption_key_id` UUID NOT NULL -- Reference to encryption_keys table
  - `uploaded_by` UUID NOT NULL REFERENCES users(id)
  - `uploaded_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - `category` VARCHAR(100) NOT NULL -- e.g., "Social Security Card"
  - `sensitivity_level` VARCHAR(50) NOT NULL DEFAULT 'Internal' CHECK (sensitivity_level IN ('Public', 'Internal', 'Confidential', 'Sensitive-PII'))
  - `expiration_date` DATE
  - `version_number` INTEGER NOT NULL DEFAULT 1
  - `metadata_tags` JSONB -- Custom tags for organization
  - `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE
  - `deleted_at` TIMESTAMPTZ
  - `deleted_by` UUID REFERENCES users(id)
  - Indexes: `(uploaded_by, is_deleted)`, `(category, sensitivity_level)`, `(expiration_date WHERE expiration_date IS NOT NULL)`
  - RLS Policies: Employee sees only assigned docs, Manager sees direct reports' docs, HR sees all

- **document_assignments** table:
  - `id` UUID PRIMARY KEY
  - `document_id` UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE
  - `employee_id` UUID REFERENCES users(id) ON DELETE CASCADE -- NULL for department assignments
  - `department_id` UUID REFERENCES departments(id) ON DELETE CASCADE -- NULL for individual assignments
  - `assigned_by` UUID NOT NULL REFERENCES users(id)
  - `assigned_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - `assignment_status` VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (assignment_status IN ('active', 'revoked'))
  - `assignment_reason` TEXT
  - CHECK: `(employee_id IS NOT NULL AND department_id IS NULL) OR (employee_id IS NULL AND department_id IS NOT NULL)` -- One or the other
  - Indexes: `(document_id, assignment_status)`, `(employee_id, assignment_status)`, `(department_id, assignment_status)`

- **document_access_logs** table:
  - `id` UUID PRIMARY KEY
  - `document_id` UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE
  - `user_id` UUID NOT NULL REFERENCES users(id)
  - `access_type` VARCHAR(20) NOT NULL CHECK (access_type IN ('view', 'download', 'preview'))
  - `access_timestamp` TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - `ip_address` INET
  - `user_agent` TEXT
  - `access_outcome` VARCHAR(20) NOT NULL CHECK (access_outcome IN ('success', 'denied'))
  - `denial_reason` TEXT -- If access_outcome = 'denied'
  - Indexes: `(document_id, access_timestamp DESC)`, `(user_id, access_timestamp DESC)`
  - Partitioning: Monthly partitions for log retention

- **document_categories** table (reference data):
  - `id` UUID PRIMARY KEY
  - `name` VARCHAR(100) NOT NULL UNIQUE
  - `default_sensitivity_level` VARCHAR(50) NOT NULL
  - `retention_years` INTEGER NOT NULL DEFAULT 3
  - `required_role` VARCHAR(50) -- Minimum role required to upload this category
  - Seed data: "Social Security Card" (Sensitive-PII, Admin only), "I-9 Form" (Confidential, HR), "Offer Letter" (Internal, HR)

- **encryption_keys** table:
  - `id` UUID PRIMARY KEY
  - `key_identifier` VARCHAR(255) NOT NULL UNIQUE -- Client-generated key ID
  - `encrypted_key_data` BYTEA NOT NULL -- Server-encrypted symmetric key
  - `key_algorithm` VARCHAR(50) NOT NULL DEFAULT 'AES-GCM-256'
  - `created_for_user` UUID NOT NULL REFERENCES users(id)
  - `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - `rotated_at` TIMESTAMPTZ
  - Indexes: `(created_for_user, created_at DESC)`

- **document_versions** table:
  - `id` UUID PRIMARY KEY
  - `document_id` UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE
  - `version_number` INTEGER NOT NULL
  - `storage_path` TEXT NOT NULL
  - `encryption_key_id` UUID NOT NULL
  - `version_created_by` UUID NOT NULL REFERENCES users(id)
  - `version_created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - `change_description` TEXT
  - UNIQUE(document_id, version_number)
  - Indexes: `(document_id, version_number DESC)`

**State Transitions**:
- Document: uploaded → active → (optional) expired → soft_deleted (3 years) → hard_deleted
- Assignment: active ↔ revoked
- Access Log: (immutable, append-only)

**Validation Rules**:
- File size: 1 byte ≤ file_size_bytes ≤ 52428800 (50 MB)
- File type: ENUM restricted to 8 allowed formats
- Sensitivity level: Escalation only (Internal → Confidential → Sensitive-PII), no downgrade without audit
- Retention: Minimum 3 years from upload_date OR employee termination_date

### 2. API Contracts (`/contracts/`)

**Generated from Functional Requirements**:

#### A. Documents API (`documents-api.yaml`)

```yaml
openapi: 3.0.3
info:
  title: Documents API
  version: 1.0.0
paths:
  /api/documents/upload:
    post:
      summary: Upload encrypted document
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
                  maxLength: 52428800  # 50 MB
                encryptedMetadata:
                  type: object
                  properties:
                    filename: {type: string}
                    category: {type: string}
                    sensitivityLevel: {type: string, enum: [Public, Internal, Confidential, Sensitive-PII]}
                    encryptionKeyId: {type: string, format: uuid}
                    assignToEmployees: {type: array, items: {type: string, format: uuid}}
                    assignToDepartments: {type: array, items: {type: string, format: uuid}}
      responses:
        '201':
          description: Document uploaded successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  documentId: {type: string, format: uuid}
                  uploadedAt: {type: string, format: date-time}
        '400': {description: Invalid file type or size}
        '403': {description: Insufficient permissions}
        '413': {description: File size exceeds 50MB}

  /api/documents/{id}/preview:
    get:
      summary: Generate document preview
      parameters:
        - name: id
          in: path
          required: true
          schema: {type: string, format: uuid}
      responses:
        '200':
          description: Preview URL generated
          content:
            application/json:
              schema:
                type: object
                properties:
                  previewUrl: {type: string, format: uri}
                  expiresAt: {type: string, format: date-time}
                  previewFormat: {type: string, enum: [PDF, inline]}
        '403': {description: Access denied}
        '404': {description: Document not found}

  /api/documents/{id}/download:
    get:
      summary: Download encrypted document
      parameters:
        - name: id
          in: path
          required: true
          schema: {type: string, format: uuid}
      responses:
        '200':
          description: Encrypted file download
          content:
            application/octet-stream:
              schema: {type: string, format: binary}
        '403': {description: Access denied}
        '404': {description: Document not found}

  /api/documents:
    get:
      summary: List documents with RBAC filtering
      parameters:
        - name: employeeId
          in: query
          schema: {type: string, format: uuid}
        - name: category
          in: query
          schema: {type: string}
        - name: sensitivityLevel
          in: query
          schema: {type: string}
        - name: page
          in: query
          schema: {type: integer, minimum: 1, default: 1}
        - name: limit
          in: query
          schema: {type: integer, minimum: 1, maximum: 100, default: 20}
      responses:
        '200':
          description: Filtered document list
          content:
            application/json:
              schema:
                type: object
                properties:
                  documents: {type: array, items: {$ref: '#/components/schemas/Document'}}
                  totalCount: {type: integer}
                  page: {type: integer}
                  limit: {type: integer}

components:
  schemas:
    Document:
      type: object
      properties:
        id: {type: string, format: uuid}
        filename: {type: string}
        fileType: {type: string}
        fileSizeBytes: {type: integer}
        uploadedBy: {$ref: '#/components/schemas/User'}
        uploadedAt: {type: string, format: date-time}
        category: {type: string}
        sensitivityLevel: {type: string}
        expirationDate: {type: string, format: date}
        versionNumber: {type: integer}
```

#### B. Encryption API (`encryption-api.yaml`)

```yaml
openapi: 3.0.3
info:
  title: Encryption Key Management API
  version: 1.0.0
paths:
  /api/encryption/keys:
    post:
      summary: Register encryption key for document
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                keyIdentifier: {type: string}
                encryptedKeyData: {type: string, format: base64}
                keyAlgorithm: {type: string, enum: [AES-GCM-256]}
      responses:
        '201':
          description: Key registered
          content:
            application/json:
              schema:
                type: object
                properties:
                  keyId: {type: string, format: uuid}
                  createdAt: {type: string, format: date-time}

  /api/encryption/keys/{id}:
    get:
      summary: Retrieve encrypted key for document decryption
      parameters:
        - name: id
          in: path
          required: true
          schema: {type: string, format: uuid}
      responses:
        '200':
          description: Encrypted key data
          content:
            application/json:
              schema:
                type: object
                properties:
                  encryptedKeyData: {type: string, format: base64}
                  keyAlgorithm: {type: string}
        '403': {description: Access denied}
```

### 3. Contract Tests (Generated from contracts)

**Test Files** (generated but initially failing - no implementation yet):

- `tests/contract/documents-upload.contract.spec.ts`:
  - POST /api/documents/upload with 10MB PDF → expect 201 + documentId
  - POST /api/documents/upload with 60MB file → expect 413
  - POST /api/documents/upload with .EXE file → expect 400
  - POST without auth token → expect 401
  - POST as Employee role → expect 403

- `tests/contract/documents-preview.contract.spec.ts`:
  - GET /api/documents/{id}/preview for owned doc → expect 200 + previewUrl
  - GET /api/documents/{id}/preview for other employee's doc → expect 403
  - GET /api/documents/{id}/preview for department doc → expect 200 (if in department)

- `tests/contract/documents-download.contract.spec.ts`:
  - GET /api/documents/{id}/download with valid permissions → expect 200 + binary stream
  - GET /api/documents/{id}/download without permissions → expect 403

- `tests/contract/encryption-keys.contract.spec.ts`:
  - POST /api/encryption/keys with valid key → expect 201
  - GET /api/encryption/keys/{id} with permissions → expect 200 + encryptedKeyData

### 4. Integration Test Scenarios (from User Stories)

**From Acceptance Scenarios**:

- **Scenario 1: HR Manager Upload Flow**
  ```typescript
  describe('Document Upload & Assignment', () => {
    it('should encrypt, upload, assign, and notify employee', async () => {
      // 1. HR manager logs in
      // 2. Navigate to /dashboard/documents/upload
      // 3. Select 5MB PDF file
      // 4. Client-side: Encrypt file with Web Crypto API
      // 5. Upload encrypted file
      // 6. Assign to employee ID
      // 7. Verify document record created
      // 8. Verify assignment record created
      // 9. Verify employee notification sent
      // 10. Verify access log entry: upload success
    });
  });
  ```

- **Scenario 5: Employee Document Access**
  ```typescript
  describe('Document Access Control', () => {
    it('should show only assigned documents to employee', async () => {
      // 1. Employee logs in
      // 2. Navigate to /dashboard/documents
      // 3. Verify document list contains only assigned docs
      // 4. Attempt to access another employee's doc ID via URL
      // 5. Verify 403 Forbidden response
      // 6. Verify access log entry: access denied
    });
  });
  ```

- **Scenario 7: Audit Log Review**
  ```typescript
  describe('Audit Trail', () => {
    it('should log all document access attempts', async () => {
      // 1. HR admin logs in
      // 2. Navigate to /dashboard/documents/audit
      // 3. Filter by document ID
      // 4. Verify log shows: upload, assignment, preview, download events
      // 5. Verify each log has: user_id, timestamp, IP, user_agent, outcome
    });
  });
  ```

### 5. Quickstart Test (`quickstart.md`)

```markdown
# Document Management Quickstart Test

## Prerequisites
- Local SvelteKit dev server running
- PostgreSQL with migrations applied
- User accounts: hr_manager@test.com, employee@test.com

## Test Scenario: Upload → Assign → Preview → Audit

### Step 1: Upload Document (HR Manager)
1. Login as hr_manager@test.com
2. Navigate to http://localhost:5173/dashboard/documents/upload
3. Click "Choose File" → select `test-files/sample-offer-letter.pdf` (2MB)
4. Select Category: "Offer Letter"
5. Select Sensitivity: "Internal"
6. Click "Upload" → observe client-side encryption progress bar
7. ✅ Verify: Document appears in "My Uploaded Documents" list

### Step 2: Assign Document
8. Click document row → "Assign to Employee"
9. Search for "employee@test.com" → select
10. Add assignment note: "Your offer letter for review"
11. Click "Assign"
12. ✅ Verify: Email notification sent to employee@test.com

### Step 3: Preview Document (Employee)
13. Logout → Login as employee@test.com
14. Navigate to http://localhost:5173/dashboard/documents
15. ✅ Verify: "Offer Letter" document appears in list
16. Click document → "Preview"
17. ✅ Verify: PDF preview loads in modal (client-side decryption)
18. ✅ Verify: Watermark shows "Viewed by employee@test.com"

### Step 4: Audit Trail (HR Manager)
19. Logout → Login as hr_manager@test.com
20. Navigate to http://localhost:5173/dashboard/documents/audit
21. Filter by document: "Offer Letter"
22. ✅ Verify: Access log shows:
    - Upload event (hr_manager@test.com)
    - Assignment event (hr_manager@test.com → employee@test.com)
    - Preview event (employee@test.com)

### Expected Results
- All ✅ checkpoints pass
- No console errors
- All operations complete in <5 seconds each
- Encryption/decryption transparent to user
```

### 6. Update CLAUDE.md (Incremental Update)

Running agent context update script...

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

1. **Load** `.specify/templates/tasks-template.md` as base structure
2. **Generate tasks from Phase 1 artifacts**:
   - From `contracts/documents-api.yaml`: 12 contract test tasks (upload, preview, download, list, assign, etc.)
   - From `contracts/encryption-api.yaml`: 4 contract test tasks (key registration, key retrieval)
   - From `data-model.md`: 6 entity creation tasks (tables + migrations)
   - From `quickstart.md`: 1 E2E integration test task covering full scenario
   - From component designs: 8 UI component tasks (FileUploader, DocumentCard, PreviewModal, etc.)
   - From service designs: 6 service implementation tasks (encryption, upload, preview, etc.)

3. **Ordering Strategy**:
   - **Phase 1: Foundations** [all parallel where possible]
     - T001-T006: Database migrations (documents, assignments, logs, categories, keys, RLS) [P]
     - T007-T010: Contract tests for all endpoints (initially failing) [P]
     - T011-T014: Zod schemas for validation [P]

   - **Phase 2: Core Services** [sequential dependencies]
     - T015: Web Crypto API encryption service (client-side)
     - T016: Server-side encryption key management
     - T017: File upload service with chunking
     - T018: File storage abstraction (PostgreSQL vs S3)

   - **Phase 3: API Implementation** [parallel after Phase 2]
     - T019-T022: API route handlers (upload, preview, download, list) [P after T015-T018]
     - T023: RBAC middleware for document access
     - T024: Audit logging service

   - **Phase 4: UI Components** [parallel after Phase 3]
     - T025: FileUploader component (Svelte 5 runes) [P]
     - T026: DocumentCard component [P]
     - T027: DocumentTable with filtering/sorting [P]
     - T028: PreviewModal with PDF.js integration [P]
     - T029: DocumentMetadataForm [P]

   - **Phase 5: Integration & Validation** [sequential]
     - T030: E2E test from quickstart.md
     - T031: Performance test (100 x 10MB uploads in parallel)
     - T032: Security audit (encryption, RBAC, audit logs)
     - T033: Constitution compliance verification

**Estimated Task Count**: 33 numbered, dependency-ordered tasks in tasks.md

**Marking [P] for Parallel**:
- Database migrations (T001-T006) can run in parallel
- Contract tests (T007-T010) independent
- UI components (T025-T029) independent after API complete

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md with 33 ordered tasks)
**Phase 4**: Implementation (execute tasks.md following TDD: contract tests → implementation → pass tests)
**Phase 5**: Validation (run quickstart.md E2E, performance tests, security audit, constitution check)

## Complexity Tracking

_No constitutional violations detected - table intentionally left empty_

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| _(none)_  | _(n/a)_    | _(n/a)_                              |

## Progress Tracking

_This checklist is updated during execution flow_

**Phase Status**:

- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved (8 deferred as low-priority)
- [x] Complexity deviations documented (none)

---

_Based on Constitution v1.1.0 - See `.specify/memory/constitution.md`_
