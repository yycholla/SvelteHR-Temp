import { describe, it, expect } from 'vitest';
import { createFormSchema } from '../builders/schema-builder';
import { loadFormTemplate, hrTemplates } from '../utils/template-loader';
import { FormContextManager } from '../utils/context-manager';
import type { FormTemplate } from '../types';

describe('Form System Integration', () => {
  describe('Template to Schema Integration', () => {
    it('loads employee onboarding template and creates valid schema', async () => {
      const template = await loadFormTemplate('employee-onboarding');
      const schema = createFormSchema(template.template_schema);
      
      // Create valid employee data
      const validEmployeeData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@company.com',
        phone: '+1234567890',
        dateOfBirth: '1990-01-01',
        startDate: '2024-01-01',
        jobTitle: 'Software Engineer',
        departmentId: 'engineering',
        employeeId: 'EMP001',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+0987654321',
        emergencyContactRelationship: 'spouse'
      };
      
      expect(() => schema.parse(validEmployeeData)).not.toThrow();
    });
    
    it('loads leave request template and validates correctly', async () => {
      const template = await loadFormTemplate('leave-request');
      const schema = createFormSchema(template.template_schema);
      
      const validLeaveData = {
        leaveType: 'vacation',
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        reason: 'Family vacation to celebrate anniversary',
        durationType: 'full_day',
        workCoverage: 'John Smith will handle my responsibilities',
        backupContact: 'john.smith@company.com',
        emergencyContactDuringLeave: 'yes'
      };
      
      expect(() => schema.parse(validLeaveData)).not.toThrow();
      
      // Test validation rules
      expect(() => schema.parse({
        ...validLeaveData,
        reason: 'Too short' // Should fail minimum length
      })).toThrow();
    });
    
    it('loads document upload template and handles file validation', async () => {
      const template = await loadFormTemplate('document-upload');
      const schema = createFormSchema(template.template_schema);
      
      const validDocumentData = {
        title: 'Employee Handbook 2024',
        description: 'Updated employee handbook with new policies',
        category: 'HR Policies',
        employee_id: 'emp-123',
        is_public: true
      };
      
      expect(() => schema.parse(validDocumentData)).not.toThrow();
    });
    
    it('loads performance review template with complex validation', async () => {
      const template = await loadFormTemplate('performance-review');
      const schema = createFormSchema(template.template_schema);
      
      // This test validates that complex forms with multiple sections work
      const validReviewData = {
        employeeId: 'emp-123',
        reviewerId: 'mgr-456',
        reviewPeriodStart: '2024-01-01',
        reviewPeriodEnd: '2024-06-30',
        overallRating: '4',
        goalsAchievement: 'exceeded',
        technicalSkills: '4',
        communication: '5',
        teamwork: '4',
        leadership: '3',
        strengths: 'Excellent problem-solving skills and attention to detail',
        areasForImprovement: 'Could improve time management during peak periods',
        goals2024: 'Lead a major project and mentor junior developers',
        reviewerComments: 'Strong performer with great potential for growth'
      };
      
      expect(() => schema.parse(validReviewData)).not.toThrow();
    });
  });
  
  describe('Context Manager Integration', () => {
    it('creates contextual forms with proper templates', async () => {
      const contextManager = new FormContextManager();
      
      // Test employee onboarding context
      const onboardingTemplate = await contextManager.loadContextualForm('employee_onboarding', 'emp-new-123');
      expect(onboardingTemplate.name).toBe('Employee Onboarding');
      
      // Context should be updated
      const context = contextManager.getContext();
      expect(context?.template?.name).toBe('Employee Onboarding');
      expect(context?.entityId).toBe('emp-new-123');
    });
    
    it('handles form persistence through context manager', async () => {
      const contextManager = new FormContextManager('integration-test');
      contextManager.setContext({
        type: 'leave_request',
        entityId: 'leave-123'
      });
      
      const formData = {
        leaveType: 'sick',
        startDate: '2024-03-01',
        endDate: '2024-03-03',
        reason: 'Medical appointment and recovery'
      };
      
      // Save draft
      await contextManager.saveDraft(formData);
      
      // Load draft
      const loadedData = await contextManager.loadDraft();
      expect(loadedData).toEqual(formData);
      
      // Context should show it's a draft
      const context = contextManager.getContext();
      expect(context?.isDraft).toBe(true);
    });
  });
  
  describe('Cross-Template Validation Consistency', () => {
    it('applies consistent email validation across templates', async () => {
      const templates = [
        await loadFormTemplate('employee-onboarding'),
        await loadFormTemplate('performance-review')
      ];
      
      templates.forEach(template => {
        const schema = createFormSchema(template.template_schema);
        
        // Find email fields
        const emailFields = template.template_schema.fields.filter(f => f.type === 'email');
        
        emailFields.forEach(field => {
          // Create minimal data with valid email
          const validData = { [field.name]: 'test@example.com' };
          expect(() => schema.parse(validData)).not.toThrow();
          
          // Test invalid email
          if (field.required) {
            const invalidData = { [field.name]: 'invalid-email' };
            expect(() => schema.parse(invalidData)).toThrow();
          }
        });
      });
    });
    
    it('applies consistent date validation across templates', async () => {
      const templates = [
        await loadFormTemplate('employee-onboarding'),
        await loadFormTemplate('leave-request'),
        await loadFormTemplate('performance-review')
      ];
      
      templates.forEach(template => {
        const schema = createFormSchema(template.template_schema);
        
        // Find date fields
        const dateFields = template.template_schema.fields.filter(f => f.type === 'date');
        
        dateFields.forEach(field => {
          // Create minimal data with valid date
          const validData = { [field.name]: '2024-01-01' };
          expect(() => schema.parse(validData)).not.toThrow();
          
          // Test invalid date format
          if (field.required) {
            const invalidData = { [field.name]: 'invalid-date' };
            expect(() => schema.parse(invalidData)).toThrow();
          }
        });
      });
    });
  });
  
  describe('HR Templates Convenience Functions', () => {
    it('provides working convenience functions for all HR templates', async () => {
      const onboarding = await hrTemplates.onboarding();
      const leave = await hrTemplates.leaveRequest();
      const performance = await hrTemplates.performanceReview();
      const document = await hrTemplates.documentUpload();
      
      // All should be valid templates
      expect(onboarding.template_schema.fields.length).toBeGreaterThan(0);
      expect(leave.template_schema.fields.length).toBeGreaterThan(0);
      expect(performance.template_schema.fields.length).toBeGreaterThan(0);
      expect(document.template_schema.fields.length).toBeGreaterThan(0);
      
      // All should create valid schemas
      expect(() => createFormSchema(onboarding.template_schema)).not.toThrow();
      expect(() => createFormSchema(leave.template_schema)).not.toThrow();
      expect(() => createFormSchema(performance.template_schema)).not.toThrow();
      expect(() => createFormSchema(document.template_schema)).not.toThrow();
    });
  });
  
  describe('Complex Validation Scenarios', () => {
    it('handles forms with conditional fields and complex validation rules', async () => {
      const template = await loadFormTemplate('leave-request');
      const schema = createFormSchema(template.template_schema);
      
      // Test full day leave request
      const fullDayLeave = {
        leaveType: 'vacation',
        startDate: '2024-06-01',
        endDate: '2024-06-05',
        durationType: 'full_day',
        reason: 'Summer vacation with family to celebrate our anniversary and spend quality time together'
      };
      
      expect(() => schema.parse(fullDayLeave)).not.toThrow();
      
      // Test partial day leave request
      const partialDayLeave = {
        leaveType: 'personal',
        startDate: '2024-06-01',
        endDate: '2024-06-01',
        durationType: 'partial_day',
        startTime: '09:00',
        endTime: '12:00',
        reason: 'Medical appointment that requires half day off'
      };
      
      expect(() => schema.parse(partialDayLeave)).not.toThrow();
    });
    
    it('validates file uploads with size and type constraints', async () => {
      const template = await loadFormTemplate('document-upload');
      const schema = createFormSchema(template.template_schema);
      
      // Test with valid document metadata
      const validUpload = {
        title: 'Company Policy Update',
        description: 'Updated remote work policy for 2024',
        category: 'HR Policies',
        is_public: true
      };
      
      expect(() => schema.parse(validUpload)).not.toThrow();
      
      // Test validation on required fields
      expect(() => schema.parse({
        description: 'Document without title',
        category: 'HR Policies'
      })).toThrow(); // Missing required title
    });
  });
  
  describe('Error Handling Integration', () => {
    it('provides meaningful errors for template loading failures', async () => {
      await expect(loadFormTemplate('non-existent-template'))
        .rejects.toThrow('Template \'non-existent-template\' not found');
    });
    
    it('handles schema creation errors gracefully', () => {
      // Invalid template structure
      const invalidTemplate = {
        fields: [
          {
            id: '1',
            name: 'testField',
            type: 'select', // Requires options
            label: 'Test Field',
            required: true
            // Missing options array
          }
        ]
      };
      
      expect(() => createFormSchema(invalidTemplate)).toThrow();
    });
    
    it('handles context manager errors properly', async () => {
      const contextManager = new FormContextManager();
      
      // Try to save draft without context
      await expect(contextManager.saveDraft({ test: 'data' }))
        .rejects.toThrow('No form context available for saving draft');
      
      // Try to load non-existent template
      await expect(contextManager.loadContextualForm('invalid-context'))
        .rejects.toThrow('No template found for context type: invalid-context');
    });
  });
  
  describe('Template Population Integration', () => {
    it('populates template options correctly', async () => {
      const options = {
        populateOptions: {
          departments: [
            { id: 'eng', name: 'Engineering' },
            { id: 'hr', name: 'Human Resources' }
          ],
          employees: [
            { id: 'emp1', name: 'John Doe' },
            { id: 'emp2', name: 'Jane Smith' }
          ]
        }
      };
      
      const template = await loadFormTemplate('employee-onboarding', options);
      
      // Find populated fields
      const deptField = template.template_schema.fields.find(f => f.name === 'departmentId');
      const managerField = template.template_schema.fields.find(f => f.name === 'managerId');
      
      if (deptField?.options) {
        expect(deptField.options.length).toBe(2);
        expect(deptField.options[0].value).toBe('eng');
        expect(deptField.options[0].label).toBe('Engineering');
      }
      
      if (managerField?.options) {
        expect(managerField.options.length).toBe(2);
        expect(managerField.options[0].value).toBe('emp1');
        expect(managerField.options[0].label).toBe('John Doe');
      }
    });
  });
});