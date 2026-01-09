import type { OnboardingFormBlock, OnboardingFormBlockType } from '$lib/graphql/form-operations';

export interface BlockTypeOption {
	value: OnboardingFormBlockType;
	label: string;
	icon: any;
}

export interface BlockEditorState {
	type: OnboardingFormBlockType;
	title: string;
	textContent: string;
	documentUrl: string;
	formTemplateId: string;
	checkboxItems: string[];
	checkboxItemsString: string;
}
