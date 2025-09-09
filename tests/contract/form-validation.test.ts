/**
 * Contract Test: Form Validation API
 * 
 * This test defines the contract for POST /api/frontend/validate/{entity} endpoint
 * Used for server-side form validation with RBAC-aware field validation and business rules
 * 
 * IMPORTANT: This test will FAIL initially (TDD Red phase)
 * Implementation must be created to make this test pass (TDD Green phase)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { UserContext, Role } from '$lib/types';

describe('Contract: POST /api/frontend/validate/{entity}', () => {
  const API_BASE_URL = 'http://localhost:8080/api/frontend';
  
  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks();
  });

  describe('Employee Entity Validation', () => {
    it('should validate complete employee creation form data for admin', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const employeeData = {
        personal_info: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@company.com',
          phone: '+1-555-123-4567',
          date_of_birth: '1990-05-15',
          social_security_number: '123-45-6789',
          address: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            zip_code: '90210',
            country: 'USA'
          }
        },
        employment_info: {
          employee_id: 'EMP-2024-001',
          hire_date: '2024-03-01',
          department_id: 'dept-engineering',
          position: 'Software Engineer',
          employment_type: 'Full-time',
          manager_id: 'mgr-123',
          salary: 75000,
          currency: 'USD',
          work_location: 'Remote',
          probation_end_date: '2024-09-01'
        },
        benefits_enrollment: {
          health_insurance: 'premium_plan',
          dental_insurance: 'basic_plan',
          vision_insurance: 'standard_plan',
          retirement_plan: '401k_standard',
          life_insurance: 50000
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/validate/employee`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: employeeData,
          validation_context: 'create',
          strict_mode: true
        })
      });
      
      // CONTRACT: Must return 200 OK for valid employee data
      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      // CONTRACT: Response must contain validation results and sanitized data
      expect(data).toMatchObject({
        validation_id: expect.any(String),
        entity: 'employee',
        validation_context: 'create',
        is_valid: true,
        validation_timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        field_validations: expect.any(Object),
        business_rules: expect.any(Array),
        sanitized_data: expect.any(Object),
        warnings: expect.any(Array)
      });
      
      // CONTRACT: Field validations should include results for each field group
      expect(data.field_validations).toMatchObject({
        personal_info: expect.any(Object),
        employment_info: expect.any(Object),
        benefits_enrollment: expect.any(Object)
      });
      
      // CONTRACT: Should validate email format and uniqueness
      expect(data.field_validations.personal_info.email).toMatchObject({
        field: 'email',
        is_valid: true,
        format_valid: true,
        uniqueness_check: 'passed',
        sanitized_value: 'john.doe@company.com'
      });
      
      // CONTRACT: Should validate employee ID format and uniqueness
      expect(data.field_validations.employment_info.employee_id).toMatchObject({
        field: 'employee_id',
        is_valid: true,
        format_valid: true,
        uniqueness_check: 'passed',
        generated: false
      });
      
      // CONTRACT: Should include business rule validations
      expect(data.business_rules.length).toBeGreaterThan(0);
      data.business_rules.forEach((rule: any) => {
        expect(rule).toMatchObject({
          rule_id: expect.any(String),
          rule_name: expect.any(String),
          status: expect.stringMatching(/^(passed|failed|warning)$/),
          message: expect.any(String)
        });
      });
    });

    it('should return validation errors for invalid employee data', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const invalidEmployeeData = {
        personal_info: {
          first_name: '', // Required field missing
          last_name: 'D', // Too short
          email: 'invalid-email', // Invalid format
          phone: '123', // Invalid format
          date_of_birth: '2010-01-01', // Too young
          social_security_number: '123-45-678', // Invalid format
        },
        employment_info: {
          employee_id: 'INVALID!@#', // Invalid characters
          hire_date: '2025-01-01', // Future date
          department_id: 'nonexistent-dept', // Invalid department
          position: '', // Required field missing
          salary: -1000, // Negative salary
          manager_id: 'self-reference' // Self-referencing manager
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/validate/employee`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: invalidEmployeeData,
          validation_context: 'create'
        })
      });
      
      expect(response.status).toBe(200); // Still 200, but validation failed
      
      const data = await response.json();
      
      // CONTRACT: Should indicate validation failure
      expect(data.is_valid).toBe(false);
      expect(data.errors).toBeDefined();
      expect(data.errors.length).toBeGreaterThan(0);
      
      // CONTRACT: Should include specific field errors
      expect(data.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'personal_info.first_name',
            error_code: 'FIELD_REQUIRED',
            message: expect.stringContaining('required')
          }),
          expect.objectContaining({
            field: 'personal_info.email',
            error_code: 'INVALID_FORMAT',
            message: expect.stringContaining('email format')
          }),
          expect.objectContaining({
            field: 'employment_info.salary',
            error_code: 'INVALID_RANGE',
            message: expect.stringContaining('positive')
          })
        ])
      );
      
      // CONTRACT: Should include business rule failures
      const businessRuleErrors = data.business_rules.filter((rule: any) => rule.status === 'failed');
      expect(businessRuleErrors.length).toBeGreaterThan(0);
    });

    it('should apply role-based field access validation for HR Manager', async () => {
      const hrToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.hrmanager.token';
      
      const employeeDataWithSalary = {
        personal_info: {
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.smith@company.com'
        },
        employment_info: {
          hire_date: '2024-03-01',
          department_id: 'dept-marketing',
          position: 'Marketing Manager',
          salary: 80000 // HR Manager should be able to set salary
        },
        sensitive_info: {
          social_security_number: '987-65-4321',
          background_check_status: 'completed'
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/validate/employee`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: employeeDataWithSalary,
          validation_context: 'create'
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: HR Manager should be able to validate salary information
      expect(data.field_validations.employment_info.salary).toMatchObject({
        field: 'salary',
        is_valid: true,
        access_granted: true,
        role_permission: 'hr_manager_salary_access'
      });
      
      // CONTRACT: HR Manager should be able to validate sensitive information
      expect(data.field_validations.sensitive_info).toBeDefined();
      expect(data.field_validations.sensitive_info.social_security_number.access_granted).toBe(true);
    });

    it('should restrict Manager from accessing salary fields', async () => {
      const managerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.manager.token';
      
      const employeeDataWithSalary = {
        personal_info: {
          first_name: 'Bob',
          last_name: 'Johnson',
          email: 'bob.johnson@company.com'
        },
        employment_info: {
          hire_date: '2024-03-01',
          department_id: 'dept-sales', // Must be manager's department
          position: 'Sales Representative',
          salary: 60000, // Manager should NOT be able to set salary
          manager_id: 'current-manager-id'
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/validate/employee`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: employeeDataWithSalary,
          validation_context: 'create'
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Manager should be denied access to salary fields
      expect(data.field_validations.employment_info.salary).toMatchObject({
        field: 'salary',
        is_valid: false,
        access_granted: false,
        error_code: 'FIELD_ACCESS_DENIED',
        role_restriction: 'salary_access_hr_only'
      });
      
      // CONTRACT: Should include access restriction in errors
      expect(data.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'employment_info.salary',
            error_code: 'FIELD_ACCESS_DENIED',
            message: expect.stringContaining('insufficient permissions')
          })
        ])
      );
    });
  });

  describe('Department Entity Validation', () => {
    it('should validate department creation with organizational hierarchy', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const departmentData = {
        basic_info: {
          name: 'Product Development',
          description: 'Responsible for product development and innovation',
          department_code: 'PROD-DEV',
          location: 'San Francisco, CA'
        },
        organizational: {
          parent_department_id: 'dept-engineering',
          manager_id: 'mgr-456',
          cost_center: 'CC-PROD-001',
          budget_allocation: 500000
        },
        operational: {
          max_employees: 25,
          requires_security_clearance: false,
          work_schedule: 'standard_business_hours',
          remote_work_allowed: true
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/validate/department`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: departmentData,
          validation_context: 'create',
          validate_hierarchy: true
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should validate department name uniqueness
      expect(data.field_validations.basic_info.name).toMatchObject({
        field: 'name',
        is_valid: true,
        uniqueness_check: 'passed',
        case_sensitivity: 'ignored'
      });
      
      // CONTRACT: Should validate organizational hierarchy
      expect(data.business_rules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_name: 'hierarchy_validation',
            status: 'passed',
            details: expect.objectContaining({
              parent_exists: true,
              circular_reference: false,
              max_depth_check: 'passed'
            })
          })
        ])
      );
      
      // CONTRACT: Should validate manager assignment
      expect(data.field_validations.organizational.manager_id).toMatchObject({
        field: 'manager_id',
        is_valid: true,
        employee_exists: true,
        manager_qualifications: 'verified'
      });
    });

    it('should prevent circular department hierarchy', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const circularDepartmentData = {
        basic_info: {
          name: 'Circular Department',
          department_code: 'CIRC-DEPT'
        },
        organizational: {
          parent_department_id: 'dept-self', // This would create circular reference
          manager_id: 'mgr-789'
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/validate/department`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: circularDepartmentData,
          validation_context: 'update',
          current_department_id: 'dept-self'
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should detect and prevent circular hierarchy
      expect(data.is_valid).toBe(false);
      expect(data.business_rules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_name: 'hierarchy_validation',
            status: 'failed',
            error_code: 'CIRCULAR_HIERARCHY',
            message: expect.stringContaining('circular reference')
          })
        ])
      );
    });

    it('should restrict HR Manager from budget-related fields', async () => {
      const hrToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.hrmanager.token';
      
      const departmentWithBudget = {
        basic_info: {
          name: 'HR Operations',
          description: 'HR operational department'
        },
        organizational: {
          budget_allocation: 200000, // HR Manager should not access budget
          cost_center: 'CC-HR-001'
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/validate/department`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: departmentWithBudget,
          validation_context: 'create'
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: HR Manager should be restricted from budget fields
      expect(data.field_validations.organizational.budget_allocation).toMatchObject({
        field: 'budget_allocation',
        is_valid: false,
        access_granted: false,
        error_code: 'FIELD_ACCESS_DENIED'
      });
    });
  });

  describe('Performance Review Entity Validation', () => {
    it('should validate performance review with goal alignment', async () => {
      const hrToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.hrmanager.token';
      
      const performanceReviewData = {
        review_info: {
          employee_id: 'emp-123',
          reviewer_id: 'mgr-456',
          review_period: '2024-Q1',
          review_type: 'quarterly',
          due_date: '2024-04-15'
        },
        ratings: {
          overall_performance: 4.2,
          technical_skills: 4.5,
          communication: 4.0,
          leadership: 3.8,
          goal_achievement: 4.1
        },
        goals: [
          {
            goal_id: 'goal-001',
            description: 'Improve code review turnaround time',
            target_completion: '2024-03-31',
            actual_completion: '2024-03-28',
            achievement_percentage: 95,
            notes: 'Exceeded expectations by implementing automated tools'
          }
        ],
        development_plan: {
          strengths: ['Technical expertise', 'Problem solving'],
          areas_for_improvement: ['Public speaking', 'Project management'],
          training_recommendations: ['Leadership workshop', 'PM certification'],
          career_goals: 'Senior Engineer promotion by Q4 2024'
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/validate/performance_review`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: performanceReviewData,
          validation_context: 'create'
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should validate rating ranges
      expect(data.field_validations.ratings.overall_performance).toMatchObject({
        field: 'overall_performance',
        is_valid: true,
        range_check: 'passed',
        min_value: 1.0,
        max_value: 5.0
      });
      
      // CONTRACT: Should validate reviewer permissions
      expect(data.business_rules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_name: 'reviewer_authorization',
            status: 'passed',
            details: expect.objectContaining({
              can_review_employee: true,
              manager_relationship: 'verified'
            })
          })
        ])
      );
      
      // CONTRACT: Should validate goal alignment
      expect(data.field_validations.goals).toBeDefined();
      data.field_validations.goals.forEach((goal: any) => {
        expect(goal).toMatchObject({
          goal_id: expect.any(String),
          is_valid: true,
          achievement_percentage_valid: true,
          completion_date_valid: true
        });
      });
    });

    it('should prevent self-performance reviews', async () => {
      const managerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.manager.token';
      
      const selfReviewData = {
        review_info: {
          employee_id: 'current-manager-id', // Same as reviewer
          reviewer_id: 'current-manager-id',
          review_period: '2024-Q1',
          review_type: 'quarterly'
        },
        ratings: {
          overall_performance: 5.0 // Perfect self-rating
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/validate/performance_review`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: selfReviewData,
          validation_context: 'create'
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should prevent self-review
      expect(data.is_valid).toBe(false);
      expect(data.business_rules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_name: 'self_review_prevention',
            status: 'failed',
            error_code: 'SELF_REVIEW_NOT_ALLOWED',
            message: expect.stringContaining('cannot review themselves')
          })
        ])
      );
    });
  });

  describe('User Account Entity Validation', () => {
    it('should validate user account creation with role assignment', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const userAccountData = {
        account_info: {
          username: 'jdoe2024',
          email: 'john.doe@company.com',
          temporary_password: 'TempPass123!',
          force_password_change: true
        },
        profile: {
          first_name: 'John',
          last_name: 'Doe',
          display_name: 'John D.',
          preferred_language: 'en-US',
          timezone: 'America/New_York'
        },
        security: {
          role_assignments: ['employee', 'manager'],
          two_factor_required: true,
          account_expiry_date: '2025-12-31',
          ip_restrictions: ['192.168.1.0/24', '10.0.0.0/8']
        },
        notifications: {
          email_notifications: true,
          sms_notifications: false,
          push_notifications: true,
          notification_frequency: 'immediate'
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/validate/user_account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: userAccountData,
          validation_context: 'create'
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should validate username uniqueness and format
      expect(data.field_validations.account_info.username).toMatchObject({
        field: 'username',
        is_valid: true,
        format_valid: true,
        uniqueness_check: 'passed',
        length_check: 'passed'
      });
      
      // CONTRACT: Should validate password complexity
      expect(data.field_validations.account_info.temporary_password).toMatchObject({
        field: 'temporary_password',
        is_valid: true,
        complexity_score: expect.any(Number),
        meets_policy: true,
        policy_details: expect.any(Object)
      });
      
      // CONTRACT: Should validate role assignments
      expect(data.field_validations.security.role_assignments).toMatchObject({
        field: 'role_assignments',
        is_valid: true,
        roles_exist: true,
        role_conflicts: 'none',
        hierarchy_valid: true
      });
      
      // CONTRACT: Should validate IP restrictions format
      expect(data.field_validations.security.ip_restrictions).toMatchObject({
        field: 'ip_restrictions',
        is_valid: true,
        cidr_format_valid: true,
        restriction_count: 2
      });
    });

    it('should validate password policy compliance', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const weakPasswordData = {
        account_info: {
          username: 'testuser',
          email: 'test@company.com',
          temporary_password: '123456', // Weak password
        },
        security: {
          two_factor_required: false
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/validate/user_account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: weakPasswordData,
          validation_context: 'create',
          enforce_security_policy: true
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should reject weak passwords
      expect(data.field_validations.account_info.temporary_password).toMatchObject({
        field: 'temporary_password',
        is_valid: false,
        complexity_score: expect.any(Number),
        meets_policy: false,
        policy_violations: expect.arrayContaining([
          'insufficient_length',
          'missing_uppercase',
          'missing_special_chars',
          'too_common'
        ])
      });
      
      // CONTRACT: Should enforce 2FA for certain roles
      expect(data.business_rules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_name: 'two_factor_requirement',
            status: 'warning',
            message: expect.stringContaining('Two-factor authentication recommended')
          })
        ])
      );
    });

    it('should restrict non-admin users from role assignments', async () => {
      const hrToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.hrmanager.token';
      
      const userWithAdminRole = {
        account_info: {
          username: 'newadmin',
          email: 'admin@company.com',
          temporary_password: 'SecurePass123!'
        },
        security: {
          role_assignments: ['admin'], // HR Manager trying to create admin
          account_expiry_date: '2025-12-31'
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/validate/user_account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: userWithAdminRole,
          validation_context: 'create'
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should prevent HR Manager from assigning admin role
      expect(data.field_validations.security.role_assignments).toMatchObject({
        field: 'role_assignments',
        is_valid: false,
        unauthorized_roles: ['admin'],
        error_code: 'ROLE_ASSIGNMENT_DENIED'
      });
    });
  });

  describe('Cross-Entity Validation Rules', () => {
    it('should validate employee-department relationship consistency', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const employeeData = {
        personal_info: {
          first_name: 'Alice',
          last_name: 'Wonder',
          email: 'alice@company.com'
        },
        employment_info: {
          department_id: 'dept-sales',
          manager_id: 'mgr-engineering' // Manager from different department
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/validate/employee`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: employeeData,
          validation_context: 'create',
          validate_cross_references: true
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should detect manager-department mismatch
      expect(data.business_rules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_name: 'manager_department_alignment',
            status: 'failed',
            error_code: 'MANAGER_DEPARTMENT_MISMATCH',
            message: expect.stringContaining('different department')
          })
        ])
      );
    });

    it('should validate capacity constraints', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const employeeData = {
        employment_info: {
          department_id: 'dept-small', // Department at capacity
          hire_date: '2024-03-01'
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/validate/employee`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: employeeData,
          validation_context: 'create',
          validate_capacity: true
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should check department capacity
      expect(data.business_rules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_name: 'department_capacity',
            status: expect.stringMatching(/^(passed|warning|failed)$/),
            details: expect.objectContaining({
              current_count: expect.any(Number),
              max_capacity: expect.any(Number),
              utilization_percentage: expect.any(Number)
            })
          })
        ])
      );
    });
  });

  describe('Validation Context and Modes', () => {
    it('should support different validation contexts', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const employeeData = {
        personal_info: {
          first_name: 'Bob',
          email: 'bob.existing@company.com' // Existing employee email
        },
        employment_info: {
          employee_id: 'EMP-EXISTING' // Existing employee ID
        }
      };
      
      // Test update context (should allow existing values)
      const updateResponse = await fetch(`${API_BASE_URL}/validate/employee`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: employeeData,
          validation_context: 'update',
          current_entity_id: 'emp-existing-123'
        })
      });
      
      expect(updateResponse.status).toBe(200);
      const updateData = await updateResponse.json();
      
      // CONTRACT: Update context should allow existing values for same entity
      expect(updateData.field_validations.personal_info.email.uniqueness_check).toBe('skipped_same_entity');
      
      // Test create context (should enforce uniqueness)
      const createResponse = await fetch(`${API_BASE_URL}/validate/employee`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: employeeData,
          validation_context: 'create'
        })
      });
      
      expect(createResponse.status).toBe(200);
      const createData = await createResponse.json();
      
      // CONTRACT: Create context should enforce uniqueness
      expect(createData.field_validations.personal_info.email.uniqueness_check).toBe('failed');
    });

    it('should support draft validation mode', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const incompleteData = {
        personal_info: {
          first_name: 'Draft',
          email: 'draft@company.com'
        }
        // Missing required employment_info
      };
      
      const response = await fetch(`${API_BASE_URL}/validate/employee`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: incompleteData,
          validation_mode: 'draft',
          validation_context: 'create'
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Draft mode should be more lenient
      expect(data.is_valid).toBe(false); // Still invalid but...
      expect(data.validation_mode).toBe('draft');
      expect(data.draft_completeness).toMatchObject({
        completion_percentage: expect.any(Number),
        required_fields_missing: expect.any(Array),
        can_save_draft: true
      });
    });

    it('should support strict validation mode', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const borderlineData = {
        personal_info: {
          first_name: 'Test',
          last_name: 'User',
          email: 'test.user@company.com',
          phone: '555-1234' // Borderline format
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/validate/employee`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: borderlineData,
          validation_mode: 'strict',
          validation_context: 'create'
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Strict mode should enforce higher standards
      expect(data.validation_mode).toBe('strict');
      expect(data.field_validations.personal_info.phone).toMatchObject({
        is_valid: false, // Would pass in normal mode
        error_code: 'STRICT_FORMAT_VIOLATION',
        strict_mode_applied: true
      });
    });
  });

  describe('Performance & Security', () => {
    it('should respond within 300ms for simple validation', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const simpleData = {
        personal_info: {
          first_name: 'Quick',
          email: 'quick@test.com'
        }
      };
      
      const startTime = Date.now();
      
      const response = await fetch(`${API_BASE_URL}/validate/employee`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: simpleData,
          validation_context: 'create'
        })
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      
      // CONTRACT: Simple validation should complete within 300ms
      expect(responseTime).toBeLessThan(300);
    });

    it('should sanitize output and prevent XSS', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const maliciousData = {
        personal_info: {
          first_name: '<script>alert("xss")</script>',
          last_name: 'User"onmouseover=alert(1)',
          email: 'test@company.com'
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/validate/employee`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: maliciousData,
          validation_context: 'create'
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should sanitize malicious input
      expect(data.sanitized_data.personal_info.first_name).not.toContain('<script>');
      expect(data.sanitized_data.personal_info.first_name).not.toContain('alert');
      expect(data.sanitized_data.personal_info.last_name).not.toContain('onmouseover');
      
      // CONTRACT: Should flag potential security issues
      expect(data.security_alerts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'xss_attempt',
            field: 'personal_info.first_name',
            severity: 'high'
          })
        ])
      );
    });

    it('should include security headers and implement rate limiting', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const response = await fetch(`${API_BASE_URL}/validate/employee`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: { personal_info: { first_name: 'Test' } },
          validation_context: 'create'
        })
      });
      
      // CONTRACT: Security headers must be present
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      expect(response.headers.get('content-security-policy')).toContain('default-src');
      
      // Test rate limiting
      const rapidRequests = Array(15).fill(null).map(() =>
        fetch(`${API_BASE_URL}/validate/employee`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: { personal_info: { first_name: `Test${Date.now()}` } }
          })
        })
      );
      
      const responses = await Promise.all(rapidRequests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      // CONTRACT: Should implement rate limiting
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 for missing Authorization header', async () => {
      const response = await fetch(`${API_BASE_URL}/validate/employee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: { personal_info: { first_name: 'Test' } }
        })
      });
      
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('Authorization'),
        status_code: 401
      });
    });

    it('should return 404 for invalid entity types', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const response = await fetch(`${API_BASE_URL}/validate/invalid_entity`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: { test: 'data' }
        })
      });
      
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data).toMatchObject({
        error: 'entity_not_supported',
        message: expect.stringContaining('invalid_entity'),
        supported_entities: expect.arrayContaining(['employee', 'department', 'performance_review', 'user_account'])
      });
    });
  });
});