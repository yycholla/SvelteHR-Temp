/**
 * Contract Test: Execute Query API
 * 
 * This test defines the contract for POST /api/frontend/queries/{id}/execute endpoint
 * Used for executing custom queries with parameters, RBAC validation, and result visualization
 * 
 * IMPORTANT: This test will FAIL initially (TDD Red phase)
 * Implementation must be created to make this test pass (TDD Green phase)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { UserContext, Role } from '$lib/types';

describe('Contract: POST /api/frontend/queries/{id}/execute', () => {
  const API_BASE_URL = 'http://localhost:8080/api/frontend';
  const VALID_QUERY_ID = 'query-123-456-789';
  const ADMIN_QUERY_ID = 'admin-financial-query-456';
  const HR_QUERY_ID = 'hr-compliance-query-789';
  const MANAGER_QUERY_ID = 'manager-team-query-012';
  const INVALID_QUERY_ID = 'invalid-query-id';
  
  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks();
  });

  describe('Admin Role - Full Query Execution Access', () => {
    it('should execute complex admin queries with full data access', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const executionRequest = {
        parameters: {
          date_range_start: '2024-01-01',
          date_range_end: '2024-12-31',
          department_ids: ['dept-1', 'dept-2'],
          include_salary_data: true,
          performance_threshold: 4.0
        },
        visualization_options: {
          chart_type: 'advanced_dashboard',
          include_drill_down: true,
          export_format: 'pdf',
          real_time_updates: true
        },
        execution_options: {
          cache_duration: 300,
          priority: 'high',
          timeout: 30000
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/${ADMIN_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(executionRequest)
      });
      
      // CONTRACT: Must return 200 OK for successful execution
      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      // CONTRACT: Response must contain execution results and metadata
      expect(data).toMatchObject({
        execution_id: expect.any(String),
        query_id: ADMIN_QUERY_ID,
        status: 'completed',
        executed_by: expect.any(String),
        executed_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        execution_time_ms: expect.any(Number),
        result_count: expect.any(Number),
        data: expect.any(Array),
        metadata: expect.any(Object)
      });
      
      // CONTRACT: Should include comprehensive execution metadata
      expect(data.metadata).toMatchObject({
        query_complexity: expect.any(String),
        data_sources_accessed: expect.any(Array),
        cache_status: expect.stringMatching(/^(hit|miss|bypassed)$/),
        performance_metrics: expect.any(Object),
        security_context: expect.any(Object)
      });
      
      // CONTRACT: Admin should access all requested data including sensitive information
      if (data.data.length > 0) {
        const firstRow = data.data[0];
        if (executionRequest.parameters.include_salary_data) {
          expect(firstRow).toHaveProperty('salary_data');
        }
      }
      
      // CONTRACT: Should include visualization configuration
      expect(data).toHaveProperty('visualization_config');
      expect(data.visualization_config).toMatchObject({
        chart_type: executionRequest.visualization_options.chart_type,
        data_mapping: expect.any(Object),
        styling: expect.any(Object),
        interactive_features: expect.any(Array)
      });
      
      // CONTRACT: Should include export capabilities
      if (executionRequest.visualization_options.export_format) {
        expect(data).toHaveProperty('export_urls');
        expect(data.export_urls).toHaveProperty(executionRequest.visualization_options.export_format);
      }
    });

    it('should handle real-time query execution with WebSocket connection', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const realtimeRequest = {
        parameters: {
          live_data: true
        },
        visualization_options: {
          real_time_updates: true,
          update_interval: 5000
        },
        execution_options: {
          streaming: true,
          buffer_size: 100
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/${VALID_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(realtimeRequest)
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should provide real-time streaming capabilities
      expect(data).toHaveProperty('streaming_config');
      expect(data.streaming_config).toMatchObject({
        websocket_url: expect.stringMatching(/^wss?:\/\//),
        connection_token: expect.any(String),
        update_interval: realtimeRequest.visualization_options.update_interval,
        stream_id: expect.any(String)
      });
      
      // CONTRACT: Should include initial data and streaming metadata
      expect(data.initial_data).toBeDefined();
      expect(data.stream_metadata).toMatchObject({
        expected_update_frequency: expect.any(Number),
        data_freshness_threshold: expect.any(Number),
        connection_timeout: expect.any(Number)
      });
    });

    it('should execute queries with complex parameter validation', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.token';
      
      const complexParameters = {
        parameters: {
          multi_select_departments: ['HR', 'Engineering', 'Sales'],
          date_range: {
            start: '2024-01-01',
            end: '2024-12-31',
            granularity: 'monthly'
          },
          performance_filters: {
            min_rating: 3.0,
            max_rating: 5.0,
            include_probation: false
          },
          custom_calculations: [
            {
              name: 'efficiency_score',
              formula: '(completed_tasks / total_tasks) * 100',
              data_type: 'percentage'
            }
          ]
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/${VALID_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(complexParameters)
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should process and validate complex nested parameters
      expect(data.metadata.parameter_processing).toMatchObject({
        validated_parameters: expect.any(Object),
        computed_fields: expect.any(Array),
        applied_filters: expect.any(Array)
      });
      
      // CONTRACT: Should include custom calculation results
      if (data.data.length > 0 && complexParameters.parameters.custom_calculations.length > 0) {
        const firstRow = data.data[0];
        expect(firstRow).toHaveProperty('efficiency_score');
        expect(typeof firstRow.efficiency_score).toBe('number');
      }
    });
  });

  describe('HR Manager Role - HR Query Execution', () => {
    it('should execute HR-specific queries with appropriate data access', async () => {
      const hrToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.hrmanager.token';
      
      const hrExecutionRequest = {
        parameters: {
          compliance_type: 'Safety Training',
          status_filter: 'Overdue',
          include_personal_info: true
        },
        visualization_options: {
          chart_type: 'compliance_dashboard',
          group_by_department: true
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/${HR_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(hrExecutionRequest)
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: HR Manager should access HR-relevant data
      expect(data.metadata.data_sources_accessed).toContain('employees');
      expect(data.metadata.data_sources_accessed).toContain('compliance_records');
      
      // CONTRACT: Should NOT access financial data sources
      expect(data.metadata.data_sources_accessed).not.toContain('payroll');
      expect(data.metadata.data_sources_accessed).not.toContain('budget_allocations');
      
      // CONTRACT: Should include HR-specific visualization config
      expect(data.visualization_config.chart_type).toBe('compliance_dashboard');
      expect(data.visualization_config.hr_context).toBeDefined();
      
      // CONTRACT: Should include compliance-specific metadata
      expect(data.metadata).toHaveProperty('compliance_summary');
      expect(data.metadata.compliance_summary).toMatchObject({
        total_employees_checked: expect.any(Number),
        compliance_rate: expect.any(Number),
        overdue_count: expect.any(Number),
        upcoming_deadlines: expect.any(Array)
      });
    });

    it('should prevent HR Manager from executing admin-level queries', async () => {
      const hrToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.hrmanager.token';
      
      const unauthorizedRequest = {
        parameters: {
          include_salary_details: true,
          financial_analysis: true
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/${ADMIN_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(unauthorizedRequest)
      });
      
      // CONTRACT: Should deny access to admin-level queries
      expect(response.status).toBe(403);
      
      const data = await response.json();
      
      expect(data).toMatchObject({
        error: 'insufficient_permissions',
        message: expect.stringContaining('query access denied'),
        query_id: ADMIN_QUERY_ID,
        required_permissions: expect.arrayContaining(['admin:queries:execute'])
      });
    });

    it('should apply HR data filtering and privacy controls', async () => {
      const hrToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.hrmanager.token';
      
      const sensitiveDataRequest = {
        parameters: {
          include_employee_details: true,
          privacy_level: 'standard'
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/${HR_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sensitiveDataRequest)
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should apply appropriate data masking and filtering
      expect(data.metadata.privacy_controls).toMatchObject({
        data_masking_applied: expect.any(Boolean),
        fields_filtered: expect.any(Array),
        privacy_level: 'standard'
      });
      
      // CONTRACT: Should mask sensitive personal data appropriately
      if (data.data.length > 0) {
        data.data.forEach((row: any) => {
          if (row.phone_number) {
            expect(row.phone_number).toMatch(/\*\*\*-\*\*\*-\d{4}/); // Partially masked
          }
          if (row.ssn) {
            expect(row.ssn).toMatch(/\*\*\*-\*\*-\d{4}/); // Partially masked
          }
        });
      }
    });
  });

  describe('Manager Role - Department-Scoped Query Execution', () => {
    it('should execute team queries with department scope enforcement', async () => {
      const managerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.manager.token';
      
      const teamQueryRequest = {
        parameters: {
          performance_period: '2024-Q1',
          include_goals: true,
          team_metrics: ['productivity', 'satisfaction', 'retention']
        },
        visualization_options: {
          chart_type: 'team_performance',
          comparison_view: 'quarterly'
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/${MANAGER_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(teamQueryRequest)
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should automatically enforce department scope
      expect(data.metadata.scope_enforcement).toMatchObject({
        department_filter_applied: true,
        user_department_id: expect.any(String),
        records_accessible: expect.any(Number),
        scope_type: 'department'
      });
      
      // CONTRACT: All returned data should belong to manager's department
      if (data.data.length > 0) {
        data.data.forEach((row: any) => {
          if (row.department_id) {
            expect(row.department_id).toBe(data.metadata.scope_enforcement.user_department_id);
          }
        });
      }
      
      // CONTRACT: Should include team-specific visualization config
      expect(data.visualization_config.chart_type).toBe('team_performance');
      expect(data.visualization_config.team_context).toBeDefined();
    });

    it('should prevent cross-department data access for managers', async () => {
      const managerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.manager.token';
      
      const crossDeptRequest = {
        parameters: {
          department_override: 'other-department-id',
          bypass_scope: true
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/${MANAGER_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(crossDeptRequest)
      });
      
      expect(response.status).toBe(200); // Query executes but with scope enforcement
      const data = await response.json();
      
      // CONTRACT: Should ignore department override attempts and enforce scope
      expect(data.metadata.scope_enforcement.department_filter_applied).toBe(true);
      expect(data.metadata.parameter_processing.ignored_parameters).toContain('department_override');
      expect(data.metadata.parameter_processing.ignored_parameters).toContain('bypass_scope');
      
      // CONTRACT: Should log security attempt for audit
      expect(data.metadata.security_events).toContainEqual(
        expect.objectContaining({
          type: 'scope_bypass_attempt',
          severity: 'medium',
          logged: true
        })
      );
    });

    it('should limit query complexity and execution time for managers', async () => {
      const managerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.manager.token';
      
      const complexRequest = {
        parameters: {
          date_range_years: 5, // Large date range
          detailed_breakdown: true,
          include_all_metrics: true
        },
        execution_options: {
          timeout: 60000, // Try to set long timeout
          priority: 'critical' // Try to set high priority
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/${MANAGER_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(complexRequest)
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should apply execution limits for manager role
      expect(data.metadata.execution_limits).toMatchObject({
        max_timeout: expect.any(Number),
        max_priority: expect.stringMatching(/^(low|normal)$/),
        complexity_limit: expect.stringMatching(/^(Basic|Intermediate)$/),
        applied_timeout: expect.any(Number)
      });
      
      expect(data.metadata.execution_limits.applied_timeout).toBeLessThanOrEqual(30000); // Max 30s for managers
    });
  });

  describe('Employee Role - Query Execution Restrictions', () => {
    it('should deny employee access to custom query execution', async () => {
      const employeeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.employee.token';
      
      const employeeRequest = {
        parameters: {
          my_data_only: true
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/${VALID_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(employeeRequest)
      });
      
      // CONTRACT: Employees should not have query execution access
      expect(response.status).toBe(403);
      
      const data = await response.json();
      
      expect(data).toMatchObject({
        error: 'insufficient_permissions',
        message: expect.stringContaining('query execution not allowed'),
        required_permissions: expect.arrayContaining(['queries:execute']),
        available_alternatives: expect.arrayContaining(['self-service reports'])
      });
    });
  });

  describe('Parameter Validation & Processing', () => {
    it('should validate required parameters and data types', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const invalidParameters = {
        parameters: {
          // Missing required parameters
          invalid_date: 'not-a-date',
          negative_number: -100,
          empty_array: [],
          null_value: null,
          oversized_string: 'x'.repeat(10000)
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/${VALID_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidParameters)
      });
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      
      // CONTRACT: Should provide detailed parameter validation errors
      expect(data).toMatchObject({
        error: 'parameter_validation_failed',
        message: expect.any(String),
        validation_errors: expect.any(Array)
      });
      
      expect(data.validation_errors.length).toBeGreaterThan(0);
      
      data.validation_errors.forEach((error: any) => {
        expect(error).toMatchObject({
          parameter: expect.any(String),
          error_code: expect.any(String),
          message: expect.any(String),
          expected_type: expect.any(String)
        });
      });
    });

    it('should apply parameter transformation and normalization', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const transformableParameters = {
        parameters: {
          date_string: '2024/01/01', // Should be normalized to YYYY-MM-DD
          case_insensitive_enum: 'ACTIVE', // Should be normalized to proper case
          numeric_string: '123.45', // Should be converted to number
          boolean_string: 'true', // Should be converted to boolean
          trimable_string: '  whitespace text  ' // Should be trimmed
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/${VALID_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transformableParameters)
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should show parameter transformations in metadata
      expect(data.metadata.parameter_processing.transformations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            parameter: 'date_string',
            original_value: '2024/01/01',
            transformed_value: '2024-01-01',
            transformation_type: 'date_normalization'
          })
        ])
      );
    });

    it('should handle parameter dependencies and conditional validation', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const dependentParameters = {
        parameters: {
          analysis_type: 'detailed',
          // When analysis_type is 'detailed', detail_level is required
          // detail_level: 'high' // Missing dependent parameter
          date_range: 'custom',
          // When date_range is 'custom', start_date and end_date are required
          start_date: '2024-01-01'
          // end_date: '2024-12-31' // Missing dependent parameter
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/${VALID_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dependentParameters)
      });
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      
      // CONTRACT: Should validate parameter dependencies
      expect(data.validation_errors).toContainEqual(
        expect.objectContaining({
          error_code: 'DEPENDENT_PARAMETER_MISSING',
          parameter: 'detail_level',
          dependent_on: 'analysis_type',
          condition: 'equals:detailed'
        })
      );
      
      expect(data.validation_errors).toContainEqual(
        expect.objectContaining({
          error_code: 'DEPENDENT_PARAMETER_MISSING',
          parameter: 'end_date',
          dependent_on: 'date_range',
          condition: 'equals:custom'
        })
      );
    });
  });

  describe('Query Execution Results & Data Format', () => {
    it('should return properly formatted query results', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const standardRequest = {
        parameters: {
          format_output: true,
          include_totals: true
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/${VALID_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(standardRequest)
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Data should be properly formatted with consistent structure
      if (data.data.length > 0) {
        data.data.forEach((row: any) => {
          expect(typeof row).toBe('object');
          expect(row).not.toBeNull();
          
          // All numeric fields should be properly typed
          Object.entries(row).forEach(([key, value]) => {
            if (key.includes('_id') || key.includes('_count') || key.includes('_amount')) {
              if (value !== null && value !== undefined) {
                expect(typeof value).toMatch(/number|string/);
              }
            }
            
            // Date fields should be properly formatted
            if (key.includes('_date') || key.includes('_at')) {
              if (value !== null && value !== undefined) {
                expect(typeof value).toBe('string');
                expect(value).toMatch(/^\d{4}-\d{2}-\d{2}/);
              }
            }
          });
        });
      }
      
      // CONTRACT: Should include summary statistics when requested
      if (standardRequest.parameters.include_totals) {
        expect(data).toHaveProperty('summary');
        expect(data.summary).toMatchObject({
          total_records: expect.any(Number),
          aggregations: expect.any(Object),
          data_quality_score: expect.any(Number)
        });
      }
    });

    it('should handle large result sets with pagination', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const paginatedRequest = {
        parameters: {
          large_dataset: true
        },
        execution_options: {
          page_size: 100,
          page: 1,
          enable_pagination: true
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/${VALID_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paginatedRequest)
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Large results should include pagination metadata
      expect(data).toHaveProperty('pagination');
      expect(data.pagination).toMatchObject({
        current_page: 1,
        page_size: 100,
        total_pages: expect.any(Number),
        total_records: expect.any(Number),
        has_next_page: expect.any(Boolean),
        next_page_url: expect.any(String)
      });
      
      // CONTRACT: Data array should respect page size limit
      expect(data.data.length).toBeLessThanOrEqual(100);
    });

    it('should provide data export capabilities', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const exportRequest = {
        parameters: {
          export_ready: true
        },
        visualization_options: {
          export_formats: ['csv', 'excel', 'pdf'],
          include_charts: true
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/${VALID_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportRequest)
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should provide export URLs for requested formats
      expect(data).toHaveProperty('export_urls');
      expect(data.export_urls).toMatchObject({
        csv: expect.stringMatching(/^https?:\/\/.*\.csv$/),
        excel: expect.stringMatching(/^https?:\/\/.*\.xlsx$/),
        pdf: expect.stringMatching(/^https?:\/\/.*\.pdf$/)
      });
      
      // CONTRACT: Export URLs should include expiration and security tokens
      Object.values(data.export_urls).forEach((url: any) => {
        expect(url).toContain('token=');
        expect(url).toContain('expires=');
      });
    });
  });

  describe('Caching & Performance', () => {
    it('should implement intelligent query result caching', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const cacheableRequest = {
        parameters: {
          static_analysis: true
        },
        execution_options: {
          cache_duration: 300,
          cache_key_override: 'custom_cache_key'
        }
      };
      
      // First request - should miss cache
      const response1 = await fetch(`${API_BASE_URL}/queries/${VALID_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cacheableRequest)
      });
      
      expect(response1.status).toBe(200);
      const data1 = await response1.json();
      
      expect(data1.metadata.cache_status).toBe('miss');
      const firstExecutionTime = data1.execution_time_ms;
      
      // Second identical request - should hit cache
      const response2 = await fetch(`${API_BASE_URL}/queries/${VALID_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cacheableRequest)
      });
      
      expect(response2.status).toBe(200);
      const data2 = await response2.json();
      
      // CONTRACT: Second request should hit cache and be faster
      expect(data2.metadata.cache_status).toBe('hit');
      expect(data2.execution_time_ms).toBeLessThan(firstExecutionTime);
      expect(data2.metadata.cache_info).toMatchObject({
        cached_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}/),
        cache_age_seconds: expect.any(Number),
        cache_key: expect.any(String)
      });
    });

    it('should handle query timeout gracefully', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const timeoutRequest = {
        parameters: {
          complex_calculation: true,
          large_dataset: true
        },
        execution_options: {
          timeout: 100 // Very short timeout to trigger timeout
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/${VALID_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(timeoutRequest)
      });
      
      // CONTRACT: Should handle timeout gracefully
      if (response.status === 408) {
        const data = await response.json();
        
        expect(data).toMatchObject({
          error: 'query_timeout',
          message: expect.stringContaining('execution timeout'),
          timeout_ms: 100,
          partial_results: expect.any(Boolean),
          retry_suggestion: expect.any(String)
        });
        
        // CONTRACT: Should provide guidance for handling timeout
        expect(data.retry_suggestion).toMatch(/(increase timeout|reduce complexity|use pagination)/);
      } else {
        // Query completed within timeout - verify execution time is reasonable
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.execution_time_ms).toBeLessThan(100);
      }
    });

    it('should optimize query execution based on complexity', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const complexRequest = {
        parameters: {
          optimization_level: 'aggressive'
        },
        execution_options: {
          performance_mode: 'optimized',
          explain_plan: true
        }
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/${VALID_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(complexRequest)
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // CONTRACT: Should include query optimization details
      expect(data.metadata.query_optimization).toMatchObject({
        optimization_applied: expect.any(Boolean),
        execution_plan: expect.any(Object),
        performance_metrics: expect.any(Object),
        bottleneck_analysis: expect.any(Array)
      });
      
      if (data.metadata.query_optimization.optimization_applied) {
        expect(data.metadata.query_optimization.optimizations).toBeInstanceOf(Array);
        expect(data.metadata.query_optimization.optimizations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 for missing Authorization header', async () => {
      const executionRequest = {
        parameters: {}
      };
      
      const response = await fetch(`${API_BASE_URL}/queries/${VALID_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(executionRequest)
      });
      
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('Authorization'),
        status_code: 401
      });
    });

    it('should return 401 for invalid or expired tokens', async () => {
      const invalidToken = 'expired-or-invalid-token';
      
      const response = await fetch(`${API_BASE_URL}/queries/${VALID_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${invalidToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ parameters: {} })
      });
      
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent queries', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const response = await fetch(`${API_BASE_URL}/queries/${INVALID_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ parameters: {} })
      });
      
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data).toMatchObject({
        error: 'query_not_found',
        message: expect.stringContaining('not found'),
        query_id: INVALID_QUERY_ID
      });
    });
  });

  describe('Security & Data Protection', () => {
    it('should not leak sensitive information in error responses', async () => {
      const response = await fetch(`${API_BASE_URL}/queries/${VALID_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer malicious-probe-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ parameters: {} })
      });
      
      expect(response.status).toBe(401);
      const data = await response.json();
      
      // CONTRACT: Error messages must not expose internal details
      expect(data.message).not.toContain('database');
      expect(data.message).not.toContain('SQL');
      expect(data.message).not.toContain('internal');
      expect(data).not.toHaveProperty('stack');
      expect(data).not.toHaveProperty('query_definition');
    });

    it('should include security headers in response', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const response = await fetch(`${API_BASE_URL}/queries/${VALID_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ parameters: {} })
      });
      
      // CONTRACT: Security headers must be present
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      expect(response.headers.get('content-security-policy')).toContain('default-src');
    });

    it('should implement rate limiting for query execution', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      // CONTRACT: Should implement rate limiting for query execution
      const rapidRequests = Array(15).fill(null).map(() =>
        fetch(`${API_BASE_URL}/queries/${VALID_QUERY_ID}/execute`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ parameters: {} })
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

  describe('Response Performance', () => {
    it('should respond within acceptable time limits for simple queries', async () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6"kpXVCJ9.admin.token';
      
      const simpleRequest = {
        parameters: {
          simple_query: true
        }
      };
      
      const startTime = Date.now();
      
      const response = await fetch(`${API_BASE_URL}/queries/${VALID_QUERY_ID}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(simpleRequest)
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      
      // CONTRACT: Simple query execution should complete within 2 seconds
      expect(responseTime).toBeLessThan(2000);
      
      const data = await response.json();
      expect(data.execution_time_ms).toBeLessThan(1000);
    });
  });
});