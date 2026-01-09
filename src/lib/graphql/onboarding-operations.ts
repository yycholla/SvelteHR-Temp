// Onboarding Module Operations
export const GET_ONBOARDING_MODULES_QUERY = `
	query GetOnboardingModules {
		onboardingModules {
			id
			title
			description
			isActive
			category
			tags
			authorId
			createdAt
			updatedAt
		}
	}
`;

export const GET_ONBOARDING_MODULE_QUERY = `
	query GetOnboardingModule($id: UUID!) {
		onboardingModule(id: $id) {
			id
			title
			description
			isActive
			category
			tags
			authorId
			createdAt
			updatedAt
		}
	}
`;

export const CREATE_ONBOARDING_MODULE_MUTATION = `
	mutation CreateOnboardingModule($input: CreateOnboardingModuleInput!) {
		onboarding {
			createOnboardingModule(input: $input) {
				id
				title
				description
				isActive
				category
				tags
				authorId
			}
		}
	}
`;

export const UPDATE_ONBOARDING_MODULE_MUTATION = `
	mutation UpdateOnboardingModule($id: UUID!, $input: UpdateOnboardingModuleInput!) {
		onboarding {
			updateOnboardingModule(id: $id, input: $input) {
				id
				title
				description
				isActive
				category
				tags
			}
		}
	}
`;

export const DELETE_ONBOARDING_MODULE_MUTATION = `
	mutation DeleteOnboardingModule($id: UUID!) {
		onboarding {
			deleteOnboardingModule(id: $id)
		}
	}
`;

// Content Block Operations
export const GET_CONTENT_BLOCKS_QUERY = `
	query GetContentBlocks($onboardingModuleId: UUID!) {
		contentBlocks(onboardingModuleId: $onboardingModuleId) {
			id
			onboardingModuleId
			title
			type
			sequenceOrder
			isRequired
			textContent
			documentUrl
			formTemplateId
			inlineFormElements
			fileUploadRequirements
			signatureRequirements
			createdAt
			updatedAt
		}
	}
`;

export const CREATE_CONTENT_BLOCK_MUTATION = `
	mutation CreateContentBlock($input: CreateContentBlockInput!) {
		onboarding {
			createContentBlock(input: $input) {
				id
				onboardingModuleId
				title
				type
				sequenceOrder
				isRequired
				textContent
				documentUrl
				formTemplateId
				inlineFormElements
				fileUploadRequirements
				signatureRequirements
			}
		}
	}
`;

export const UPDATE_CONTENT_BLOCK_MUTATION = `
	mutation UpdateContentBlock($id: UUID!, $input: UpdateContentBlockInput!) {
		onboarding {
			updateContentBlock(id: $id, input: $input) {
				id
				title
				type
				sequenceOrder
				isRequired
				textContent
				documentUrl
				formTemplateId
				inlineFormElements
				fileUploadRequirements
				signatureRequirements
			}
		}
	}
`;

export const DELETE_CONTENT_BLOCK_MUTATION = `
	mutation DeleteContentBlock($id: UUID!) {
		onboarding {
			deleteContentBlock(id: $id)
		}
	}
`;

// Form Template Operations
export const GET_FORM_TEMPLATES_QUERY = `
	query GetFormTemplates {
		formTemplates {
			id
			name
			description
			category
			version
			isActive
			fields
			createdAt
			updatedAt
		}
	}
`;

export const GET_FORM_TEMPLATE_QUERY = `
	query GetFormTemplate($id: UUID!) {
		formTemplate(id: $id) {
			id
			name
			description
			category
			version
			isActive
			fields
			createdAt
			updatedAt
		}
	}
`;

export const SAVE_INLINE_FORM_AS_TEMPLATE_MUTATION = `
	mutation SaveInlineFormAsTemplate($contentBlockId: UUID!, $name: String!, $description: String, $category: String) {
		onboarding {
			saveInlineFormAsTemplate(
				contentBlockId: $contentBlockId
				name: $name
				description: $description
				category: $category
			) {
				id
				name
				description
				category
				version
				isActive
				fields
			}
		}
	}
`;

// Assignment Operations
export const GET_ONBOARDING_ASSIGNMENTS_QUERY = `
	query GetOnboardingAssignments($onboardingModuleId: UUID!) {
		onboardingAssignments(onboardingModuleId: $onboardingModuleId) {
			id
			userId
			onboardingModuleId
			assignedById
			assignedAt
			dueDate
			completedAt
			user {
				id
				displayName
				email
			}
		}
	}
`;

export const GET_ALL_ONBOARDING_ASSIGNMENTS_QUERY = `
	query GetAllOnboardingAssignments {
		allOnboardingAssignments {
			id
			userId
			onboardingModuleId
			user {
				id
				displayName
				email
			}
		}
	}
`;

export const ASSIGN_ONBOARDING_MUTATION = `
	mutation AssignOnboarding($input: CreateOnboardingAssignmentInput!) {
		onboarding {
			assignOnboarding(input: $input) {
				id
				userId
				onboardingModuleId
				assignedAt
				dueDate
			}
		}
	}
`;

export const DELETE_ONBOARDING_ASSIGNMENT_MUTATION = `
	mutation DeleteOnboardingAssignment($id: UUID!) {
		onboarding {
			deleteOnboardingAssignment(id: $id)
		}
	}
`;

export const ASSIGN_ONBOARDING_TO_DEPARTMENT_MUTATION = `
	mutation AssignOnboardingToDepartment($onboardingModuleId: UUID!, $departmentId: UUID!, $dueDate: DateTime) {
		onboarding {
			assignOnboardingToDepartment(onboardingModuleId: $onboardingModuleId, departmentId: $departmentId, dueDate: $dueDate)
		}
	}
`;

// Progress Operations
export const GET_ONBOARDING_PROGRESS_QUERY = `
	query GetOnboardingProgress($userId: UUID!, $onboardingModuleId: UUID!) {
		onboardingProgress(userId: $userId, onboardingModuleId: $onboardingModuleId) {
			id
			userId
			contentBlockId
			status
			startedAt
			completedAt
			lastAccessedAt
		}
	}
`;

export const UPDATE_ONBOARDING_PROGRESS_MUTATION = `
	mutation UpdateOnboardingProgress($contentBlockId: UUID!, $input: UpdateOnboardingProgressInput!) {
		onboarding {
			updateOnboardingProgress(contentBlockId: $contentBlockId, input: $input) {
				id
				status
				completedAt
			}
		}
	}
`;

// Form Submission Operations
export const SUBMIT_FORM_MUTATION = `
	mutation SubmitForm($input: CreateFormSubmissionInput!) {
		onboarding {
			submitForm(input: $input) {
				id
				userId
				contentBlockId
				formTemplateId
				formData
				submittedAt
			}
		}
	}
`;

// Document Upload Operations
export const CREATE_DOCUMENT_UPLOAD_MUTATION = `
	mutation CreateDocumentUpload($input: CreateDocumentUploadInput!) {
		onboarding {
			createDocumentUpload(input: $input) {
				id
				userId
				contentBlockId
				fileName
				fileSizeBytes
				mimeType
				storagePath
				storageUrl
				uploadedAt
				documentId
			}
		}
	}
`;

// Employee/User View Operations
export const GET_MY_ONBOARDING_MODULES_QUERY = `
	query GetMyOnboardingModules {
		myOnboardingModules {
			id
			title
			description
			category
			tags
		}
	}
`;

export const GET_MY_ONBOARDING_ASSIGNMENTS_QUERY = `
	query GetMyOnboardingAssignments {
		myOnboardingAssignments {
			id
			onboardingModuleId
			assignedAt
			dueDate
			completedAt
			onboardingModule {
				id
				title
				description
			}
		}
	}
`;
