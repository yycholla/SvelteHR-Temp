/**
 * Integration Test: HR Manager Role Access Validation
 * 
 * This test validates the complete HR Manager user journey with RBAC enforcement,
 * testing HR-specific functionality, employee management, and compliance workflows.
 * 
 * IMPORTANT: This test will FAIL initially (TDD Red phase)
 * Implementation must be created to make this test pass (TDD Green phase)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { UserContext, Role } from '$lib/types';

describe('Integration: HR Manager Role Access Validation', () => {
  const API_BASE_URL = 'http://localhost:8080';
  const FRONTEND_BASE_URL = 'http://localhost:5173';
  
  // Test HR Manager credentials and context
  const HR_MANAGER_CREDENTIALS = {
    email: 'hr.manager@company.com',
    password: 'HRManager123!',
    expected_role: 'HR_Manager',
    employee_id: 'emp-hr-001',
    department_id: 'dept-human-resources'
  };
  
  let hrToken: string;
  let hrContext: UserContext;
  
  beforeEach(async () => {
    // Reset any mocks and state
    vi.clearAllMocks();
    
    // Authenticate as HR Manager to get token and context
    const loginResponse = await fetch(`${API_BASE_URL}/api/v2/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: HR_MANAGER_CREDENTIALS.email,
        password: HR_MANAGER_CREDENTIALS.password
      })
    });
    
    expect(loginResponse.status).toBe(200);
    const loginData = await loginResponse.json();
    
    hrToken = loginData.token;
    hrContext = loginData.user;
    
    // Verify HR Manager role
    expect(hrContext.roles.some(r => r.name === 'HR_Manager')).toBe(true);
  });
  
  afterEach(async () => {
    // Cleanup: logout HR Manager session
    if (hrToken) {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrToken}`
        }
      });
    }
  });

  describe('HR Manager Dashboard Access', () => {
    it('should successfully load HR Manager dashboard with HR-specific widgets', async () => {
      // INTEGRATION: Test complete HR dashboard loading workflow
      const dashboardResponse = await fetch(`${API_BASE_URL}/api/frontend/dashboard/hr_manager`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(dashboardResponse.status).toBe(200);
      const dashboardData = await dashboardResponse.json();
      
      // CONTRACT: HR Manager dashboard should contain HR-focused widgets
      expect(dashboardData.role).toBe('hr_manager');
      expect(dashboardData.widgets).toBeDefined();
      
      const widgetTypes = dashboardData.widgets.map((w: any) => w.widget_type);
      
      // Should have HR-specific widgets
      expect(widgetTypes).toContain('employee_overview');
      expect(widgetTypes).toContain('hiring_pipeline');
      expect(widgetTypes).toContain('performance_summary');
      expect(widgetTypes).toContain('compliance_tracking');
      expect(widgetTypes).toContain('turnover_analysis');
      expect(widgetTypes).toContain('training_progress');
      expect(widgetTypes).toContain('diversity_metrics');
      
      // Should NOT have financial widgets
      expect(widgetTypes).not.toContain('financial_summary');
      expect(widgetTypes).not.toContain('budget_analysis');
      expect(widgetTypes).not.toContain('payroll_costs');
    });

    it('should include compliance and training analytics for HR Manager', async () => {
      // INTEGRATION: Test HR-specific dashboard functionality
      const dashboardResponse = await fetch(`${API_BASE_URL}/api/frontend/dashboard/hr_manager?focus=compliance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(dashboardResponse.status).toBe(200);
      const dashboardData = await dashboardResponse.json();
      
      // CONTRACT: Should include detailed compliance tracking
      const complianceWidget = dashboardData.widgets.find((w: any) => w.widget_type === 'compliance_tracking');
      expect(complianceWidget).toBeDefined();
      expect(complianceWidget.data).toMatchObject({
        overall_compliance_rate: expect.any(Number),
        overdue_trainings: expect.any(Array),
        upcoming_deadlines: expect.any(Array),
        compliance_by_department: expect.any(Array),
        critical_gaps: expect.any(Array)
      });
      
      // CONTRACT: Should include diversity metrics
      const diversityWidget = dashboardData.widgets.find((w: any) => w.widget_type === 'diversity_metrics');
      expect(diversityWidget).toBeDefined();
      expect(diversityWidget.data).toMatchObject({
        gender_distribution: expect.any(Object),
        ethnicity_breakdown: expect.any(Object),
        leadership_diversity: expect.any(Object),
        pay_equity_analysis: expect.any(Object)
      });
    });

    it('should receive HR-specific real-time updates', async () => {
      const dashboardResponse = await fetch(`${API_BASE_URL}/api/frontend/dashboard/hr_manager?real_time=true`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(dashboardResponse.status).toBe(200);
      const dashboardData = await dashboardResponse.json();
      
      // CONTRACT: HR real-time channels should be HR-focused
      expect(dashboardData.real_time_updates.update_channels).toEqual(
        expect.arrayContaining([
          'employee_changes',
          'compliance_alerts',
          'training_completions',
          'performance_updates',
          'hiring_activity'
        ])
      );
      
      // Should NOT include financial or security channels
      expect(dashboardData.real_time_updates.update_channels).not.toContain('financial_alerts');
      expect(dashboardData.real_time_updates.update_channels).not.toContain('security_events');
    });
  });

  describe('Employee Management Access', () => {
    it('should access complete employee list with HR-relevant data', async () => {
      // INTEGRATION: Test HR Manager accessing employee list
      const employeesResponse = await fetch(`${API_BASE_URL}/api/v2/employees`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(employeesResponse.status).toBe(200);
      const employeesData = await employeesResponse.json();
      
      // CONTRACT: HR Manager should access all employees
      expect(employeesData.employees).toBeDefined();
      expect(employeesData.employees.length).toBeGreaterThan(0);
      
      // Should include HR-relevant fields
      employeesData.employees.forEach((employee: any) => {
        expect(employee).toMatchObject({
          id: expect.any(String),
          full_name: expect.any(String),
          email: expect.any(String),
          department_id: expect.any(String),
          hire_date: expect.any(String),
          status: expect.any(String),
          role: expect.any(String)
        });
        
        // Should include salary information for HR
        expect(employee.salary).toBeDefined();
        expect(typeof employee.salary).toBe('number');
      });
      
      // Should include HR metadata
      expect(employeesData.hr_metadata).toBeDefined();
      expect(employeesData.hr_metadata).toMatchObject({
        total_employees: expect.any(Number),
        active_employees: expect.any(Number),
        departments_represented: expect.any(Array),
        compliance_overview: expect.any(Object)
      });
    });

    it('should access individual employee details with HR permissions', async () => {
      // Get employee list first to get a valid employee ID
      const employeesResponse = await fetch(`${API_BASE_URL}/api/v2/employees?limit=1`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const employeesData = await employeesResponse.json();
      const testEmployeeId = employeesData.employees[0].id;
      
      // INTEGRATION: Test HR Manager accessing individual employee
      const employeeResponse = await fetch(`${API_BASE_URL}/api/v2/employees/${testEmployeeId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(employeeResponse.status).toBe(200);
      const employeeData = await employeeResponse.json();
      
      // CONTRACT: HR Manager should see complete employee data
      expect(employeeData.employee).toMatchObject({
        id: testEmployeeId,
        email: expect.any(String),
        full_name: expect.any(String),
        hire_date: expect.any(String),
        salary: expect.any(Number), // HR should see salary
        department_id: expect.any(String),
        status: expect.any(String)
      });
      
      // Should include HR-specific metadata
      expect(employeeData.hr_metadata).toMatchObject({
        can_edit: true,
        can_view_salary: true,
        can_manage_roles: true,
        last_hr_update: expect.any(String)
      });
    });

    it('should access employee compliance and training records', async () => {
      const employeesResponse = await fetch(`${API_BASE_URL}/api/v2/employees?limit=1`, {
        headers: { 'Authorization': `Bearer ${hrToken}` }
      });
      const employeesData = await employeesResponse.json();
      const testEmployeeId = employeesData.employees[0].id;
      
      // INTEGRATION: Test HR accessing compliance data
      const complianceResponse = await fetch(`${API_BASE_URL}/api/v2/employees/${testEmployeeId}?include=compliance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(complianceResponse.status).toBe(200);
      const complianceData = await complianceResponse.json();
      
      // CONTRACT: Should include compliance tracking
      expect(complianceData.compliance_records).toBeDefined();
      
      if (complianceData.compliance_records.length > 0) {
        complianceData.compliance_records.forEach((record: any) => {
          expect(record).toMatchObject({
            id: expect.any(String),
            compliance_type: expect.any(String),
            status: expect.stringMatching(/^(Compliant|Non-Compliant|Pending|Expired)$/),
            due_date: expect.any(String),
            notes: expect.any(String)
          });
        });
      }
    });

    it('should filter and search employees with HR-specific criteria', async () => {
      // INTEGRATION: Test HR Manager employee search and filtering
      const searchCriteria = [
        '?status=Active',
        '?department=Engineering',
        '?search=john',
        '?sort_by=hire_date&sort_order=desc',
        '?compliance_status=overdue'
      ];
      
      for (const criteria of searchCriteria) {
        const response = await fetch(`${API_BASE_URL}/api/v2/employees${criteria}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${hrToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.employees).toBeDefined();
        
        // Should include filter metadata
        expect(data.filters_applied).toBeDefined();
      }
    });
  });

  describe('Department Management Access', () => {
    it('should access all departments with HR-relevant information', async () => {
      // INTEGRATION: Test HR Manager accessing departments
      const deptResponse = await fetch(`${API_BASE_URL}/api/v2/departments`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(deptResponse.status).toBe(200);
      const deptData = await deptResponse.json();
      
      // CONTRACT: HR Manager should see all departments
      expect(deptData.departments).toBeDefined();
      
      if (deptData.departments.length > 0) {
        deptData.departments.forEach((dept: any) => {
          expect(dept).toMatchObject({
            id: expect.any(String),
            name: expect.any(String),
            description: expect.any(String),
            manager_id: expect.any(String),
            employee_count: expect.any(Number),
            status: expect.any(String)
          });
          
          // HR should see limited budget information
          if (dept.budget) {
            expect(typeof dept.budget).toBe('number');
          }
          
          // Should NOT see detailed financial data
          expect(dept.cost_center_details).toBeUndefined();
          expect(dept.profit_loss_data).toBeUndefined();
        });
      }
    });

    it('should access department employee distribution analytics', async () => {
      const deptResponse = await fetch(`${API_BASE_URL}/api/v2/departments?include=employee_distribution`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(deptResponse.status).toBe(200);
      const deptData = await deptResponse.json();
      
      // CONTRACT: Should include employee distribution analytics
      if (deptData.departments.length > 0) {
        deptData.departments.forEach((dept: any) => {
          expect(dept.employee_distribution).toMatchObject({
            by_role: expect.any(Object),
            by_seniority: expect.any(Object),
            by_employment_type: expect.any(Object),
            diversity_metrics: expect.any(Object)
          });
        });
      }
    });

    it('should be restricted from budget and financial department data', async () => {
      // Try to access financial department data
      const deptResponse = await fetch(`${API_BASE_URL}/api/v2/departments?include=financial`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(deptResponse.status).toBe(403);
      
      const errorData = await deptResponse.json();
      expect(errorData.message).toContain('financial data access denied');
    });
  });

  describe('HR Query and Analytics Access', () => {
    it('should access HR-specific query templates', async () => {
      // INTEGRATION: Test HR Manager accessing HR queries
      const queriesResponse = await fetch(`${API_BASE_URL}/api/frontend/queries`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(queriesResponse.status).toBe(200);
      const queriesData = await queriesResponse.json();
      
      // CONTRACT: HR Manager should see HR and employee-focused templates
      if (queriesData.query_templates.length > 0) {
        const allowedCategories = ['HR', 'Analytics', 'Operations'];
        queriesData.query_templates.forEach((template: any) => {
          expect(allowedCategories).toContain(template.category);
          
          // Should not see financial templates
          expect(template.category).not.toBe('Finance');
        });
      }
      
      // Should have access to HR-relevant tables
      expect(queriesData.available_tables).toContain('employees');
      expect(queriesData.available_tables).toContain('departments');
      expect(queriesData.available_tables).toContain('compliance_records');
      
      // Should NOT have access to financial tables
      expect(queriesData.available_tables).not.toContain('payroll');
      expect(queriesData.available_tables).not.toContain('budget_allocations');
    });

    it('should create HR-specific custom queries', async () => {
      // INTEGRATION: Test HR Manager creating compliance query
      const hrQuery = {
        name: 'Employee Compliance Tracking',
        description: 'Track employee compliance status and training requirements',
        category: 'HR',
        complexity_level: 'Intermediate',
        table_sources: ['employees', 'compliance_records'],
        query_config: {
          joins: [
            {
              table: 'compliance_records',
              on: 'employees.id = compliance_records.employee_id',
              type: 'LEFT'
            }
          ],
          filters: [
            {
              field: 'employees.is_active',
              operator: 'equals',
              value: true
            }
          ]
        },
        parameters: [
          {
            name: 'compliance_type',
            type: 'select',
            required: false,
            options: ['Safety Training', 'Privacy Policy', 'Code of Conduct']
          }
        ],
        visualization_config: {
          chart_type: 'compliance_dashboard'
        }
      };
      
      const createResponse = await fetch(`${API_BASE_URL}/api/frontend/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(hrQuery)
      });
      
      expect(createResponse.status).toBe(201);
      const createData = await createResponse.json();
      
      // CONTRACT: HR Manager should be able to create HR-category queries
      expect(createData.category).toBe('HR');
      expect(createData.created_by).toMatch(/hr.*manager/i);
    });

    it('should be denied access to financial queries', async () => {
      // Try to create a financial query
      const financialQuery = {
        name: 'Salary Analysis Query',
        category: 'Finance',
        table_sources: ['employees', 'payroll'],
        query_config: {
          filters: [
            {
              field: 'payroll.base_salary',
              operator: 'greater_than',
              value: 50000
            }
          ]
        }
      };
      
      const createResponse = await fetch(`${API_BASE_URL}/api/frontend/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(financialQuery)
      });
      
      expect(createResponse.status).toBe(403);
      
      const errorData = await createResponse.json();
      expect(errorData.error).toBe('insufficient_permissions');
      expect(errorData.message).toContain('Finance category');
    });

    it('should execute HR compliance reports', async () => {
      // INTEGRATION: Test executing pre-built compliance query
      const hrQuery = await fetch(`${API_BASE_URL}/api/frontend/queries?type=compliance_reports`, {
        headers: { 'Authorization': `Bearer ${hrToken}` }
      });
      
      const hrQueryData = await hrQuery.json();
      
      if (hrQueryData.query_templates.length > 0) {
        const complianceTemplate = hrQueryData.query_templates[0];
        
        const executeResponse = await fetch(`${API_BASE_URL}/api/frontend/queries/${complianceTemplate.id}/execute`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hrToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            parameters: {
              compliance_type: 'Safety Training'
            }
          })
        });
        
        expect(executeResponse.status).toBe(200);
        const executeData = await executeResponse.json();
        
        // Should include HR-specific compliance data
        expect(executeData.data).toBeDefined();
        expect(executeData.metadata.data_sources_accessed).toContain('compliance_records');
      }
    });
  });

  describe('Form Validation and Data Management', () => {
    it('should validate employee creation with HR permissions', async () => {
      // INTEGRATION: Test HR Manager creating new employee
      const newEmployeeData = {
        personal_info: {
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.smith@company.com',
          phone: '+1-555-123-4567'
        },
        employment_info: {
          hire_date: '2024-03-01',
          department_id: 'dept-marketing',
          position: 'Marketing Manager',
          salary: 80000, // HR Manager should be able to set salary
          employment_type: 'Full-time'
        }
      };
      
      const validationResponse = await fetch(`${API_BASE_URL}/api/frontend/validate/employee`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: newEmployeeData,
          validation_context: 'create'
        })
      });
      
      expect(validationResponse.status).toBe(200);
      const validationData = await validationResponse.json();
      
      // CONTRACT: HR Manager should validate salary and sensitive data
      expect(validationData.field_validations.employment_info.salary).toMatchObject({
        field: 'salary',
        is_valid: true,
        access_granted: true,
        role_permission: 'hr_manager_salary_access'
      });
    });

    it('should validate department creation with HR scope', async () => {
      const departmentData = {
        basic_info: {
          name: 'Customer Success',
          description: 'Customer success and support department'
        },
        organizational: {
          parent_department_id: 'dept-sales',
          manager_id: 'mgr-456'
          // Note: No budget_allocation - HR Manager cannot set budgets
        }
      };
      
      const validationResponse = await fetch(`${API_BASE_URL}/api/frontend/validate/department`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: departmentData,
          validation_context: 'create'
        })
      });
      
      expect(validationResponse.status).toBe(200);
      const validationData = await validationResponse.json();
      
      // Should be able to validate organizational structure
      expect(validationData.field_validations.basic_info.name.is_valid).toBe(true);
      expect(validationData.field_validations.organizational.manager_id.is_valid).toBe(true);
    });

    it('should be restricted from budget-related validations', async () => {
      const departmentWithBudget = {
        basic_info: {
          name: 'HR Operations'
        },
        organizational: {
          budget_allocation: 200000, // HR Manager should not access budget
          cost_center: 'CC-HR-001'
        }
      };
      
      const validationResponse = await fetch(`${API_BASE_URL}/api/frontend/validate/department`, {
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
      
      expect(validationResponse.status).toBe(200);
      const validationData = await validationResponse.json();
      
      // Should be restricted from budget fields
      expect(validationData.field_validations.organizational.budget_allocation).toMatchObject({
        field: 'budget_allocation',
        is_valid: false,
        access_granted: false,
        error_code: 'FIELD_ACCESS_DENIED'
      });
    });
  });

  describe('Performance Reviews and Compliance', () => {
    it('should validate performance reviews with HR oversight', async () => {
      const performanceReviewData = {
        review_info: {
          employee_id: 'emp-123',
          reviewer_id: 'mgr-456',
          review_period: '2024-Q1',
          review_type: 'quarterly'
        },
        ratings: {
          overall_performance: 4.2,
          technical_skills: 4.5,
          communication: 4.0
        },
        hr_notes: {
          performance_improvement_plan: false,
          promotion_recommended: true,
          salary_adjustment_recommended: 5.0 // HR can recommend salary changes
        }
      };
      
      const validationResponse = await fetch(`${API_BASE_URL}/api/frontend/validate/performance_review`, {
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
      
      expect(validationResponse.status).toBe(200);
      const validationData = await validationResponse.json();
      
      // HR Manager should be able to add HR-specific notes
      expect(validationData.field_validations.hr_notes).toBeDefined();
      expect(validationData.field_validations.hr_notes.salary_adjustment_recommended.access_granted).toBe(true);
    });
  });

  describe('Authentication and Role Verification', () => {
    it('should maintain HR Manager authentication state', async () => {
      const verifyResponse = await fetch(`${API_BASE_URL}/api/v2/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(verifyResponse.status).toBe(200);
      const verifyData = await verifyResponse.json();
      
      // Should return HR Manager context
      expect(verifyData.user.id).toBe(hrContext.id);
      expect(verifyData.user.roles.find((r: Role) => r.name === 'HR_Manager')).toBeDefined();
      
      // Should include HR-specific permissions
      expect(verifyData.permissions).toEqual(
        expect.arrayContaining([
          'employees:read',
          'employees:write',
          'departments:read',
          'compliance:read',
          'analytics:read'
        ])
      );
      
      // Should NOT include financial permissions
      expect(verifyData.permissions).not.toContain('finance:read');
      expect(verifyData.permissions).not.toContain('payroll:*');
    });

    it('should be denied access to admin-only functions', async () => {
      // Try to access admin dashboard
      const adminDashResponse = await fetch(`${API_BASE_URL}/api/frontend/dashboard/admin`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(adminDashResponse.status).toBe(403);
    });

    it('should access employee dashboard but with HR capabilities', async () => {
      // HR Manager should also access employee dashboard
      const empDashResponse = await fetch(`${API_BASE_URL}/api/frontend/dashboard/employee`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(empDashResponse.status).toBe(200);
      
      const empDashData = await empDashResponse.json();
      expect(empDashData.role).toBe('employee');
      
      // But should still have HR-level customization options
      expect(empDashData.customization_options.can_add_widgets).toBe(true);
    });
  });

  describe('Performance and Security', () => {
    it('should handle concurrent HR operations efficiently', async () => {
      // Test concurrent access to HR-specific endpoints
      const concurrentRequests = [
        fetch(`${API_BASE_URL}/api/v2/employees?limit=5`, {
          headers: { 'Authorization': `Bearer ${hrToken}` }
        }),
        fetch(`${API_BASE_URL}/api/v2/departments`, {
          headers: { 'Authorization': `Bearer ${hrToken}` }
        }),
        fetch(`${API_BASE_URL}/api/frontend/dashboard/hr_manager`, {
          headers: { 'Authorization': `Bearer ${hrToken}` }
        }),
        fetch(`${API_BASE_URL}/api/frontend/queries?category=HR`, {
          headers: { 'Authorization': `Bearer ${hrToken}` }
        })
      ];
      
      const responses = await Promise.all(concurrentRequests);
      
      // All HR operations should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should maintain data privacy for sensitive employee information', async () => {
      // Test that HR access includes appropriate data masking
      const employeeResponse = await fetch(`${API_BASE_URL}/api/v2/employees?include=sensitive`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(employeeResponse.status).toBe(200);
      const employeeData = await employeeResponse.json();
      
      // Should include privacy controls metadata
      expect(employeeData.metadata.privacy_controls).toBeDefined();
      expect(employeeData.metadata.privacy_controls.data_masking_applied).toBe(true);
      
      // Sensitive fields should be partially masked even for HR
      if (employeeData.employees.length > 0) {
        const employee = employeeData.employees[0];
        if (employee.social_security_number) {
          expect(employee.social_security_number).toMatch(/\*\*\*-\*\*-\d{4}/);
        }
      }
    });

    it('should implement appropriate rate limiting for HR operations', async () => {
      // Test rate limiting for employee data access
      const rapidRequests = Array(12).fill(null).map(() =>
        fetch(`${API_BASE_URL}/api/v2/employees?no_cache=true&timestamp=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${hrToken}`,
            'Content-Type': 'application/json'
          }
        })
      );
      
      const responses = await Promise.all(rapidRequests);
      
      // Should have some rate limiting but be more lenient than employee limits
      const rateLimited = responses.filter(r => r.status === 429);
      const successful = responses.filter(r => r.status === 200);
      
      // HR Manager should have higher limits than employees
      expect(successful.length).toBeGreaterThan(8);
      expect(rateLimited.length).toBeLessThan(4);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid employee IDs in HR context', async () => {
      const invalidResponse = await fetch(`${API_BASE_URL}/api/v2/employees/invalid-hr-employee-id`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(invalidResponse.status).toBe(404);
      
      const errorData = await invalidResponse.json();
      expect(errorData.error).toBe('employee_not_found');
    });

    it('should gracefully handle department access edge cases', async () => {
      // Test accessing non-existent department
      const invalidDeptResponse = await fetch(`${API_BASE_URL}/api/v2/departments/nonexistent-dept`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(invalidDeptResponse.status).toBe(404);
    });

    it('should handle complex query failures gracefully', async () => {
      // Test malformed query creation
      const malformedQuery = {
        name: 'Malformed HR Query',
        table_sources: [], // Empty sources
        query_config: {
          joins: [{ invalid: 'join' }]
        }
      };
      
      const createResponse = await fetch(`${API_BASE_URL}/api/frontend/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(malformedQuery)
      });
      
      expect(createResponse.status).toBe(400);
      
      const errorData = await createResponse.json();
      expect(errorData.error).toBe('validation_failed');
      expect(errorData.validation_errors).toBeDefined();
    });
  });
});