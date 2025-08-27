import { describe, it, expect } from 'vitest';
import { createFormSchema, createTextFieldSchema, createEmailFieldSchema } from '../builders/schema-builder';
import type { FormSchema } from '../types';

describe('Form Schema Builder', () => {
  describe('createFormSchema', () => {
    it('creates valid Zod schema from form definition', () => {
      const formSchema: FormSchema = {
        fields: [
          {
            id: '1',
            name: 'email',
            type: 'email',
            label: 'Email',
            required: true
          },
          {
            id: '2',
            name: 'age',
            type: 'number',
            label: 'Age',
            required: false,
            validation: { minValue: 18, maxValue: 100 }
          },
          {
            id: '3',
            name: 'name',
            type: 'text',
            label: 'Name',
            required: true,
            validation: { minLength: 2, maxLength: 50 }
          }
        ]
      };
      
      const zodSchema = createFormSchema(formSchema);
      
      // Valid data
      const validData = { email: 'test@example.com', age: 25, name: 'John Doe' };
      expect(() => zodSchema.parse(validData)).not.toThrow();
      
      // Invalid email
      expect(() => zodSchema.parse({ email: 'invalid', age: 25, name: 'John' }))
        .toThrow();
        
      // Age too low
      expect(() => zodSchema.parse({ email: 'test@example.com', age: 17, name: 'John' }))
        .toThrow();
        
      // Name too short
      expect(() => zodSchema.parse({ email: 'test@example.com', age: 25, name: 'J' }))
        .toThrow();
        
      // Missing required field
      expect(() => zodSchema.parse({ age: 25, name: 'John' }))
        .toThrow();
    });
    
    it('handles select fields with options', () => {
      const formSchema: FormSchema = {
        fields: [
          {
            id: '1',
            name: 'category',
            type: 'select',
            label: 'Category',
            required: true,
            options: [
              { value: 'a', label: 'Option A' },
              { value: 'b', label: 'Option B' }
            ]
          }
        ]
      };
      
      const zodSchema = createFormSchema(formSchema);
      
      // Valid option
      expect(() => zodSchema.parse({ category: 'a' })).not.toThrow();
      
      // Invalid option
      expect(() => zodSchema.parse({ category: 'c' })).toThrow();
    });
    
    it('handles multi-select fields', () => {
      const formSchema: FormSchema = {
        fields: [
          {
            id: '1',
            name: 'interests',
            type: 'multi_select',
            label: 'Interests',
            required: false,
            options: [
              { value: 'sports', label: 'Sports' },
              { value: 'music', label: 'Music' },
              { value: 'reading', label: 'Reading' }
            ]
          }
        ]
      };
      
      const zodSchema = createFormSchema(formSchema);
      
      // Valid selections
      expect(() => zodSchema.parse({ interests: ['sports', 'music'] })).not.toThrow();
      expect(() => zodSchema.parse({ interests: [] })).not.toThrow();
      expect(() => zodSchema.parse({})).not.toThrow(); // Optional field
      
      // Invalid selection
      expect(() => zodSchema.parse({ interests: ['invalid'] })).toThrow();
    });
    
    it('applies form-level validation rules', () => {
      const formSchema: FormSchema = {
        fields: [
          {
            id: '1',
            name: 'start_date',
            type: 'date',
            label: 'Start Date',
            required: true
          },
          {
            id: '2',
            name: 'end_date',
            type: 'date',
            label: 'End Date',
            required: true
          }
        ],
        validation_rules: [
          {
            field: 'end_date',
            rule: 'date_range',
            message: 'End date must be after start date'
          }
        ]
      };
      
      const zodSchema = createFormSchema(formSchema);
      
      // Valid date range
      expect(() => zodSchema.parse({ 
        start_date: '2024-01-01', 
        end_date: '2024-01-02' 
      })).not.toThrow();
      
      // Invalid date range
      expect(() => zodSchema.parse({ 
        start_date: '2024-01-02', 
        end_date: '2024-01-01' 
      })).toThrow();
    });
    
    it('skips non-input field types', () => {
      const formSchema: FormSchema = {
        fields: [
          {
            id: '1',
            name: 'section',
            type: 'section',
            label: 'Section Header',
            required: false
          },
          {
            id: '2',
            name: 'divider',
            type: 'divider',
            label: 'Divider',
            required: false
          },
          {
            id: '3',
            name: 'name',
            type: 'text',
            label: 'Name',
            required: true
          }
        ]
      };
      
      const zodSchema = createFormSchema(formSchema);
      
      // Only the text field should be validated
      expect(() => zodSchema.parse({ name: 'John' })).not.toThrow();
      expect(() => zodSchema.parse({})).toThrow(); // Missing required field
    });
  });
  
  describe('helper functions', () => {
    it('creates text field schema correctly', () => {
      const schema = createTextFieldSchema('Name', true, 2, 50);
      
      expect(() => schema.parse('John')).not.toThrow();
      expect(() => schema.parse('')).toThrow(); // Required
      expect(() => schema.parse('J')).toThrow(); // Too short
      expect(() => schema.parse('A'.repeat(51))).toThrow(); // Too long
    });
    
    it('creates email field schema correctly', () => {
      const requiredSchema = createEmailFieldSchema(true);
      const optionalSchema = createEmailFieldSchema(false);
      
      expect(() => requiredSchema.parse('test@example.com')).not.toThrow();
      expect(() => requiredSchema.parse('invalid')).toThrow();
      expect(() => requiredSchema.parse('')).toThrow(); // Required
      
      expect(() => optionalSchema.parse('test@example.com')).not.toThrow();
      expect(() => optionalSchema.parse('')).not.toThrow(); // Optional
      expect(() => optionalSchema.parse('invalid')).toThrow();
    });
  });
});

describe('File Field Validation', () => {
  it('validates file fields with size limits', () => {
    const formSchema: FormSchema = {
      fields: [
        {
          id: '1',
          name: 'document',
          type: 'file',
          label: 'Document',
          required: true,
          validation: {
            maxValue: 1024 * 1024 // 1MB
          }
        }
      ]
    };
    
    const zodSchema = createFormSchema(formSchema);
    
    // Test with valid file size (mock File object)
    const smallFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(smallFile, 'size', { value: 500 * 1024 }); // 500KB
    expect(() => zodSchema.parse({ document: smallFile })).not.toThrow();
    
    // Test with file too large
    const largeFile = new File(['test'], 'large.pdf', { type: 'application/pdf' });
    Object.defineProperty(largeFile, 'size', { value: 2 * 1024 * 1024 }); // 2MB
    expect(() => zodSchema.parse({ document: largeFile })).toThrow();
  });
  
  it('handles optional file fields', () => {
    const formSchema: FormSchema = {
      fields: [
        {
          id: '1',
          name: 'optionalDoc',
          type: 'file',
          label: 'Optional Document',
          required: false
        }
      ]
    };
    
    const zodSchema = createFormSchema(formSchema);
    
    // Should allow empty/undefined
    expect(() => zodSchema.parse({})).not.toThrow();
    expect(() => zodSchema.parse({ optionalDoc: undefined })).not.toThrow();
  });
});

describe('Complex Form Scenarios', () => {
  it('handles mixed field types with cross-field validation', () => {
    const formSchema: FormSchema = {
      fields: [
        {
          id: '1',
          name: 'email',
          type: 'email',
          label: 'Email',
          required: true
        },
        {
          id: '2',
          name: 'password',
          type: 'text',
          label: 'Password',
          required: true,
          validation: {
            minLength: 8,
            maxLength: 50
          }
        },
        {
          id: '3',
          name: 'age',
          type: 'number',
          label: 'Age',
          required: true,
          validation: {
            minValue: 18,
            maxValue: 120
          }
        },
        {
          id: '4',
          name: 'terms',
          type: 'checkbox',
          label: 'Accept Terms',
          required: true,
          options: [
            { value: 'accepted', label: 'I accept the terms' }
          ]
        }
      ]
    };
    
    const zodSchema = createFormSchema(formSchema);
    
    // Valid data
    const validData = {
      email: 'user@example.com',
      password: 'securepassword123',
      age: 25,
      terms: ['accepted']
    };
    expect(() => zodSchema.parse(validData)).not.toThrow();
    
    // Invalid email
    expect(() => zodSchema.parse({
      ...validData,
      email: 'invalid-email'
    })).toThrow();
    
    // Password too short
    expect(() => zodSchema.parse({
      ...validData,
      password: '123'
    })).toThrow();
    
    // Age too young
    expect(() => zodSchema.parse({
      ...validData,
      age: 16
    })).toThrow();
    
    // Terms not accepted
    expect(() => zodSchema.parse({
      ...validData,
      terms: []
    })).toThrow();
  });
  
  it('validates phone numbers correctly', () => {
    const formSchema: FormSchema = {
      fields: [
        {
          id: '1',
          name: 'phone',
          type: 'phone',
          label: 'Phone Number',
          required: true
        }
      ]
    };
    
    const zodSchema = createFormSchema(formSchema);
    
    // Valid phone formats
    const validPhones = [
      '+1234567890',
      '(555) 123-4567',
      '555-123-4567',
      '5551234567',
      '+1 (555) 123-4567'
    ];
    
    validPhones.forEach(phone => {
      expect(() => zodSchema.parse({ phone })).not.toThrow();
    });
    
    // Invalid phone formats - patterns that should clearly fail
    const invalidPhones = [
      'not-a-phone',
      'abc-def-ghij',
      '++invalid',
      'phone number with letters'
    ];
    
    invalidPhones.forEach(phone => {
      expect(() => zodSchema.parse({ phone })).toThrow();
    });
  });
});

describe('Error Message Validation', () => {
  it('provides meaningful error messages for different field types', () => {
    const formSchema: FormSchema = {
      fields: [
        {
          id: '1',
          name: 'email',
          type: 'email',
          label: 'Email Address',
          required: true
        },
        {
          id: '2',
          name: 'name',
          type: 'text',
          label: 'Full Name',
          required: true,
          validation: {
            minLength: 2,
            maxLength: 50
          }
        }
      ]
    };
    
    const zodSchema = createFormSchema(formSchema);
    
    try {
      zodSchema.parse({ email: 'invalid', name: 'A' });
      throw new Error('Should have thrown');
    } catch (error: any) {
      expect(error).toBeDefined();
      
      // Zod errors have an 'issues' property
      const issues = error.issues || [];
      expect(issues.length).toBeGreaterThan(0);
      
      // Check that we have appropriate error messages
      const errorMessages = issues.map((e: any) => e.message);
      expect(errorMessages).toContain('Please enter a valid email address');
      expect(errorMessages).toContain('Must be at least 2 characters long');
    }
  });
});

describe('Form Template Integration', () => {
  it('validates form templates correctly', async () => {
    // This would test the template loading functionality
    // For now, we'll just verify the structure is correct
    
    const templateStructure = {
      name: 'Test Form',
      category: 'test',
      version: 1,
      template_schema: {
        fields: [
          {
            id: 'test_field',
            name: 'testField',
            type: 'text',
            label: 'Test Field',
            required: true
          }
        ]
      }
    };
    
    // This should create a valid Zod schema
    const zodSchema = createFormSchema(templateStructure.template_schema);
    expect(zodSchema).toBeDefined();
    
    // Test validation
    expect(() => zodSchema.parse({ testField: 'valid' })).not.toThrow();
    expect(() => zodSchema.parse({})).toThrow();
  });
  
  it('handles template with all field types', () => {
    const comprehensiveTemplate = {
      fields: [
        { id: '1', name: 'text_field', type: 'text', label: 'Text', required: true },
        { id: '2', name: 'email_field', type: 'email', label: 'Email', required: true },
        { id: '3', name: 'number_field', type: 'number', label: 'Number', required: true },
        { id: '4', name: 'date_field', type: 'date', label: 'Date', required: true },
        { id: '5', name: 'select_field', type: 'select', label: 'Select', required: true, 
          options: [{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }] },
        { id: '6', name: 'multi_field', type: 'multi_select', label: 'Multi Select', required: false,
          options: [{ value: '1', label: 'One' }, { value: '2', label: 'Two' }] },
        { id: '7', name: 'phone_field', type: 'phone', label: 'Phone', required: false },
        { id: '8', name: 'textarea_field', type: 'textarea', label: 'Textarea', required: false },
        { id: '9', name: 'file_field', type: 'file', label: 'File', required: false }
      ]
    };
    
    const zodSchema = createFormSchema(comprehensiveTemplate);
    
    // Valid data for all fields
    const validData = {
      text_field: 'Sample text',
      email_field: 'test@example.com',
      number_field: 42,
      date_field: '2024-01-01',
      select_field: 'a',
      multi_field: ['1', '2'],
      phone_field: '+1234567890',
      textarea_field: 'Long text content here',
      file_field: 'path/to/file.pdf' // String representation for server-side
    };
    
    expect(() => zodSchema.parse(validData)).not.toThrow();
    
    // Test required field validation
    const { text_field, email_field, number_field, date_field, select_field, ...optionalFields } = validData;
    expect(() => zodSchema.parse(optionalFields)).toThrow();
  });
});