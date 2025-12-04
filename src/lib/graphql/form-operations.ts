import { gql } from '@urql/svelte';

// ============================================================================
// FRAGMENTS
// ============================================================================

export const FORM_BLOCK_FRAGMENT = gql`
	fragment FormBlockFields on OnboardingFormBlock {
		id
		onboardingFormId
		title
		type
		sequenceOrder
		textContent
		documentUrl
		formTemplateId
		fileUploadRequirements
		signatureRequirements
		checkboxItems
		createdAt
		updatedAt
	}
`;

export const ONBOARDING_FORM_FRAGMENT = gql`
	fragment OnboardingFormFields on OnboardingForm {
		id
		onboardingModuleId
		title
		description
		sequenceOrder
		isRequired
		createdAt
		updatedAt
	}
`;

export const FORM_PROGRESS_FRAGMENT = gql`
	fragment FormProgressFields on OnboardingFormProgress {
		id
		userId
		onboardingFormId
		status
		formData
		startedAt
		completedAt
		lastAccessedAt
	}
`;

// ============================================================================
// QUERIES
// ============================================================================

export const GET_ONBOARDING_FORM = gql`
	${ONBOARDING_FORM_FRAGMENT}
	${FORM_BLOCK_FRAGMENT}
	query GetOnboardingForm($id: UUID!) {
		onboardingForm(id: $id) {
			...OnboardingFormFields
			blocks {
				...FormBlockFields
			}
		}
	}
`;

export const GET_FORMS_BY_MODULE = gql`
	${ONBOARDING_FORM_FRAGMENT}
	query GetFormsByModule($onboardingModuleId: UUID!) {
		onboardingFormsByModule(onboardingModuleId: $onboardingModuleId) {
			...OnboardingFormFields
		}
	}
`;

export const GET_FORM_BLOCKS = gql`
	${FORM_BLOCK_FRAGMENT}
	query GetFormBlocks($onboardingFormId: UUID!) {
		formBlocks(onboardingFormId: $onboardingFormId) {
			...FormBlockFields
		}
	}
`;

export const GET_FORM_PROGRESS = gql`
	${FORM_PROGRESS_FRAGMENT}
	query GetFormProgress($userId: UUID!, $onboardingFormId: UUID!) {
		formProgress(userId: $userId, onboardingFormId: $onboardingFormId) {
			...FormProgressFields
		}
	}
`;

export const GET_USER_FORM_PROGRESS_LIST = gql`
	${FORM_PROGRESS_FRAGMENT}
	query GetUserFormProgressList($userId: UUID!) {
		userFormProgressList(userId: $userId) {
			...FormProgressFields
		}
	}
`;

// ============================================================================
// MUTATIONS - FORMS
// ============================================================================

export const CREATE_ONBOARDING_FORM = gql`
	${ONBOARDING_FORM_FRAGMENT}
	mutation CreateOnboardingForm($input: CreateOnboardingFormInput!) {
		createOnboardingForm(input: $input) {
			...OnboardingFormFields
		}
	}
`;

export const UPDATE_ONBOARDING_FORM = gql`
	${ONBOARDING_FORM_FRAGMENT}
	mutation UpdateOnboardingForm($id: UUID!, $input: UpdateOnboardingFormInput!) {
		updateOnboardingForm(id: $id, input: $input) {
			...OnboardingFormFields
		}
	}
`;

export const DELETE_ONBOARDING_FORM = gql`
	mutation DeleteOnboardingForm($id: UUID!) {
		deleteOnboardingForm(id: $id)
	}
`;

export const REORDER_ONBOARDING_FORMS = gql`
	mutation ReorderOnboardingForms($onboardingModuleId: UUID!, $formIds: [UUID!]!) {
		reorderOnboardingForms(onboardingModuleId: $onboardingModuleId, formIds: $formIds)
	}
`;

// ============================================================================
// MUTATIONS - FORM BLOCKS
// ============================================================================

export const CREATE_FORM_BLOCK = gql`
	${FORM_BLOCK_FRAGMENT}
	mutation CreateFormBlock($input: CreateFormBlockInput!) {
		createFormBlock(input: $input) {
			...FormBlockFields
		}
	}
`;

export const UPDATE_FORM_BLOCK = gql`
	${FORM_BLOCK_FRAGMENT}
	mutation UpdateFormBlock($id: UUID!, $input: UpdateFormBlockInput!) {
		updateFormBlock(id: $id, input: $input) {
			...FormBlockFields
		}
	}
`;

export const DELETE_FORM_BLOCK = gql`
	mutation DeleteFormBlock($id: UUID!) {
		deleteFormBlock(id: $id)
	}
`;

export const REORDER_FORM_BLOCKS = gql`
	mutation ReorderFormBlocks($onboardingFormId: UUID!, $blockIds: [UUID!]!) {
		reorderFormBlocks(onboardingFormId: $onboardingFormId, blockIds: $blockIds)
	}
`;

// ============================================================================
// MUTATIONS - FORM PROGRESS
// ============================================================================

export const SAVE_FORM_PROGRESS = gql`
	${FORM_PROGRESS_FRAGMENT}
	mutation SaveFormProgress($input: SaveFormProgressInput!) {
		saveFormProgress(input: $input) {
			...FormProgressFields
		}
	}
`;

export const COMPLETE_FORM = gql`
	${FORM_PROGRESS_FRAGMENT}
	mutation CompleteForm($input: CompleteFormInput!) {
		completeForm(input: $input) {
			...FormProgressFields
		}
	}
`;

// ============================================================================
// TYPES
// ============================================================================

export type OnboardingFormBlockType =
	| 'TEXT'
	| 'FORM_FIELDS'
	| 'DOCUMENT'
	| 'FILE_UPLOAD'
	| 'SIGNATURE'
	| 'CHECKBOX';

export type OnboardingFormProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface OnboardingFormBlock {
	id: string;
	onboardingFormId: string;
	title: string | null;
	type: OnboardingFormBlockType;
	sequenceOrder: number;
	textContent: string | null;
	documentUrl: string | null;
	formTemplateId: string | null;
	fileUploadRequirements: any | null;
	signatureRequirements: any | null;
	checkboxItems: any | null;
	createdAt: string;
	updatedAt: string;
}

export interface OnboardingForm {
	id: string;
	onboardingModuleId: string;
	title: string;
	description: string | null;
	sequenceOrder: number;
	isRequired: boolean;
	createdAt: string;
	updatedAt: string;
	blocks?: OnboardingFormBlock[];
}

export interface OnboardingFormProgress {
	id: string;
	userId: string;
	onboardingFormId: string;
	status: OnboardingFormProgressStatus;
	formData: any | null;
	startedAt: string | null;
	completedAt: string | null;
	lastAccessedAt: string | null;
}

export interface CreateOnboardingFormInput {
	onboardingModuleId: string;
	title: string;
	description?: string | null;
	sequenceOrder: number;
	isRequired: boolean;
}

export interface UpdateOnboardingFormInput {
	title?: string;
	description?: string | null;
	sequenceOrder?: number;
	isRequired?: boolean;
}

export interface CreateFormBlockInput {
	onboardingFormId: string;
	title?: string | null;
	type: OnboardingFormBlockType;
	sequenceOrder: number;
	textContent?: string | null;
	documentUrl?: string | null;
	formTemplateId?: string | null;
	fileUploadRequirements?: any | null;
	signatureRequirements?: any | null;
	checkboxItems?: any | null;
}

export interface UpdateFormBlockInput {
	title?: string | null;
	sequenceOrder?: number;
	textContent?: string | null;
	documentUrl?: string | null;
	formTemplateId?: string | null;
	fileUploadRequirements?: any | null;
	signatureRequirements?: any | null;
	checkboxItems?: any | null;
}

export interface SaveFormProgressInput {
	userId: string;
	onboardingFormId: string;
	status: OnboardingFormProgressStatus;
	formData?: any | null;
}

export interface CompleteFormInput {
	onboardingFormId: string;
	formData: any;
}
