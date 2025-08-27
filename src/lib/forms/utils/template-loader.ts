import type { FormTemplate, FormSchema, ApiResponse } from '$lib/forms/types';

// Import JSON templates
import employeeOnboardingTemplate from '../templates/employee-onboarding.json';
import leaveRequestTemplate from '../templates/leave-request.json';
import performanceReviewTemplate from '../templates/performance-review.json';
import documentUploadTemplate from '../templates/document-upload.json';

// Define available templates
const BUILT_IN_TEMPLATES: Record<string, any> = {
  'employee-onboarding': employeeOnboardingTemplate,
  'leave-request': leaveRequestTemplate,
  'performance-review': performanceReviewTemplate,
  'document-upload': documentUploadTemplate
};

export interface TemplateLoadOptions {
  populateOptions?: {
    departments?: Array<{ id: string; name: string }>;
    roles?: Array<{ id: string; name: string }>;
    employees?: Array<{ id: string; name: string }>;
    managers?: Array<{ id: string; name: string }>;
  };
}

/**
 * Loads a form template by ID with optional data population
 */
export async function loadFormTemplate(
  templateId: string,
  options: TemplateLoadOptions = {}
): Promise<FormTemplate> {
  // First, try to load from built-in templates
  const template = BUILT_IN_TEMPLATES[templateId];
  
  if (!template) {
    throw new Error(`Template '${templateId}' not found`);
  }
  
  // Clone the template to avoid mutations
  const clonedTemplate = JSON.parse(JSON.stringify(template)) as FormTemplate;
  
  // Populate dynamic options if provided
  if (options.populateOptions) {
    populateTemplateOptions(clonedTemplate, options.populateOptions);
  }
  
  return clonedTemplate;
}

/**
 * Gets a list of all available form templates
 */
export function getAvailableTemplates(): Array<{ id: string; name: string; category: string; description?: string }> {
  return Object.entries(BUILT_IN_TEMPLATES).map(([id, template]) => ({
    id,
    name: template.name,
    category: template.category,
    description: template.description
  }));
}

/**
 * Loads templates by category
 */
export function getTemplatesByCategory(category: string): Array<{ id: string; name: string; description?: string }> {
  return Object.entries(BUILT_IN_TEMPLATES)
    .filter(([_, template]) => template.category === category)
    .map(([id, template]) => ({
      id,
      name: template.name,
      description: template.description
    }));
}

/**
 * Creates a form instance from a template
 */
export async function createFormFromTemplate(
  templateId: string,
  customizations: Partial<FormTemplate> = {},
  options: TemplateLoadOptions = {}
): Promise<FormTemplate> {
  const template = await loadFormTemplate(templateId, options);
  
  // Apply customizations
  const customizedTemplate: FormTemplate = {
    ...template,
    ...customizations,
    id: customizations.id || `${templateId}-${Date.now()}`,
    template_schema: {
      ...template.template_schema,
      ...customizations.template_schema,
      fields: customizations.template_schema?.fields || template.template_schema.fields
    }
  };
  
  return customizedTemplate;
}

/**
 * Populates dynamic field options (departments, roles, etc.)
 */
function populateTemplateOptions(
  template: FormTemplate,
  options: NonNullable<TemplateLoadOptions['populateOptions']>
) {
  template.template_schema.fields.forEach(field => {
    switch (field.name) {
      case 'departmentId':
        if (options.departments) {
          field.options = options.departments.map(dept => ({
            value: dept.id,
            label: dept.name
          }));
        }
        break;
        
      case 'roleId':
        if (options.roles) {
          field.options = options.roles.map(role => ({
            value: role.id,
            label: role.name
          }));
        }
        break;
        
      case 'managerId':
      case 'supervisorId':
        if (options.managers) {
          field.options = options.managers.map(manager => ({
            value: manager.id,
            label: manager.name
          }));
        }
        break;
        
      case 'employeeId':
      case 'revieweeId':
        if (options.employees) {
          field.options = options.employees.map(employee => ({
            value: employee.id,
            label: employee.name
          }));
        }
        break;
    }
  });
}

/**
 * Validates a form template structure
 */
export function validateTemplate(template: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required top-level properties
  if (!template.name) errors.push('Template name is required');
  if (!template.category) errors.push('Template category is required');
  if (!template.template_schema) errors.push('Template schema is required');
  
  // Check schema structure
  if (template.template_schema) {
    if (!template.template_schema.fields || !Array.isArray(template.template_schema.fields)) {
      errors.push('Schema must have a fields array');
    } else {
      // Validate fields
      template.template_schema.fields.forEach((field: any, index: number) => {
        if (!field.id) errors.push(`Field ${index} is missing id`);
        if (!field.name) errors.push(`Field ${index} is missing name`);
        if (!field.type) errors.push(`Field ${index} is missing type`);
        if (!field.label) errors.push(`Field ${index} is missing label`);
        
        // Validate field type
        const validTypes = ['text', 'textarea', 'email', 'phone', 'number', 'date', 'select', 'multi_select', 'radio', 'checkbox', 'file', 'section', 'divider'];
        if (field.type && !validTypes.includes(field.type)) {
          errors.push(`Field ${index} has invalid type: ${field.type}`);
        }
        
        // Validate options for select/radio/checkbox fields
        if (['select', 'multi_select', 'radio', 'checkbox'].includes(field.type)) {
          if (!field.options || !Array.isArray(field.options)) {
            errors.push(`Field ${index} of type ${field.type} requires options array`);
          } else {
            field.options.forEach((option: any, optIndex: number) => {
              if (!option.value) errors.push(`Field ${index} option ${optIndex} is missing value`);
              if (!option.label) errors.push(`Field ${index} option ${optIndex} is missing label`);
            });
          }
        }
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Server-side template loader (for API endpoints)
 */
export class TemplateApiClient {
  async getTemplates(): Promise<ApiResponse<Array<{ id: string; name: string; category: string }>>> {
    try {
      const templates = getAvailableTemplates();
      return {
        success: true,
        data: templates
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load templates'
      };
    }
  }
  
  async getTemplate(templateId: string, options?: TemplateLoadOptions): Promise<ApiResponse<FormTemplate>> {
    try {
      const template = await loadFormTemplate(templateId, options);
      return {
        success: true,
        data: template
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : `Template '${templateId}' not found`
      };
    }
  }
  
  async createForm(templateId: string, customizations?: Partial<FormTemplate>, options?: TemplateLoadOptions): Promise<ApiResponse<FormTemplate>> {
    try {
      const form = await createFormFromTemplate(templateId, customizations, options);
      return {
        success: true,
        data: form
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create form from template'
      };
    }
  }
}

// Convenience functions for specific use cases
export const hrTemplates = {
  onboarding: (options?: TemplateLoadOptions) => loadFormTemplate('employee-onboarding', options),
  leaveRequest: (options?: TemplateLoadOptions) => loadFormTemplate('leave-request', options),
  performanceReview: (options?: TemplateLoadOptions) => loadFormTemplate('performance-review', options),
  documentUpload: (options?: TemplateLoadOptions) => loadFormTemplate('document-upload', options)
};

// Template categories
export const TEMPLATE_CATEGORIES = {
  ONBOARDING: 'onboarding',
  LEAVE_MANAGEMENT: 'leave_management',
  PERFORMANCE_MANAGEMENT: 'performance_management',
  COMPLIANCE: 'compliance',
  DOCUMENT_MANAGEMENT: 'document_management',
  TRAINING: 'training'
} as const;