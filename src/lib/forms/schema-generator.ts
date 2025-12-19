/**
 * Zod Schema Generator for Dynamic Forms
 *
 * Generates Zod validation schemas from FormTemplate definitions.
 * Used for onboarding forms, training forms, and other dynamic form content.
 */

import { z } from 'zod';

/**
 * FormTemplate field definition
 */
export interface FormFieldDefinition {
	name: string;
	label: string;
	type: 'TEXT' | 'EMAIL' | 'PHONE' | 'TEXTAREA' | 'NUMBER' | 'DATE';
	required?: boolean;
	placeholder?: string;
	validation?: {
		minLength?: number;
		maxLength?: number;
		min?: number;
		max?: number;
		pattern?: string;
	};
}

export interface FormTemplate {
	id: string;
	name: string;
	fields: FormFieldDefinition[];
}

/**
 * Content block with embedded form template
 */
export interface ContentBlock {
	id: string;
	type: string;
	formTemplateId?: string;
}

/**
 * Generates a Zod schema for a single form field
 */
function generateFieldSchema(field: FormFieldDefinition): z.ZodTypeAny {
	let schema: z.ZodTypeAny;

	switch (field.type) {
		case 'EMAIL':
			schema = z.string().email('Please enter a valid email address');
			break;

		case 'PHONE':
			// US phone number pattern (flexible format)
			schema = z
				.string()
				.regex(
					/^[\d\s()+-]+$/,
					'Please enter a valid phone number'
				);
			break;

		case 'NUMBER':
			schema = z.coerce.number({
				message: 'Please enter a valid number'
			});

			// Apply min/max constraints if provided
			if (field.validation?.min !== undefined) {
				schema = (schema as z.ZodNumber).min(field.validation.min, `Minimum value is ${field.validation.min}`);
			}
			if (field.validation?.max !== undefined) {
				schema = (schema as z.ZodNumber).max(field.validation.max, `Maximum value is ${field.validation.max}`);
			}
			break;

		case 'DATE':
			schema = z.string().regex(
				/^\d{4}-\d{2}-\d{2}$/,
				'Please enter a valid date (YYYY-MM-DD)'
			);
			break;

		case 'TEXT':
		case 'TEXTAREA':
		default:
			schema = z.string();

			// Apply length constraints if provided
			if (field.validation?.minLength) {
				schema = (schema as z.ZodString).min(
					field.validation.minLength,
					`Minimum length is ${field.validation.minLength} characters`
				);
			}
			if (field.validation?.maxLength) {
				schema = (schema as z.ZodString).max(
					field.validation.maxLength,
					`Maximum length is ${field.validation.maxLength} characters`
				);
			}

			// Apply custom pattern if provided
			if (field.validation?.pattern) {
				schema = (schema as z.ZodString).regex(
					new RegExp(field.validation.pattern),
					'Please enter a valid value'
				);
			}
			break;
	}

	// Make field optional if not required
	if (!field.required) {
		schema = schema.optional().or(z.literal(''));
	}

	return schema;
}

/**
 * Generates a complete Zod schema for a FormTemplate
 *
 * @param template - The form template definition
 * @param blockId - Optional block ID to prefix field names (for uniqueness)
 * @returns Zod object schema for the form
 */
export function generateFormSchema(template: FormTemplate, blockId?: string): z.ZodObject<any> {
	const schemaShape: Record<string, z.ZodTypeAny> = {};

	for (const field of template.fields) {
		// Generate unique field key (same pattern as in component)
		const fieldKey = blockId
			? `${blockId}-${field.name}`
			: field.name;

		schemaShape[fieldKey] = generateFieldSchema(field);
	}

	return z.object(schemaShape);
}

/**
 * Generates a combined schema for multiple form blocks
 * Each block may contain a form template with its own fields
 *
 * @param blocks - Array of content blocks
 * @param templates - Map of template ID to template definition
 * @returns Combined Zod schema for all form blocks
 */
export function generateMultiBlockSchema(
	blocks: ContentBlock[],
	templates: Map<string, FormTemplate>
): z.ZodObject<any> {
	let combinedShape: Record<string, z.ZodTypeAny> = {};

	for (const block of blocks) {
		if (block.type === 'FORM_FIELDS' && block.formTemplateId) {
			const template = templates.get(block.formTemplateId);
			if (template) {
				const blockSchema = generateFormSchema(template, block.id);
				// Merge schemas
				combinedShape = {
					...combinedShape,
					...blockSchema.shape
				};
			}
		}
	}

	return z.object(combinedShape);
}

/**
 * Generates schema for checkbox items
 *
 * @param blockId - Block ID for unique keys
 * @param items - Array of checkbox item labels
 * @param requireAll - Whether all checkboxes must be checked
 * @returns Zod schema for checkbox group
 */
export function generateCheckboxSchema(
	blockId: string,
	items: string[],
	requireAll = false
): z.ZodObject<any> {
	const schemaShape: Record<string, z.ZodTypeAny> = {};

	for (let idx = 0; idx < items.length; idx++) {
		const fieldKey = `${blockId}-${idx}`;
		schemaShape[fieldKey] = requireAll
			? z.boolean().refine((val) => val === true, {
					message: 'This field must be checked'
				})
			: z.boolean().optional();
	}

	return z.object(schemaShape);
}

/**
 * Generates schema for signature field
 *
 * @param blockId - Block ID for unique key
 * @param required - Whether signature is required
 * @returns Zod schema for signature
 */
export function generateSignatureSchema(
	blockId: string,
	required = false
): z.ZodObject<any> {
	const schema = required
		? z.string().min(1, 'Signature is required')
		: z.string().optional();

	return z.object({
		[blockId]: schema
	});
}

/**
 * Type helper to infer TypeScript type from Zod schema
 */
export type InferFormData<T extends z.ZodTypeAny> = z.infer<T>;
