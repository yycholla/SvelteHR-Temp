# Onboarding Document Integration

This document explains how onboarding file uploads are integrated with the existing document management system.

## Architecture Decision

**User Requirement**: "the file storage can piggyback on our document upload on the documents page as these documents should be accessible there."

Onboarding document uploads now create records in BOTH the `onboarding_document_uploads` table AND the `documents` table, making them accessible through the standard document management interface.

## Database Schema

### Migration: `m20251202_006_integrate_onboarding_documents`

**Changes**:

1. Creates "Onboarding Documents" category in `document_categories` table
2. Adds `document_id` column to `onboarding_document_uploads` with foreign key to `documents(id)`
3. Creates index `idx_onboarding_document_uploads_document_id` for performance

**Schema**:

```sql
-- New column in onboarding_document_uploads
ALTER TABLE hr_public.onboarding_document_uploads
ADD COLUMN document_id UUID,
ADD CONSTRAINT fk_onboarding_document_uploads_document_id
    FOREIGN KEY (document_id)
    REFERENCES hr_public.documents(id)
    ON DELETE CASCADE;

-- Performance index
CREATE INDEX idx_onboarding_document_uploads_document_id
ON hr_public.onboarding_document_uploads(document_id);

-- New category
INSERT INTO hr_public.document_categories
(id, name, description, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Onboarding Documents',
    'Documents uploaded during employee onboarding (W-4, I-9, ID verification, etc.)',
    NOW(),
    NOW()
)
ON CONFLICT (name) DO NOTHING;
```

## Model Updates

### `document_upload.rs` Model

**New Field**:

```rust
pub struct Model {
    // ... existing fields ...
    pub document_id: Option<Uuid>,  // Links to documents table
}
```

**New Relation**:

```rust
#[sea_orm(
    belongs_to = "crate::models::documents::document::Entity",
    from = "Column::DocumentId",
    to = "crate::models::documents::document::Column::Id"
)]
Document,
```

### `CreateDocumentUploadInput`

**New Optional Fields**:

```rust
pub struct CreateDocumentUploadInput {
    // ... existing fields ...

    // Optional: Create document record in documents table
    pub create_document: Option<bool>,
    pub document_title: Option<String>,
    pub document_description: Option<String>,
    pub document_access_level: Option<String>,
    pub document_expiry_date: Option<DateTime<Utc>>,
}
```

## GraphQL Mutation Updates

### `create_document_upload` Mutation

**New Behavior**:

- When `create_document` is `true`, automatically creates a document record
- Links onboarding upload to document via `document_id` foreign key
- Document is categorized under "Onboarding Documents"
- Document appears in standard document management interface

**Implementation**:

```rust
async fn create_document_upload(&self, ctx: &Context<'_>, input: CreateDocumentUploadInput) -> Result<DocumentUpload> {
    let db = get_db_from_context(ctx)?;
    let user_context = ctx.data::<UserContext>()?;

    // Optionally create a document record if requested
    let document_id = if input.create_document.unwrap_or(false) {
        // Get "Onboarding Documents" category
        let category = document_category::Entity::find()
            .filter(document_category::Column::Name.eq("Onboarding Documents"))
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Onboarding Documents category not found"))?;

        // Create document record
        let document = document::ActiveModel {
            id: Set(Uuid::new_v4()),
            title: Set(input.document_title.unwrap_or_else(|| input.file_name.clone())),
            description: Set(input.document_description),
            category_id: Set(Some(category.id)),
            uploader_id: Set(user_context.user_id),
            file_path: Set(input.storage_path.clone()),
            file_size: Set(input.file_size_bytes),
            mime_type: Set(input.mime_type.clone()),
            access_level: Set(input.document_access_level.unwrap_or_else(|| "private".to_string())),
            is_encrypted: Set(false),
            expiry_date: Set(input.document_expiry_date),
            version_number: Set(1),
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
            deleted_at: Set(None),
        };

        let doc_result = document.insert(&db).await?;
        Some(doc_result.id)
    } else {
        None
    };

    // Create onboarding upload with optional document link
    let upload = document_upload::ActiveModel {
        // ... other fields ...
        document_id: Set(document_id),  // Links to document if created
    };

    upload.insert(&db).await?
}
```

## Usage Example

### Frontend: Uploading Onboarding Documents

```graphql
mutation UploadOnboardingDocument($input: CreateDocumentUploadInput!) {
	createDocumentUpload(input: $input) {
		id
		fileName
		fileSize
		uploadedAt
		documentId # Will be populated if create_document was true
	}
}
```

**Variables**:

```json
{
	"input": {
		"contentBlockId": "uuid-of-content-block",
		"fileName": "john-doe-w4.pdf",
		"fileSizeBytes": 245678,
		"mimeType": "application/pdf",
		"storagePath": "/uploads/onboarding/john-doe-w4.pdf",
		"storageUrl": "https://storage.example.com/onboarding/john-doe-w4.pdf",
		"createDocument": true,
		"documentTitle": "John Doe - W-4 Form",
		"documentDescription": "W-4 Employee's Withholding Certificate submitted during onboarding",
		"documentAccessLevel": "private"
	}
}
```

## Benefits

1. **Unified Document Access**: Onboarding documents visible in standard Documents page
2. **Categorization**: All onboarding uploads automatically categorized
3. **Permission System**: Leverages existing document access controls
4. **Audit Trail**: Document creation tracked in both tables
5. **Flexibility**: Can optionally skip document creation for temporary uploads
6. **Cascading Deletes**: Deleting document automatically removes onboarding upload

## Default Values

- **document_title**: Defaults to `file_name` if not provided
- **document_access_level**: Defaults to `"private"` if not provided
- **version_number**: Always `1` for new uploads
- **is_encrypted**: Always `false` (encryption happens at storage layer)

## Security Considerations

1. **Authentication Required**: Mutation requires valid `UserContext`
2. **Access Level**: Documents default to "private" access
3. **Category Validation**: Fails if "Onboarding Documents" category doesn't exist
4. **Uploader Tracking**: Document `uploader_id` set to authenticated user
5. **Soft Delete Support**: Documents table has `deleted_at` for soft deletes

## Querying Onboarding Documents

### Get All Onboarding Documents

```graphql
query OnboardingDocuments {
	documents(filter: { category: "Onboarding Documents" }) {
		id
		title
		description
		filePath
		fileSize
		uploadedBy {
			id
			fullName
		}
		createdAt
	}
}
```

### Get Documents for Specific Upload

```graphql
query OnboardingUploadWithDocument($uploadId: UUID!) {
	onboardingDocumentUpload(id: $uploadId) {
		id
		fileName
		uploadedAt
		document {
			id
			title
			category {
				name
			}
			accessLevel
		}
	}
}
```

## Future Enhancements

1. **Automatic Categorization by Document Type**: Subcategories for W-4, I-9, etc.
2. **Document Versioning**: Track multiple versions of same onboarding document
3. **Expiry Notifications**: Alert when onboarding documents expire
4. **Bulk Document Creation**: Upload multiple onboarding documents at once
5. **Document Templates**: Pre-fill document metadata based on file type
