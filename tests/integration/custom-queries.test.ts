import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { testConfig } from '../config';

describe('Integration: Custom Query Creation and Visualization', () => {
	let authTokens: Record<string, string> = {};
	let testQueries: Array<{ id: string; name: string; role: string }> = [];

	beforeEach(async () => {
		// Login as different roles to get auth tokens
		const roles = ['employee', 'manager', 'hr_manager', 'admin'];
		
		for (const role of roles) {
			const credentials = testConfig.users[role];
			const response = await fetch(`${testConfig.baseURL}/api/v2/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(credentials)
			});
			
			const data = await response.json();
			authTokens[role] = data.token;
		}
	});

	afterEach(async () => {
		// Clean up created test queries
		for (const query of testQueries) {
			try {
				await fetch(`${testConfig.baseURL}/api/v2/custom-queries/${query.id}`, {
					method: 'DELETE',
					headers: { 'Authorization': `Bearer ${authTokens.admin}` }
				});
			} catch (error) {
				// Ignore cleanup errors
			}
		}
		testQueries = [];
	});

	describe('Employee Custom Query Experience', () => {
		it('should deny query creation access', async () => {
			const queryData = {
				name: 'My Personal Performance',
				category: 'Personal',
				complexity_level: 'Basic',
				table_sources: ['employees'],
				raw_sql: "SELECT name, performance_score FROM employees WHERE id = @user_id",
				parameters: [{ name: 'user_id', type: 'string', required: true }]
			};

			const response = await fetch(`${testConfig.baseURL}/api/v2/custom-queries`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${authTokens.employee}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(queryData)
			});

			// CONTRACT: Employee should be denied query creation
			expect(response.status).toBe(403);
			
			const errorData = await response.json();
			expect(errorData.error).toMatch(/insufficient.*permissions|access.*denied/i);
			expect(errorData.required_permissions).toContain('queries:create');
		});

		it('should access pre-built queries only', async () => {
			// First, admin creates a pre-built query for employees
			const preBuiltQuery = {
				name: 'Employee Self-Service Dashboard',
				category: 'Self-Service',
				complexity_level: 'Basic',
				table_sources: ['employees', 'leave_requests'],
				raw_sql: "SELECT personal_info, leave_balance FROM employees WHERE id = @user_id",
				parameters: [{ name: 'user_id', type: 'string', required: true }],
				is_pre_built: true,
				allowed_roles: ['employee', 'manager', 'hr_manager', 'admin']
			};

			const createResponse = await fetch(`${testConfig.baseURL}/api/v2/custom-queries`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${authTokens.admin}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(preBuiltQuery)
			});

			expect(createResponse.status).toBe(201);
			const createdQuery = await createResponse.json();
			testQueries.push({ id: createdQuery.id, name: createdQuery.name, role: 'admin' });

			// Employee accesses pre-built queries
			const queriesResponse = await fetch(`${testConfig.baseURL}/api/v2/custom-queries`, {
				headers: { 'Authorization': `Bearer ${authTokens.employee}` }
			});

			expect(queriesResponse.status).toBe(200);
			const queriesData = await queriesResponse.json();

			// CONTRACT: Employee should only see pre-built queries they have access to
			expect(queriesData.queries).toBeInstanceOf(Array);
			expect(queriesData.queries.length).toBeGreaterThan(0);
			
			const availableQuery = queriesData.queries.find((q: any) => q.is_pre_built);
			expect(availableQuery).toBeDefined();
			expect(availableQuery.allowed_roles).toContain('employee');
		});

		it('should execute pre-built query with auto-populated user context', async () => {
			// Execute a pre-built employee query
			const executeResponse = await fetch(`${testConfig.baseURL}/api/v2/custom-queries/employee-dashboard/execute`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${authTokens.employee}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					parameters: {}, // User ID should be auto-populated from JWT
					visualization_options: {
						chart_type: 'personal_dashboard'
					}
				})
			});

			// CONTRACT: Employee should successfully execute personal queries
			expect(executeResponse.status).toBe(200);
			
			const resultData = await executeResponse.json();
			expect(resultData).toMatchObject({
				results: expect.any(Array),
				metadata: {
					execution_time_ms: expect.any(Number),
					row_count: expect.any(Number),
					user_context: {
						auto_filtered: true,
						user_id: expect.any(String)
					}
				}
			});

			// Results should be filtered to employee's own data only
			expect(resultData.results.every((row: any) => 
				row.employee_id === resultData.metadata.user_context.user_id
			)).toBe(true);
		});
	});

	describe('Manager Custom Query Experience', () => {
		it('should create department-scoped queries', async () => {
			const departmentQuery = {
				name: 'Team Performance Analysis',
				category: 'Team Management',
				complexity_level: 'Intermediate',
				table_sources: ['employees', 'performance_reviews', 'departments'],
				raw_sql: `
					SELECT e.name, e.position, pr.score, pr.review_date 
					FROM employees e
					JOIN performance_reviews pr ON e.id = pr.employee_id
					WHERE e.department_id = @manager_department_id
					AND pr.review_date >= @start_date
				`,
				parameters: [
					{ name: 'manager_department_id', type: 'string', required: true, auto_populate: 'manager_department' },
					{ name: 'start_date', type: 'date', required: true }
				],
				scope_restrictions: {
					department_scoped: true,
					data_access_level: 'team_only'
				}
			};

			const response = await fetch(`${testConfig.baseURL}/api/v2/custom-queries`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${authTokens.manager}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(departmentQuery)
			});

			// CONTRACT: Manager should successfully create department-scoped queries
			expect(response.status).toBe(201);
			
			const queryData = await response.json();
			expect(queryData).toMatchObject({
				id: expect.any(String),
				name: departmentQuery.name,
				category: departmentQuery.category,
				scope_restrictions: {
					department_scoped: true,
					data_access_level: 'team_only',
					created_by_role: 'manager'
				},
				validation: {
					sql_validated: true,
					security_checked: true,
					department_scope_enforced: true
				}
			});

			testQueries.push({ id: queryData.id, name: queryData.name, role: 'manager' });
		});

		it('should be denied cross-department data access', async () => {
			const crossDeptQuery = {
				name: 'All Departments Salary Analysis',
				category: 'Analytics',
				complexity_level: 'Advanced',
				table_sources: ['employees', 'departments', 'payroll'],
				raw_sql: `
					SELECT d.name as dept_name, AVG(e.salary) as avg_salary
					FROM employees e
					JOIN departments d ON e.department_id = d.id
					GROUP BY d.name
				`,
				parameters: []
			};

			const response = await fetch(`${testConfig.baseURL}/api/v2/custom-queries`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${authTokens.manager}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(crossDeptQuery)
			});

			// CONTRACT: Manager should be denied cross-department queries
			expect(response.status).toBe(403);
			
			const errorData = await response.json();
			expect(errorData.error).toMatch(/department.*scope|cross.*department.*denied/i);
			expect(errorData.violation_type).toBe('scope_restriction');
			expect(errorData.allowed_scope).toContain('department_scoped');
		});

		it('should execute team queries with automatic department filtering', async () => {
			// First create a manager query
			const managerQuery = {
				name: 'Team Productivity Dashboard',
				category: 'Team Management',
				complexity_level: 'Intermediate',
				table_sources: ['employees', 'productivity_metrics'],
				raw_sql: `
					SELECT e.name, pm.productivity_score, pm.month
					FROM employees e
					JOIN productivity_metrics pm ON e.id = pm.employee_id
					WHERE e.department_id = @manager_department_id
				`,
				parameters: [
					{ name: 'manager_department_id', type: 'string', required: true, auto_populate: 'manager_department' }
				]
			};

			const createResponse = await fetch(`${testConfig.baseURL}/api/v2/custom-queries`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${authTokens.manager}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(managerQuery)
			});

			const createdQuery = await createResponse.json();
			testQueries.push({ id: createdQuery.id, name: createdQuery.name, role: 'manager' });

			// Execute the query
			const executeResponse = await fetch(`${testConfig.baseURL}/api/v2/custom-queries/${createdQuery.id}/execute`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${authTokens.manager}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					parameters: {}, // Department ID auto-populated
					visualization_options: {
						chart_type: 'team_dashboard',
						grouping: 'by_month'
					}
				})
			});

			// CONTRACT: Manager should execute team-scoped queries successfully
			expect(executeResponse.status).toBe(200);
			
			const resultData = await executeResponse.json();
			expect(resultData).toMatchObject({
				results: expect.any(Array),
				metadata: {
					execution_time_ms: expect.any(Number),
					department_scope: {
						enforced: true,
						department_id: expect.any(String),
						manager_verified: true
					}
				}
			});

			// All results should be from manager's department only
			expect(resultData.metadata.department_scope.enforced).toBe(true);
		});
	});

	describe('HR Manager Custom Query Experience', () => {
		it('should create advanced HR analytics queries', async () => {
			const hrAnalyticsQuery = {
				name: 'Comprehensive HR Metrics Dashboard',
				category: 'HR Analytics',
				complexity_level: 'Expert',
				table_sources: ['employees', 'departments', 'performance_reviews', 'payroll', 'leave_requests', 'training_records'],
				raw_sql: `
					SELECT 
						d.name as department,
						COUNT(e.id) as employee_count,
						AVG(e.salary) as avg_salary,
						AVG(pr.score) as avg_performance,
						SUM(CASE WHEN lr.status = 'approved' THEN lr.days ELSE 0 END) as total_leave_days,
						COUNT(tr.id) as training_completions
					FROM employees e
					JOIN departments d ON e.department_id = d.id
					LEFT JOIN performance_reviews pr ON e.id = pr.employee_id 
						AND pr.review_date >= @start_date
					LEFT JOIN leave_requests lr ON e.id = lr.employee_id 
						AND lr.request_date >= @start_date
					LEFT JOIN training_records tr ON e.id = tr.employee_id 
						AND tr.completion_date >= @start_date
					GROUP BY d.id, d.name
					ORDER BY employee_count DESC
				`,
				parameters: [
					{ name: 'start_date', type: 'date', required: true, default: '2024-01-01' },
					{ name: 'end_date', type: 'date', required: false, default: 'current_date' }
				],
				visualization_config: {
					chart_type: 'executive_dashboard',
					widgets: [
						{ type: 'bar_chart', data_source: 'employee_count', title: 'Headcount by Department' },
						{ type: 'line_chart', data_source: 'avg_performance', title: 'Performance Trends' },
						{ type: 'pie_chart', data_source: 'total_leave_days', title: 'Leave Distribution' }
					]
				}
			};

			const response = await fetch(`${testConfig.baseURL}/api/v2/custom-queries`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${authTokens.hr_manager}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(hrAnalyticsQuery)
			});

			// CONTRACT: HR Manager should successfully create complex HR queries
			expect(response.status).toBe(201);
			
			const queryData = await response.json();
			expect(queryData).toMatchObject({
				id: expect.any(String),
				name: hrAnalyticsQuery.name,
				category: hrAnalyticsQuery.category,
				complexity_level: 'Expert',
				validation: {
					sql_validated: true,
					security_checked: true,
					hr_data_approved: true,
					complexity_authorized: true
				},
				access_level: 'hr_full'
			});

			testQueries.push({ id: queryData.id, name: queryData.name, role: 'hr_manager' });
		});

		it('should access payroll and sensitive HR data', async () => {
			const payrollQuery = {
				name: 'Payroll Analysis and Compliance',
				category: 'Payroll',
				complexity_level: 'Expert',
				table_sources: ['employees', 'payroll', 'tax_records', 'benefits'],
				raw_sql: `
					SELECT 
						e.employee_id,
						e.name,
						p.gross_pay,
						p.net_pay,
						p.tax_withholdings,
						b.benefit_contributions,
						tr.tax_status
					FROM employees e
					JOIN payroll p ON e.id = p.employee_id
					JOIN tax_records tr ON e.id = tr.employee_id
					LEFT JOIN benefits b ON e.id = b.employee_id
					WHERE p.pay_period = @pay_period
				`,
				parameters: [
					{ name: 'pay_period', type: 'string', required: true }
				],
				security_level: 'confidential',
				data_classification: 'pii_financial'
			};

			const response = await fetch(`${testConfig.baseURL}/api/v2/custom-queries`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${authTokens.hr_manager}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payrollQuery)
			});

			// CONTRACT: HR Manager should access sensitive payroll data
			expect(response.status).toBe(201);
			
			const queryData = await response.json();
			expect(queryData).toMatchObject({
				security_level: 'confidential',
				data_classification: 'pii_financial',
				access_granted: {
					payroll_access: true,
					tax_data_access: true,
					benefits_access: true,
					hr_manager_verified: true
				}
			});

			testQueries.push({ id: queryData.id, name: queryData.name, role: 'hr_manager' });
		});

		it('should be denied system administration queries', async () => {
			const systemQuery = {
				name: 'System User Management',
				category: 'System Administration',
				complexity_level: 'Expert',
				table_sources: ['users', 'roles', 'permissions', 'system_logs'],
				raw_sql: `
					SELECT u.username, r.role_name, p.permission_name, sl.last_login
					FROM users u
					JOIN user_roles ur ON u.id = ur.user_id
					JOIN roles r ON ur.role_id = r.id
					JOIN role_permissions rp ON r.id = rp.role_id
					JOIN permissions p ON rp.permission_id = p.id
					LEFT JOIN system_logs sl ON u.id = sl.user_id
				`,
				parameters: []
			};

			const response = await fetch(`${testConfig.baseURL}/api/v2/custom-queries`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${authTokens.hr_manager}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(systemQuery)
			});

			// CONTRACT: HR Manager should be denied system administration queries
			expect(response.status).toBe(403);
			
			const errorData = await response.json();
			expect(errorData.error).toMatch(/system.*administration|insufficient.*privileges/i);
			expect(errorData.restricted_tables).toContain('system_logs');
			expect(errorData.required_role).toBe('admin');
		});
	});

	describe('Administrator Custom Query Experience', () => {
		it('should create unrestricted system queries', async () => {
			const systemWideQuery = {
				name: 'Complete System Analytics Dashboard',
				category: 'System Administration',
				complexity_level: 'Expert',
				table_sources: ['employees', 'users', 'roles', 'permissions', 'system_logs', 'audit_trail', 'performance_metrics'],
				raw_sql: `
					SELECT 
						'users' as metric_type,
						COUNT(*) as total_count,
						COUNT(CASE WHEN last_login > NOW() - INTERVAL '30 days' THEN 1 END) as active_count
					FROM users
					UNION ALL
					SELECT 
						'employees' as metric_type,
						COUNT(*) as total_count,
						COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
					FROM employees
					UNION ALL
					SELECT 
						'system_events' as metric_type,
						COUNT(*) as total_count,
						COUNT(CASE WHEN severity = 'error' THEN 1 END) as active_count
					FROM system_logs 
					WHERE created_at > NOW() - INTERVAL '24 hours'
				`,
				parameters: [],
				access_level: 'system_admin',
				security_override: true
			};

			const response = await fetch(`${testConfig.baseURL}/api/v2/custom-queries`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${authTokens.admin}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(systemWideQuery)
			});

			// CONTRACT: Admin should create unrestricted system queries
			expect(response.status).toBe(201);
			
			const queryData = await response.json();
			expect(queryData).toMatchObject({
				id: expect.any(String),
				access_level: 'system_admin',
				security_override: true,
				validation: {
					unrestricted_access: true,
					admin_privilege_verified: true,
					system_table_access: true
				}
			});

			testQueries.push({ id: queryData.id, name: queryData.name, role: 'admin' });
		});

		it('should execute queries with complete data access', async () => {
			// Create and execute a comprehensive admin query
			const adminQuery = {
				name: 'Executive Data Intelligence',
				category: 'Executive',
				complexity_level: 'Expert',
				table_sources: ['employees', 'payroll', 'departments', 'financial_data'],
				raw_sql: `
					SELECT 
						d.name as department,
						COUNT(e.id) as headcount,
						SUM(e.salary) as total_payroll,
						AVG(e.salary) as avg_salary,
						fd.quarterly_budget,
						(SUM(e.salary) / fd.quarterly_budget * 100) as budget_utilization
					FROM employees e
					JOIN departments d ON e.department_id = d.id
					JOIN financial_data fd ON d.id = fd.department_id
					GROUP BY d.id, d.name, fd.quarterly_budget
				`,
				parameters: []
			};

			const createResponse = await fetch(`${testConfig.baseURL}/api/v2/custom-queries`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${authTokens.admin}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(adminQuery)
			});

			const createdQuery = await createResponse.json();
			testQueries.push({ id: createdQuery.id, name: createdQuery.name, role: 'admin' });

			// Execute the query
			const executeResponse = await fetch(`${testConfig.baseURL}/api/v2/custom-queries/${createdQuery.id}/execute`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${authTokens.admin}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					parameters: {},
					execution_options: {
						include_sensitive_data: true,
						override_data_filters: true
					},
					visualization_options: {
						chart_type: 'executive_dashboard'
					}
				})
			});

			// CONTRACT: Admin should execute queries with complete data access
			expect(executeResponse.status).toBe(200);
			
			const resultData = await executeResponse.json();
			expect(resultData).toMatchObject({
				results: expect.any(Array),
				metadata: {
					execution_time_ms: expect.any(Number),
					admin_access: {
						unrestricted_data: true,
						sensitive_data_included: true,
						financial_data_access: true
					}
				}
			});

			// Results should include sensitive financial data
			expect(resultData.results.length).toBeGreaterThan(0);
			expect(resultData.results[0]).toMatchObject({
				department: expect.any(String),
				total_payroll: expect.any(Number),
				quarterly_budget: expect.any(Number),
				budget_utilization: expect.any(Number)
			});
		});
	});

	describe('Query Visualization and Export', () => {
		it('should provide role-appropriate visualization options', async () => {
			// Create query as HR Manager
			const hrQuery = {
				name: 'Department Performance Visualization',
				category: 'HR Analytics',
				complexity_level: 'Intermediate',
				table_sources: ['employees', 'departments', 'performance_reviews'],
				raw_sql: "SELECT d.name, AVG(pr.score) as avg_score FROM departments d JOIN employees e ON d.id = e.department_id JOIN performance_reviews pr ON e.id = pr.employee_id GROUP BY d.name",
				parameters: []
			};

			const createResponse = await fetch(`${testConfig.baseURL}/api/v2/custom-queries`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${authTokens.hr_manager}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(hrQuery)
			});

			const createdQuery = await createResponse.json();
			testQueries.push({ id: createdQuery.id, name: createdQuery.name, role: 'hr_manager' });

			// Get visualization options
			const vizResponse = await fetch(`${testConfig.baseURL}/api/v2/custom-queries/${createdQuery.id}/visualization-options`, {
				headers: { 'Authorization': `Bearer ${authTokens.hr_manager}` }
			});

			expect(vizResponse.status).toBe(200);
			
			const vizOptions = await vizResponse.json();
			expect(vizOptions).toMatchObject({
				available_charts: expect.arrayContaining(['bar_chart', 'pie_chart', 'table']),
				export_formats: expect.arrayContaining(['pdf', 'excel', 'csv']),
				role_restrictions: {
					role: 'hr_manager',
					sensitive_data_charts: true,
					executive_dashboards: false // Only available to admins
				}
			});
		});

		it('should export query results in multiple formats', async () => {
			// Use admin to test all export formats
			const exportFormats = ['csv', 'excel', 'pdf', 'json'];
			
			for (const format of exportFormats) {
				const exportResponse = await fetch(`${testConfig.baseURL}/api/v2/custom-queries/system-metrics/export`, {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${authTokens.admin}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						format: format,
						parameters: {},
						options: {
							include_metadata: true,
							timestamp: true
						}
					})
				});

				// CONTRACT: Admin should successfully export in all formats
				expect(exportResponse.status).toBe(200);
				
				const contentType = exportResponse.headers.get('content-type');
				switch (format) {
					case 'csv':
						expect(contentType).toContain('text/csv');
						break;
					case 'excel':
						expect(contentType).toContain('application/vnd.openxmlformats');
						break;
					case 'pdf':
						expect(contentType).toContain('application/pdf');
						break;
					case 'json':
						expect(contentType).toContain('application/json');
						break;
				}
			}
		});

		it('should handle real-time query updates and streaming', async () => {
			// Create a real-time query
			const realtimeQuery = {
				name: 'Live System Monitoring',
				category: 'Monitoring',
				complexity_level: 'Advanced',
				table_sources: ['system_logs', 'performance_metrics'],
				raw_sql: `
					SELECT 
						DATE_TRUNC('minute', created_at) as time_bucket,
						COUNT(*) as event_count,
						AVG(response_time) as avg_response_time
					FROM system_logs 
					WHERE created_at >= NOW() - INTERVAL '1 hour'
					GROUP BY DATE_TRUNC('minute', created_at)
					ORDER BY time_bucket DESC
				`,
				parameters: [],
				real_time_config: {
					update_interval: 30, // seconds
					streaming_enabled: true,
					max_data_points: 120
				}
			};

			const createResponse = await fetch(`${testConfig.baseURL}/api/v2/custom-queries`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${authTokens.admin}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(realtimeQuery)
			});

			const createdQuery = await createResponse.json();
			testQueries.push({ id: createdQuery.id, name: createdQuery.name, role: 'admin' });

			// Initialize real-time connection
			const streamResponse = await fetch(`${testConfig.baseURL}/api/v2/custom-queries/${createdQuery.id}/stream`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${authTokens.admin}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					parameters: {},
					stream_options: {
						buffer_size: 50,
						compression: 'gzip'
					}
				})
			});

			// CONTRACT: Admin should successfully initialize real-time streaming
			expect(streamResponse.status).toBe(200);
			
			const streamData = await streamResponse.json();
			expect(streamData).toMatchObject({
				stream_id: expect.any(String),
				connection_url: expect.stringMatching(/^wss?:\/\//),
				configuration: {
					update_interval: 30,
					max_data_points: 120,
					compression: 'gzip'
				}
			});
		});
	});

	describe('Performance and Scaling', () => {
		it('should handle complex queries within performance limits', async () => {
			// Create a performance-intensive query
			const complexQuery = {
				name: 'Complex Performance Analysis',
				category: 'Analytics',
				complexity_level: 'Expert',
				table_sources: ['employees', 'performance_reviews', 'training_records', 'projects', 'time_tracking'],
				raw_sql: `
					WITH employee_metrics AS (
						SELECT 
							e.id,
							e.name,
							AVG(pr.score) as avg_performance,
							COUNT(tr.id) as training_count,
							SUM(tt.hours_worked) as total_hours
						FROM employees e
						LEFT JOIN performance_reviews pr ON e.id = pr.employee_id
						LEFT JOIN training_records tr ON e.id = tr.employee_id
						LEFT JOIN time_tracking tt ON e.id = tt.employee_id
						GROUP BY e.id, e.name
					)
					SELECT 
						em.*,
						RANK() OVER (ORDER BY avg_performance DESC) as performance_rank,
						NTILE(4) OVER (ORDER BY total_hours DESC) as productivity_quartile
					FROM employee_metrics em
					ORDER BY performance_rank
				`,
				parameters: [],
				performance_settings: {
					max_execution_time: 30, // seconds
					result_limit: 1000,
					memory_limit: '512MB'
				}
			};

			const startTime = Date.now();
			
			const response = await fetch(`${testConfig.baseURL}/api/v2/custom-queries`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${authTokens.admin}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(complexQuery)
			});

			const createdQuery = await response.json();
			testQueries.push({ id: createdQuery.id, name: createdQuery.name, role: 'admin' });

			// Execute the complex query
			const executeResponse = await fetch(`${testConfig.baseURL}/api/v2/custom-queries/${createdQuery.id}/execute`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${authTokens.admin}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					parameters: {}
				})
			});

			const endTime = Date.now();
			const executionTime = endTime - startTime;

			// CONTRACT: Complex queries should complete within performance limits
			expect(executeResponse.status).toBe(200);
			expect(executionTime).toBeLessThan(30000); // 30 seconds
			
			const resultData = await executeResponse.json();
			expect(resultData.metadata.execution_time_ms).toBeLessThan(30000);
			expect(resultData.results.length).toBeLessThanOrEqual(1000);
		});

		it('should handle concurrent query executions', async () => {
			// Create multiple concurrent query executions
			const concurrentRequests = Array.from({ length: 5 }, (_, i) => 
				fetch(`${testConfig.baseURL}/api/v2/custom-queries/employee-dashboard/execute`, {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${authTokens.hr_manager}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						parameters: { department_filter: `dept_${i}` }
					})
				})
			);

			const responses = await Promise.all(concurrentRequests);

			// CONTRACT: System should handle concurrent queries successfully
			expect(responses.every(r => r.status === 200 || r.status === 429)).toBe(true);
			
			// At least some requests should succeed
			const successfulResponses = responses.filter(r => r.status === 200);
			expect(successfulResponses.length).toBeGreaterThan(0);
		});
	});

	describe('Security and Validation', () => {
		it('should prevent SQL injection in custom queries', async () => {
			const maliciousQuery = {
				name: 'Malicious Query Attempt',
				category: 'Test',
				complexity_level: 'Basic',
				table_sources: ['employees'],
				raw_sql: "SELECT * FROM employees WHERE name = @name; DROP TABLE employees; --",
				parameters: [
					{ name: 'name', type: 'string', required: true }
				]
			};

			const response = await fetch(`${testConfig.baseURL}/api/v2/custom-queries`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${authTokens.hr_manager}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(maliciousQuery)
			});

			// CONTRACT: System should reject queries with SQL injection attempts
			expect(response.status).toBe(400);
			
			const errorData = await response.json();
			expect(errorData.error).toMatch(/sql.*injection|malicious.*query|security.*violation/i);
			expect(errorData.validation_errors).toContain('dangerous_sql_detected');
		});

		it('should validate parameter types and sanitization', async () => {
			// Create a query with various parameter types
			const parameterQuery = {
				name: 'Parameter Validation Test',
				category: 'Test',
				complexity_level: 'Intermediate',
				table_sources: ['employees'],
				raw_sql: `
					SELECT * FROM employees 
					WHERE salary BETWEEN @min_salary AND @max_salary
					AND hire_date >= @start_date
					AND department_id = @dept_id
					AND name LIKE @name_pattern
				`,
				parameters: [
					{ name: 'min_salary', type: 'number', required: true, min: 0, max: 1000000 },
					{ name: 'max_salary', type: 'number', required: true, min: 0, max: 1000000 },
					{ name: 'start_date', type: 'date', required: true },
					{ name: 'dept_id', type: 'uuid', required: true },
					{ name: 'name_pattern', type: 'string', required: false, max_length: 50 }
				]
			};

			const createResponse = await fetch(`${testConfig.baseURL}/api/v2/custom-queries`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${authTokens.hr_manager}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(parameterQuery)
			});

			const createdQuery = await createResponse.json();
			testQueries.push({ id: createdQuery.id, name: createdQuery.name, role: 'hr_manager' });

			// Test with invalid parameters
			const invalidParams = {
				min_salary: -1000, // Invalid: negative
				max_salary: 'not_a_number', // Invalid: wrong type
				start_date: 'invalid_date', // Invalid: wrong format
				dept_id: 'not_a_uuid', // Invalid: wrong format
				name_pattern: 'x'.repeat(100) // Invalid: too long
			};

			const executeResponse = await fetch(`${testConfig.baseURL}/api/v2/custom-queries/${createdQuery.id}/execute`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${authTokens.hr_manager}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					parameters: invalidParams
				})
			});

			// CONTRACT: System should validate and reject invalid parameters
			expect(executeResponse.status).toBe(400);
			
			const errorData = await executeResponse.json();
			expect(errorData.parameter_validation_errors).toBeInstanceOf(Array);
			expect(errorData.parameter_validation_errors.length).toBeGreaterThan(0);
		});

		it('should enforce rate limiting on query creation and execution', async () => {
			const queryTemplate = {
				name: 'Rate Limit Test Query',
				category: 'Test',
				complexity_level: 'Basic',
				table_sources: ['employees'],
				raw_sql: "SELECT COUNT(*) as employee_count FROM employees",
				parameters: []
			};

			// Attempt to create many queries rapidly
			const rapidRequests = Array.from({ length: 20 }, (_, i) =>
				fetch(`${testConfig.baseURL}/api/v2/custom-queries`, {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${authTokens.hr_manager}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						...queryTemplate,
						name: `${queryTemplate.name} ${i}`
					})
				})
			);

			const responses = await Promise.all(rapidRequests);

			// CONTRACT: System should apply rate limiting
			const rateLimitedResponses = responses.filter(r => r.status === 429);
			expect(rateLimitedResponses.length).toBeGreaterThan(0);

			// Some requests should have succeeded
			const successfulResponses = responses.filter(r => r.status === 201);
			expect(successfulResponses.length).toBeGreaterThan(0);
			expect(successfulResponses.length).toBeLessThan(responses.length);
		});
	});
});