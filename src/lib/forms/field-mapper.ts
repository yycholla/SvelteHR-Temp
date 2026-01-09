/**
 * Form Field Mapper
 *
 * Maps FormTemplate field definitions to form components
 */

import TextInput from './components/TextInput.svelte';
import EmailInput from './components/EmailInput.svelte';
import PhoneInput from './components/PhoneInput.svelte';
import NumberInput from './components/NumberInput.svelte';
import DateInput from './components/DateInput.svelte';
import type { FormFieldDefinition } from './schema-generator';

export interface FieldComponentConfig {
	component: typeof TextInput | typeof EmailInput | typeof PhoneInput | typeof NumberInput | typeof DateInput;
	props: Record<string, unknown>;
}

/**
 * Maps a form field definition to its corresponding form component
 *
 * @param field - The field definition from FormTemplate
 * @param blockId - Optional block ID for unique field naming
 * @returns Component and props for rendering
 */
export function mapFieldToComponent(
	field: FormFieldDefinition,
	blockId?: string
): FieldComponentConfig {
	// Generate unique field name (same pattern as schema generator)
	const fieldName = blockId ? `${blockId}-${field.name}` : field.name;

	const baseProps = {
		name: fieldName,
		label: field.label,
		required: field.required || false,
		placeholder: field.placeholder
	};

	switch (field.type) {
		case 'EMAIL':
			return {
				component: EmailInput,
				props: baseProps
			};

		case 'PHONE':
			return {
				component: PhoneInput,
				props: baseProps
			};

		case 'NUMBER':
			return {
				component: NumberInput,
				props: {
					...baseProps,
					min: field.validation?.min,
					max: field.validation?.max,
					step: 1
				}
			};

		case 'DATE':
			return {
				component: DateInput,
				props: {
					...baseProps,
					min: field.validation?.min as string | undefined,
					max: field.validation?.max as string | undefined
				}
			};

		case 'TEXTAREA':
			return {
				component: TextInput,
				props: {
					...baseProps,
					multiline: true,
					rows: 4
				}
			};

		case 'TEXT':
		default:
			return {
				component: TextInput,
				props: baseProps
			};
	}
}
