import { z } from 'zod';
import type { FormSchema, FormField, FieldValidation, ValidationRule } from '$lib/forms/types';

/**
 * Formats file size in bytes to human readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Creates a text field schema with optional length validation
 */
export function createTextFieldSchema(label: string, required: boolean, minLength?: number, maxLength?: number): z.ZodType<any> {
  let schema = z.string();
  
  if (minLength !== undefined) {
    schema = schema.min(minLength, `Must be at least ${minLength} characters long`);
  }
  
  if (maxLength !== undefined) {
    schema = schema.max(maxLength, `Must be no more than ${maxLength} characters long`);
  }
  
  if (!required) {
    schema = schema.optional();
  } else if (minLength === undefined) {
    schema = schema.min(1, `${label} is required`);
  }
  
  return schema;
}

/**
 * Creates an email field schema
 */
export function createEmailFieldSchema(required: boolean): z.ZodType<any> {
  if (!required) {
    return z.string().email('Please enter a valid email address').or(z.literal(''));
  }
  
  return z.string().email('Please enter a valid email address');
}

/**
 * Converts a FormSchema to a Zod schema for validation
 * This is the core function that enables dynamic form validation
 */
export function createFormSchema(formSchema: FormSchema): z.ZodObject<any> {
  const schemaFields: Record<string, z.ZodType<any>> = {};
  
  formSchema.fields.forEach(field => {
    // Skip non-input fields
    if (field.type === 'section' || field.type === 'divider') {
      return;
    }
    
    let fieldSchema = createFieldSchema(field);
    
    // Apply field-level validation
    if (field.validation) {
      fieldSchema = applyValidation(fieldSchema, field.validation);
    }
    
    // Handle required fields
    if (!field.required) {
      fieldSchema = fieldSchema.optional();
    }
    
    schemaFields[field.name] = fieldSchema;
  });
  
  let schema = z.object(schemaFields);
  
  // Apply form-level validation rules
  if (formSchema.validation_rules) {
    schema = applyFormValidationRules(schema, formSchema.validation_rules);
  }
  
  return schema;
}

/**
 * Creates appropriate Zod schema for a specific field type
 */
function createFieldSchema(field: FormField): z.ZodType<any> {
  switch (field.type) {
    case 'text':
    case 'textarea':
      return z.string().min(1, `${field.label} is required`);
      
    case 'email':
      return z.string().email(`Please enter a valid email address`);
      
    case 'phone':
      return z.string().regex(
        /^[\+]?[\d\s\-\(\)\.]{6,}$/,
        'Please enter a valid phone number'
      );
      
    case 'number':
      return z.coerce.number({
        invalid_type_error: `${field.label} must be a number`
      });
      
    case 'date':
      return z.string().pipe(z.coerce.date({
        invalid_type_error: `Please enter a valid date`
      }));
      
    case 'select':
    case 'radio':
      if (!field.options?.length) {
        throw new Error(`Field ${field.name} requires options`);
      }
      const values = field.options.map(opt => opt.value);
      return z.enum(values as [string, ...string[]], {
        invalid_type_error: `Please select a valid ${field.label.toLowerCase()}`
      });
      
    case 'multi_select':
    case 'checkbox':
      if (!field.options?.length) {
        throw new Error(`Field ${field.name} requires options`);
      }
      const multiValues = field.options.map(opt => opt.value);
      const arraySchema = z.array(z.enum(multiValues as [string, ...string[]]));
      
      if (field.required) {
        return arraySchema.min(1, `Please select at least one ${field.label.toLowerCase()}`);
      }
      
      return arraySchema.default([]);
      
    case 'file':
      // For client-side, we expect File objects
      // For server-side, we might get strings (file paths)
      return z.union([
        z.instanceof(File, { message: `${field.label} is required` }),
        z.string().min(1, `${field.label} is required`)
      ]);
      
    default:
      console.warn(`Unknown field type: ${field.type}, defaulting to string`);
      return z.string();
  }
}

/**
 * Applies field-level validation rules to a Zod schema
 */
function applyValidation(schema: z.ZodType<any>, validation: FieldValidation): z.ZodType<any> {
  // String validations
  if (validation.minLength && schema instanceof z.ZodString) {
    schema = schema.min(validation.minLength, 
      `Must be at least ${validation.minLength} characters long`);
  }
  
  if (validation.maxLength && schema instanceof z.ZodString) {
    schema = schema.max(validation.maxLength, 
      `Must be no more than ${validation.maxLength} characters long`);
  }
  
  if (validation.pattern && schema instanceof z.ZodString) {
    schema = schema.regex(
      new RegExp(validation.pattern), 
      validation.patternMessage || 'Invalid format'
    );
  }
  
  // Number validations
  if (validation.minValue !== undefined && schema instanceof z.ZodNumber) {
    schema = schema.min(validation.minValue, `Must be at least ${validation.minValue}`);
  }
  
  if (validation.maxValue !== undefined && schema instanceof z.ZodNumber) {
    schema = schema.max(validation.maxValue, `Must be no more than ${validation.maxValue}`);
  }
  
  // File validations
  if (validation.maxValue !== undefined && schema instanceof z.ZodUnion) {
    // Check if it's a file union (File | string)
    const fileSchema = schema.options.find(opt => opt instanceof z.ZodType && opt._def.typeName === 'ZodBranded');
    if (fileSchema || schema.options.some(opt => opt instanceof z.ZodType)) {
      schema = schema.refine(
        (val) => {
          if (val instanceof File) {
            return val.size <= validation.maxValue!;
          }
          return true; // Skip validation for non-File values
        },
        {
          message: `File size must be less than ${formatFileSize(validation.maxValue)}`
        }
      );
    }
  }
  
  // Custom validations
  if (validation.custom) {
    validation.custom.forEach(customRule => {
      schema = applyCustomValidation(schema, customRule);
    });
  }
  
  return schema;
}

/**
 * Applies custom validation rules
 */
function applyCustomValidation(schema: z.ZodType<any>, customRule: any): z.ZodType<any> {
  switch (customRule.rule) {
    case 'past_date':
      return schema.refine((val) => {
        if (!val) return true; // Allow empty values (handled by required check)
        const date = new Date(val);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
      }, {
        message: customRule.message || 'Date must be in the past'
      });
      
    case 'future_date':
      return schema.refine((val) => {
        if (!val) return true;
        const date = new Date(val);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return date > today;
      }, {
        message: customRule.message || 'Date must be in the future'
      });
      
    case 'date_range':
      // This would be handled at the form level, not field level
      console.warn('date_range validation should be applied at form level');
      return schema;
      
    case 'unique_email':
      // This would typically involve an async check against the database
      // For now, we just ensure it's a valid email format
      return schema;
      
    case 'strong_password':
      if (schema instanceof z.ZodString) {
        return schema.regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
          customRule.message || 'Password must contain uppercase, lowercase, number and special character'
        );
      }
      return schema;
      
    case 'future_date':
      return schema.refine((date) => {
        const inputDate = new Date(date);
        return inputDate > new Date();
      }, customRule.message || 'Date must be in the future');
      
    case 'business_days_notice':
      const daysNotice = customRule.params?.days || 5;
      return schema.refine((date) => {
        const inputDate = new Date(date);
        const today = new Date();
        const diffTime = inputDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= daysNotice;
      }, customRule.message || `Must be at least ${daysNotice} business days in advance`);
      
    default:
      console.warn(`Unknown custom validation rule: ${customRule.rule}`);
      return schema;
  }
}

/**
 * Applies form-level validation rules that span multiple fields
 */
function applyFormValidationRules(schema: z.ZodObject<any>, rules: ValidationRule[]): z.ZodObject<any> {
  let refinedSchema = schema;
  
  rules.forEach(rule => {
    switch (rule.rule) {
      case 'date_range':
        refinedSchema = refinedSchema.refine((data) => {
          const startDate = new Date(data.start_date);
          const endDate = new Date(data.end_date);
          return startDate <= endDate;
        }, {
          message: rule.message || 'End date must be after start date',
          path: ['end_date']
        });
        break;
        
      case 'conditional_required':
        const dependsOn = rule.params?.depends_on;
        const condition = rule.params?.condition;
        const value = rule.params?.value;
        
        if (dependsOn && condition && value !== undefined) {
          refinedSchema = refinedSchema.refine((data) => {
            const dependentValue = data[dependsOn];
            const shouldBeRequired = evaluateCondition(dependentValue, condition, value);
            
            if (shouldBeRequired) {
              const fieldValue = data[rule.field];
              return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
            }
            return true;
          }, {
            message: rule.message,
            path: [rule.field]
          });
        }
        break;
        
      case 'unique_combination':
        // This would typically require database validation
        // For now, we just log the rule
        console.warn(`Form-level validation '${rule.rule}' requires server-side implementation`);
        break;
        
      default:
        console.warn(`Unknown form validation rule: ${rule.rule}`);
    }
  });
  
  return refinedSchema;
}

/**
 * Evaluates conditional logic for form validation
 */
function evaluateCondition(value: any, condition: string, expectedValue: any): boolean {
  switch (condition) {
    case 'equals':
      return value === expectedValue;
    case 'not_equals':
      return value !== expectedValue;
    case 'contains':
      return Array.isArray(value) ? value.includes(expectedValue) : 
             String(value).includes(String(expectedValue));
    case 'greater_than':
      return Number(value) > Number(expectedValue);
    case 'less_than':
      return Number(value) < Number(expectedValue);
    default:
      return false;
  }
}


/**
 * Helper function to create a select field schema
 */
export function createSelectFieldSchema(options: string[], label: string, required = false): z.ZodEnum<[string, ...string[]]> {
  const enumSchema = z.enum(options as [string, ...string[]], {
    invalid_type_error: `Please select a valid ${label.toLowerCase()}`
  });
  
  if (!required) {
    return enumSchema.optional() as z.ZodEnum<[string, ...string[]]>;
  }
  
  return enumSchema;
}