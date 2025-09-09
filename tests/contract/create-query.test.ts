/**
 * Contract Test: Create Custom Query API
 * 
 * This test defines the contract for POST /api/frontend/queries endpoint
 * Used for creating custom query templates with RBAC validation and visualization config
 * 
 * IMPORTANT: This test will FAIL initially (TDD Red phase)
 * Implementation must be created to make this test pass (TDD Green phase)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { UserContext, Role } from '$lib/types';

describe('Contract: POST /api/frontend/queries', () => {
  const API_BASE_URL = 'http://localhost:8080/api/frontend';
  
  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks();
  });

  describe('Admin Role - Full Query Creation Access', () => {
    it('should allow admin to create complex custom queries', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const complexQuery = {
        name: 'Advanced Employee Performance Analysis',
        description: 'Comprehensive analysis combining employee data with performance metrics',
        category: 'Analytics',
        complexity_level: 'Expert',
        table_sources: ['employees', 'departments', 'performance_reviews', 'payroll'],
        query_config: {
          joins: [
            {
              table: 'departments',
              on: 'employees.department_id = departments.id',
              type: 'LEFT'
            },
            {
              table: 'performance_reviews',
              on: 'employees.id = performance_reviews.employee_id',
              type: 'LEFT'
            }
          ],
          filters: [
            {
              field: 'employees.is_active',
              operator: 'equals',
              value: true
            }
          ],
          aggregations: [
            {
              field: 'performance_reviews.overall_rating',
              function: 'AVG',
              alias: 'avg_performance'
            }
          ],
          group_by: ['departments.name'],
          order_by: [
            {
              field: 'avg_performance',
              direction: 'DESC'
            }
          ]
        },
        parameters: [
          {
            name: 'date_range_start',
            type: 'date',
            required: true,
            default_value: '2024-01-01',
            validation_rules: {
              format: 'YYYY-MM-DD',
              min_date: '2020-01-01'
            },
            display_name: 'Analysis Start Date'
          },
          {
            name: 'department_ids',
            type: 'array',
            required: false,
            validation_rules: {
              item_type: 'string',
              max_items: 10
            },
            display_name: 'Department Filter'
          }
        ],
        visualization_config: {
          chart_type: 'dashboard',
          layout: {
            type: 'grid',
            columns: 2,
            widgets: [
              {
                type: 'bar_chart',
                title: 'Performance by Department',
                data_field: 'avg_performance',
                x_axis: 'department_name',
                position: { row: 1, col: 1 }
              },
              {
                type: 'data_table',
                title: 'Detailed Results',
                columns: ['department_name', 'employee_count', 'avg_performance'],
                position: { row: 1, col: 2 }
              }
            ]
          },
          styling: {
            color_scheme: 'professional',
            responsive: true
          }
        },
        is_public: true,
        tags: ['hr', 'performance', 'analytics'],
        scheduled_refresh: {
          enabled: true,
          frequency: 'weekly',
          day_of_week: 'Monday'
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(complexQuery)
      });
      
      // CONTRACT: Must return 201 Created for successful query creation
      expect(response.status).toBe(201);
      
      const data = await response.json();
      
      // CONTRACT: Response must contain created query with generated ID and metadata
      expect(data).toMatchObject({
        id: expect.any(String),
        name: complexQuery.name,
        description: complexQuery.description,
        category: complexQuery.category,
        complexity_level: complexQuery.complexity_level,
        created_by: expect.any(String),
        created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}/),
        updated_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}/),
        version: 1,
        status: 'active',
        validation_status: 'passed'
      });
      
      // CONTRACT: Should include query execution metadata
      expect(data).toHaveProperty('execution_metadata');
      expect(data.execution_metadata).toMatchObject({
        estimated_runtime: expect.any(Number),
        complexity_score: expect.any(Number),
        resource_requirements: expect.any(Object),
        cache_strategy: expect.any(String)
      });
      
      // CONTRACT: Should validate and return sanitized query config
      expect(data.query_config).toBeDefined();
      expect(data.query_config.joins).toHaveLength(2);
      expect(data.parameters).toHaveLength(2);
    });

    it('should validate query syntax and dependencies for admin', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const queryWithSyntaxErrors = {
        name: 'Invalid Query Test',
        table_sources: ['employees'],
        query_config: {
          joins: [
            {
              table: 'nonexistent_table',
              on: 'invalid.field = another.field',
              type: 'INNER'
            }
          ],
          filters: [
            {
              field: 'invalid_field',
              operator: 'invalid_operator',
              value: 'test'
            }
          ]
        },
        parameters: [
          {
            name: 'invalid-param-name!',
            type: 'invalid_type',
            required: true
          }
        ]
      };
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queryWithSyntaxErrors)
      });
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      
      // CONTRACT: Should return detailed validation errors
      expect(data).toMatchObject({
        error: 'validation_failed',
        message: expect.any(String),
        validation_errors: expect.any(Array)
      });
      
      expect(data.validation_errors.length).toBeGreaterThan(0);
      
      data.validation_errors.forEach((error: any) => {
        expect(error).toMatchObject({
          field: expect.any(String),
          message: expect.any(String),
          error_code: expect.any(String)
        });
      });
    });

    it('should allow admin to create queries with raw SQL access', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const rawSqlQuery = {
        name: 'Custom SQL Analytics Query',
        description: 'Advanced query using raw SQL for complex analytics',
        category: 'Custom',
        complexity_level: 'Expert',
        query_type: 'raw_sql',
        raw_sql: `
          SELECT 
            d.name as department,
            COUNT(e.id) as employee_count,
            AVG(CASE WHEN pr.overall_rating IS NOT NULL THEN pr.overall_rating END) as avg_rating,
            SUM(p.base_salary) as total_salary_cost
          FROM employees e
          LEFT JOIN departments d ON e.department_id = d.id
          LEFT JOIN performance_reviews pr ON e.id = pr.employee_id 
            AND pr.review_period = $1
          LEFT JOIN payroll p ON e.id = p.employee_id
            AND p.pay_period = $2
          WHERE e.is_active = true
            AND ($3 = 'all' OR d.id = $3)
          GROUP BY d.name
          ORDER BY avg_rating DESC NULLS LAST
        `,
        parameters: [
          {
            name: 'review_period',
            type: 'string',
            required: true,
            validation_rules: {
              pattern: '^\\d{4}-Q[1-4]$'
            }
          },
          {
            name: 'pay_period',
            type: 'string',
            required: true,
            validation_rules: {
              pattern: '^\\d{4}-\\d{2}$'
            }
          },
          {
            name: 'department_filter',
            type: 'string',
            required: false,
            default_value: 'all'
          }
        ],
        visualization_config: {
          chart_type: 'multi_metric_dashboard',
          widgets: [
            {
              type: 'kpi_card',
              title: 'Total Employees',
              metric: 'employee_count',
              aggregation: 'sum'
            }
          ]
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(rawSqlQuery)
      });
      
      expect(response.status).toBe(201);
      
      const data = await response.json();
      
      // CONTRACT: Should accept and validate raw SQL queries
      expect(data.query_type).toBe('raw_sql');
      expect(data.validation_status).toBe('passed');
      expect(data.security_scan_status).toBe('approved');
    });
  });

  describe('HR Manager Role - HR-Focused Query Creation', () => {
    it('should allow HR Manager to create HR-specific queries', async () => {
      const hrToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.hrmanager.token';
      
      const hrQuery = {
        name: 'Employee Compliance Tracking',
        description: 'Track employee compliance status and training requirements',
        category: 'HR',
        complexity_level: 'Intermediate',
        table_sources: ['employees', 'compliance_records', 'training_records'],
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
            options: ['Safety Training', 'Privacy Policy', 'Code of Conduct'],
            display_name: 'Compliance Type Filter'
          }
        ],
        visualization_config: {
          chart_type: 'compliance_dashboard',
          widgets: [
            {
              type: 'status_grid',
              title: 'Compliance Status Overview'
            }
          ]
        },
        is_public: false
      };
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(hrQuery)
      });
      
      expect(response.status).toBe(201);
      
      const data = await response.json();
      
      // CONTRACT: HR Manager should be able to create HR-category queries
      expect(data.category).toBe('HR');
      expect(data.created_by).toMatch(/hr.*manager/i);
      
      // CONTRACT: Should not allow access to financial tables
      expect(data.table_sources).not.toContain('payroll');
      expect(data.table_sources).not.toContain('budget_allocations');
    });

    it('should restrict HR Manager from creating financial queries', async () => {
      const hrToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.hrmanager.token';
      
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
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(financialQuery)
      });
      
      expect(response.status).toBe(403);
      
      const data = await response.json();
      
      // CONTRACT: Should deny access to financial category and payroll table
      expect(data).toMatchObject({
        error: 'insufficient_permissions',
        message: expect.stringContaining('Finance category'),
        forbidden_resources: expect.arrayContaining(['payroll'])
      });
    });

    it('should prevent HR Manager from using raw SQL', async () => {
      const hrToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.hrmanager.token';
      
      const rawSqlQuery = {
        name: 'Unauthorized Raw SQL Query',
        query_type: 'raw_sql',
        raw_sql: 'SELECT * FROM employees'
      };
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(rawSqlQuery)
      });
      
      expect(response.status).toBe(403);
      
      const data = await response.json();
      expect(data.message).toContain('raw SQL access denied');
    });
  });

  describe('Manager Role - Department-Scoped Query Creation', () => {
    it('should allow Manager to create department-scoped team queries', async () => {
      const managerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.manager.token';
      
      const teamQuery = {
        name: 'My Team Performance Metrics',
        description: 'Track my team performance and productivity metrics',
        category: 'Operations',
        complexity_level: 'Basic',
        table_sources: ['employees'],
        query_config: {
          filters: [
            {
              field: 'employees.department_id',
              operator: 'equals',
              value: '{{user_department_id}}' // Template variable
            },
            {
              field: 'employees.is_active',
              operator: 'equals',
              value: true
            }
          ],
          aggregations: [
            {
              field: 'employees.id',
              function: 'COUNT',
              alias: 'team_size'
            }
          ]
        },
        parameters: [
          {
            name: 'date_range',
            type: 'daterange',
            required: true,
            default_value: 'last_30_days'
          }
        ],
        visualization_config: {
          chart_type: 'team_dashboard',
          widgets: [
            {
              type: 'metric_card',
              title: 'Team Size',
              metric: 'team_size'
            }
          ]
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(teamQuery)
      });
      
      expect(response.status).toBe(201);
      
      const data = await response.json();
      
      // CONTRACT: Manager queries should be automatically scoped to their department
      expect(data.query_config.filters).toContainEqual(
        expect.objectContaining({
          field: 'employees.department_id',
          value: '{{user_department_id}}',
          immutable: true
        })
      );
      
      // CONTRACT: Should enforce department scope constraint
      expect(data.scope_constraints).toContainEqual({
        type: 'department_scope',
        enforced: true,
        user_field: 'department_id'
      });
    });

    it('should prevent Manager from creating organization-wide queries', async () => {
      const managerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.manager.token';
      
      const orgWideQuery = {
        name: 'Organization-Wide Analysis',
        table_sources: ['employees', 'departments'],
        query_config: {
          // No department filter - trying to access all data
          aggregations: [
            {
              field: 'employees.id',
              function: 'COUNT',
              alias: 'total_employees'
            }
          ],
          group_by: ['departments.name']
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orgWideQuery)
      });
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      
      // CONTRACT: Should require department scoping for manager queries
      expect(data).toMatchObject({
        error: 'scope_validation_failed',
        message: expect.stringContaining('department scope required'),
        required_filters: expect.arrayContaining(['department_id'])
      });
    });

    it('should restrict Manager query complexity and capabilities', async () => {
      const managerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.manager.token';
      
      const complexQuery = {
        name: 'Too Complex Query',
        complexity_level: 'Expert', // Not allowed for managers
        table_sources: ['employees', 'performance_reviews', 'training_records'],
        query_config: {
          joins: [
            { table: 'performance_reviews', on: 'complex join', type: 'INNER' },
            { table: 'training_records', on: 'another complex join', type: 'LEFT' }
          ],
          subqueries: [
            { name: 'subquery1', sql: 'SELECT complex calculation' }
          ]
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(complexQuery)
      });
      
      expect(response.status).toBe(403);
      
      const data = await response.json();
      
      // CONTRACT: Should enforce complexity level restrictions
      expect(data).toMatchObject({
        error: 'complexity_level_exceeded',
        message: expect.stringContaining('maximum complexity: Intermediate'),
        forbidden_features: expect.arrayContaining(['subqueries', 'Expert complexity'])
      });
    });
  });

  describe('Employee Role - Query Creation Restrictions', () => {
    it('should deny Employee query creation access', async () => {
      const employeeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.employee.token';
      
      const simpleQuery = {
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
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(simpleQuery)
      });
      
      // CONTRACT: Employees should not be able to create custom queries
      expect(response.status).toBe(403);
      
      const data = await response.json();
      
      expect(data).toMatchObject({
        error: 'insufficient_permissions',
        message: expect.stringContaining('query creation not allowed'),
        required_permissions: expect.arrayContaining(['queries:create'])
      });
    });
  });

  describe('Input Validation & Security', () => {
    it('should validate required fields and data types', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const invalidQuery = {
        // Missing required name field
        description: 'Query without name',
        table_sources: [], // Empty array not allowed
        parameters: [
          {
            // Missing required name field
            type: 'invalid_type',
            required: 'not_boolean' // Should be boolean
          }
        ]
      };
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidQuery)
      });
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      
      // CONTRACT: Should provide comprehensive validation errors
      expect(data.validation_errors).toContainEqual(
        expect.objectContaining({
          field: 'name',
          error_code: 'FIELD_REQUIRED'
        })
      );
      
      expect(data.validation_errors).toContainEqual(
        expect.objectContaining({
          field: 'table_sources',
          error_code: 'ARRAY_MIN_LENGTH'
        })
      );
      
      expect(data.validation_errors).toContainEqual(
        expect.objectContaining({
          field: 'parameters[0].type',
          error_code: 'INVALID_ENUM_VALUE'
        })
      );
    });

    it('should sanitize and validate query names and descriptions', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const queryWithSpecialChars = {
        name: '  Test Query <script>alert("xss")</script>  ',
        description: 'Description with\n\rspecial\tcharacters & symbols',
        table_sources: ['employees'],
        query_config: {
          filters: [
            {
              field: 'name',
              operator: 'equals',
              value: 'test'
            }
          ]
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queryWithSpecialChars)
      });
      
      expect(response.status).toBe(201);
      
      const data = await response.json();
      
      // CONTRACT: Should sanitize input while preserving safe content
      expect(data.name).toBe('Test Query');
      expect(data.name).not.toContain('<script>');
      expect(data.description).not.toContain('\n');
      expect(data.description).not.toContain('\r');
    });

    it('should prevent SQL injection in query configuration', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const maliciousQuery = {
        name: 'SQL Injection Test',
        table_sources: ['employees'],
        query_config: {
          filters: [
            {
              field: "id'; DROP TABLE employees; --",
              operator: 'equals',
              value: '1'
            }
          ],
          joins: [
            {
              table: 'departments',
              on: "employees.id = departments.id OR '1'='1",
              type: 'INNER'
            }
          ]
        },
        raw_sql: "SELECT * FROM employees WHERE id = 1; DROP TABLE users; --"
      };
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(maliciousQuery)
      });
      
      // CONTRACT: Should detect and reject malicious SQL patterns
      expect(response.status).toBe(400);
      
      const data = await response.json();
      
      expect(data).toMatchObject({
        error: 'security_violation',
        message: expect.stringContaining('malicious SQL detected'),
        security_violations: expect.arrayContaining([
          expect.objectContaining({ type: 'sql_injection_attempt' })
        ])
      });
    });

    it('should enforce parameter validation rules', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const queryWithInvalidParams = {
        name: 'Parameter Validation Test',
        table_sources: ['employees'],
        parameters: [
          {
            name: 'invalid-param!@#', // Invalid characters
            type: 'string',
            validation_rules: {
              min_length: -1, // Invalid negative value
              max_length: 'not_a_number', // Invalid type
              pattern: '[invalid regex(' // Invalid regex
            }
          },
          {
            name: 'date_param',
            type: 'date',
            validation_rules: {
              min_date: 'invalid-date-format',
              max_date: '2023-13-40' // Invalid date
            }
          }
        ]
      };
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queryWithInvalidParams)
      });
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      
      // CONTRACT: Should validate parameter definitions
      expect(data.validation_errors).toContainEqual(
        expect.objectContaining({
          field: 'parameters[0].name',
          error_code: 'INVALID_PARAMETER_NAME'
        })
      );
      
      expect(data.validation_errors).toContainEqual(
        expect.objectContaining({
          field: 'parameters[0].validation_rules.pattern',
          error_code: 'INVALID_REGEX'
        })
      );
    });
  });

  describe('Response Format & Metadata', () => {
    it('should return consistent response structure', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const validQuery = {
        name: 'Test Query Response Format',
        table_sources: ['employees'],
        query_config: {
          filters: [
            {
              field: 'is_active',
              operator: 'equals',
              value: true
            }
          ]
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validQuery)
      });
      
      expect(response.status).toBe(201);
      expect(response.headers.get('content-type')).toContain('application/json');
      
      const data = await response.json();
      
      // CONTRACT: Response must have consistent structure
      const expectedKeys = [
        'id', 'name', 'description', 'category', 'created_by', 'created_at', 
        'updated_at', 'version', 'status', 'validation_status'
      ];
      
      expectedKeys.forEach(key => {
        expect(data).toHaveProperty(key);
      });
      
      // CONTRACT: Should include creation metadata
      expect(data.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(data.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(data.version).toBe(1);
      expect(data.status).toBe('active');
    });

    it('should include query performance estimates', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const complexQuery = {
        name: 'Performance Estimate Test',
        table_sources: ['employees', 'departments', 'performance_reviews'],
        query_config: {
          joins: [
            {
              table: 'departments',
              on: 'employees.department_id = departments.id',
              type: 'LEFT'
            }
          ],
          aggregations: [
            {
              field: 'performance_reviews.overall_rating',
              function: 'AVG'
            }
          ]
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(complexQuery)
      });
      
      expect(response.status).toBe(201);
      
      const data = await response.json();
      
      // CONTRACT: Should include performance metadata
      expect(data.execution_metadata).toMatchObject({
        estimated_runtime: expect.any(Number),
        complexity_score: expect.any(Number),
        resource_requirements: expect.objectContaining({
          memory_estimate: expect.any(String),
          cpu_intensity: expect.stringMatching(/^(Low|Medium|High)$/)
        }),
        cache_strategy: expect.stringMatching(/^(none|short|medium|long)$/),
        recommended_schedule: expect.any(String)
      });
    });
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 for missing Authorization header', async () => {
      const queryData = {
        name: 'Unauthorized Query',
        table_sources: ['employees']
      };
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queryData)
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
      
      const queryData = {
        name: 'Query with Invalid Token',
        table_sources: ['employees']
      };
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${invalidToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queryData)
      });
      
      expect(response.status).toBe(401);
    });

    it('should include security headers in response', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const queryData = {
        name: 'Security Headers Test',
        table_sources: ['employees']
      };
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queryData)
      });
      
      // CONTRACT: Security headers must be present
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      expect(response.headers.get('content-security-policy')).toContain('default-src');
    });
  });

  describe('Performance & Rate Limiting', () => {
    it('should respond within 500ms for query creation', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const queryData = {
        name: 'Performance Test Query',
        table_sources: ['employees']
      };
      
      const startTime = Date.now();
      
      const response = await fetch(`${API_BASE_URL}/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queryData)
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(201);
      
      // CONTRACT: Query creation must complete within 500ms
      expect(responseTime).toBeLessThan(500);
    });

    it('should implement rate limiting for query creation', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      // CONTRACT: Should implement rate limiting for query creation
      const rapidRequests = Array(10).fill(null).map((_, index) =>
        fetch(`${API_BASE_URL}/queries`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: `Rate Limit Test Query ${index}`,
            table_sources: ['employees']
          })
        })
      );
      
      const responses = await Promise.all(rapidRequests);
      
      // Should have at least one rate limit response
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      if (rateLimitedResponses.length > 0) {
        const rateLimitData = await rateLimitedResponses[0].json();
        expect(rateLimitData.message).toContain('rate limit exceeded');
        expect(rateLimitData.retry_after).toBeGreaterThan(0);
      }
    });
  });
});