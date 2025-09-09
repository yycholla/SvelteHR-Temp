/**
 * Contract Test: Custom Queries API
 * 
 * This test defines the contract for GET /api/frontend/queries endpoint
 * Used for customizable data queries with visualization support and RBAC filtering
 * 
 * IMPORTANT: This test will FAIL initially (TDD Red phase)
 * Implementation must be created to make this test pass (TDD Green phase)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { UserContext, Role } from '$lib/types';

describe('Contract: GET /api/frontend/queries', () => {
  const API_BASE_URL = 'http://localhost:8080/api/frontend';
  
  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks();
  });

  describe('Admin Role - Full Query Access', () => {
    it('should return all available query templates with full access', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // CONTRACT: Must return 200 OK for admin access
      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      // CONTRACT: Response must contain query templates and capabilities
      expect(data).toMatchObject({
        query_templates: expect.any(Array),
        available_tables: expect.any(Array),
        visualization_types: expect.any(Array),
        query_capabilities: expect.any(Object)
      });
      
      // CONTRACT: Admin should see all query templates
      if (data.query_templates.length > 0) {
        data.query_templates.forEach((template: any) => {
          expect(template).toMatchObject({
            id: expect.any(String),
            name: expect.any(String),
            description: expect.any(String),
            category: expect.stringMatching(/^(HR|Finance|Operations|Analytics|Custom)$/),
            required_permissions: expect.any(Array),
            table_sources: expect.any(Array),
            parameters: expect.any(Array),
            visualization_config: expect.any(Object),
            created_by: expect.any(String),
            is_public: expect.any(Boolean),
            complexity_level: expect.stringMatching(/^(Basic|Intermediate|Advanced|Expert)$/)
          });
          
          // CONTRACT: Should include parameter definitions
          template.parameters.forEach((param: any) => {
            expect(param).toMatchObject({
              name: expect.any(String),
              type: expect.stringMatching(/^(string|number|date|boolean|array|select)$/),
              required: expect.any(Boolean),
              default_value: expect.anything(),
              validation_rules: expect.any(Object)
            });
          });
        });
      }
      
      // CONTRACT: Admin should see all available tables
      expect(data.available_tables).toContain('employees');
      expect(data.available_tables).toContain('departments');
      expect(data.available_tables).toContain('roles');
      expect(data.available_tables).toContain('permissions');
      expect(data.available_tables).toContain('performance_reviews');
      expect(data.available_tables).toContain('payroll');
      expect(data.available_tables).toContain('compliance_records');
    });

    it('should support advanced query builder capabilities for admin', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const response = await fetch(`${API_BASE_URL}/queries?include=builder_capabilities`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should include advanced query builder features
      expect(data.query_capabilities).toMatchObject({
        can_create_custom: true,
        can_modify_existing: true,
        can_access_raw_sql: true,
        can_join_tables: true,
        max_complexity_level: 'Expert',
        available_functions: expect.any(Array),
        supported_aggregations: expect.any(Array)
      });
      
      // CONTRACT: Should support complex visualization types
      expect(data.visualization_types).toContain('custom_dashboard');
      expect(data.visualization_types).toContain('pivot_table');
      expect(data.visualization_types).toContain('heat_map');
      expect(data.visualization_types).toContain('trend_analysis');
      expect(data.visualization_types).toContain('correlation_matrix');
    });

    it('should return financial and sensitive query templates for admin', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const response = await fetch(`${API_BASE_URL}/queries?category=Finance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Admin should access financial query templates
      if (data.query_templates.length > 0) {
        data.query_templates.forEach((template: any) => {
          expect(template.category).toBe('Finance');
          expect(template.required_permissions).toContain('finance:read');
        });
      }
      
      // CONTRACT: Should include sensitive data sources
      expect(data.available_tables).toContain('payroll');
      expect(data.available_tables).toContain('budget_allocations');
      expect(data.available_tables).toContain('cost_centers');
    });
  });

  describe('HR Manager Role - HR-Focused Query Access', () => {
    it('should return HR-specific query templates', async () => {
      const hrToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.hrmanager.token';
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: HR Manager should see HR and employee-focused templates
      expect(data.query_templates).toBeDefined();
      
      if (data.query_templates.length > 0) {
        const allowedCategories = ['HR', 'Analytics', 'Operations'];
        data.query_templates.forEach((template: any) => {
          expect(allowedCategories).toContain(template.category);
          
          // CONTRACT: Should not see financial templates
          expect(template.category).not.toBe('Finance');
          
          // CONTRACT: Required permissions should match HR scope
          const hasHRPermission = template.required_permissions.some((perm: string) =>
            perm.startsWith('employees:') || perm.startsWith('departments:') || 
            perm.startsWith('hr:') || perm.startsWith('analytics:')
          );
          expect(hasHRPermission).toBe(true);
        });
      }
      
      // CONTRACT: Should have access to HR-relevant tables
      expect(data.available_tables).toContain('employees');
      expect(data.available_tables).toContain('departments');
      expect(data.available_tables).toContain('performance_reviews');
      expect(data.available_tables).toContain('compliance_records');
      
      // CONTRACT: Should NOT have access to financial tables
      expect(data.available_tables).not.toContain('payroll');
      expect(data.available_tables).not.toContain('budget_allocations');
    });

    it('should support HR analytics and reporting capabilities', async () => {
      const hrToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.hrmanager.token';
      
      const response = await fetch(`${API_BASE_URL}/queries?include=hr_analytics`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should include HR-specific analytics capabilities
      expect(data.query_capabilities).toMatchObject({
        can_create_custom: true,
        can_modify_existing: true,
        can_access_raw_sql: false,
        can_join_tables: true,
        max_complexity_level: 'Advanced',
        hr_specific_functions: expect.any(Array)
      });
      
      // CONTRACT: Should support HR-focused visualizations
      expect(data.visualization_types).toContain('employee_dashboard');
      expect(data.visualization_types).toContain('department_comparison');
      expect(data.visualization_types).toContain('performance_metrics');
      expect(data.visualization_types).toContain('compliance_tracking');
    });

    it('should provide pre-built HR compliance query templates', async () => {
      const hrToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.hrmanager.token';
      
      const response = await fetch(`${API_BASE_URL}/queries?type=compliance_reports`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should include compliance-specific templates
      if (data.query_templates.length > 0) {
        const complianceTemplates = data.query_templates.filter((t: any) => 
          t.name.toLowerCase().includes('compliance') || 
          t.description.toLowerCase().includes('compliance')
        );
        
        expect(complianceTemplates.length).toBeGreaterThan(0);
        
        complianceTemplates.forEach((template: any) => {
          expect(template.table_sources).toContain('compliance_records');
          expect(template.required_permissions).toContain('compliance:read');
        });
      }
    });
  });

  describe('Manager Role - Department-Scoped Query Access', () => {
    it('should return department-focused query templates', async () => {
      const managerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.manager.token';
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Manager should see team and operations focused templates
      if (data.query_templates.length > 0) {
        data.query_templates.forEach((template: any) => {
          const allowedCategories = ['Operations', 'Analytics'];
          expect(allowedCategories).toContain(template.category);
          
          // CONTRACT: Should not access HR or Finance templates
          expect(template.category).not.toBe('HR');
          expect(template.category).not.toBe('Finance');
          
          // CONTRACT: Templates should be scoped to department level
          const hasDepartmentScope = template.parameters.some((param: any) =>
            param.name === 'department_id' && param.required === true
          );
          if (template.table_sources.includes('employees')) {
            expect(hasDepartmentScope).toBe(true);
          }
        });
      }
      
      // CONTRACT: Should have limited table access
      expect(data.available_tables).toContain('employees');
      expect(data.available_tables).toContain('departments');
      
      // CONTRACT: Should NOT access sensitive tables
      expect(data.available_tables).not.toContain('roles');
      expect(data.available_tables).not.toContain('permissions');
      expect(data.available_tables).not.toContain('payroll');
    });

    it('should enforce department-scoped query parameters', async () => {
      const managerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.manager.token';
      
      const response = await fetch(`${API_BASE_URL}/queries?include=parameter_constraints`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should include parameter constraints for managers
      expect(data.query_capabilities).toMatchObject({
        can_create_custom: false,
        can_modify_existing: false,
        can_access_raw_sql: false,
        can_join_tables: false,
        max_complexity_level: 'Intermediate',
        enforced_filters: expect.any(Array)
      });
      
      // CONTRACT: Should enforce department filtering
      expect(data.query_capabilities.enforced_filters).toContainEqual({
        field: 'department_id',
        operator: 'equals',
        value: 'user_department_id',
        immutable: true
      });
    });

    it('should provide team performance query templates', async () => {
      const managerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.manager.token';
      
      const response = await fetch(`${API_BASE_URL}/queries?type=team_performance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should include team-focused performance templates
      if (data.query_templates.length > 0) {
        data.query_templates.forEach((template: any) => {
          expect(template.name.toLowerCase()).toMatch(/team|performance|productivity/);
          expect(template.table_sources).toContain('employees');
          
          // CONTRACT: Should include team performance visualizations
          expect(template.visualization_config.chart_types).toContain('team_metrics');
        });
      }
    });
  });

  describe('Employee Role - Self-Service Query Access', () => {
    it('should return basic self-service query templates', async () => {
      const employeeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.employee.token';
      
      const response = await fetch(`${API_BASE_URL}/queries?view=self_service`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Employee should see only self-service templates
      if (data.query_templates.length > 0) {
        data.query_templates.forEach((template: any) => {
          expect(template.category).toBe('Self-Service');
          expect(template.complexity_level).toMatch(/^(Basic|Intermediate)$/);
          
          // CONTRACT: Should be scoped to own data
          const hasSelfScope = template.parameters.some((param: any) =>
            param.name === 'employee_id' && param.default_value === 'current_user_id'
          );
          expect(hasSelfScope).toBe(true);
        });
      }
      
      // CONTRACT: Very limited table access
      expect(data.available_tables).toHaveLength(1);
      expect(data.available_tables).toContain('employees');
    });

    it('should restrict query capabilities for employees', async () => {
      const employeeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.employee.token';
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Minimal query capabilities for employees
      expect(data.query_capabilities).toMatchObject({
        can_create_custom: false,
        can_modify_existing: false,
        can_access_raw_sql: false,
        can_join_tables: false,
        max_complexity_level: 'Basic',
        enforced_filters: expect.arrayContaining([
          {
            field: 'id',
            operator: 'equals',
            value: 'current_user_id',
            immutable: true
          }
        ])
      });
      
      // CONTRACT: Basic visualization types only
      expect(data.visualization_types).toEqual(['table', 'simple_chart', 'summary_card']);
    });

    it('should deny access to advanced queries without self-service view', async () => {
      const employeeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.employee.token';
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // CONTRACT: Should require self_service view parameter for employee access
      expect(response.status).toBe(403);
      
      const data = await response.json();
      expect(data).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('self_service view required'),
        status_code: 403
      });
    });
  });

  describe('Query Execution & Data Visualization', () => {
    it('should support executing custom queries with parameters', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const queryPayload = {
        template_id: 'employee_count_by_department',
        parameters: {
          date_range: '2024-01-01,2024-12-31',
          status_filter: 'Active',
          include_contractors: false
        },
        visualization_type: 'bar_chart'
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queryPayload)
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should return query results with visualization data
      expect(data).toMatchObject({
        query_id: expect.any(String),
        execution_time_ms: expect.any(Number),
        result_count: expect.any(Number),
        data: expect.any(Array),
        visualization_config: expect.any(Object),
        metadata: expect.any(Object)
      });
      
      // CONTRACT: Visualization config should match requested type
      expect(data.visualization_config.chart_type).toBe('bar_chart');
      expect(data.visualization_config.axes).toBeDefined();
      expect(data.visualization_config.styling).toBeDefined();
    });

    it('should validate query parameters before execution', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const invalidQuery = {
        template_id: 'non_existent_template',
        parameters: {
          invalid_param: 'invalid_value'
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidQuery)
      });
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('invalid'),
        validation_errors: expect.any(Array)
      });
    });

    it('should support real-time query result updates', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const realtimeQuery = {
        template_id: 'live_employee_status',
        parameters: {},
        real_time: true,
        update_interval: 30
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(realtimeQuery)
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should provide WebSocket connection for real-time updates
      expect(data).toMatchObject({
        query_id: expect.any(String),
        websocket_url: expect.stringMatching(/^wss?:\/\//),
        initial_data: expect.any(Array),
        update_interval: 30
      });
    });
  });

  describe('Query Template Management', () => {
    it('should allow admins to create custom query templates', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const newTemplate = {
        name: 'Custom Department Analysis',
        description: 'Analysis of department performance metrics',
        category: 'Analytics',
        table_sources: ['employees', 'departments', 'performance_reviews'],
        parameters: [
          {
            name: 'department_id',
            type: 'select',
            required: true,
            validation_rules: { min_length: 1 }
          }
        ],
        visualization_config: {
          chart_type: 'dashboard',
          layout: 'grid'
        },
        is_public: true
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTemplate)
      });
      
      expect(response.status).toBe(201);
      const data = await response.json();
      
      // CONTRACT: Should return created template with ID
      expect(data).toMatchObject({
        id: expect.any(String),
        name: newTemplate.name,
        created_by: expect.any(String),
        created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}/),
        status: 'active'
      });
    });

    it('should prevent non-admin users from creating templates', async () => {
      const hrToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.hrmanager.token';
      
      const newTemplate = {
        name: 'Unauthorized Template',
        category: 'HR'
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTemplate)
      });
      
      expect(response.status).toBe(403);
      
      const data = await response.json();
      expect(data.message).toContain('insufficient permissions');
    });

    it('should support template versioning and updates', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const templateUpdate = {
        description: 'Updated description for template',
        parameters: [
          {
            name: 'new_parameter',
            type: 'string',
            required: false
          }
        ],
        version_notes: 'Added new parameter for enhanced filtering'
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/templates/existing-template-id`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateUpdate)
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should create new version while preserving old
      expect(data).toMatchObject({
        id: 'existing-template-id',
        version: expect.any(Number),
        previous_version: expect.any(Number),
        updated_by: expect.any(String),
        updated_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}/)
      });
    });
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 for missing Authorization header', async () => {
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('Authorization'),
        status_code: 401
      });
    });

    it('should return 401 for invalid token', async () => {
      const invalidToken = 'invalid-token-format';
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${invalidToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(401);
    });

    it('should enforce role-based query template access', async () => {
      const employeeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.employee.token';
      
      // Try to access admin-level query category
      const response = await fetch(`${API_BASE_URL}/queries?category=Finance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(403);
      
      const data = await response.json();
      expect(data.message).toContain('insufficient permissions');
    });

    it('should validate query execution permissions', async () => {
      const employeeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.employee.token';
      
      const unauthorizedQuery = {
        template_id: 'admin_financial_report',
        parameters: {}
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(unauthorizedQuery)
      });
      
      expect(response.status).toBe(403);
      
      const data = await response.json();
      expect(data.message).toContain('insufficient permissions for template');
    });
  });

  describe('Performance & Caching', () => {
    it('should respond within 200ms for query template list', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const startTime = Date.now();
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      
      // CONTRACT: Query templates must load within 200ms
      expect(responseTime).toBeLessThan(200);
    });

    it('should implement query result caching', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const queryPayload = {
        template_id: 'cached_employee_count',
        parameters: {},
        cache_duration: 300
      };
      
      // First request
      const response1 = await fetch(`${API_BASE_URL}/queries/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queryPayload)
      });
      
      expect(response1.status).toBe(200);
      const data1 = await response1.json();
      
      // Second request (should be cached)
      const response2 = await fetch(`${API_BASE_URL}/queries/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queryPayload)
      });
      
      expect(response2.status).toBe(200);
      const data2 = await response2.json();
      
      // CONTRACT: Second request should indicate cache hit
      expect(data2.metadata.cache_hit).toBe(true);
      expect(data2.execution_time_ms).toBeLessThan(data1.execution_time_ms);
    });

    it('should handle concurrent query executions', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const queryPayload = {
        template_id: 'simple_employee_count',
        parameters: {}
      };
      
      // CONTRACT: Should handle multiple concurrent query executions
      const requests = Array(3).fill(null).map(() =>
        fetch(`${API_BASE_URL}/queries/execute`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(queryPayload)
        })
      );
      
      const responses = await Promise.all(requests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Security & Data Protection', () => {
    it('should prevent SQL injection in custom queries', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const maliciousQuery = {
        template_id: 'employee_search',
        parameters: {
          search_term: "'; DROP TABLE employees; --"
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(maliciousQuery)
      });
      
      // CONTRACT: Should either sanitize or reject malicious input
      if (response.status === 200) {
        const data = await response.json();
        expect(data.data).toBeDefined(); // Query executed safely
      } else {
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.message).toContain('invalid parameter');
      }
    });

    it('should not leak sensitive information in error responses', async () => {
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer malicious-probe-token',
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status).toBe(401);
      const data = await response.json();
      
      // CONTRACT: Error messages must not expose internal details
      expect(data.message).not.toContain('database');
      expect(data.message).not.toContain('SQL');
      expect(data.message).not.toContain('query');
      expect(data).not.toHaveProperty('stack');
      expect(data).not.toHaveProperty('query_templates');
    });

    it('should include security headers in response', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // CONTRACT: Security headers must be present
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      expect(response.headers.get('content-security-policy')).toContain('default-src');
    });

    it('should implement query timeout protection', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const longRunningQuery = {
        template_id: 'complex_analytics_query',
        parameters: {
          date_range: '2020-01-01,2024-12-31',
          include_all_details: true
        },
        timeout: 1 // 1 second timeout
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(longRunningQuery)
      });
      
      // CONTRACT: Should timeout long-running queries
      if (response.status === 408) {
        const data = await response.json();
        expect(data.message).toContain('timeout');
      } else {
        // Query completed within timeout
        expect(response.status).toBe(200);
      }
    });
  });
});