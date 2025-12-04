# Onboarding Forms Architecture

## Overview

This document describes the new Forms-based architecture for the onboarding system, where each onboarding module contains multiple Forms, and each Form is composed of multiple Blocks.

## Database Schema

### Existing Tables (Keep)

- `onboarding_modules` - Top-level onboarding modules
- `form_templates` - Reusable form definitions (like W4 IRS form)
- `onboarding_assignments` - User assignments to modules
- `onboarding_progress` - User progress tracking

### New Tables

#### `onboarding_forms`

Represents a single form/step within an onboarding module.

```sql
CREATE TABLE hr_public.onboarding_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    onboarding_module_id UUID NOT NULL REFERENCES hr_public.onboarding_modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sequence_order INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_onboarding_forms_module_id ON hr_public.onboarding_forms(onboarding_module_id);
CREATE INDEX idx_onboarding_forms_sequence ON hr_public.onboarding_forms(onboarding_module_id, sequence_order);
```

#### `onboarding_form_blocks`

Individual content blocks within a form (text, fields, signature, etc.)

```sql
CREATE TABLE hr_public.onboarding_form_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    onboarding_form_id UUID NOT NULL REFERENCES hr_public.onboarding_forms(id) ON DELETE CASCADE,
    title VARCHAR(255),
    type VARCHAR(50) NOT NULL, -- TEXT, FORM_FIELDS, DOCUMENT, FILE_UPLOAD, SIGNATURE, CHECKBOX
    sequence_order INTEGER NOT NULL DEFAULT 0,

    -- Content fields (type-specific, nullable)
    text_content TEXT,
    document_url TEXT,
    form_template_id UUID REFERENCES hr_public.form_templates(id) ON DELETE SET NULL,
    file_upload_requirements JSONB,
    signature_requirements JSONB,
    checkbox_items JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_form_blocks_form_id ON hr_public.onboarding_form_blocks(onboarding_form_id);
CREATE INDEX idx_form_blocks_sequence ON hr_public.onboarding_form_blocks(onboarding_form_id, sequence_order);
CREATE INDEX idx_form_blocks_template ON hr_public.onboarding_form_blocks(form_template_id);
```

#### `onboarding_form_progress`

Track user progress through forms (replaces individual block progress)

```sql
CREATE TABLE hr_public.onboarding_form_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    onboarding_form_id UUID NOT NULL REFERENCES hr_public.onboarding_forms(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED', -- NOT_STARTED, IN_PROGRESS, COMPLETED
    form_data JSONB, -- All form field values
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, onboarding_form_id)
);

CREATE INDEX idx_form_progress_user ON hr_public.onboarding_form_progress(user_id);
CREATE INDEX idx_form_progress_form ON hr_public.onboarding_form_progress(onboarding_form_id);
CREATE INDEX idx_form_progress_status ON hr_public.onboarding_form_progress(status);
```

### Tables to Deprecate (Eventually)

- `onboarding_content_blocks` - Will be replaced by `onboarding_form_blocks`
- `onboarding_progress` - Will be replaced by `onboarding_form_progress`

## Data Flow

### Admin Creates Onboarding Module

1. Create `OnboardingModule` (e.g., "New Hire Onboarding")
2. Add multiple `OnboardingForms` to the module:
   - Form 1: "Personal Information" (sequence_order: 0)
   - Form 2: "Tax Documents" (sequence_order: 1)
   - Form 3: "Company Policies" (sequence_order: 2)

### Admin Builds Each Form

For each form (e.g., "Personal Information"):

1. Add multiple `OnboardingFormBlocks`:
   - Block 1: TEXT - Welcome message (sequence_order: 0)
   - Block 2: FORM_FIELDS - Name, address, phone (sequence_order: 1)
   - Block 3: SIGNATURE - Acknowledgment (sequence_order: 2)

### Employee Completes Onboarding

1. View onboarding module with list of forms
2. Navigate to Form 1 - sees all 3 blocks on one page
3. Fill out all fields, sign signature
4. Click "Next" → saves all data for Form 1, marks it complete
5. Navigate to Form 2 - repeat process
6. Complete all forms → onboarding complete

## GraphQL Schema

### Types

```graphql
type OnboardingForm {
	id: UUID!
	onboardingModuleId: UUID!
	title: String!
	description: String
	sequenceOrder: Int!
	isRequired: Boolean!
	blocks: [OnboardingFormBlock!]!
	createdAt: DateTime!
	updatedAt: DateTime!
}

type OnboardingFormBlock {
	id: UUID!
	onboardingFormId: UUID!
	title: String
	type: OnboardingFormBlockType!
	sequenceOrder: Int!
	textContent: String
	documentUrl: String
	formTemplateId: UUID
	formTemplate: FormTemplate
	fileUploadRequirements: JSON
	signatureRequirements: JSON
	checkboxItems: JSON
	createdAt: DateTime!
	updatedAt: DateTime!
}

enum OnboardingFormBlockType {
	TEXT
	FORM_FIELDS
	DOCUMENT
	FILE_UPLOAD
	SIGNATURE
	CHECKBOX
}

type OnboardingFormProgress {
	id: UUID!
	userId: UUID!
	onboardingFormId: UUID!
	status: OnboardingFormProgressStatus!
	formData: JSON
	startedAt: DateTime
	completedAt: DateTime
	lastAccessedAt: DateTime
}

enum OnboardingFormProgressStatus {
	NOT_STARTED
	IN_PROGRESS
	COMPLETED
}
```

### Queries

```graphql
type Query {
	# Get all forms for a module
	onboardingForms(onboardingModuleId: UUID!): [OnboardingForm!]!

	# Get single form with all blocks
	onboardingForm(id: UUID!): OnboardingForm

	# Get user's progress on a form
	myFormProgress(onboardingFormId: UUID!): OnboardingFormProgress

	# Get all user's progress for a module
	myModuleProgress(onboardingModuleId: UUID!): [OnboardingFormProgress!]!
}
```

### Mutations

```graphql
type Mutation {
	# Form management
	createOnboardingForm(input: CreateOnboardingFormInput!): OnboardingForm!
	updateOnboardingForm(id: UUID!, input: UpdateOnboardingFormInput!): OnboardingForm!
	deleteOnboardingForm(id: UUID!): Boolean!
	reorderOnboardingForms(onboardingModuleId: UUID!, formIds: [UUID!]!): Boolean!

	# Block management
	createFormBlock(input: CreateFormBlockInput!): OnboardingFormBlock!
	updateFormBlock(id: UUID!, input: UpdateFormBlockInput!): OnboardingFormBlock!
	deleteFormBlock(id: UUID!): Boolean!
	reorderFormBlocks(onboardingFormId: UUID!, blockIds: [UUID!]!): Boolean!

	# Progress tracking
	saveFormProgress(input: SaveFormProgressInput!): OnboardingFormProgress!
	completeForm(onboardingFormId: UUID!, formData: JSON!): OnboardingFormProgress!
}
```

## UI Components

### Admin Side

#### 1. Form Builder (`/dashboard/admin/forms/[id]`)

- Standalone form editor (not tied to onboarding module)
- Add/edit/delete/reorder blocks
- Preview form as employee would see it
- Can be used independently or linked to onboarding modules

#### 2. Onboarding Module Editor (`/dashboard/admin/onboarding/[id]`)

- Add existing forms to module OR create new forms inline
- Reorder forms (drag-and-drop)
- Set form as required/optional
- Remove forms from module

### Employee Side

#### Onboarding Flow (`/dashboard/onboarding/[id]`)

- Progress bar showing X of Y forms complete
- Left sidebar: List of forms (current, completed, upcoming)
- Main area: Current form with ALL its blocks displayed
- All blocks on one page (scroll if needed)
- Single "Save & Continue" button at bottom
- "Previous" button to go back to previous form

## Migration Strategy

### Phase 1: Build New System

1. Create new tables alongside existing ones
2. Build new GraphQL schema
3. Create Form Builder UI
4. Update Onboarding Module editor to use forms

### Phase 2: Dual Operation

- New modules use Forms
- Existing modules continue to use ContentBlocks
- Employee view handles both architectures

### Phase 3: Migration

- Create migration script to convert ContentBlocks → FormBlocks
- Group existing blocks into logical forms (1 block = 1 form initially)
- Admin can then reorganize blocks into better forms

### Phase 4: Deprecation

- Remove old ContentBlocks schema
- Remove old progress tracking
- Clean up code

## Benefits

1. **Better UX**: Employees see logical groupings, not fragmented steps
2. **Flexibility**: Admins can create complex multi-block forms
3. **Reusability**: Forms can be reused across modules (future)
4. **Cleaner Data**: One save per form instead of per block
5. **Better Progress**: Track completion at form level
6. **Reduced Clicks**: Fewer "Next" button clicks for employees
