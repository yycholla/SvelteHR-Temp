/**
 * GraphQL Queries, Mutations, and Subscriptions
 * Centralized collection of all GraphQL operations used in the application
 */

// Common fragments for reuse
export const fragments = {
	userInfo: `
		fragment UserInfo on User {
			id
			email
			name
			role
			department_id
			permissions
			created_at
			updated_at
			last_login
		}
	`,

	employeeBasic: `
		fragment EmployeeBasic on Employee {
			id
			employee_id
			first_name
			last_name
			full_name
			email
			phone
			position
			department {
				id
				name
			}
			status
			hire_date
		}
	`,

	employeeFull: `
		fragment EmployeeFull on Employee {
			id
			employee_id
			first_name
			last_name
			full_name
			email
			phone
			address
			position
			department {
				id
				name
				manager {
					id
					full_name
				}
			}
			manager {
				id
				full_name
			}
			status
			hire_date
			salary
			currency
			employment_type
			benefits {
				health_plan
				dental_plan
				retirement_contribution
				vacation_days
			}
			performance_reviews {
				id
				score
				review_date
				reviewer {
					id
					full_name
				}
				goals
				achievements
				areas_for_improvement
				notes
			}
			emergency_contacts {
				name
				relationship
				phone
				email
			}
			created_at
			updated_at
		}
	`,

	departmentInfo: `
		fragment DepartmentInfo on Department {
			id
			name
			description
			manager {
				id
				full_name
			}
			employee_count
			budget
			created_at
			updated_at
		}
	`,

	dashboardWidget: `
		fragment DashboardWidget on DashboardWidget {
			id
			type
			title
			data
			accessible
			priority
			requires_action
			sensitive_data
			last_updated
		}
	`,

	paginationInfo: `
		fragment PaginationInfo on PaginationInfo {
			page
			limit
			total
			total_pages
			has_next
			has_previous
		}
	`,

	permissionInfo: `
		fragment PermissionInfo on Permission {
			id
			name
			resource
			action
			description
		}
	`,

	roleInfo: `
		fragment RoleInfo on Role {
			id
			name
			description
			level
			permissions {
				...PermissionInfo
			}
			created_at
			updated_at
		}
	`
};

// Authentication Queries
export const authQueries = {
	me: `
		query Me {
			me {
				user {
					...UserInfo
				}
				authenticated
				permissions
				roles {
					...RoleInfo
				}
				session {
					id
					expires_at
					last_accessed
				}
			}
		}
		${fragments.userInfo}
		${fragments.roleInfo}
		${fragments.permissionInfo}
	`,

	verifyToken: `
		query VerifyToken {
			verifyToken {
				valid
				user {
					...UserInfo
				}
				expires_at
			}
		}
		${fragments.userInfo}
	`
};

// Employee Queries
export const employeeQueries = {
	employees: `
		query Employees(
			$page: Int
			$limit: Int
			$search: String
			$department_id: String
			$status: String
			$position: String
			$hire_date_from: String
			$hire_date_to: String
			$sort: String
			$order: String
		) {
			employees(
				page: $page
				limit: $limit
				search: $search
				department_id: $department_id
				status: $status
				position: $position
				hire_date_from: $hire_date_from
				hire_date_to: $hire_date_to
				sort: $sort
				order: $order
			) {
				data {
					...EmployeeBasic
				}
				pagination {
					...PaginationInfo
				}
			}
		}
		${fragments.employeeBasic}
		${fragments.paginationInfo}
	`,

	employee: `
		query Employee($id: ID!) {
			employee(id: $id) {
				...EmployeeFull
			}
		}
		${fragments.employeeFull}
	`,

	employeesByDepartment: `
		query EmployeesByDepartment($department_id: String!, $include_managers: Boolean = false) {
			employeesByDepartment(department_id: $department_id, include_managers: $include_managers) {
				...EmployeeBasic
			}
		}
		${fragments.employeeBasic}
	`,

	employeeSearch: `
		query EmployeeSearch($query: String!, $filters: EmployeeFilterInput) {
			employeeSearch(query: $query, filters: $filters) {
				results {
					...EmployeeBasic
				}
				facets {
					departments {
						value
						count
					}
					positions {
						value
						count
					}
					statuses {
						value
						count
					}
				}
				total_results
			}
		}
		${fragments.employeeBasic}
	`
};

// Department Queries
export const departmentQueries = {
	departments: `
		query Departments {
			departments {
				...DepartmentInfo
			}
		}
		${fragments.departmentInfo}
	`,

	department: `
		query Department($id: ID!) {
			department(id: $id) {
				...DepartmentInfo
				employees {
					...EmployeeBasic
				}
				metrics {
					total_employees
					avg_performance_score
					total_payroll
					budget_utilization
				}
			}
		}
		${fragments.departmentInfo}
		${fragments.employeeBasic}
	`,

	departmentMetrics: `
		query DepartmentMetrics($id: ID!, $date_range: DateRangeInput) {
			departmentMetrics(id: $id, date_range: $date_range) {
				department {
					...DepartmentInfo
				}
				employee_count
				performance_summary {
					average_score
					high_performers
					needs_improvement
				}
				financial_summary {
					total_payroll
					budget_allocated
					budget_used
					budget_remaining
				}
				trends {
					employee_growth
					performance_trend
					retention_rate
				}
			}
		}
		${fragments.departmentInfo}
	`
};

// Dashboard Queries
export const dashboardQueries = {
	dashboardData: `
		query DashboardData($role: String) {
			dashboardData(role: $role) {
				widgets {
					...DashboardWidget
				}
				user_role
				access_scope
				permissions
				metadata {
					last_updated
					refresh_interval
					realtime_enabled
				}
			}
		}
		${fragments.dashboardWidget}
	`,

	dashboardWidget: `
		query DashboardWidget($widget_id: String!) {
			dashboardWidget(widget_id: $widget_id) {
				...DashboardWidget
				refresh_url
				dependencies
			}
		}
		${fragments.dashboardWidget}
	`,

	systemHealth: `
		query SystemHealth {
			systemHealth {
				overall_status
				uptime
				active_sessions
				avg_response_time
				database_status
				api_status
				background_jobs_status
				last_updated
			}
		}
	`
};

// Custom Query System Queries
export const customQueryQueries = {
	customQueries: `
		query CustomQueries($category: String, $user_created: Boolean) {
			customQueries(category: $category, user_created: $user_created) {
				id
				name
				category
				complexity_level
				description
				is_pre_built
				allowed_roles
				table_sources
				parameters {
					name
					type
					required
					default_value
					validation_rules
				}
				created_by {
					id
					full_name
				}
				created_at
				last_executed
				execution_count
			}
		}
	`,

	customQuery: `
		query CustomQuery($id: ID!) {
			customQuery(id: $id) {
				id
				name
				category
				description
				complexity_level
				raw_sql
				parameters {
					name
					type
					required
					default_value
					auto_populate
					validation_rules
				}
				visualization_config {
					chart_type
					widgets {
						type
						data_source
						title
						options
					}
				}
				table_sources
				scope_restrictions {
					department_scoped
					data_access_level
				}
				is_pre_built
				allowed_roles
				security_level
				data_classification
				created_by {
					id
					full_name
				}
				created_at
				updated_at
			}
		}
	`,

	executeCustomQuery: `
		query ExecuteCustomQuery(
			$query_id: ID!
			$parameters: JSON
			$visualization_options: JSON
			$execution_options: JSON
		) {
			executeCustomQuery(
				query_id: $query_id
				parameters: $parameters
				visualization_options: $visualization_options
				execution_options: $execution_options
			) {
				results
				metadata {
					execution_time_ms
					row_count
					columns {
						name
						type
						nullable
					}
					query_plan
					cache_hit
					user_context {
						auto_filtered
						user_id
						department_scope
					}
				}
				visualization_data {
					chart_config
					processed_data
					suggested_visualizations
				}
			}
		}
	`
};

// RBAC and User Management Queries
export const rbacQueries = {
	roles: `
		query Roles($include_permissions: Boolean = true) {
			roles(include_permissions: $include_permissions) {
				...RoleInfo
			}
		}
		${fragments.roleInfo}
		${fragments.permissionInfo}
	`,

	permissions: `
		query Permissions($resource: String) {
			permissions(resource: $resource) {
				...PermissionInfo
			}
		}
		${fragments.permissionInfo}
	`,

	userPermissions: `
		query UserPermissions($user_id: ID!) {
			userPermissions(user_id: $user_id) {
				user {
					...UserInfo
				}
				effective_permissions {
					...PermissionInfo
				}
				role_permissions {
					role {
						...RoleInfo
					}
					permissions {
						...PermissionInfo
					}
				}
			}
		}
		${fragments.userInfo}
		${fragments.roleInfo}
		${fragments.permissionInfo}
	`,

	auditLogs: `
		query AuditLogs(
			$page: Int
			$limit: Int
			$category: String
			$user_id: String
			$action: String
			$date_from: String
			$date_to: String
		) {
			auditLogs(
				page: $page
				limit: $limit
				category: $category
				user_id: $user_id
				action: $action
				date_from: $date_from
				date_to: $date_to
			) {
				data {
					id
					timestamp
					category
					action
					user {
						id
						full_name
					}
					ip_address
					user_agent
					resource_type
					resource_id
					outcome
					details
					changes {
						field
						old_value
						new_value
					}
				}
				pagination {
					...PaginationInfo
				}
			}
		}
		${fragments.paginationInfo}
	`
};

// Navigation and UX Queries
export const navigationQueries = {
	navigationMenu: `
		query NavigationMenu($viewport: String) {
			navigationMenu(viewport: $viewport) {
				menu_items {
					key
					label
					url
					icon
					accessible
					category
					priority
					children {
						key
						label
						url
						accessible
					}
					metadata
				}
				role
				permissions_checked
				viewport
				navigation_type
			}
		}
	`,

	breadcrumbs: `
		query Breadcrumbs($path: String!) {
			breadcrumbs(path: $path) {
				breadcrumbs {
					label
					url
					active
				}
			}
		}
	`,

	searchSuggestions: `
		query SearchSuggestions($query: String!) {
			searchSuggestions(query: $query) {
				employees {
					id
					full_name
					position
					department
				}
				departments {
					id
					name
				}
				documents {
					id
					title
					type
				}
			}
		}
	`,

	globalSearch: `
		query GlobalSearch($query: String!, $filters: SearchFiltersInput, $limit: Int) {
			globalSearch(query: $query, filters: $filters, limit: $limit) {
				results {
					type
					id
					title
					description
					url
					relevance_score
					highlights
				}
				metadata {
					total_results
					search_scope
					filtered_by_role
					processing_time_ms
				}
				facets {
					type {
						value
						count
					}
					department {
						value
						count
					}
				}
			}
		}
	`
};

// Authentication Mutations
export const authMutations = {
	login: `
		mutation Login($email: String!, $password: String!, $remember: Boolean) {
			login(email: $email, password: $password, remember: $remember) {
				success
				user {
					...UserInfo
				}
				token
				refresh_token
				expires_at
				session_id
				requires_2fa
				partial_token
				error
			}
		}
		${fragments.userInfo}
	`,

	logout: `
		mutation Logout($all_devices: Boolean) {
			logout(all_devices: $all_devices) {
				success
				message
			}
		}
	`,

	refreshToken: `
		mutation RefreshToken {
			refreshToken {
				success
				token
				expires_at
				error
			}
		}
	`,

	verify2FA: `
		mutation Verify2FA($code: String!, $partial_token: String!) {
			verify2FA(code: $code, partial_token: $partial_token) {
				success
				user {
					...UserInfo
				}
				token
				expires_at
				session_id
				error
			}
		}
		${fragments.userInfo}
	`,

	resetPassword: `
		mutation ResetPassword($email: String!) {
			resetPassword(email: $email) {
				success
				message
			}
		}
	`,

	confirmResetPassword: `
		mutation ConfirmResetPassword($token: String!, $new_password: String!) {
			confirmResetPassword(token: $token, new_password: $new_password) {
				success
				message
				error
			}
		}
	`
};

// Employee Mutations
export const employeeMutations = {
	createEmployee: `
		mutation CreateEmployee($input: CreateEmployeeInput!) {
			createEmployee(input: $input) {
				...EmployeeFull
			}
		}
		${fragments.employeeFull}
	`,

	updateEmployee: `
		mutation UpdateEmployee($id: ID!, $input: UpdateEmployeeInput!) {
			updateEmployee(id: $id, input: $input) {
				...EmployeeFull
			}
		}
		${fragments.employeeFull}
	`,

	deleteEmployee: `
		mutation DeleteEmployee($id: ID!) {
			deleteEmployee(id: $id) {
				success
				message
			}
		}
	`,

	bulkUpdateEmployees: `
		mutation BulkUpdateEmployees($employee_ids: [ID!]!, $updates: BulkUpdateInput!) {
			bulkUpdateEmployees(employee_ids: $employee_ids, updates: $updates) {
				success
				affected_count
				results {
					employee_id
					success
					error
				}
				operation_id
				audit_log_id
			}
		}
	`,

	transferEmployee: `
		mutation TransferEmployee($employee_id: ID!, $new_department_id: ID!, $effective_date: String) {
			transferEmployee(
				employee_id: $employee_id
				new_department_id: $new_department_id
				effective_date: $effective_date
			) {
				success
				employee {
					...EmployeeFull
				}
				transfer_record {
					id
					from_department
					to_department
					effective_date
					reason
				}
			}
		}
		${fragments.employeeFull}
	`
};

// Custom Query Mutations
export const customQueryMutations = {
	createCustomQuery: `
		mutation CreateCustomQuery($input: CreateCustomQueryInput!) {
			createCustomQuery(input: $input) {
				id
				name
				category
				description
				raw_sql
				parameters {
					name
					type
					required
				}
				validation {
					sql_validated
					security_checked
					complexity_authorized
				}
				access_level
				created_at
			}
		}
	`,

	updateCustomQuery: `
		mutation UpdateCustomQuery($id: ID!, $input: UpdateCustomQueryInput!) {
			updateCustomQuery(id: $id, input: $input) {
				id
				name
				description
				raw_sql
				updated_at
			}
		}
	`,

	deleteCustomQuery: `
		mutation DeleteCustomQuery($id: ID!) {
			deleteCustomQuery(id: $id) {
				success
				message
			}
		}
	`,

	shareCustomQuery: `
		mutation ShareCustomQuery($query_id: ID!, $share_with: [String!]!, $permissions: [String!]!) {
			shareCustomQuery(query_id: $query_id, share_with: $share_with, permissions: $permissions) {
				success
				shared_with {
					user_id
					permissions
					shared_at
				}
			}
		}
	`
};

// Dashboard Mutations
export const dashboardMutations = {
	updateDashboardPreferences: `
		mutation UpdateDashboardPreferences($preferences: DashboardPreferencesInput!) {
			updateDashboardPreferences(preferences: $preferences) {
				success
				preferences {
					widget_order
					hidden_widgets
					refresh_interval
					compact_mode
				}
			}
		}
	`,

	refreshDashboardWidget: `
		mutation RefreshDashboardWidget($widget_id: String!) {
			refreshDashboardWidget(widget_id: $widget_id) {
				success
				widget {
					...DashboardWidget
				}
				refresh_time
			}
		}
		${fragments.dashboardWidget}
	`
};

// Subscription Queries for Real-time Updates
export const subscriptions = {
	employeeUpdates: `
		subscription EmployeeUpdates {
			employeeUpdates {
				type
				employee {
					...EmployeeBasic
				}
				timestamp
			}
		}
		${fragments.employeeBasic}
	`,

	dashboardUpdates: `
		subscription DashboardUpdates {
			dashboardUpdates {
				widget_id
				data
				timestamp
				update_type
			}
		}
	`,

	notifications: `
		subscription Notifications {
			notifications {
				id
				type
				title
				message
				priority
				read
				action_url
				created_at
				expires_at
			}
		}
	`,

	systemHealth: `
		subscription SystemHealthUpdates {
			systemHealthUpdates {
				status
				metric_name
				value
				timestamp
				alert_level
			}
		}
	`,

	auditLogStream: `
		subscription AuditLogStream {
			auditLogStream {
				id
				timestamp
				category
				action
				user {
					id
					full_name
				}
				resource_type
				outcome
			}
		}
	`
};

// Export all queries organized by category
export const queries = {
	auth: authQueries,
	employees: employeeQueries,
	departments: departmentQueries,
	dashboard: dashboardQueries,
	customQueries: customQueryQueries,
	rbac: rbacQueries,
	navigation: navigationQueries
};

export const mutations = {
	auth: authMutations,
	employees: employeeMutations,
	customQueries: customQueryMutations,
	dashboard: dashboardMutations
};

// Default export with all operations
export default {
	fragments,
	queries,
	mutations,
	subscriptions
};