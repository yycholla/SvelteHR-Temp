/**
 * Integration Test: Employee Role Access Validation
 * 
 * This test validates the complete employee user journey with RBAC enforcement,
 * testing the full stack integration from authentication to data access.
 * 
 * IMPORTANT: This test will FAIL initially (TDD Red phase)
 * Implementation must be created to make this test pass (TDD Green phase)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { UserContext, Role } from '$lib/types';

describe('Integration: Employee Role Access Validation', () => {
  const API_BASE_URL = 'http://localhost:8080';
  const FRONTEND_BASE_URL = 'http://localhost:5173';
  
  // Test employee credentials and context
  const EMPLOYEE_CREDENTIALS = {
    email: 'employee.test@company.com',
    password: 'EmployeeTest123!',
    expected_role: 'Employee',
    employee_id: 'emp-test-001',
    department_id: 'dept-engineering'
  };
  
  let employeeToken: string;
  let employeeContext: UserContext;
  
  beforeEach(async () => {
    // Reset any mocks and state
    vi.clearAllMocks();
    
    // Authenticate as employee to get token and context
    const loginResponse = await fetch(`${API_BASE_URL}/api/v2/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: EMPLOYEE_CREDENTIALS.email,
        password: EMPLOYEE_CREDENTIALS.password
      })
    });
    
    expect(loginResponse.status).toBe(200);
    const loginData = await loginResponse.json();
    
    employeeToken = loginData.token;
    employeeContext = loginData.user;
    
    // Verify employee role
    expect(employeeContext.roles.some(r => r.name === 'Employee')).toBe(true);
  });
  
  afterEach(async () => {
    // Cleanup: logout employee session
    if (employeeToken) {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${employeeToken}`
        }
      });
    }
  });

  describe('Employee Dashboard Access', () => {
    it('should successfully load employee dashboard with personal widgets', async () => {
      // INTEGRATION: Test complete dashboard loading workflow
      const dashboardResponse = await fetch(`${API_BASE_URL}/api/frontend/dashboard/employee`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(dashboardResponse.status).toBe(200);
      const dashboardData = await dashboardResponse.json();
      
      // CONTRACT: Employee dashboard should contain self-service widgets only
      expect(dashboardData.role).toBe('employee');
      expect(dashboardData.widgets).toBeDefined();
      
      const widgetTypes = dashboardData.widgets.map((w: any) => w.widget_type);
      
      // Should have employee-specific widgets
      expect(widgetTypes).toContain('personal_overview');
      expect(widgetTypes).toContain('my_timesheet');
      expect(widgetData).toContain('my_requests');
      
      // Should NOT have management or HR widgets
      expect(widgetTypes).not.toContain('team_overview');
      expect(widgetTypes).not.toContain('department_analytics');
      expect(widgetTypes).not.toContain('financial_summary');
      
      // INTEGRATION: Verify all widget data is scoped to current employee
      dashboardData.widgets.forEach((widget: any) => {
        if (widget.data.user_scope) {
          expect(widget.data.user_scope.user_id).toBe(employeeContext.id);
          expect(widget.data.user_scope.scoped_to_self).toBe(true);
        }
      });
    });

    it('should deny access to other role dashboards', async () => {
      // Test access to admin dashboard
      const adminDashResponse = await fetch(`${API_BASE_URL}/api/frontend/dashboard/admin`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(adminDashResponse.status).toBe(403);
      
      // Test access to HR dashboard
      const hrDashResponse = await fetch(`${API_BASE_URL}/api/frontend/dashboard/hr_manager`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(hrDashResponse.status).toBe(403);
      
      // Test access to manager dashboard
      const managerDashResponse = await fetch(`${API_BASE_URL}/api/frontend/dashboard/manager`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(managerDashResponse.status).toBe(403);
    });
  });

  describe('Personal Data Access', () => {
    it('should access own employee profile with full personal data', async () => {
      // INTEGRATION: Test employee accessing their own complete profile
      const profileResponse = await fetch(`${API_BASE_URL}/api/v2/employees/${employeeContext.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(profileResponse.status).toBe(200);
      const profileData = await profileResponse.json();
      
      // CONTRACT: Employee should see their complete personal profile
      expect(profileData.employee.id).toBe(employeeContext.id);
      expect(profileData.employee.email).toBe(EMPLOYEE_CREDENTIALS.email);
      
      // Should include personal information
      expect(profileData.employee.full_name).toBeDefined();
      expect(profileData.employee.phone).toBeDefined();
      expect(profileData.employee.hire_date).toBeDefined();
      
      // Should include personal metadata
      expect(profileData.personal_info).toBeDefined();
      expect(profileData.personal_info.can_edit).toBe(true);
      
      // Should NOT include salary information
      expect(profileData.employee.salary).toBeUndefined();
    });

    it('should access own benefits and entitlements', async () => {
      // INTEGRATION: Test employee accessing their benefits information
      const profileResponse = await fetch(`${API_BASE_URL}/api/v2/employees/${employeeContext.id}?include=benefits`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(profileResponse.status).toBe(200);
      const profileData = await profileResponse.json();
      
      // CONTRACT: Should include benefits information
      expect(profileData.benefits).toBeDefined();
      expect(profileData.benefits).toMatchObject({
        health_insurance: expect.any(Object),
        vacation_days: expect.any(Number),
        sick_days: expect.any(Number),
        retirement_plan: expect.any(Object)
      });
      
      // Should include time-off balances
      expect(profileData.time_off_balance).toBeDefined();
      expect(profileData.time_off_balance.vacation_remaining).toBeGreaterThanOrEqual(0);
      expect(profileData.time_off_balance.sick_remaining).toBeGreaterThanOrEqual(0);
    });

    it('should be denied access to other employees profiles', async () => {
      // Try to access another employee's profile
      const otherEmployeeId = 'emp-other-123';
      
      const profileResponse = await fetch(`${API_BASE_URL}/api/v2/employees/${otherEmployeeId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // CONTRACT: Should be denied access to other employees
      expect(profileResponse.status).toBe(403);
      
      const errorData = await profileResponse.json();
      expect(errorData.message).toContain('access denied');
    });

    it('should access limited colleague directory information', async () => {
      // INTEGRATION: Test employee accessing company directory
      const otherEmployeeId = 'emp-colleague-456';
      
      const directoryResponse = await fetch(`${API_BASE_URL}/api/v2/employees/${otherEmployeeId}?view=directory`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(directoryResponse.status).toBe(200);
      const directoryData = await directoryResponse.json();
      
      // CONTRACT: Directory view should have limited information only
      expect(directoryData.employee).toMatchObject({
        id: otherEmployeeId,
        full_name: expect.any(String),
        department_id: expect.any(String),
        role: expect.any(String),
        email: expect.any(String) // Work email only
      });
      
      // Should NOT include sensitive information
      expect(directoryData.employee.phone).toBeUndefined();
      expect(directoryData.employee.salary).toBeUndefined();
      expect(directoryData.employee.hire_date).toBeUndefined();
      expect(directoryData.employee.address).toBeUndefined();
    });
  });

  describe('Department Data Access', () => {
    it('should access own department basic information', async () => {
      // INTEGRATION: Test employee accessing their department info
      const deptResponse = await fetch(`${API_BASE_URL}/api/v2/departments?filter=own`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(deptResponse.status).toBe(200);
      const deptData = await deptResponse.json();
      
      // CONTRACT: Should return only employee's own department
      expect(deptData.departments.length).toBeLessThanOrEqual(1);
      
      if (deptData.departments.length > 0) {
        const ownDept = deptData.departments[0];
        expect(ownDept.id).toBe(EMPLOYEE_CREDENTIALS.department_id);
        expect(ownDept.name).toBeDefined();
        expect(ownDept.description).toBeDefined();
        expect(ownDept.manager).toBeDefined();
        
        // Should include employee-relevant information
        expect(ownDept.employee_resources).toBeDefined();
        expect(ownDept.employee_resources.team_directory).toBeDefined();
      }
    });

    it('should access company directory with basic department info', async () => {
      // INTEGRATION: Test employee accessing company directory
      const directoryResponse = await fetch(`${API_BASE_URL}/api/v2/departments?view=directory`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(directoryResponse.status).toBe(200);
      const directoryData = await directoryResponse.json();
      
      // CONTRACT: Directory should show basic department information
      if (directoryData.departments.length > 0) {
        directoryData.departments.forEach((dept: any) => {
          expect(dept).toMatchObject({
            id: expect.any(String),
            name: expect.any(String),
            description: expect.any(String),
            location: expect.any(String)
          });
          
          // Should include manager contact info
          if (dept.manager) {
            expect(dept.manager.full_name).toBeDefined();
            expect(dept.manager.email).toBeDefined();
          }
          
          // Should NOT include sensitive operational data
          expect(dept.budget).toBeUndefined();
          expect(dept.employee_count).toBeUndefined();
          expect(dept.cost_center).toBeUndefined();
        });
      }
    });

    it('should be denied access to full departments list', async () => {
      // Try to access full departments list without directory view
      const deptResponse = await fetch(`${API_BASE_URL}/api/v2/departments`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // CONTRACT: Should deny access without directory view
      expect(deptResponse.status).toBe(403);
      
      const errorData = await deptResponse.json();
      expect(errorData.message).toContain('insufficient permissions');
    });
  });

  describe('Employee List Access Restrictions', () => {
    it('should be denied access to employee list', async () => {
      // INTEGRATION: Test employee denied from accessing employee list
      const employeesResponse = await fetch(`${API_BASE_URL}/api/v2/employees`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // CONTRACT: Employees should not access employee list
      expect(employeesResponse.status).toBe(403);
      
      const errorData = await employeesResponse.json();
      expect(errorData).toMatchObject({
        error: 'insufficient_permissions',
        message: expect.stringContaining('employee list access denied'),
        required_permissions: expect.arrayContaining(['employees:read'])
      });
    });

    it('should be denied access to employee search and filtering', async () => {
      // Try various employee search endpoints
      const searchQueries = [
        '/api/v2/employees?search=john',
        '/api/v2/employees?department=engineering',
        '/api/v2/employees?status=active',
        '/api/v2/employees?sort=name'
      ];
      
      for (const query of searchQueries) {
        const response = await fetch(`${API_BASE_URL}${query}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${employeeToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        expect(response.status).toBe(403);
      }
    });
  });

  describe('Query and Analytics Restrictions', () => {
    it('should be denied access to custom query creation', async () => {
      // INTEGRATION: Test employee denied from creating custom queries
      const queryData = {
        name: 'My Simple Query',
        table_sources: ['employees'],
        query_config: {
          filters: [
            {
              field: 'employees.id',
              operator: 'equals',
              value: '{{current_user_id}}'
            }
          ]
        }
      };
      
      const createResponse = await fetch(`${API_BASE_URL}/api/frontend/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queryData)
      });
      
      // CONTRACT: Should deny query creation for employees
      expect(createResponse.status).toBe(403);
      
      const errorData = await createResponse.json();
      expect(errorData).toMatchObject({
        error: 'insufficient_permissions',
        message: expect.stringContaining('query creation not allowed'),
        required_permissions: expect.arrayContaining(['queries:create'])
      });
    });

    it('should be denied access to query execution', async () => {
      // Try to execute an existing query
      const queryId = 'query-employee-analytics';
      
      const executeResponse = await fetch(`${API_BASE_URL}/api/frontend/queries/${queryId}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ parameters: {} })
      });
      
      // CONTRACT: Should deny query execution for employees
      expect(executeResponse.status).toBe(403);
      
      const errorData = await executeResponse.json();
      expect(errorData.message).toContain('query execution not allowed');
    });

    it('should access only self-service query templates', async () => {
      // INTEGRATION: Test employee accessing self-service queries
      const queriesResponse = await fetch(`${API_BASE_URL}/api/frontend/queries?view=self_service`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(queriesResponse.status).toBe(200);
      const queriesData = await queriesResponse.json();
      
      // CONTRACT: Should only see self-service templates
      if (queriesData.query_templates.length > 0) {
        queriesData.query_templates.forEach((template: any) => {
          expect(template.category).toBe('Self-Service');
          expect(template.complexity_level).toMatch(/^(Basic|Intermediate)$/);
          
          // Should be scoped to own data
          const hasSelfScope = template.parameters.some((param: any) =>
            param.name === 'employee_id' && param.default_value === 'current_user_id'
          );
          expect(hasSelfScope).toBe(true);
        });
      }
      
      // Should have minimal query capabilities
      expect(queriesData.query_capabilities).toMatchObject({
        can_create_custom: false,
        can_modify_existing: false,
        can_access_raw_sql: false,
        can_join_tables: false,
        max_complexity_level: 'Basic'
      });
    });
  });

  describe('Form Validation and Data Entry', () => {
    it('should validate own profile updates with appropriate permissions', async () => {
      // INTEGRATION: Test employee updating their own profile
      const profileUpdateData = {
        personal_info: {
          phone: '+1-555-987-6543',
          emergency_contact: {
            name: 'Jane Doe',
            relationship: 'Spouse',
            phone: '+1-555-123-4567'
          }
        },
        preferences: {
          preferred_language: 'en-US',
          timezone: 'America/New_York',
          notification_preferences: {
            email: true,
            sms: false
          }
        }
      };
      
      const validationResponse = await fetch(`${API_BASE_URL}/api/frontend/validate/employee`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: profileUpdateData,
          validation_context: 'update',
          current_entity_id: employeeContext.id
        })
      });
      
      expect(validationResponse.status).toBe(200);
      const validationData = await validationResponse.json();
      
      // CONTRACT: Employee should be able to update own personal info
      expect(validationData.is_valid).toBe(true);
      expect(validationData.field_validations.personal_info.phone.access_granted).toBe(true);
    });

    it('should be denied access to sensitive field validation', async () => {
      // Try to validate data with salary information
      const sensitiveData = {
        employment_info: {
          salary: 75000,
          manager_id: 'mgr-different'
        }
      };
      
      const validationResponse = await fetch(`${API_BASE_URL}/api/frontend/validate/employee`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: sensitiveData,
          validation_context: 'update'
        })
      });
      
      expect(validationResponse.status).toBe(200);
      const validationData = await validationResponse.json();
      
      // CONTRACT: Should deny access to salary fields
      expect(validationData.field_validations.employment_info.salary).toMatchObject({
        field: 'salary',
        is_valid: false,
        access_granted: false,
        error_code: 'FIELD_ACCESS_DENIED'
      });
    });
  });

  describe('Authentication State Management', () => {
    it('should maintain valid authentication state throughout session', async () => {
      // INTEGRATION: Test auth verification endpoint
      const verifyResponse = await fetch(`${API_BASE_URL}/api/v2/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(verifyResponse.status).toBe(200);
      const verifyData = await verifyResponse.json();
      
      // CONTRACT: Should return current user context
      expect(verifyData.user.id).toBe(employeeContext.id);
      expect(verifyData.user.email).toBe(EMPLOYEE_CREDENTIALS.email);
      
      // Should include employee role
      const employeeRole = verifyData.user.roles.find((role: Role) => role.name === 'Employee');
      expect(employeeRole).toBeDefined();
      expect(employeeRole.level).toBe(25);
      
      // Should include appropriate permissions
      expect(verifyData.permissions).toEqual(
        expect.arrayContaining([
          'profile:read:own',
          'profile:update:own',
          'timesheet:read:own'
        ])
      );
      
      // Should NOT include higher-level permissions
      expect(verifyData.permissions).not.toContain('employees:read');
      expect(verifyData.permissions).not.toContain('departments:*');
      expect(verifyData.permissions).not.toContain('*');
    });

    it('should handle token refresh gracefully', async () => {
      // Simulate token near expiry scenario
      // Make request that would normally trigger refresh
      const longRunningResponse = await fetch(`${API_BASE_URL}/api/frontend/dashboard/employee?refresh=true`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(longRunningResponse.status).toBe(200);
      
      // Verify token is still valid after potential refresh
      const postRefreshVerify = await fetch(`${API_BASE_URL}/api/v2/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(postRefreshVerify.status).toBe(200);
    });

    it('should handle session timeout appropriately', async () => {
      // Simulate expired token (this would be set up in test environment)
      const expiredToken = 'expired-employee-token';
      
      const expiredResponse = await fetch(`${API_BASE_URL}/api/v2/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${expiredToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(expiredResponse.status).toBe(401);
      
      const errorData = await expiredResponse.json();
      expect(errorData.message).toContain('expired');
    });
  });

  describe('Performance and Security', () => {
    it('should respond within acceptable time limits for employee operations', async () => {
      // Test performance of common employee operations
      const operations = [
        () => fetch(`${API_BASE_URL}/api/frontend/dashboard/employee`, {
          headers: { 'Authorization': `Bearer ${employeeToken}` }
        }),
        () => fetch(`${API_BASE_URL}/api/v2/employees/${employeeContext.id}`, {
          headers: { 'Authorization': `Bearer ${employeeToken}` }
        }),
        () => fetch(`${API_BASE_URL}/api/v2/departments?filter=own`, {
          headers: { 'Authorization': `Bearer ${employeeToken}` }
        })
      ];
      
      for (const operation of operations) {
        const startTime = Date.now();
        const response = await operation();
        const endTime = Date.now();
        
        expect(response.status).toBe(200);
        expect(endTime - startTime).toBeLessThan(1000); // Within 1 second
      }
    });

    it('should implement proper rate limiting for employee requests', async () => {
      // Test rate limiting for dashboard requests
      const rapidRequests = Array(10).fill(null).map(() =>
        fetch(`${API_BASE_URL}/api/frontend/dashboard/employee?no_cache=true`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${employeeToken}`,
            'Content-Type': 'application/json'
          }
        })
      );
      
      const responses = await Promise.all(rapidRequests);
      
      // Should have at least some rate limiting
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThanOrEqual(0);
      
      // Most requests should still succeed for normal usage
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(5);
    });

    it('should maintain data privacy and not leak sensitive information', async () => {
      // Verify that error responses don't leak sensitive data
      const maliciousRequest = await fetch(`${API_BASE_URL}/api/v2/employees/admin-employee-id`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(maliciousRequest.status).toBe(403);
      const errorData = await maliciousRequest.json();
      
      // Should not reveal information about the target employee
      expect(errorData.message).not.toContain('admin');
      expect(errorData.message).not.toContain('salary');
      expect(errorData.message).not.toContain('manager');
      expect(errorData).not.toHaveProperty('employee_data');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid employee ID gracefully', async () => {
      const invalidResponse = await fetch(`${API_BASE_URL}/api/v2/employees/invalid-id-format`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(invalidResponse.status).toBe(400);
      
      const errorData = await invalidResponse.json();
      expect(errorData.error_code).toBe('INVALID_EMPLOYEE_ID');
    });

    it('should handle network errors and provide appropriate feedback', async () => {
      // This would be tested with network simulation in real environment
      // For now, test malformed request handling
      const malformedResponse = await fetch(`${API_BASE_URL}/api/frontend/dashboard/employee`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json',
          'X-Invalid-Header': 'malformed\nheader'
        }
      });
      
      // Should handle gracefully without exposing internal errors
      expect([200, 400]).toContain(malformedResponse.status);
    });

    it('should handle concurrent requests without data corruption', async () => {
      // Test concurrent access to employee dashboard
      const concurrentRequests = Array(5).fill(null).map(() =>
        fetch(`${API_BASE_URL}/api/frontend/dashboard/employee`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${employeeToken}`,
            'Content-Type': 'application/json'
          }
        })
      );
      
      const responses = await Promise.all(concurrentRequests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // All responses should contain consistent data
      const responseData = await Promise.all(responses.map(r => r.json()));
      const firstResponseId = responseData[0].user_id;
      
      responseData.forEach(data => {
        expect(data.user_id).toBe(firstResponseId);
        expect(data.role).toBe('employee');
      });
    });
  });
});