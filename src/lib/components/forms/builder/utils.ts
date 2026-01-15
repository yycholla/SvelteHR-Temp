import { CheckSquare, FileIcon, FileText, FormInput, PenTool, Upload } from '@lucide/svelte';
import type { OnboardingFormBlockType } from '$lib/graphql/form-operations';
import type { BlockTypeOption } from './types';

// Block type configuration
export const blockTypes: BlockTypeOption[] = [
	{ value: 'TEXT', label: 'Text Content', icon: FileText },
	{ value: 'FORM_FIELDS', label: 'Form Fields', icon: FormInput },
	{ value: 'DOCUMENT', label: 'Document', icon: FileIcon },
	{ value: 'FILE_UPLOAD', label: 'File Upload', icon: Upload },
	{ value: 'SIGNATURE', label: 'Signature', icon: PenTool },
	{ value: 'CHECKBOX', label: 'Checkbox List', icon: CheckSquare }
];

// Get icon for block type
export function getBlockIcon(type: OnboardingFormBlockType) {
	const blockType = blockTypes.find((bt) => bt.value === type);
	return blockType ? blockType.icon : FileText;
}
