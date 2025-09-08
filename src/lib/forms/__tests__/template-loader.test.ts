import { describe, it, expect } from 'vitest';
import {
	loadFormTemplate,
	getAvailableTemplates,
	getTemplatesByCategory,
	createFormFromTemplate,
	validateTemplate,
	hrTemplates,
	TEMPLATE_CATEGORIES
} from '../utils/template-loader';
import type { FormTemplate } from '../types';

describe('Template Loader', () => {
	describe('loadFormTemplate', () => {
		it('loads built-in templates successfully', async () => {
			const template = await loadFormTemplate('employee-onboarding');

			expect(template).toBeDefined();
			expect(template.name).toBe('Employee Onboarding');
			expect(template.category).toBe('onboarding');
			expect(template.template_schema).toBeDefined();
			expect(template.template_schema.fields).toBeInstanceOf(Array);
			expect(template.template_schema.fields.length).toBeGreaterThan(0);
		});

		it('loads leave request template', async () => {
			const template = await loadFormTemplate('leave-request');

			expect(template).toBeDefined();
			expect(template.name).toBe('Leave Request');
			expect(template.category).toBe('leave_management');
			expect(template.template_schema.fields).toBeInstanceOf(Array);
		});

		it('loads document upload template', async () => {
			const template = await loadFormTemplate('document-upload');

			expect(template).toBeDefined();
			expect(template.name).toBe('Document Upload');
			expect(template.category).toBe('document_management');
			expect(template.template_schema.fields).toBeInstanceOf(Array);

			// Check for file field
			const fileField = template.template_schema.fields.find((f) => f.type === 'file');
			expect(fileField).toBeDefined();
			expect(fileField?.validation?.maxValue).toBe(10485760); // 10MB
		});

		it('loads performance review template', async () => {
			const template = await loadFormTemplate('performance-review');

			expect(template).toBeDefined();
			expect(template.name).toBe('Performance Review');
			expect(template.category).toBe('performance_management');
		});

		it('throws error for non-existent template', async () => {
			await expect(loadFormTemplate('non-existent-template')).rejects.toThrow();
		});

		it('clones templates to prevent mutation', async () => {
			const template1 = await loadFormTemplate('employee-onboarding');
			const template2 = await loadFormTemplate('employee-onboarding');

			// Modify one template
			template1.name = 'Modified Template';

			// The other should remain unchanged
			expect(template2.name).toBe('Employee Onboarding');
		});
	});

	describe('getAvailableTemplates', () => {
		it('returns all available templates', () => {
			const templates = getAvailableTemplates();

			expect(templates).toBeInstanceOf(Array);
			expect(templates.length).toBeGreaterThan(0);

			// Check structure
			templates.forEach((template) => {
				expect(template).toHaveProperty('id');
				expect(template).toHaveProperty('name');
				expect(template).toHaveProperty('category');
				expect(typeof template.id).toBe('string');
				expect(typeof template.name).toBe('string');
				expect(typeof template.category).toBe('string');
			});

			// Check that all expected templates are included
			const templateIds = templates.map((t) => t.id);
			expect(templateIds).toContain('employee-onboarding');
			expect(templateIds).toContain('leave-request');
			expect(templateIds).toContain('performance-review');
			expect(templateIds).toContain('document-upload');
		});
	});

	describe('getTemplatesByCategory', () => {
		it('filters templates by category', () => {
			const onboardingTemplates = getTemplatesByCategory('onboarding');

			expect(onboardingTemplates).toBeInstanceOf(Array);
			expect(onboardingTemplates.length).toBeGreaterThan(0);
			expect(onboardingTemplates[0].id).toBe('employee-onboarding');
		});

		it('returns empty array for non-existent category', () => {
			const templates = getTemplatesByCategory('non-existent-category');
			expect(templates).toEqual([]);
		});
	});

	describe('createFormFromTemplate', () => {
		it('creates customized form from template', async () => {
			const customizations = {
				id: 'custom-onboarding-123',
				name: 'Custom Onboarding Form'
			};

			const form = await createFormFromTemplate('employee-onboarding', customizations);

			expect(form.id).toBe('custom-onboarding-123');
			expect(form.name).toBe('Custom Onboarding Form');
			expect(form.template_schema).toBeDefined();
		});

		it('generates unique ID when none provided', async () => {
			const form1 = await createFormFromTemplate('employee-onboarding');
			const form2 = await createFormFromTemplate('employee-onboarding');

			expect(form1.id).not.toBe(form2.id);
			expect(form1.id).toContain('employee-onboarding-');
			expect(form2.id).toContain('employee-onboarding-');
		});

		it('applies field customizations', async () => {
			const customizations: Partial<FormTemplate> = {
				template_schema: {
					fields: [
						{
							id: 'custom-field',
							name: 'customField',
							type: 'text',
							label: 'Custom Field',
							required: true
						}
					]
				}
			};

			const form = await createFormFromTemplate('employee-onboarding', customizations);

			// Should have custom fields instead of original
			expect(form.template_schema.fields).toEqual(customizations.template_schema?.fields);
		});
	});

	describe('validateTemplate', () => {
		it('validates correct template structure', () => {
			const validTemplate = {
				name: 'Test Template',
				category: 'test',
				template_schema: {
					fields: [
						{
							id: '1',
							name: 'testField',
							type: 'text',
							label: 'Test Field'
						}
					]
				}
			};

			const result = validateTemplate(validTemplate);
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('identifies missing required properties', () => {
			const invalidTemplate = {
				// Missing name
				category: 'test',
				template_schema: {
					fields: []
				}
			};

			const result = validateTemplate(invalidTemplate);
			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Template name is required');
		});

		it('validates field structure', () => {
			const templateWithInvalidFields = {
				name: 'Test Template',
				category: 'test',
				template_schema: {
					fields: [
						{
							// Missing required properties
							id: '1'
							// Missing: name, type, label
						}
					]
				}
			};

			const result = validateTemplate(templateWithInvalidFields);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors.some((err) => err.includes('missing name'))).toBe(true);
			expect(result.errors.some((err) => err.includes('missing type'))).toBe(true);
			expect(result.errors.some((err) => err.includes('missing label'))).toBe(true);
		});

		it('validates field types', () => {
			const templateWithInvalidType = {
				name: 'Test Template',
				category: 'test',
				template_schema: {
					fields: [
						{
							id: '1',
							name: 'field1',
							type: 'invalid-type',
							label: 'Field 1'
						}
					]
				}
			};

			const result = validateTemplate(templateWithInvalidType);
			expect(result.valid).toBe(false);
			expect(result.errors.some((err) => err.includes('invalid type'))).toBe(true);
		});

		it('validates options for select fields', () => {
			const templateWithInvalidSelect = {
				name: 'Test Template',
				category: 'test',
				template_schema: {
					fields: [
						{
							id: '1',
							name: 'selectField',
							type: 'select',
							label: 'Select Field'
							// Missing options array
						}
					]
				}
			};

			const result = validateTemplate(templateWithInvalidSelect);
			expect(result.valid).toBe(false);
			expect(result.errors.some((err) => err.includes('requires options array'))).toBe(true);
		});

		it('validates option structure', () => {
			const templateWithInvalidOptions = {
				name: 'Test Template',
				category: 'test',
				template_schema: {
					fields: [
						{
							id: '1',
							name: 'selectField',
							type: 'select',
							label: 'Select Field',
							options: [
								{
									value: 'option1'
									// Missing label
								},
								{
									label: 'Option 2'
									// Missing value
								}
							]
						}
					]
				}
			};

			const result = validateTemplate(templateWithInvalidOptions);
			expect(result.valid).toBe(false);
			expect(result.errors.some((err) => err.includes('missing value'))).toBe(true);
			expect(result.errors.some((err) => err.includes('missing label'))).toBe(true);
		});
	});

	describe('hrTemplates convenience functions', () => {
		it('provides easy access to HR templates', async () => {
			const onboarding = await hrTemplates.onboarding();
			const leaveRequest = await hrTemplates.leaveRequest();
			const performanceReview = await hrTemplates.performanceReview();
			const documentUpload = await hrTemplates.documentUpload();

			expect(onboarding.name).toBe('Employee Onboarding');
			expect(leaveRequest.name).toBe('Leave Request');
			expect(performanceReview.name).toBe('Performance Review');
			expect(documentUpload.name).toBe('Document Upload');
		});
	});

	describe('Template Categories', () => {
		it('defines correct category constants', () => {
			expect(TEMPLATE_CATEGORIES.ONBOARDING).toBe('onboarding');
			expect(TEMPLATE_CATEGORIES.LEAVE_MANAGEMENT).toBe('leave_management');
			expect(TEMPLATE_CATEGORIES.PERFORMANCE_MANAGEMENT).toBe('performance_management');
			expect(TEMPLATE_CATEGORIES.COMPLIANCE).toBe('compliance');
			expect(TEMPLATE_CATEGORIES.DOCUMENT_MANAGEMENT).toBe('document_management');
			expect(TEMPLATE_CATEGORIES.TRAINING).toBe('training');
		});
	});

	describe('Template Population Options', () => {
		it('populates department options', async () => {
			const options = {
				populateOptions: {
					departments: [
						{ id: 'dept1', name: 'Engineering' },
						{ id: 'dept2', name: 'Marketing' }
					]
				}
			};

			const template = await loadFormTemplate('employee-onboarding', options);

			// Find department field
			const deptField = template.template_schema.fields.find((f) => f.name === 'departmentId');
			if (deptField) {
				expect(deptField.options).toBeDefined();
				expect(deptField.options?.length).toBe(2);
				expect(deptField.options?.[0].value).toBe('dept1');
				expect(deptField.options?.[0].label).toBe('Engineering');
			}
		});

		it('populates employee options', async () => {
			const options = {
				populateOptions: {
					employees: [
						{ id: 'emp1', name: 'John Doe' },
						{ id: 'emp2', name: 'Jane Smith' }
					]
				}
			};

			const template = await loadFormTemplate('performance-review', options);

			// Find employee field (reviewee)
			const employeeField = template.template_schema.fields.find(
				(f) => f.name === 'employeeId' || f.name === 'revieweeId'
			);

			if (employeeField) {
				expect(employeeField.options).toBeDefined();
				expect(employeeField.options?.length).toBe(2);
			}
		});
	});
});
