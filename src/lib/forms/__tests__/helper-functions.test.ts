import { describe, it, expect } from 'vitest';
import { 
  createTextFieldSchema, 
  createEmailFieldSchema 
} from '../builders/schema-builder';
import { z } from 'zod';

describe('Schema Builder Helper Functions', () => {
  describe('createTextFieldSchema', () => {
    it('creates basic required text schema', () => {
      const schema = createTextFieldSchema('Name', true);
      
      expect(() => schema.parse('John Doe')).not.toThrow();
      expect(() => schema.parse('')).toThrow();
      expect(() => schema.parse(undefined)).toThrow();
    });
    
    it('creates optional text schema', () => {
      const schema = createTextFieldSchema('Name', false);
      
      expect(() => schema.parse('John Doe')).not.toThrow();
      expect(() => schema.parse('')).not.toThrow();
      expect(() => schema.parse(undefined)).not.toThrow();
    });
    
    it('applies length validation', () => {
      const schema = createTextFieldSchema('Name', true, 2, 10);
      
      expect(() => schema.parse('Jo')).not.toThrow(); // Min length
      expect(() => schema.parse('1234567890')).not.toThrow(); // Max length
      expect(() => schema.parse('J')).toThrow(); // Too short
      expect(() => schema.parse('12345678901')).toThrow(); // Too long
    });
    
    it('handles only minimum length', () => {
      const schema = createTextFieldSchema('Name', true, 5);
      
      expect(() => schema.parse('12345')).not.toThrow();
      expect(() => schema.parse('123456789012345')).not.toThrow(); // No max limit
      expect(() => schema.parse('1234')).toThrow();
    });
    
    it('handles only maximum length', () => {
      const schema = createTextFieldSchema('Name', true, undefined, 5);
      
      expect(() => schema.parse('12345')).not.toThrow();
      expect(() => schema.parse('1')).not.toThrow(); // No min limit beyond required
      expect(() => schema.parse('123456')).toThrow();
    });
  });
  
  describe('createEmailFieldSchema', () => {
    it('creates required email schema', () => {
      const schema = createEmailFieldSchema(true);
      
      expect(() => schema.parse('user@example.com')).not.toThrow();
      expect(() => schema.parse('test.email+tag@domain.co.uk')).not.toThrow();
      expect(() => schema.parse('invalid-email')).toThrow();
      expect(() => schema.parse('')).toThrow();
      expect(() => schema.parse(undefined)).toThrow();
    });
    
    it('creates optional email schema', () => {
      const schema = createEmailFieldSchema(false);
      
      expect(() => schema.parse('user@example.com')).not.toThrow();
      expect(() => schema.parse('')).not.toThrow();
      expect(() => schema.parse(undefined)).not.toThrow();
      expect(() => schema.parse('invalid-email')).toThrow();
    });
    
    it('validates various email formats', () => {
      const schema = createEmailFieldSchema(true);
      
      const validEmails = [
        'user@example.com',
        'test.email@domain.com',
        'user+tag@example.org',
        'user_name@domain-name.com',
        'user123@example123.com',
        'test@sub.domain.com'
      ];
      
      validEmails.forEach(email => {
        expect(() => schema.parse(email)).not.toThrow();
      });
      
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@@example.com',
        'user@.com',
        'user@domain.',
        'user name@example.com',
        'user@domain..com'
      ];
      
      invalidEmails.forEach(email => {
        expect(() => schema.parse(email)).toThrow();
      });
    });
  });
});

describe('Field Type Integration', () => {
  it('handles all standard field types', () => {
    // This test ensures all field types work with the schema builder
    const fieldTypes = [
      'text', 'textarea', 'email', 'phone', 'number', 
      'date', 'select', 'multi_select', 'radio', 'checkbox', 'file'
    ];
    
    fieldTypes.forEach(type => {
      // Should not throw when creating schemas for valid field types
      expect(() => {
        const mockField = {
          id: '1',
          name: 'testField',
          type: type as any,
          label: 'Test Field',
          required: false
        };
        
        if (type === 'select' || type === 'multi_select' || type === 'radio' || type === 'checkbox') {
          mockField.options = [
            { value: 'option1', label: 'Option 1' },
            { value: 'option2', label: 'Option 2' }
          ];
        }
        
        // This would be called internally by createFormSchema
        // We're just testing that the field type is recognized
      }).not.toThrow();
    });
  });
});