# Tasks: Secure Employee Document Management

**Input**: Design documents from `/home/yycholla/Documents/SvelteHR/specs/024-we-need-to/`
**Prerequisites**: plan.md ✅, spec.md ✅
**Branch**: `024-we-need-to`

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → ✅ Loaded: tech stack (SvelteKit + PostGraphile), structure (web app)
2. Load optional design documents:
   → ✅ plan.md contains embedded data model and API contracts
   → ✅ Extracted: 6 database tables, 2 API specs, 1 E2E scenario
3. Generate tasks by category:
   → ✅ Setup: migrations, schemas, contract tests
   → ✅ Core: encryption, upload, preview, RBAC
   → ✅ Integration: UI components, routes, audit
   → ✅ Polish: E2E, performance, security validation
4. Apply task rules:
   → ✅ Database migrations = parallel [P]
   → ✅ Contract tests = parallel [P]
   → ✅ UI components = parallel [P]
   → ✅ API routes sharing files = sequential
5. Number tasks sequentially (T001-T033)
6. Validation: All requirements covered ✅
7. Return: SUCCESS (33 tasks ready for execution)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Paths use SvelteKit structure: `src/`, `migrations/`, `tests/`

## Path Conventions

**Project Structure**: SvelteKit web application
- Database: `migrations/` (PostgreSQL)
- Frontend: `src/lib/`, `src/routes/`
- Backend: `src/routes/api/` (SvelteKit API routes)
- Tests: `tests/contract/`, `tests/integration/`, `tests/e2e/`

---

## Phase 3.1: Database Foundation

**CRITICAL: Complete before any application code**

- [x] T001 [P] Create `migrations/20251007_001_create_documents_table.sql` with documents table (id, filename, file_type, file_size_bytes, storage_path, encryption_key_id, uploaded_by, uploaded_at, category, sensitivity_level, expiration_date, version_number, metadata_tags, is_deleted, deleted_at, deleted_by). Add indexes: (uploaded_by, is_deleted), (category, sensitivity_level), (expiration_date WHERE NOT NULL). Add RLS policies: Employee sees assigned docs, Manager sees direct reports, HR sees all.

- [x] T002 [P] Create `migrations/20251007_002_create_document_assignments.sql` with document_assignments table (id, document_id, employee_id, department_id, assigned_by, assigned_at, assignment_status, assignment_reason). Add CHECK constraint: (employee_id IS NOT NULL AND department_id IS NULL) OR (employee_id IS NULL AND department_id IS NOT NULL). Add indexes: (document_id, assignment_status), (employee_id, assignment_status), (department_id, assignment_status).

- [x] T003 [P] Create `migrations/20251007_003_create_access_logs.sql` with document_access_logs table (id, document_id, user_id, access_type, access_timestamp, ip_address, user_agent, access_outcome, denial_reason). Add indexes: (document_id, access_timestamp DESC), (user_id, access_timestamp DESC). Add monthly partitioning for log retention.

- [x] T004 [P] Create `migrations/20251007_004_create_document_categories.sql` with document_categories table (id, name, default_sensitivity_level, retention_years, required_role). Add UNIQUE constraint on name. Seed data: "Social Security Card" (Sensitive-PII, Admin only), "I-9 Form" (Confidential, HR), "Offer Letter" (Internal, HR), "Tax Form" (Confidential, HR), "Benefits Enrollment" (Internal, HR), "Background Check" (Confidential, HR), "Department Policy" (Public, Manager).

- [x] T005 [P] Create `migrations/20251007_005_add_encryption_keys.sql` with encryption_keys table (id, key_identifier, encrypted_key_data, key_algorithm, created_for_user, created_at, rotated_at). Add UNIQUE constraint on key_identifier. Add index: (created_for_user, created_at DESC).

- [x] T006 [P] Create `migrations/20251007_006_create_document_versions.sql` with document_versions table (id, document_id, version_number, storage_path, encryption_key_id, version_created_by, version_created_at, change_description). Add UNIQUE(document_id, version_number). Add index: (document_id, version_number DESC).

- [x] T007 Create `migrations/20251007_007_add_rls_policies.sql` with Row-Level Security policies: 1) documents_employee_access: Users see documents assigned to them via document_assignments. 2) documents_manager_access: Managers see documents assigned to direct reports (recursive CTE for org chart traversal). 3) documents_hr_access: HR role sees all non-deleted documents. 4) documents_admin_access: Admin role sees all documents including soft-deleted.

## Phase 3.2: Validation & Type Safety

**CRITICAL: Type definitions and schemas before services**

- [x] T008 [P] Create `src/lib/types/document.ts` with TypeScript interfaces: Document, DocumentAssignment, DocumentAccessLog, DocumentCategory, DocumentVersion, EncryptionKey. Export enums: FileType ('PDF' | 'JPEG' | 'PNG' | 'GIF' | 'DOCX' | 'XLSX' | 'TXT' | 'CSV'), SensitivityLevel ('Public' | 'Internal' | 'Confidential' | 'Sensitive-PII'), AccessType ('view' | 'download' | 'preview'), AssignmentStatus ('active' | 'revoked').

- [x] T009 [P] Create `src/lib/schemas/documentSchemas.ts` with Zod schemas: documentUploadSchema (file, category, sensitivityLevel, assignToEmployees[], assignToDepartments[], expirationDate?), documentMetadataSchema, documentFilterSchema (employeeId?, category?, sensitivityLevel?, page, limit). Enforce: file_size_bytes max 52428800 (50MB), fileType enum validation.

- [x] T010 [P] Create `src/lib/schemas/encryptionSchemas.ts` with Zod schemas: encryptionKeySchema (keyIdentifier, encryptedKeyData base64, keyAlgorithm 'AES-GCM-256'), keyRetrievalSchema. Add runtime validation for Web Crypto API key formats.

## Phase 3.3: Contract Tests First (TDD) ⚠️ MUST FAIL INITIALLY

**CRITICAL: Write these tests BEFORE any implementation - they MUST fail first**

- [x] T011 [P] Contract test: Create `tests/contract/documents-upload.contract.spec.ts` testing POST /api/documents/upload. Test cases: 1) 10MB PDF with valid auth → expect 201 + documentId, 2) 60MB file → expect 413, 3) .EXE file → expect 400, 4) No auth token → expect 401, 5) Employee role (not HR) → expect 403. Use Vitest + Supertest.

- [x] T012 [P] Contract test: Create `tests/contract/documents-preview.contract.spec.ts` testing GET /api/documents/{id}/preview. Test cases: 1) Preview owned doc → expect 200 + previewUrl + expiresAt, 2) Preview other employee's doc → expect 403, 3) Preview department doc (user in dept) → expect 200, 4) Preview department doc (user NOT in dept) → expect 403.

- [x] T013 [P] Contract test: Create `tests/contract/documents-download.contract.spec.ts` testing GET /api/documents/{id}/download. Test cases: 1) Download with valid permissions → expect 200 + binary stream, 2) Download without permissions → expect 403, 3) Download non-existent doc → expect 404.

- [x] T014 [P] Contract test: Create `tests/contract/documents-list.contract.spec.ts` testing GET /api/documents. Test cases: 1) List with employeeId filter → expect filtered results, 2) List with category filter → expect filtered results, 3) List with pagination (page=2, limit=20) → expect correct page, 4) Employee sees only assigned docs (RBAC enforcement).

- [x] T015 [P] Contract test: Create `tests/contract/encryption-keys.contract.spec.ts` testing encryption key management. Test cases: 1) POST /api/encryption/keys with valid key → expect 201 + keyId, 2) GET /api/encryption/keys/{id} with permissions → expect 200 + encryptedKeyData, 3) GET without permissions → expect 403.

## Phase 3.4: Core Services (ONLY after contract tests are failing)

**Dependencies: T008-T010 (types/schemas), T011-T015 (tests failing)**

- [x] T016 Create `src/lib/services/encryption.ts` with client-side Web Crypto API encryption. Functions: generateEncryptionKey() → CryptoKey, encryptFile(file: File, key: CryptoKey) → { encryptedData: ArrayBuffer, iv: Uint8Array }, decryptFile(encryptedData: ArrayBuffer, key: CryptoKey, iv: Uint8Array) → Blob. Use AES-GCM-256 algorithm. Include progress callbacks for 50MB files.

- [x] T017 Create `src/lib/services/keyManagement.ts` for encryption key storage. Functions: registerKey(keyData: ArrayBuffer, userId: string) → Promise<string>, retrieveKey(keyId: string) → Promise<ArrayBuffer>. Implement server-side encryption of key material before PostgreSQL storage using pg_crypto.

- [x] T018 Create `src/lib/services/documentService.ts` for document operations. Functions: uploadDocument(file: File, metadata: DocumentMetadata) → Promise<UploadResult>, assignDocument(documentId: string, assignments: Assignment[]) → Promise<void>, getDocumentMetadata(documentId: string) → Promise<Document>. Integrate with encryption.ts for client-side encryption before upload.

- [x] T019 Create `src/lib/services/previewService.ts` for preview generation. Functions: generatePreview(documentId: string) → Promise<PreviewResult>, convertOfficeToPDF(filePath: string) → Promise<string> (server-side LibreOffice headless). Support: native PDF/images (direct), DOCX/XLSX (convert to PDF first). Return signed URLs with 15-minute expiration.

- [x] T020 Create `src/lib/services/storageService.ts` for file storage abstraction. Functions: storeFile(encryptedData: ArrayBuffer, metadata: FileMetadata) → Promise<string>, retrieveFile(storagePath: string) → Promise<ArrayBuffer>. Initial implementation: PostgreSQL BYTEA columns. Future: S3-compatible object storage switch.

- [x] T021 Create `src/lib/services/auditService.ts` for access logging. Functions: logAccess(documentId: string, userId: string, accessType: AccessType, outcome: 'success' | 'denied', metadata: AccessMetadata) → Promise<void>. Log: timestamp, IP address, user agent, denial reason (if applicable). Insert into document_access_logs table.

- [x] T022 Create `src/lib/services/rbacService.ts` for RBAC checks. Functions: canAccessDocument(userId: string, documentId: string) → Promise<boolean>, canUploadDocument(userId: string, category: string) → Promise<boolean>, getDirectReports(managerId: string) → Promise<string[]> (recursive CTE query). Enforce: 4-tier RBAC (Super Admin 100, Admin 80, Manager 60, Employee 20) + direct report hierarchy.

## Phase 3.5: API Implementation

**Dependencies: T016-T022 (services complete), T001-T007 (database ready)**

- [x] T023 Create `src/routes/api/documents/upload/+server.ts` with POST handler. Steps: 1) Validate JWT auth (hooks.server.ts), 2) Parse multipart/form-data (50MB limit), 3) Validate with documentUploadSchema, 4) Receive encrypted file + metadata, 5) Store via storageService, 6) Create document record + assignments, 7) Log upload event, 8) Send employee notifications. Return 201 + documentId or appropriate error.

- [x] T024 Create `src/routes/api/documents/[id]/preview/+server.ts` with GET handler. Steps: 1) Validate auth + RBAC (rbacService.canAccessDocument), 2) Retrieve document metadata, 3) Generate preview via previewService, 4) Create signed URL (15min expiration), 5) Log preview access, 6) Return { previewUrl, expiresAt, previewFormat }. Handle Office doc conversion asynchronously.

- [x] T025 Create `src/routes/api/documents/[id]/download/+server.ts` with GET handler. Steps: 1) Validate auth + RBAC, 2) Retrieve encrypted file via storageService, 3) Stream binary response with Content-Disposition header, 4) Log download access. Return 403 if RBAC check fails, 404 if document not found.

- [x] T026 Create `src/routes/api/documents/+server.ts` with GET handler for listing/filtering. Steps: 1) Validate auth, 2) Parse query params with documentFilterSchema, 3) Apply RBAC filtering (Employee: assigned only, Manager: direct reports, Admin: all), 4) Execute PostgreSQL query with RLS policies, 5) Paginate results (20/page default), 6) Return { documents, totalCount, page, limit }.

- [x] T027 Create `src/routes/api/encryption/keys/+server.ts` with POST handler for key registration. Steps: 1) Validate auth, 2) Parse with encryptionKeySchema, 3) Server-side encrypt key material using pg_crypto, 4) Store in encryption_keys table, 5) Return keyId + createdAt.

- [x] T028 Create `src/routes/api/encryption/keys/[id]/+server.ts` with GET handler. Steps: 1) Validate auth + ownership (key.created_for_user = current_user), 2) Retrieve encrypted key data, 3) Return { encryptedKeyData, keyAlgorithm }. Return 403 if user doesn't own the key.

## Phase 3.6: UI Components (Svelte 5 Runes)

**Dependencies: T023-T028 (API routes complete)**

- [x] T029 [P] Create `src/lib/components/documents/FileUploader.svelte` with drag-and-drop upload. Props: `$props<{ onUpload: (file: File) => void, maxSizeMB: number }>`. State: `let uploadProgress = $state(0)`, `let isEncrypting = $state(false)`. Features: client-side encryption progress bar, file type validation (8 allowed types), 50MB size check, MIME type verification. Use Web Crypto API from encryption.ts.

- [x] T030 [P] Create `src/lib/components/documents/DocumentCard.svelte` for list display. Props: `$props<{ document: Document, canPreview: boolean, canDownload: boolean }>`. Derived: `let fileIcon = $derived(getIconForFileType(document.file_type))`. Display: filename, category, sensitivity badge (color-coded), upload date, file size. Actions: Preview button (if canPreview), Download button (if canDownload).

- [x] T031 [P] Create `src/lib/components/documents/DocumentTable.svelte` with filtering/sorting. Props: `$props<{ documents: Document[], onFilter: (filters: DocumentFilter) => void }>`. State: `let sortColumn = $state<string>('uploaded_at')`, `let sortDirection = $state<'asc' | 'desc'>('desc')`. Features: category filter dropdown, sensitivity filter, search by filename, pagination controls (20/page). Use Skeleton UI DataTable component pattern.

- [x] T032 [P] Create `src/lib/components/documents/PreviewModal.svelte` for in-browser preview. Props: `$props<{ documentId: string, isOpen: boolean, onClose: () => void }>`. State: `let previewUrl = $state<string | null>(null)`, `let isLoading = $state(true)`. Features: PDF.js integration for PDF rendering, image preview for JPEG/PNG/GIF, Office doc conversion status indicator. Watermark: "Viewed by {user.email}" overlay. Auto-cleanup preview URL after 15min.

- [x] T033 [P] Create `src/lib/components/documents/DocumentMetadataForm.svelte` for upload metadata. Props: `$props<{ onSubmit: (metadata: DocumentMetadata) => void }>`. State: `let selectedCategory = $state<string>('')`, `let sensitivityLevel = $state<SensitivityLevel>('Internal')`. Fields: category dropdown (from document_categories), sensitivity radio buttons, expiration date picker (optional), employee assignment multi-select, department assignment multi-select. Validate with documentMetadataSchema.

- [x] T034 [P] Create `src/lib/components/documents/DocumentAssignmentModal.svelte` for assigning docs to employees/departments. Props: `$props<{ documentId: string, isOpen: boolean, onAssign: (assignments: Assignment[]) => void }>`. Features: employee search/select (combobox), department multi-select, assignment reason textarea, bulk assignment preview. Call documentService.assignDocument() on submit.

## Phase 3.7: Page Routes (Server-Side Data Loading)

**Dependencies: T029-T034 (UI components), T023-T028 (API routes)**

- [x] T035 Create `src/routes/dashboard/documents/+page.svelte` for document list page. Display: DocumentTable component with server-loaded documents, filter controls, pagination. Actions: Upload button → navigate to /dashboard/documents/upload, Preview button → open PreviewModal, Download button → trigger download.

- [x] T036 Create `src/routes/dashboard/documents/+page.server.ts` with load function. Steps: 1) Validate auth from event.locals.user, 2) Get filter params from url.searchParams, 3) Call GET /api/documents with RBAC filtering, 4) Return { documents, totalCount, page, userPermissions }. Redirect to /login if unauthenticated.

- [x] T037 Create `src/routes/dashboard/documents/upload/+page.svelte` for upload page. Components: FileUploader, DocumentMetadataForm. Flow: 1) User selects file → FileUploader validates and encrypts, 2) User fills metadata form, 3) Submit → call documentService.uploadDocument(), 4) Show success toast, 5) Navigate to /dashboard/documents.

- [x] T038 Create `src/routes/dashboard/documents/upload/+page.server.ts` with load function. Steps: 1) Validate auth, 2) Check user permissions (HR or Admin roles only), 3) Load document_categories for dropdown, 4) Load employee list for assignment, 5) Load department list for assignment. Return { categories, employees, departments, userRole }.

- [x] T039 Create `src/routes/dashboard/documents/[id]/+page.svelte` for document detail page. Display: Document metadata (filename, category, sensitivity, uploader, upload date), preview section (PreviewModal), version history (if applicable), assignment history, access log (if HR/Admin). Actions: Assign to employee/department (DocumentAssignmentModal), Delete (soft delete).

- [x] T040 Create `src/routes/dashboard/documents/[id]/+page.server.ts` with load function. Steps: 1) Validate auth, 2) Get documentId from params, 3) Check RBAC access via rbacService.canAccessDocument(), 4) Load document metadata + assignments + access logs (if permitted), 5) Return { document, assignments, accessLogs, canAssign, canDelete }. Return 403 if access denied.

- [x] T041 Create `src/routes/dashboard/documents/audit/+page.svelte` for audit log page (HR/Admin only). Display: Access log table with filters (document, user, date range, access type), export CSV button. Use DocumentTable component pattern with custom columns.

- [x] T042 Create `src/routes/dashboard/documents/audit/+page.server.ts` with load function. Steps: 1) Validate auth + role (HR or Admin only), 2) Get filter params, 3) Query document_access_logs with filters, 4) Paginate results, 5) Return { accessLogs, totalCount, page }. Return 403 if not HR/Admin.

## Phase 3.8: Integration & Validation

**Dependencies: T035-T042 (all routes complete)**

- [x] T043 [P] Integration test: Create `tests/integration/documents-upload-flow.integration.spec.ts` testing full upload flow. Steps: 1) Client-side encrypt 2MB PDF, 2) Register encryption key, 3) Upload encrypted document, 4) Verify document in database, 5) Verify encryption key stored, 6) Verify audit log entry, 7) Test RBAC enforcement (employee denied, admin allowed), 8) Test upload failures and rollback, 9) Test document assignment creation. Assert: upload completes <30s for 50MB file (performance requirement).

- [x] T044 [P] Integration test: Create `tests/integration/documents-preview-generation.integration.spec.ts` testing preview generation. Steps: 1) Test instant PDF preview, 2) Test DOCX → PDF conversion with LibreOffice, 3) Test XLSX conversion, 4) Test image preview (JPEG), 5) Verify signed URL with 15min expiration, 6) Test preview URL expiration, 7) Verify RBAC preview access, 8) Verify audit logging. Assert: DOCX → PDF conversion <5s (performance requirement).

- [x] T045 [P] Integration test: Create `tests/integration/rbac-enforcement.integration.spec.ts` testing RBAC enforcement. Test cases: 1) Role hierarchy validation (super_admin > admin > manager > employee), 2) Upload permissions by role, 3) Document viewing with RLS filtering, 4) Manager hierarchy permissions (recursive CTE), 5) Download permissions, 6) Delete permissions, 7) Audit log access permissions, 8) Permission denial audit logging, 9) Soft delete visibility. Verify: PostgreSQL RLS policies enforced, audit logs record denials.

- [x] T046 E2E test: Create `tests/integration/document-lifecycle.e2e.spec.ts` implementing complete lifecycle. Full flow: 1) Upload document with encryption, 2) Register encryption key, 3) Assign to employee, 4) Employee previews with signed URL, 5) Employee downloads and decrypts, 6) Admin updates metadata, 7) Admin soft deletes document, 8) Verify audit trail (all operations logged), 9) Test document restoration, 10) Test multi-assignment workflow, 11) Test department-wide assignment, 12) Test retention policy. Assert: all operations <5s each, full lifecycle <15s for 10MB.

## Phase 3.9: Security & Performance Validation

**Dependencies: T043-T046 (integration tests passing)**

- [ ] T047 Security audit: Validate end-to-end encryption. Verify: 1) Client-side encryption with Web Crypto API (AES-GCM-256), 2) Server receives only encrypted data, 3) Encryption keys stored with pg_crypto, 4) TLS 1.3 for transport, 5) No plaintext file content in database or logs, 6) Encryption key access restricted to owner. Run manual inspection + automated security scan.

- [ ] T048 Performance test: Create `tests/performance/bulk-upload.spec.ts` with parallel upload test. Test: Upload 100 x 10MB files concurrently from 10 different users. Measure: p95 latency, throughput (MB/s), database connection pool usage. Assert: p95 <30s per upload (including encryption), no connection pool exhaustion.

- [ ] T049 Performance test: Create `tests/performance/document-search.spec.ts` with search/filter test. Test: Database with 10K documents, search by category + sensitivity + employee, paginate results. Measure: query execution time. Assert: <500ms for filtered search (performance requirement). Verify: indexes on (employee_id, category), (sensitivity_level) used.

- [ ] T050 RBAC validation: Create `tests/security/rbac-enforcement.spec.ts` testing all permission scenarios. Test matrix: 4 roles × 10 operations = 40 test cases. Verify: Admin full access, HR sees all non-deleted, Manager sees direct reports only (recursive CTE validation), Employee sees assigned only. Assert: All unauthorized actions return 403, audit log records denials.

- [ ] T051 Retention policy validation: Create `tests/security/retention-compliance.spec.ts` testing 3-year retention. Steps: 1) Create test employee, 2) Upload document assigned to employee, 3) Terminate employee (set termination_date), 4) Verify document soft-deleted after 3 years (automated job simulation), 5) Verify hard delete after retention period. Assert: Retention enforced per FR-044.

## Phase 3.10: Documentation & Polish

**Dependencies: All tests passing (T043-T051)**

- [x] T052 [P] Unit test: Create `tests/unit/encryption.spec.ts` testing Web Crypto API wrapper. Test cases: 1) generateEncryptionKey() returns valid CryptoKey, 2) encryptFile() produces different ciphertext for same input (IV randomness), 3) decryptFile() recovers original file, 4) Large file encryption (50MB) with progress callbacks. Use Vitest.

- [x] T053 [P] Unit test: Create `tests/unit/documentValidation.spec.ts` testing Zod schemas. Test cases: 1) Valid upload metadata passes, 2) 51MB file rejected, 3) .EXE file type rejected, 4) Invalid sensitivity level rejected, 5) Missing required fields rejected. Test all schemas: documentUploadSchema, documentMetadataSchema, encryptionKeySchema.

- [x] T054 [P] Update `src/routes/dashboard/documents/README.md` with feature documentation. Sections: 1) Architecture overview (encryption flow diagram), 2) RBAC permission matrix, 3) API endpoints reference, 4) Component usage examples, 5) Database schema diagram, 6) Performance benchmarks, 7) Security considerations. Include screenshots of UI components.

- [ ] T055 Constitution compliance check: Verify all 6 constitutional principles. Checklist: I) Test-First Development (contract tests before implementation ✅), II) Type Safety (strict TypeScript + Zod ✅), III) Security by Design (RLS + encryption + audit ✅), IV) Performance Standards (all benchmarks met ✅), V) Component Architecture (Svelte 5 runes + shadcn/ui ✅), VI) MCP-First Development (Serena MCP for refactoring ✅). Document any deviations in plan.md Complexity Tracking section.

- [ ] T056 Run quickstart.md manual test: Execute full quickstart test scenario from plan.md. Steps: 1) Upload document (HR manager), 2) Assign to employee, 3) Preview (employee), 4) Audit trail (HR admin). Verify: all ✅ checkpoints pass, no console errors, all operations <5s. Record screen recording for documentation.

---

## Dependencies

**Critical Path**:
```
Database (T001-T007) → Types/Schemas (T008-T010) → Contract Tests (T011-T015) →
Services (T016-T022) → API Routes (T023-T028) → UI Components (T029-T034) →
Page Routes (T035-T042) → Integration Tests (T043-T046) →
Performance/Security (T047-T051) → Documentation (T052-T056)
```

**Blocking Dependencies**:
- T001-T007 (database) blocks ALL application code
- T008-T010 (types) blocks T016-T022 (services)
- T011-T015 (contract tests) must FAIL before T023-T028 (implementation)
- T023-T028 (API) blocks T029-T034 (UI components)
- T029-T034 (components) blocks T035-T042 (page routes)
- T043-T046 (integration) blocks T047-T051 (validation)
- T052-T056 (polish) requires all tests passing

**Parallelizable Tasks** (grouped by phase):
- Database: T001, T002, T003, T004, T005, T006 (different migration files)
- Types: T008, T009, T010 (different files)
- Contract Tests: T011, T012, T013, T014, T015 (different test files)
- UI Components: T029, T030, T031, T032, T033, T034 (different components)
- Integration Tests: T043, T044, T045 (different test scenarios)
- Documentation: T052, T053, T054 (different files)

## Parallel Execution Examples

### Phase 3.1: Launch Database Migrations (T001-T006)
```bash
# All migrations can run in parallel (different files)
Task(prompt="Create migrations/20251007_001_create_documents_table.sql with documents table...", description="Create documents table migration")
Task(prompt="Create migrations/20251007_002_create_document_assignments.sql with document_assignments table...", description="Create assignments table migration")
Task(prompt="Create migrations/20251007_003_create_access_logs.sql with document_access_logs table...", description="Create access logs migration")
Task(prompt="Create migrations/20251007_004_create_document_categories.sql with document_categories table...", description="Create categories migration")
Task(prompt="Create migrations/20251007_005_add_encryption_keys.sql with encryption_keys table...", description="Create encryption keys migration")
Task(prompt="Create migrations/20251007_006_create_document_versions.sql with document_versions table...", description="Create versions table migration")
```

### Phase 3.2: Launch Type Definitions (T008-T010)
```bash
# All type files independent
Task(prompt="Create src/lib/types/document.ts with TypeScript interfaces: Document, DocumentAssignment...", description="Create document types")
Task(prompt="Create src/lib/schemas/documentSchemas.ts with Zod schemas: documentUploadSchema...", description="Create document Zod schemas")
Task(prompt="Create src/lib/schemas/encryptionSchemas.ts with Zod schemas: encryptionKeySchema...", description="Create encryption Zod schemas")
```

### Phase 3.3: Launch Contract Tests (T011-T015)
```bash
# All contract tests independent (TDD - expect failures)
Task(prompt="Create tests/contract/documents-upload.contract.spec.ts testing POST /api/documents/upload...", description="Contract test: document upload")
Task(prompt="Create tests/contract/documents-preview.contract.spec.ts testing GET /api/documents/{id}/preview...", description="Contract test: document preview")
Task(prompt="Create tests/contract/documents-download.contract.spec.ts testing GET /api/documents/{id}/download...", description="Contract test: document download")
Task(prompt="Create tests/contract/documents-list.contract.spec.ts testing GET /api/documents...", description="Contract test: document list")
Task(prompt="Create tests/contract/encryption-keys.contract.spec.ts testing encryption key management...", description="Contract test: encryption keys")
```

### Phase 3.6: Launch UI Components (T029-T034)
```bash
# All Svelte components independent (after API complete)
Task(prompt="Create src/lib/components/documents/FileUploader.svelte with drag-and-drop upload...", description="Create FileUploader component")
Task(prompt="Create src/lib/components/documents/DocumentCard.svelte for list display...", description="Create DocumentCard component")
Task(prompt="Create src/lib/components/documents/DocumentTable.svelte with filtering/sorting...", description="Create DocumentTable component")
Task(prompt="Create src/lib/components/documents/PreviewModal.svelte for in-browser preview...", description="Create PreviewModal component")
Task(prompt="Create src/lib/components/documents/DocumentMetadataForm.svelte for upload metadata...", description="Create metadata form component")
Task(prompt="Create src/lib/components/documents/DocumentAssignmentModal.svelte for assigning docs...", description="Create assignment modal component")
```

## Validation Checklist

_GATE: Verified before task execution_

- [x] All contract tests generated (T011-T015 cover all API endpoints)
- [x] All database entities have migrations (T001-T007 cover 6 tables + RLS)
- [x] All tests come before implementation (T011-T015 before T023-T028)
- [x] Parallel tasks truly independent (verified file paths)
- [x] Each task specifies exact file path (all tasks include full paths)
- [x] No [P] task modifies same file (verified no conflicts)
- [x] Constitution compliance enforced (T055 validates all 6 principles)
- [x] Performance requirements tracked (T048-T049 validate <30s upload, <500ms search)
- [x] Security requirements covered (T047, T050-T051 validate encryption, RBAC, retention)

## Notes

- **[P] tasks**: Different files, no dependencies - can run in parallel
- **TDD enforcement**: Contract tests (T011-T015) MUST fail before API implementation (T023-T028)
- **Commit strategy**: Commit after each task completion for clean git history
- **MCP-First**: Use Serena MCP `replace_symbol_body()` for surgical updates to existing auth/upload logic
- **Performance targets**: Upload <30s (50MB), Preview <5s (Office docs), Search <500ms (10K docs)
- **Security priorities**: E2E encryption, RBAC enforcement, audit logging, 3-year retention compliance

## Task Count Summary

- **Total Tasks**: 56 (T001-T056)
- **Database**: 7 tasks (T001-T007)
- **Types & Schemas**: 3 tasks (T008-T010)
- **Contract Tests**: 5 tasks (T011-T015) - TDD
- **Core Services**: 7 tasks (T016-T022)
- **API Routes**: 6 tasks (T023-T028)
- **UI Components**: 6 tasks (T029-T034)
- **Page Routes**: 8 tasks (T035-T042)
- **Integration Tests**: 4 tasks (T043-T046)
- **Security & Performance**: 5 tasks (T047-T051)
- **Documentation & Polish**: 5 tasks (T052-T056)
- **Parallelizable**: 25 tasks marked [P]
