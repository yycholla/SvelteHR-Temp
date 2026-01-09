# Onboarding Module Database Schema

## Overview

The onboarding module provides a structured way to onboard new employees with interactive forms, document uploads, acknowledgments, and e-signatures. It extends the training module pattern with enhanced form capabilities.

## Database Tables

### 1. `onboarding_modules` (Main Module Table)

Stores onboarding module metadata, similar to trainings.

```sql
CREATE TABLE hr_public.onboarding_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    category VARCHAR(100), -- e.g., "New Hire", "Manager Onboarding", "Contractor"
    tags TEXT[], -- For filtering and organization
    author_id UUID REFERENCES hr_public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields:**

- `id`: Unique identifier
- `title`: Module name (e.g., "New Hire Onboarding 2025")
- `description`: Module overview
- `is_active`: Whether module is available for assignment
- `category`: Onboarding type for filtering
- `tags`: Searchable tags
- `author_id`: HR admin who created the module

---

### 2. `onboarding_content_blocks` (Content Blocks Table)

Stores individual content blocks within an onboarding module.

```sql
CREATE TYPE hr_public.onboarding_content_type AS ENUM (
    'TEXT',           -- Read-only informational content
    'VIDEO',          -- Instructional video (YouTube, Vimeo, etc.)
    'DOCUMENT',       -- PDF/document for review
    'FORM',           -- Interactive form with fields
    'FILE_UPLOAD',    -- Document upload requirement
    'CHECKBOX_LIST',  -- Acknowledgment checkboxes
    'SIGNATURE'       -- E-signature requirement
);

CREATE TABLE hr_public.onboarding_content_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    onboarding_module_id UUID REFERENCES hr_public.onboarding_modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type hr_public.onboarding_content_type NOT NULL,
    sequence_order INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT true,

    -- Content data (type-specific)
    text_content TEXT,                     -- For TEXT type
    video_url VARCHAR(500),                -- For VIDEO type
    document_url VARCHAR(500),             -- For DOCUMENT type
    form_template_id UUID REFERENCES hr_public.onboarding_form_templates(id), -- For FORM type
    file_upload_requirements JSONB,        -- For FILE_UPLOAD type (e.g., {max_size: 10MB, allowed_types: ["pdf", "jpg"]})
    checkbox_items JSONB,                  -- For CHECKBOX_LIST type (e.g., [{id: "1", label: "I agree to..."}])
    signature_requirements JSONB,          -- For SIGNATURE type (e.g., {type: "typed", require_date: true})

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_onboarding_blocks_module ON hr_public.onboarding_content_blocks(onboarding_module_id);
CREATE INDEX idx_onboarding_blocks_sequence ON hr_public.onboarding_content_blocks(onboarding_module_id, sequence_order);
```

**Content Types:**

- `TEXT`: Read-only information (company policies, welcome messages)
- `VIDEO`: Embedded video content
- `DOCUMENT`: Downloadable documents (employee handbook, benefits guide)
- `FORM`: Interactive forms (W-4, state licenses, emergency contacts)
- `FILE_UPLOAD`: Required document uploads (ID verification, certifications)
- `CHECKBOX_LIST`: Acknowledgment lists (safety policies, code of conduct)
- `SIGNATURE`: E-signature blocks (offer acceptance, policy acknowledgment)

---

### 3. `onboarding_form_templates` (Form Definitions Table)

Stores reusable form templates (W-4, I-9, emergency contacts, etc.).

```sql
CREATE TYPE hr_public.form_field_type AS ENUM (
    'TEXT',           -- Single-line text input
    'TEXTAREA',       -- Multi-line text input
    'NUMBER',         -- Numeric input
    'EMAIL',          -- Email input
    'PHONE',          -- Phone number input
    'DATE',           -- Date picker
    'DROPDOWN',       -- Select dropdown
    'RADIO',          -- Radio buttons
    'CHECKBOX',       -- Single checkbox
    'SIGNATURE',      -- Signature pad
    'INITIALS',       -- Initials input
    'ADDRESS',        -- Structured address fields
    'SSN',            -- Social Security Number (encrypted)
    'FILE_UPLOAD'     -- File attachment
);

CREATE TABLE hr_public.onboarding_form_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,              -- e.g., "Federal W-4 Form"
    description TEXT,
    category VARCHAR(100),                   -- e.g., "Tax Forms", "Personal Info"
    version VARCHAR(50),                     -- Form version (e.g., "2024")
    is_active BOOLEAN DEFAULT true,

    -- Form structure (JSON schema)
    fields JSONB NOT NULL,                   -- Array of field definitions
    /*
    Example fields structure:
    [
        {
            "id": "full_name",
            "label": "Full Legal Name",
            "type": "TEXT",
            "required": true,
            "validation": {
                "min_length": 2,
                "max_length": 100
            },
            "help_text": "Enter your name as it appears on your Social Security card"
        },
        {
            "id": "filing_status",
            "label": "Filing Status",
            "type": "RADIO",
            "required": true,
            "options": [
                {"value": "single", "label": "Single or Married filing separately"},
                {"value": "married", "label": "Married filing jointly"},
                {"value": "head", "label": "Head of household"}
            ]
        },
        {
            "id": "dependents",
            "label": "Number of Dependents",
            "type": "NUMBER",
            "required": false,
            "validation": {
                "min": 0,
                "max": 20
            }
        },
        {
            "id": "signature",
            "label": "Employee Signature",
            "type": "SIGNATURE",
            "required": true
        }
    ]
    */

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_form_templates_category ON hr_public.onboarding_form_templates(category);
```

**Key Features:**

- **Reusable templates**: Create once, use in multiple onboarding modules
- **Flexible field types**: Supports all common form inputs
- **Validation rules**: Built-in validation (min/max, required, regex patterns)
- **Versioning**: Track form versions for compliance

---

### 4. `onboarding_form_submissions` (User Form Submissions Table)

Stores user-submitted form data.

```sql
CREATE TABLE hr_public.onboarding_form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES hr_public.users(id) ON DELETE CASCADE,
    content_block_id UUID REFERENCES hr_public.onboarding_content_blocks(id) ON DELETE CASCADE,
    form_template_id UUID REFERENCES hr_public.onboarding_form_templates(id),

    -- Submitted form data (encrypted for sensitive fields)
    form_data JSONB NOT NULL,
    /*
    Example form_data structure:
    {
        "full_name": "John Doe",
        "filing_status": "single",
        "dependents": 0,
        "signature": {
            "data": "base64_signature_image",
            "signed_at": "2025-01-15T10:30:00Z",
            "ip_address": "192.168.1.1"
        }
    }
    */

    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address VARCHAR(45),                 -- For audit trail
    user_agent TEXT,                        -- Browser info for audit

    UNIQUE(user_id, content_block_id)       -- One submission per user per block
);

CREATE INDEX idx_form_submissions_user ON hr_public.onboarding_form_submissions(user_id);
CREATE INDEX idx_form_submissions_block ON hr_public.onboarding_form_submissions(content_block_id);
```

**Security:**

- Sensitive fields (SSN, DOB) should be encrypted at application level
- IP address and user agent logged for audit compliance
- Unique constraint ensures one submission per user per form

---

### 5. `onboarding_document_uploads` (Document Uploads Table)

Tracks user-uploaded documents.

```sql
CREATE TABLE hr_public.onboarding_document_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES hr_public.users(id) ON DELETE CASCADE,
    content_block_id UUID REFERENCES hr_public.onboarding_content_blocks(id) ON DELETE CASCADE,

    -- File metadata
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,     -- S3 path or local file path
    storage_url VARCHAR(500),               -- Pre-signed S3 URL or public URL

    -- File validation
    virus_scan_status VARCHAR(50),          -- "clean", "infected", "pending"
    virus_scan_date TIMESTAMPTZ,

    uploaded_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, content_block_id)       -- One upload per user per block (can be enhanced to allow multiple)
);

CREATE INDEX idx_document_uploads_user ON hr_public.onboarding_document_uploads(user_id);
CREATE INDEX idx_document_uploads_block ON hr_public.onboarding_document_uploads(content_block_id);
```

**Features:**

- **Virus scanning**: Integration point for antivirus scanning
- **Storage abstraction**: Supports S3, local storage, or other backends
- **File validation**: Size and type restrictions enforced

---

### 6. `onboarding_assignments` (User Assignments Table)

Tracks which users are assigned to which onboarding modules.

```sql
CREATE TABLE hr_public.onboarding_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES hr_public.users(id) ON DELETE CASCADE,
    onboarding_module_id UUID REFERENCES hr_public.onboarding_modules(id) ON DELETE CASCADE,
    assigned_by_id UUID REFERENCES hr_public.users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    UNIQUE(user_id, onboarding_module_id)
);

CREATE INDEX idx_onboarding_assignments_user ON hr_public.onboarding_assignments(user_id);
CREATE INDEX idx_onboarding_assignments_module ON hr_public.onboarding_assignments(onboarding_module_id);
CREATE INDEX idx_onboarding_assignments_due ON hr_public.onboarding_assignments(due_date) WHERE completed_at IS NULL;
```

---

### 7. `onboarding_progress` (Progress Tracking Table)

Tracks user progress through each content block.

```sql
CREATE TYPE hr_public.onboarding_progress_status AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'COMPLETED',
    'SKIPPED'         -- For optional blocks
);

CREATE TABLE hr_public.onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES hr_public.users(id) ON DELETE CASCADE,
    content_block_id UUID REFERENCES hr_public.onboarding_content_blocks(id) ON DELETE CASCADE,
    status hr_public.onboarding_progress_status DEFAULT 'NOT_STARTED',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,

    UNIQUE(user_id, content_block_id)
);

CREATE INDEX idx_onboarding_progress_user ON hr_public.onboarding_progress(user_id);
CREATE INDEX idx_onboarding_progress_block ON hr_public.onboarding_progress(content_block_id);
CREATE INDEX idx_onboarding_progress_status ON hr_public.onboarding_progress(user_id, status);
```

---

## Relationships

```
onboarding_modules (1) ---< (N) onboarding_content_blocks
onboarding_modules (1) ---< (N) onboarding_assignments
onboarding_form_templates (1) ---< (N) onboarding_content_blocks (optional)
onboarding_content_blocks (1) ---< (N) onboarding_progress
onboarding_content_blocks (1) ---< (N) onboarding_form_submissions (for FORM type)
onboarding_content_blocks (1) ---< (N) onboarding_document_uploads (for FILE_UPLOAD type)
users (1) ---< (N) onboarding_assignments
users (1) ---< (N) onboarding_progress
users (1) ---< (N) onboarding_form_submissions
users (1) ---< (N) onboarding_document_uploads
```

---

## Migration Notes

1. **Create types first** (enums)
2. **Create tables in order** (respecting foreign keys)
3. **Add indexes** for performance
4. **Seed common form templates** (W-4, I-9, emergency contacts)

---

## Security Considerations

1. **Data Encryption**:
   - Encrypt SSN, DOB, and other PII at application level
   - Use PostgreSQL `pgcrypto` extension or application-level encryption

2. **Access Control**:
   - Only HR Managers and Admins can create/edit modules
   - Users can only access their own submissions
   - Audit trail via `assigned_by_id`, `ip_address`, `user_agent`

3. **File Storage**:
   - Store files outside web root
   - Use pre-signed URLs for S3 with expiration
   - Virus scan all uploaded files

4. **Form Validation**:
   - Server-side validation of all form submissions
   - Rate limiting on form submissions to prevent abuse
   - CSRF protection on all form endpoints

---

## Example Use Cases

### 1. New Hire W-4 Form

```json
{
	"content_block": {
		"title": "Federal W-4 Tax Withholding Form",
		"type": "FORM",
		"is_required": true,
		"form_template_id": "uuid-of-w4-template"
	}
}
```

### 2. ID Verification Upload

```json
{
	"content_block": {
		"title": "Government-Issued ID Upload",
		"type": "FILE_UPLOAD",
		"is_required": true,
		"file_upload_requirements": {
			"max_size_mb": 10,
			"allowed_types": ["image/jpeg", "image/png", "application/pdf"],
			"min_files": 1,
			"max_files": 2,
			"help_text": "Upload a clear photo of your driver's license or passport"
		}
	}
}
```

### 3. Policy Acknowledgment

```json
{
	"content_block": {
		"title": "Company Policies Acknowledgment",
		"type": "CHECKBOX_LIST",
		"is_required": true,
		"checkbox_items": [
			{
				"id": "handbook",
				"label": "I have read and understood the Employee Handbook",
				"required": true
			},
			{
				"id": "code_of_conduct",
				"label": "I agree to abide by the Code of Conduct",
				"required": true
			},
			{
				"id": "safety",
				"label": "I have completed the Safety Training",
				"required": true
			}
		]
	}
}
```

### 4. Offer Letter E-Signature

```json
{
	"content_block": {
		"title": "Offer Letter Acceptance",
		"type": "SIGNATURE",
		"is_required": true,
		"signature_requirements": {
			"signature_type": "typed_or_drawn",
			"require_date": true,
			"require_initials": false,
			"agreement_text": "By signing below, I accept the terms of employment as outlined in this offer letter."
		}
	}
}
```

---

## Next Steps

1. **Create SeaORM entity models** for each table
2. **Implement GraphQL schema** with queries/mutations
3. **Build admin UI** for creating onboarding modules
4. **Build employee UI** for completing onboarding
5. **Implement file upload service** (S3 or local storage)
6. **Add form validation library** for complex validation rules
7. **Implement e-signature capture** (HTML canvas or third-party service)
