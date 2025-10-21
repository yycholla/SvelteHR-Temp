# COMPLETE API ALIGNMENT ANALYSIS
**SvelteHR - Frontend → PostgreSQL → Rust GraphQL API**

**Generated: 2025-10-13 20:36:02**

---

## Executive Summary

- **GraphQL Operations**: 268
- **Database Tables**: 16
- **Rust Resolvers**: 337

- **Queries**: 137
- **Mutations**: 125
- **Subscriptions**: 6

---

## All GraphQL Operations

### src/lib/graphql/activity-logs-operations.ts

#### `GET_USER_ACTIVITIES` (QUERY)

**Arguments:**
- `$condition`
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `action`
- `allActivityLogs`
- `condition`
- `createdAt`
- `details`
- `employeeId`
- `first`
- `hasNextPage`
- `hasPreviousPage`
- `id`
- `ipAddress`
- `nodes`
- `offset`
- `orderBy`
- `pageInfo`
- `query`
- `resourceId`
- `resourceType`
- `totalCount`
- `userAgent`
- *... and 1 more*

```graphql
query GetUserActivities(
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [ActivityLogsOrderBy!] = [CREATED_AT_DESC]
		$condition: ActivityLogCondition
	) {
		allActivityLogs(
			first: $first
			offset: $offset
			orderBy: $orderBy
			condition: $condition
		) {
			nodes {
				id
				employeeId
				userId
				action
				resourceType
				resourceId
				details
				ipAddress
				userAgent
				createdAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
```

#### `GET_AUDIT_LOGS` (QUERY)

**Arguments:**
- `$condition`
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `action`
- `afterSnapshot`
- `allActivityLogs`
- `beforeSnapshot`
- `createdAt`
- `departmentByDepartmentId`
- `departmentId`
- `details`
- `displayName`
- `email`
- `employeeId`
- `hasNextPage`
- `hasPreviousPage`
- `id`
- `ipAddress`
- `isRollback`
- `name`
- `nodes`
- `pageInfo`
- `query`
- *... and 7 more*

```graphql
query GetAuditLogs(
		$first: Int = 100
		$offset: Int = 0
		$orderBy: [ActivityLogsOrderBy!] = [CREATED_AT_DESC]
		$condition: ActivityLogCondition
	) {
		allActivityLogs(first: $first, offset: $offset, orderBy: $orderBy, condition: $condition) {
			nodes {
				id
				employeeId
				userId
				userByEmployeeId {
					id
					displayName
					email
					departmentId
					departmentByDepartmentId {
						id
						name
					}
				}
				action
				resourceType
				resourceId
				details
				beforeSnapshot
				afterSnapshot
				isRollback
				rolledBackLogId
				ipAddress
				userAgent
				createdAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
```

#### `GET_RESOURCE_ACTIVITY_HISTORY` (QUERY)

**Arguments:**
- `$first`
- `$resourceId`
- `$resourceType`

**Fields Used:**
- `action`
- `allActivityLogs`
- `condition`
- `createdAt`
- `details`
- `displayName`
- `email`
- `employeeId`
- `first`
- `id`
- `nodes`
- `orderBy`
- `query`
- `resourceId`
- `resourceType`
- `totalCount`
- `userByEmployeeId`
- `userId`

```graphql
query GetResourceActivityHistory(
		$resourceType: String!
		$resourceId: UUID!
		$first: Int = 20
	) {
		allActivityLogs(
			first: $first
			condition: { resourceType: $resourceType, resourceId: $resourceId }
			orderBy: [CREATED_AT_DESC]
		) {
			nodes {
				id
				employeeId
				userId
				userByEmployeeId {
					id
					displayName
					email
				}
				action
				resourceType
				resourceId
				details
				createdAt
			}
			totalCount
		}
	}
```

#### `GET_ACTIVITIES_BY_DATE_RANGE` (QUERY)

**Arguments:**
- `$employeeId`
- `$first`

**Fields Used:**
- `action`
- `allActivityLogs`
- `condition`
- `createdAt`
- `details`
- `employeeId`
- `first`
- `id`
- `nodes`
- `orderBy`
- `query`
- `resourceId`
- `resourceType`
- `totalCount`
- `userId`

```graphql
query GetActivitiesByDateRange(
		$employeeId: UUID
		$first: Int = 1000
	) {
		allActivityLogs(
			first: $first
			condition: { employeeId: $employeeId }
			orderBy: [CREATED_AT_DESC]
		) {
			nodes {
				id
				employeeId
				userId
				action
				resourceType
				resourceId
				details
				createdAt
			}
			totalCount
		}
	}
```

#### `GET_ACTIVITY_LOG_BY_ID` (QUERY)

**Arguments:**
- `$id`

**Fields Used:**
- `action`
- `afterSnapshot`
- `allActivityLogs`
- `beforeSnapshot`
- `createdAt`
- `departmentByDepartmentId`
- `departmentId`
- `details`
- `displayName`
- `email`
- `employeeId`
- `id`
- `ipAddress`
- `isRollback`
- `name`
- `nodes`
- `query`
- `resourceId`
- `resourceType`
- `rolledBackLogId`
- *... and 3 more*

```graphql
query GetActivityLogById($id: UUID!) {
		allActivityLogs(condition: { id: $id }, first: 1) {
			nodes {
				id
				employeeId
				userId
				action
				resourceType
				resourceId
				beforeSnapshot
				afterSnapshot
				isRollback
				rolledBackLogId
				details
				createdAt
				ipAddress
				userAgent
				userByEmployeeId {
					id
					displayName
					email
					departmentId
					departmentByDepartmentId {
						id
						name
					}
				}
			}
		}
	}
```

### src/lib/graphql/auth-operations.ts

#### `LOGIN_MUTATION` (MUTATION)

**Arguments:**
- `$deviceInfo`
- `$email`
- `$password`

**Fields Used:**
- `action`
- `authenticate`
- `avatarUrl`
- `browser`
- `city`
- `country`
- `departmentId`
- `deviceInfo`
- `displayName`
- `email`
- `expiresAt`
- `firstName`
- `id`
- `ipAddress`
- `jwtToken`
- `lastName`
- `location`
- `mutation`
- `name`
- `nodes`
- *... and 11 more*

```graphql
mutation Login($email: String!, $password: String!, $deviceInfo: DeviceInfoInput) {
		authenticate(input: { email: $email, password: $password, deviceInfo: $deviceInfo }) {
			jwtToken
			refreshToken
			user {
				id
				email
				displayName
				roles {
					nodes {
						name
						permissions {
							nodes {
								resource
								action
							}
						}
					}
				}
				profile {
					firstName
					lastName
					avatarUrl
					departmentId
				}
			}
			expiresAt
			sessionInfo {
				sessionId
				deviceInfo {
					userAgent
					platform
					browser
					ipAddress
				}
				location {
					country
					city
					timezone
				}
			}
		}
	}
```

#### `REFRESH_TOKEN_MUTATION` (MUTATION)

**Arguments:**
- `$refreshToken`

**Fields Used:**
- `action`
- `displayName`
- `email`
- `expiresAt`
- `id`
- `jwtToken`
- `mutation`
- `name`
- `nodes`
- `permissions`
- `refreshToken`
- `resource`
- `roles`
- `user`

```graphql
mutation RefreshToken($refreshToken: String!) {
		refreshToken(input: { refreshToken: $refreshToken }) {
			jwtToken
			refreshToken
			expiresAt
			user {
				id
				email
				displayName
				roles {
					nodes {
						name
						permissions {
							nodes {
								resource
								action
							}
						}
					}
				}
			}
		}
	}
```

#### `LOGOUT_MUTATION` (MUTATION)

**Arguments:**
- `$sessionId`

**Fields Used:**
- `logout`
- `message`
- `mutation`
- `success`

```graphql
mutation Logout($sessionId: String!) {
		logout(input: { sessionId: $sessionId }) {
			success
			message
		}
	}
```

#### `VERIFY_TOKEN_QUERY` (QUERY)

**Fields Used:**
- `action`
- `avatarUrl`
- `currentUser`
- `departmentId`
- `displayName`
- `email`
- `expiresAt`
- `firstName`
- `id`
- `isActive`
- `isValid`
- `lastActiveAt`
- `lastName`
- `name`
- `nodes`
- `permissions`
- `profile`
- `query`
- `resource`
- `roles`
- *... and 2 more*

```graphql
query VerifyToken {
		currentUser {
			id
			email
			displayName
			isActive
			roles {
				nodes {
					name
					permissions {
						nodes {
							resource
							action
						}
					}
				}
			}
			profile {
				firstName
				lastName
				avatarUrl
				departmentId
			}
			sessionInfo {
				sessionId
				lastActiveAt
				isValid
				expiresAt
			}
		}
	}
```

### src/lib/graphql/dashboard-operations.ts

#### `GET_DASHBOARD_STATS` (QUERY)

**Fields Used:**
- `activeEmployees`
- `dashboardStats`
- `lastUpdated`
- `pendingLeaveRequests`
- `query`
- `recentHires`
- `totalDepartments`
- `totalEmployees`
- `upcomingReviews`

```graphql
query GetDashboardStats {
		dashboardStats {
			totalEmployees
			activeEmployees
			totalDepartments
			pendingLeaveRequests
			recentHires
			upcomingReviews
			lastUpdated
		}
	}
```

#### `GET_DASHBOARD_ANALYTICS` (QUERY)

**Arguments:**
- `$period`

**Fields Used:**
- `analytics`
- `approved`
- `averageRating`
- `change`
- `completedReviews`
- `count`
- `date`
- `department`
- `departmentDistribution`
- `employeeGrowth`
- `leaveAnalytics`
- `pending`
- `pendingReviews`
- `percentage`
- `performanceMetrics`
- `query`
- `rejected`
- `total`

```graphql
query GetDashboardAnalytics($period: String = "30d") {
		analytics(period: $period) {
			employeeGrowth {
				date
				count
				change
			}
			departmentDistribution {
				department
				count
				percentage
			}
			leaveAnalytics {
				approved
				pending
				rejected
				total
			}
			performanceMetrics {
				averageRating
				completedReviews
				pendingReviews
			}
		}
	}
```

#### `GET_RECENT_ACTIVITIES` (QUERY)

**Arguments:**
- `$limit`

**Fields Used:**
- `activityType`
- `createdAt`
- `description`
- `id`
- `metadata`
- `nodes`
- `query`
- `recentActivities`
- `severity`
- `totalCount`
- `userId`
- `userName`

```graphql
query GetRecentActivities($limit: Int = 10) {
		recentActivities(first: $limit, orderBy: CREATED_AT_DESC) {
			nodes {
				id
				activityType
				description
				userId
				userName
				createdAt
				metadata
				severity
			}
			totalCount
		}
	}
```

#### `GET_UPCOMING_EVENTS` (QUERY)

**Arguments:**
- `$days`

**Fields Used:**
- `assignedTo`
- `department`
- `description`
- `eventType`
- `id`
- `isCompleted`
- `nodes`
- `priority`
- `query`
- `scheduledDate`
- `title`
- `totalCount`
- `upcomingEvents`

```graphql
query GetUpcomingEvents($days: Int = 30) {
		upcomingEvents(daysAhead: $days) {
			nodes {
				id
				eventType
				title
				description
				scheduledDate
				priority
				assignedTo
				department
				isCompleted
			}
			totalCount
		}
	}
```

#### `GET_EMPLOYEE_QUICK_STATS` (QUERY)

**Fields Used:**
- `birthdaysThisMonth`
- `employeeStats`
- `newThisMonth`
- `onLeaveToday`
- `query`
- `remoteWorkingToday`
- `workAnniversaries`

```graphql
query GetEmployeeQuickStats {
		employeeStats {
			newThisMonth
			birthdaysThisMonth
			workAnniversaries
			onLeaveToday
			remoteWorkingToday
		}
	}
```

#### `GET_DEPARTMENT_PERFORMANCE` (QUERY)

**Fields Used:**
- `activeProjects`
- `allDepartments`
- `averageRating`
- `budgetUtilization`
- `employeeCount`
- `id`
- `month`
- `name`
- `nodes`
- `productivity`
- `query`
- `rating`
- `recentPerformance`

```graphql
query GetDepartmentPerformance {
		allDepartments(orderBy: NAME_ASC) {
			nodes {
				id
				name
				employeeCount
				averageRating
				budgetUtilization
				activeProjects
				recentPerformance {
					month
					rating
					productivity
				}
			}
		}
	}
```

#### `GET_PENDING_APPROVALS` (QUERY)

**Arguments:**
- `$userId`

**Fields Used:**
- `amount`
- `category`
- `dueDate`
- `employeeName`
- `endDate`
- `expenseReports`
- `id`
- `leaveRequests`
- `leaveType`
- `pendingApprovals`
- `performanceReviews`
- `query`
- `reason`
- `reviewPeriod`
- `startDate`
- `status`
- `submittedAt`

```graphql
query GetPendingApprovals($userId: UUID!) {
		pendingApprovals(managerId: $userId) {
			leaveRequests {
				id
				employeeName
				leaveType
				startDate
				endDate
				reason
				submittedAt
			}
			expenseReports {
				id
				employeeName
				amount
				category
				submittedAt
			}
			performanceReviews {
				id
				employeeName
				reviewPeriod
				dueDate
				status
			}
		}
	}
```

#### `GET_MY_DASHBOARD` (QUERY)

**Arguments:**
- `$userId`

**Fields Used:**
- `annual`
- `avatar`
- `createdAt`
- `date`
- `deadlines`
- `department`
- `description`
- `displayName`
- `id`
- `isRead`
- `jobTitle`
- `leaveBalance`
- `manager`
- `meetings`
- `message`
- `myDashboard`
- `notifications`
- `personal`
- `profile`
- `query`
- *... and 7 more*

```graphql
query GetMyDashboard($userId: UUID!) {
		myDashboard(userId: $userId) {
			profile {
				id
				displayName
				department
				jobTitle
				manager
				avatar
			}
			leaveBalance {
				annual
				sick
				personal
				used
				remaining
			}
			upcomingEvents {
				meetings
				reviews
				deadlines
			}
			recentActivities {
				id
				type
				description
				date
			}
			notifications {
				id
				message
				type
				isRead
				createdAt
			}
		}
	}
```

#### `GET_TEAM_DASHBOARD` (QUERY)

**Arguments:**
- `$managerId`

**Fields Used:**
- `assignee`
- `date`
- `dueDate`
- `employees`
- `id`
- `lastActive`
- `leaveCalendar`
- `leaveType`
- `name`
- `performance`
- `priority`
- `productivity`
- `query`
- `role`
- `satisfaction`
- `status`
- `task`
- `teamDashboard`
- `teamMembers`
- `teamMetrics`
- *... and 2 more*

```graphql
query GetTeamDashboard($managerId: UUID!) {
		teamDashboard(managerId: $managerId) {
			teamMembers {
				id
				name
				role
				status
				lastActive
			}
			teamMetrics {
				productivity
				satisfaction
				turnover
				performance
			}
			upcomingDeadlines {
				id
				task
				assignee
				dueDate
				priority
			}
			leaveCalendar {
				date
				employees {
					id
					name
					leaveType
				}
			}
		}
	}
```

#### `GET_SYSTEM_HEALTH` (QUERY)

**Fields Used:**
- `activeUsers`
- `application`
- `backup`
- `connections`
- `cpuUsage`
- `database`
- `integrations`
- `lastBackup`
- `lastSync`
- `memoryUsage`
- `name`
- `nextScheduled`
- `query`
- `responseTime`
- `status`
- `systemHealth`
- `uptime`

```graphql
query GetSystemHealth {
		systemHealth {
			database {
				status
				responseTime
				connections
			}
			application {
				uptime
				memoryUsage
				cpuUsage
				activeUsers
			}
			backup {
				lastBackup
				status
				nextScheduled
			}
			integrations {
				name
				status
				lastSync
			}
		}
	}
```

#### `GET_NOTIFICATIONS_SUMMARY` (QUERY)

**Arguments:**
- `$userId`

**Fields Used:**
- `actionUrl`
- `categories`
- `count`
- `createdAt`
- `id`
- `isRead`
- `lastReceived`
- `message`
- `nodes`
- `notificationsSummary`
- `query`
- `recent`
- `title`
- `type`
- `unreadCount`

```graphql
query GetNotificationsSummary($userId: UUID!) {
		notificationsSummary(userId: $userId) {
			unreadCount
			categories {
				type
				count
				lastReceived
			}
			recent(first: 5) {
				nodes {
					id
					title
					message
					type
					isRead
					createdAt
					actionUrl
				}
			}
		}
	}
```

#### `UPDATE_DASHBOARD_PREFERENCES` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `id`
- `layout`
- `mutation`
- `notifications`
- `preferences`
- `refreshInterval`
- `theme`
- `updateDashboardPreferences`
- `updatedAt`
- `userId`
- `widgets`

```graphql
mutation UpdateDashboardPreferences($input: UpdateDashboardPreferencesInput!) {
		updateDashboardPreferences(input: $input) {
			preferences {
				id
				userId
				layout
				widgets
				refreshInterval
				theme
				notifications
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `MARK_NOTIFICATION_READ` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `id`
- `isRead`
- `markNotificationRead`
- `mutation`
- `notification`
- `readAt`

```graphql
mutation MarkNotificationRead($input: MarkNotificationReadInput!) {
		markNotificationRead(input: $input) {
			notification {
				id
				isRead
				readAt
			}
			clientMutationId
		}
	}
```

#### `DISMISS_NOTIFICATION` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `dismissNotification`
- `dismissedAt`
- `id`
- `isDismissed`
- `mutation`
- `notification`

```graphql
mutation DismissNotification($input: DismissNotificationInput!) {
		dismissNotification(input: $input) {
			notification {
				id
				isDismissed
				dismissedAt
			}
			clientMutationId
		}
	}
```

#### `CREATE_DASHBOARD_WIDGET` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `configuration`
- `createDashboardWidget`
- `createdAt`
- `id`
- `isVisible`
- `mutation`
- `name`
- `position`
- `size`
- `type`
- `widget`

```graphql
mutation CreateDashboardWidget($input: CreateDashboardWidgetInput!) {
		createDashboardWidget(input: $input) {
			widget {
				id
				name
				type
				configuration
				position
				size
				isVisible
				createdAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_DASHBOARD_WIDGET` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `configuration`
- `id`
- `isVisible`
- `mutation`
- `name`
- `position`
- `size`
- `type`
- `updateDashboardWidget`
- `updatedAt`
- `widget`

```graphql
mutation UpdateDashboardWidget($input: UpdateDashboardWidgetInput!) {
		updateDashboardWidget(input: $input) {
			widget {
				id
				name
				type
				configuration
				position
				size
				isVisible
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `DELETE_DASHBOARD_WIDGET` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `deleteDashboardWidget`
- `id`
- `mutation`
- `widget`

```graphql
mutation DeleteDashboardWidget($input: DeleteDashboardWidgetInput!) {
		deleteDashboardWidget(input: $input) {
			widget {
				id
			}
			clientMutationId
		}
	}
```

#### `GET_DASHBOARD_CONFIG` (QUERY)

**Arguments:**
- `$userId`

**Fields Used:**
- `autoRefresh`
- `compactMode`
- `configuration`
- `dashboardConfig`
- `height`
- `id`
- `isVisible`
- `layout`
- `permissions`
- `position`
- `query`
- `refreshInterval`
- `showWelcome`
- `theme`
- `title`
- `type`
- `widgets`
- `width`
- `x`
- `y`

```graphql
query GetDashboardConfig($userId: UUID!) {
		dashboardConfig(userId: $userId) {
			id
			layout
			widgets {
				id
				type
				title
				configuration
				position {
					x
					y
					width
					height
				}
				isVisible
				permissions
			}
			theme
			refreshInterval
			autoRefresh
			showWelcome
			compactMode
		}
	}
```

#### `DASHBOARD_UPDATES_SUBSCRIPTION` (SUBSCRIPTION)

**Arguments:**
- `$userId`

**Fields Used:**
- `dashboardUpdates`
- `data`
- `priority`
- `subscription`
- `timestamp`
- `type`

```graphql
subscription DashboardUpdates($userId: UUID!) {
		dashboardUpdates(userId: $userId) {
			type
			data
			timestamp
			priority
		}
	}
```

### src/lib/graphql/department-operations.ts

#### `GET_DEPARTMENTS_QUERY` (QUERY)

**Arguments:**
- `$after`
- `$filter`
- `$first`
- `$orderBy`

**Fields Used:**
- `activeProjects`
- `address`
- `allocated`
- `annual`
- `averageSalary`
- `budget`
- `building`
- `childDepartments`
- `code`
- `createdAt`
- `departments`
- `description`
- `displayName`
- `email`
- `employeeCount`
- `employees`
- `endCursor`
- `floor`
- `hasNextPage`
- `hasPreviousPage`
- *... and 16 more*

```graphql
query GetDepartments(
		$first: Int
		$after: Cursor
		$filter: DepartmentFilter
		$orderBy: [DepartmentsOrderBy!]
	) {
		departments(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
			nodes {
				id
				name
				description
				code
				isActive
				createdAt
				updatedAt
				manager {
					id
					displayName
					email
				}
				parentDepartment {
					id
					name
				}
				childDepartments {
					nodes {
						id
						name
						employeeCount
					}
				}
				employees {
					totalCount
				}
				budget {
					annual
					allocated
					spent
					remaining
				}
				location {
					building
					floor
					address
				}
				metrics {
					employeeCount
					activeProjects
					averageSalary
					turnoverRate
				}
			}
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
			totalCount
		}
	}
```

#### `GET_DEPARTMENT_BY_ID_QUERY` (QUERY)

**Arguments:**
- `$id`

**Fields Used:**
- `activeProjects`
- `address`
- `allocated`
- `annual`
- `avatarUrl`
- `averageSalary`
- `budget`
- `building`
- `childDepartments`
- `city`
- `code`
- `createdAt`
- `currency`
- `department`
- `description`
- `displayName`
- `email`
- `employeeCount`
- `employees`
- `firstName`
- *... and 25 more*

```graphql
query GetDepartmentById($id: UUID!) {
		department(id: $id) {
			id
			name
			description
			code
			isActive
			createdAt
			updatedAt
			manager {
				id
				displayName
				email
				profile {
					firstName
					lastName
					avatarUrl
				}
			}
			parentDepartment {
				id
				name
				manager {
					displayName
				}
			}
			childDepartments {
				nodes {
					id
					name
					description
					manager {
						displayName
					}
					employees {
						totalCount
					}
				}
			}
			employees(first: 50) {
				nodes {
					id
					displayName
					email
					profile {
						firstName
						lastName
						avatarUrl
						jobTitle
						hireDate
					}
					roles {
						nodes {
							name
						}
					}
				}
				totalCount
			}
			budget {
				annual
				allocated
				spent
				remaining
				currency
				lastUpdated
			}
			location {
				building
				floor
				address
				city
				state
				zipCode
			}
			metrics {
				employeeCount
				activeProjects
				averageSalary
				turnoverRate
				performanceScore
				satisfaction
			}
		}
	}
```

#### `GET_DEPARTMENT_HIERARCHY_QUERY` (QUERY)

**Fields Used:**
- `childDepartments`
- `code`
- `departments`
- `description`
- `displayName`
- `employees`
- `id`
- `manager`
- `name`
- `nodes`
- `parentDepartment`
- `query`
- `totalCount`

```graphql
query GetDepartmentHierarchy {
		departments(filter: { isActive: true }, orderBy: [NAME_ASC]) {
			nodes {
				id
				name
				description
				code
				parentDepartment {
					id
					name
				}
				childDepartments {
					nodes {
						id
						name
						childDepartments {
							nodes {
								id
								name
							}
						}
					}
				}
				manager {
					id
					displayName
				}
				employees {
					totalCount
				}
			}
		}
	}
```

#### `CREATE_DEPARTMENT_MUTATION` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `address`
- `allocated`
- `annual`
- `budget`
- `building`
- `clientMutationId`
- `code`
- `createDepartment`
- `department`
- `description`
- `displayName`
- `floor`
- `id`
- `isActive`
- `location`
- `manager`
- `mutation`
- `name`
- `parentDepartment`

```graphql
mutation CreateDepartment($input: CreateDepartmentInput!) {
		createDepartment(input: $input) {
			department {
				id
				name
				description
				code
				isActive
				manager {
					id
					displayName
				}
				parentDepartment {
					id
					name
				}
				budget {
					annual
					allocated
				}
				location {
					building
					floor
					address
				}
			}
			clientMutationId
		}
	}
```

#### `UPDATE_DEPARTMENT_MUTATION` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `address`
- `allocated`
- `annual`
- `budget`
- `building`
- `clientMutationId`
- `code`
- `department`
- `description`
- `displayName`
- `floor`
- `id`
- `isActive`
- `location`
- `manager`
- `mutation`
- `name`
- `parentDepartment`
- `remaining`
- `spent`
- *... and 2 more*

```graphql
mutation UpdateDepartment($input: UpdateDepartmentInput!) {
		updateDepartment(input: $input) {
			department {
				id
				name
				description
				code
				isActive
				updatedAt
				manager {
					id
					displayName
				}
				parentDepartment {
					id
					name
				}
				budget {
					annual
					allocated
					spent
					remaining
				}
				location {
					building
					floor
					address
				}
			}
			clientMutationId
		}
	}
```

#### `DELETE_DEPARTMENT_MUTATION` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `deleteDepartment`
- `deletedDepartmentId`
- `mutation`

```graphql
mutation DeleteDepartment($input: DeleteDepartmentInput!) {
		deleteDepartment(input: $input) {
			deletedDepartmentId
			clientMutationId
		}
	}
```

### src/lib/graphql/employee-operations.ts

#### `GET_EMPLOYEES_QUERY` (QUERY)

**Arguments:**
- `$after`
- `$first`

**Fields Used:**
- `allUsers`
- `createdAt`
- `departmentByDepartmentId`
- `departmentId`
- `displayName`
- `email`
- `endCursor`
- `firstName`
- `hasNextPage`
- `hasPreviousPage`
- `hireDate`
- `id`
- `isActive`
- `lastName`
- `name`
- `nodes`
- `pageInfo`
- `query`
- `role`
- `startCursor`
- *... and 2 more*

```graphql
query GetEmployees(
		$first: Int
		$after: Cursor
	) {
		allUsers(first: $first, after: $after) {
			nodes {
				id
				email
				displayName
				firstName
				lastName
				role
				departmentId
				isActive
				hireDate
				createdAt
				updatedAt
				departmentByDepartmentId {
					id
					name
				}
			}
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
			totalCount
		}
	}
```

#### `GET_EMPLOYEE_BY_ID_QUERY` (QUERY)

**Arguments:**
- `$id`

**Fields Used:**
- `action`
- `address`
- `avatarUrl`
- `certifications`
- `city`
- `country`
- `createdAt`
- `credentialId`
- `dateOfBirth`
- `department`
- `description`
- `displayName`
- `email`
- `emergencyContact`
- `employee`
- `endorsements`
- `expiryDate`
- `firstName`
- `hireDate`
- `id`
- *... and 26 more*

```graphql
query GetEmployeeById($id: UUID!) {
		employee(id: $id) {
			id
			email
			displayName
			isActive
			createdAt
			updatedAt
			profile {
				firstName
				lastName
				phoneNumber
				avatarUrl
				dateOfBirth
				hireDate
				jobTitle
				salary
				department {
					id
					name
					description
				}
				manager {
					id
					displayName
					email
				}
				address {
					street
					city
					state
					zipCode
					country
				}
				emergencyContact {
					name
					relationship
					phoneNumber
					email
				}
				skills {
					nodes {
						name
						level
						endorsements
					}
				}
				certifications {
					nodes {
						name
						issuer
						issuedDate
						expiryDate
						credentialId
					}
				}
			}
			roles {
				nodes {
					name
					description
					permissions {
						nodes {
							resource
							action
							description
						}
					}
				}
			}
			performanceReviews {
				nodes {
					id
					reviewDate
					overallRating
					reviewer {
						displayName
					}
				}
			}
		}
	}
```

#### `GET_DEPARTMENTS_QUERY` (QUERY)

**Arguments:**
- `$after`
- `$first`

**Fields Used:**
- `allDepartments`
- `createdAt`
- `description`
- `endCursor`
- `hasNextPage`
- `hasPreviousPage`
- `id`
- `name`
- `nodes`
- `pageInfo`
- `query`
- `startCursor`
- `totalCount`
- `updatedAt`

```graphql
query GetDepartments($first: Int, $after: Cursor) {
		allDepartments(first: $first, after: $after) {
			nodes {
				id
				name
				description
				createdAt
				updatedAt
			}
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
			totalCount
		}
	}
```

#### `GET_EMPLOYEE_DASHBOARD_QUERY` (QUERY)

**Arguments:**
- `$employeeId`

**Fields Used:**
- `attendanceRate`
- `avatarUrl`
- `completedTasks`
- `createdAt`
- `department`
- `description`
- `displayName`
- `employee`
- `endDate`
- `firstName`
- `id`
- `jobTitle`
- `lastName`
- `metadata`
- `metrics`
- `name`
- `nodes`
- `pendingTasks`
- `profile`
- `query`
- *... and 6 more*

```graphql
query GetEmployeeDashboard($employeeId: UUID!) {
		employee(id: $employeeId) {
			id
			displayName
			profile {
				firstName
				lastName
				avatarUrl
				jobTitle
				department {
					name
				}
			}
			metrics {
				attendanceRate
				completedTasks
				pendingTasks
				upcomingReviews
			}
			recentActivities(first: 10) {
				nodes {
					id
					type
					description
					createdAt
					metadata
				}
			}
			upcomingEvents(first: 5) {
				nodes {
					id
					title
					startDate
					endDate
					type
				}
			}
		}
	}
```

#### `CREATE_EMPLOYEE_MUTATION` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `createEmployee`
- `department`
- `displayName`
- `email`
- `employee`
- `firstName`
- `hireDate`
- `id`
- `isActive`
- `jobTitle`
- `lastName`
- `manager`
- `mutation`
- `name`
- `phoneNumber`
- `profile`

```graphql
mutation CreateEmployee($input: CreateEmployeeInput!) {
		createEmployee(input: $input) {
			employee {
				id
				email
				displayName
				isActive
				profile {
					firstName
					lastName
					phoneNumber
					jobTitle
					hireDate
					department {
						id
						name
					}
					manager {
						id
						displayName
					}
				}
			}
			clientMutationId
		}
	}
```

#### `UPDATE_EMPLOYEE_MUTATION` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `address`
- `avatarUrl`
- `city`
- `clientMutationId`
- `country`
- `department`
- `displayName`
- `email`
- `emergencyContact`
- `employee`
- `firstName`
- `id`
- `isActive`
- `jobTitle`
- `lastName`
- `manager`
- `mutation`
- `name`
- `phoneNumber`
- `profile`
- *... and 6 more*

```graphql
mutation UpdateEmployee($input: UpdateEmployeeInput!) {
		updateEmployee(input: $input) {
			employee {
				id
				email
				displayName
				isActive
				updatedAt
				profile {
					firstName
					lastName
					phoneNumber
					avatarUrl
					jobTitle
					department {
						id
						name
					}
					manager {
						id
						displayName
					}
					address {
						street
						city
						state
						zipCode
						country
					}
					emergencyContact {
						name
						relationship
						phoneNumber
						email
					}
				}
			}
			clientMutationId
		}
	}
```

#### `DEACTIVATE_EMPLOYEE_MUTATION` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `deactivateEmployee`
- `employee`
- `id`
- `isActive`
- `mutation`
- `updatedAt`

```graphql
mutation DeactivateEmployee($input: DeactivateEmployeeInput!) {
		deactivateEmployee(input: $input) {
			employee {
				id
				isActive
				updatedAt
			}
			clientMutationId
		}
	}
```

### src/lib/graphql/events-operations.ts

#### `GET_ALL_EVENTS` (QUERY)

**Arguments:**
- `$condition`
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `allDay`
- `allEvents`
- `color`
- `createdAt`
- `description`
- `displayName`
- `email`
- `employeeId`
- `endCursor`
- `endTime`
- `eventAttendeesByEventId`
- `eventType`
- `hasNextPage`
- `hasPreviousPage`
- `id`
- `isPublic`
- `location`
- `nodeId`
- `nodes`
- `organizerId`
- *... and 12 more*

```graphql
query GetAllEvents(
		$first: Int = 20
		$offset: Int = 0
		$orderBy: [EventsOrderBy!] = [START_TIME_ASC]
		$condition: EventCondition
	) {
		allEvents(first: $first, offset: $offset, orderBy: $orderBy, condition: $condition) {
			nodes {
				id
				nodeId
				title
				description
				eventType
				startTime
				endTime
				allDay
				location
				organizerId
				userByOrganizerId {
					id
					displayName
					email
				}
				status
				color
				isPublic
				createdAt
				updatedAt
				eventAttendeesByEventId {
					nodes {
						id
						employeeId
						responseStatus
						reminderTime
						userByEmployeeId {
							id
							displayName
							email
						}
					}
				}
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
```

#### `GET_EVENT_BY_ID` (QUERY)

**Arguments:**
- `$id`

**Fields Used:**
- `allDay`
- `color`
- `createdAt`
- `description`
- `displayName`
- `email`
- `employeeId`
- `endTime`
- `eventAttendeesByEventId`
- `eventById`
- `eventType`
- `id`
- `isPublic`
- `isRequired`
- `location`
- `nodeId`
- `nodes`
- `organizerId`
- `query`
- `reminderTime`
- *... and 7 more*

```graphql
query GetEventById($id: UUID!) {
		eventById(id: $id) {
			id
			nodeId
			title
			description
			eventType
			startTime
			endTime
			allDay
			location
			organizerId
			userByOrganizerId {
				id
				displayName
				email
			}
			status
			color
			isPublic
			createdAt
			updatedAt
			eventAttendeesByEventId {
				nodes {
					id
					employeeId
					responseStatus
					isRequired
					reminderTime
					createdAt
					userByEmployeeId {
						id
						displayName
						email
					}
				}
			}
		}
	}
```

#### `GET_USER_EVENTS` (QUERY)

**Arguments:**
- `$employeeId`
- `$first`
- `$offset`

**Fields Used:**
- `allDay`
- `allEvents`
- `color`
- `createdAt`
- `description`
- `endTime`
- `eventAttendeesByEventId`
- `eventType`
- `first`
- `id`
- `isRequired`
- `location`
- `nodeId`
- `nodes`
- `offset`
- `orderBy`
- `organizerId`
- `query`
- `responseStatus`
- `startTime`
- *... and 3 more*

```graphql
query GetUserEvents(
		$employeeId: UUID
		$first: Int = 50
		$offset: Int = 0
	) {
		allEvents(
			first: $first
			offset: $offset
			orderBy: [START_TIME_ASC]
		) {
			nodes {
				id
				nodeId
				title
				description
				eventType
				startTime
				endTime
				allDay
				location
				organizerId
				status
				color
				eventAttendeesByEventId(condition: { employeeId: $employeeId }) {
					nodes {
						responseStatus
						isRequired
						createdAt
					}
				}
			}
			totalCount
		}
	}
```

#### `GET_UPCOMING_EVENTS` (QUERY)

**Arguments:**
- `$condition`
- `$first`

**Fields Used:**
- `allEvents`
- `condition`
- `endTime`
- `first`
- `id`
- `isPublic`
- `location`
- `nodeId`
- `nodes`
- `orderBy`
- `query`
- `startTime`
- `status`
- `title`
- `totalCount`

```graphql
query GetUpcomingEvents($first: Int = 10, $condition: EventCondition) {
		allEvents(
			first: $first
			condition: $condition
			orderBy: [START_TIME_ASC]
		) {
			nodes {
				id
				nodeId
				title
				startTime
				endTime
				location
				status
				isPublic
			}
			totalCount
		}
	}
```

#### `CREATE_EVENT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `allDay`
- `clientMutationId`
- `color`
- `createEvent`
- `createdAt`
- `description`
- `endTime`
- `event`
- `eventType`
- `id`
- `isPublic`
- `location`
- `mutation`
- `organizerId`
- `startTime`
- `status`
- `title`
- `updatedAt`

```graphql
mutation CreateEvent($input: CreateEventInput!) {
		createEvent(input: $input) {
			event {
				id
				title
				description
				eventType
				startTime
				endTime
				allDay
				location
				organizerId
				isPublic
				status
				color
				createdAt
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_EVENT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `allDay`
- `clientMutationId`
- `color`
- `description`
- `endTime`
- `event`
- `eventType`
- `id`
- `isPublic`
- `location`
- `mutation`
- `nodeId`
- `startTime`
- `status`
- `title`
- `updateEventById`
- `updatedAt`

```graphql
mutation UpdateEvent($input: UpdateEventByIdInput!) {
		updateEventById(input: $input) {
			event {
				id
				nodeId
				title
				description
				eventType
				startTime
				endTime
				allDay
				location
				isPublic
				status
				color
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `DELETE_EVENT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `deleteEvent`
- `deletedEventId`
- `mutation`

```graphql
mutation DeleteEvent($input: DeleteEventInput!) {
		deleteEvent(input: $input) {
			deletedEventId
			clientMutationId
		}
	}
```

#### `UPDATE_RSVP_STATUS` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `employeeId`
- `eventAttendee`
- `eventId`
- `id`
- `mutation`
- `respondedAt`
- `responseStatus`
- `updateEventAttendeeById`

```graphql
mutation UpdateRsvpStatus($input: UpdateEventAttendeeByIdInput!) {
		updateEventAttendeeById(input: $input) {
			eventAttendee {
				id
				eventId
				employeeId
				responseStatus
				respondedAt
			}
		}
	}
```

#### `INVITE_ATTENDEES` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `createEventAttendee`
- `createdAt`
- `employeeId`
- `eventAttendee`
- `eventId`
- `id`
- `isRequired`
- `mutation`
- `responseStatus`

```graphql
mutation InviteAttendees($input: CreateEventAttendeeInput!) {
		createEventAttendee(input: $input) {
			eventAttendee {
				id
				eventId
				employeeId
				responseStatus
				isRequired
				createdAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_EVENT_REMINDER` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `employeeId`
- `eventAttendee`
- `eventId`
- `id`
- `mutation`
- `responseStatus`
- `updateEventAttendeeById`

```graphql
mutation UpdateEventReminder($input: UpdateEventAttendeeByIdInput!) {
		updateEventAttendeeById(input: $input) {
			eventAttendee {
				id
				eventId
				employeeId
				responseStatus
			}
		}
	}
```

#### `GET_PENDING_REMINDERS` (QUERY)

**Fields Used:**
- `displayName`
- `email`
- `employee`
- `employeeId`
- `endTime`
- `event`
- `eventAttendees`
- `eventId`
- `id`
- `query`
- `reminderTime`
- `responseStatus`
- `startTime`
- `status`
- `title`

```graphql
query GetPendingReminders {
		eventAttendees(filter: { responseStatus: accepted }) {
			id
			employeeId
			eventId
			reminderTime
			responseStatus
			event {
				id
				title
				startTime
				endTime
				status
			}
			employee {
				id
				displayName
				email
			}
		}
	}
```

#### `CREATE_EVENT_NOTIFICATION` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `category`
- `createNotification`
- `createdAt`
- `deliveredAt`
- `id`
- `message`
- `mutation`
- `notification`
- `readStatus`
- `recipientId`
- `relatedResourceId`
- `relatedResourceType`
- `title`
- `type`

```graphql
mutation CreateEventNotification($input: CreateNotificationInput!) {
		createNotification(input: $input) {
			notification {
				id
				recipientId
				type
				category
				title
				message
				relatedResourceType
				relatedResourceId
				readStatus
				deliveredAt
				createdAt
			}
		}
	}
```

#### `GET_EVENTS_FOR_CALENDAR` (QUERY)

**Arguments:**
- `$bufferEnd`
- `$bufferStart`
- `$eventTypes`
- `$userId`
- `$visibilityFilter`

**Fields Used:**
- `allDay`
- `allEvents`
- `and`
- `color`
- `condition`
- `createdAt`
- `currentAcceptanceCount`
- `description`
- `displayName`
- `email`
- `endTime`
- `eventAttendeesByEventId`
- `eventType`
- `filter`
- `hasNextPage`
- `hasPreviousPage`
- `id`
- `imageAspectRatio`
- `imageUrl`
- `isPublic`
- *... and 20 more*

```graphql
query GetEventsForCalendar(
		$bufferStart: Datetime!
		$bufferEnd: Datetime!
		$userId: UUID!
		$eventTypes: [String!]
		$visibilityFilter: String
	) {
		allEvents(
			condition: {
				isPublic: true
			}
			filter: {
				or: [
					{
						# One-time events within buffer
						and: [
							{ recurrencePattern: { isNull: true } }
							{ startTime: { greaterThanOrEqualTo: $bufferStart } }
							{ startTime: { lessThanOrEqualTo: $bufferEnd } }
						]
					}
					{
						# Recurring events that overlap buffer
						and: [
							{ recurrencePattern: { isNull: false } }
							{ startTime: { lessThanOrEqualTo: $bufferEnd } }
							{ recurrenceEndDate: { greaterThanOrEqualTo: $bufferStart } }
						]
					}
				]
			}
			orderBy: START_TIME_ASC
		) {
			nodes {
				id
				nodeId
				title
				description
				eventType
				startTime
				endTime
				allDay
				location
				organizerId
				userByOrganizerId {
					id
					displayName
					email
				}
				status
				color
				isPublic
				maxCapacity
				currentAcceptanceCount
				recurrencePattern
				recurrenceEndDate
				imageUrl
				imageAspectRatio
				createdAt
				updatedAt
				# User's RSVP status for this event
				eventAttendeesByEventId(condition: { employeeId: $userId }) {
					nodes {
						id
						responseStatus
						scope
						reminderTime
					}
				}
				# Acceptance count for conflict detection
				eventAttendeesByEventId(condition: { responseStatus: "accepted" }) {
					totalCount
				}
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
```

#### `GET_EVENT_DETAILS` (QUERY)

**Arguments:**
- `$eventId`
- `$userId`

**Fields Used:**
- `allDay`
- `color`
- `createdAt`
- `currentAcceptanceCount`
- `description`
- `displayName`
- `email`
- `employeeId`
- `endTime`
- `eventAttendeesByEventId`
- `eventById`
- `eventType`
- `eventWaitlistsByEventId`
- `id`
- `imageAspectRatio`
- `imageUrl`
- `isOrganizer`
- `isPublic`
- `jobTitle`
- `joinedAt`
- *... and 20 more*

```graphql
query GetEventDetails($eventId: UUID!, $userId: UUID!) {
		eventById(id: $eventId) {
			id
			nodeId
			title
			description
			eventType
			startTime
			endTime
			allDay
			location
			organizerId
			userByOrganizerId {
				id
				displayName
				email
			}
			status
			color
			isPublic
			maxCapacity
			currentAcceptanceCount
			recurrencePattern
			recurrenceEndDate
			imageUrl
			imageAspectRatio
			createdAt
			updatedAt
			# All attendees with full details
			eventAttendeesByEventId {
				nodes {
					id
					employeeId
					responseStatus
					scope
					reminderTime
					isOrganizer
					respondedAt
					userByEmployeeId {
						id
						displayName
						email
						jobTitle
					}
				}
				totalCount
			}
			# Waitlist entries
			eventWaitlistsByEventId(orderBy: POSITION_ASC) {
				nodes {
					id
					employeeId
					position
					joinedAt
					userByEmployeeId {
						id
						displayName
						email
					}
				}
				totalCount
			}
			# User's specific RSVP
			eventAttendeesByEventId(condition: { employeeId: $userId }) {
				nodes {
					id
					responseStatus
					scope
					reminderTime
				}
			}
		}
	}
```

#### `GET_NOTIFICATION_PREFERENCES` (QUERY)

**Arguments:**
- `$userId`

**Fields Used:**
- `eventNotificationPreferences`
- `id`
- `query`
- `userById`

```graphql
query GetNotificationPreferences($userId: UUID!) {
		userById(id: $userId) {
			id
			eventNotificationPreferences
		}
	}
```

#### `CREATE_EVENT_FULL` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `allDay`
- `clientMutationId`
- `color`
- `createEvent`
- `createdAt`
- `description`
- `endTime`
- `event`
- `eventType`
- `id`
- `imageAspectRatio`
- `imageUrl`
- `isPublic`
- `location`
- `maxCapacity`
- `mutation`
- `nodeId`
- `organizerId`
- `recurrenceEndDate`
- `recurrencePattern`
- *... and 4 more*

```graphql
mutation CreateEventFull($input: CreateEventInput!) {
		createEvent(input: $input) {
			event {
				id
				nodeId
				title
				description
				eventType
				startTime
				endTime
				allDay
				location
				organizerId
				status
				color
				isPublic
				maxCapacity
				recurrencePattern
				recurrenceEndDate
				imageUrl
				imageAspectRatio
				createdAt
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_EVENT_FULL` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `allDay`
- `clientMutationId`
- `color`
- `description`
- `endTime`
- `event`
- `eventType`
- `id`
- `imageAspectRatio`
- `imageUrl`
- `isPublic`
- `location`
- `maxCapacity`
- `mutation`
- `nodeId`
- `recurrenceEndDate`
- `recurrencePattern`
- `startTime`
- `status`
- `title`
- *... and 2 more*

```graphql
mutation UpdateEventFull($input: UpdateEventByIdInput!) {
		updateEventById(input: $input) {
			event {
				id
				nodeId
				title
				description
				eventType
				startTime
				endTime
				allDay
				location
				status
				color
				isPublic
				maxCapacity
				recurrencePattern
				recurrenceEndDate
				imageUrl
				imageAspectRatio
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `RSVP_TO_EVENT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `employeeId`
- `eventAttendee`
- `eventId`
- `id`
- `mutation`
- `respondedAt`
- `responseStatus`
- `scope`
- `updateEventAttendeeById`

```graphql
mutation RsvpToEvent($input: UpdateEventAttendeeByIdInput!) {
		updateEventAttendeeById(input: $input) {
			eventAttendee {
				id
				eventId
				employeeId
				responseStatus
				scope
				respondedAt
			}
			clientMutationId
		}
	}
```

#### `JOIN_WAITLIST` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `createEventWaitlist`
- `employeeId`
- `eventId`
- `eventWaitlist`
- `id`
- `joinedAt`
- `mutation`
- `position`

```graphql
mutation JoinWaitlist($input: CreateEventWaitlistInput!) {
		createEventWaitlist(input: $input) {
			eventWaitlist {
				id
				eventId
				employeeId
				position
				joinedAt
			}
			clientMutationId
		}
	}
```

#### `POST_EVENT_COMMENT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `content`
- `createEventComment`
- `createdAt`
- `displayName`
- `employeeId`
- `eventComment`
- `eventId`
- `id`
- `mentions`
- `mutation`
- `userByEmployeeId`

```graphql
mutation PostEventComment($input: CreateEventCommentInput!) {
		createEventComment(input: $input) {
			eventComment {
				id
				eventId
				employeeId
				content
				mentions
				createdAt
				userByEmployeeId {
					id
					displayName
				}
			}
			clientMutationId
		}
	}
```

#### `UPDATE_NOTIFICATION_PREFERENCES` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `eventNotificationPreferences`
- `id`
- `mutation`
- `updateUserById`
- `user`

```graphql
mutation UpdateNotificationPreferences($input: UpdateUserByIdInput!) {
		updateUserById(input: $input) {
			user {
				id
				eventNotificationPreferences
			}
			clientMutationId
		}
	}
```

#### `UPLOAD_EVENT_IMAGE` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `aspectRatio`
- `clientMutationId`
- `imageUrl`
- `mutation`
- `uploadEventImage`

```graphql
mutation UploadEventImage($input: UploadEventImageInput!) {
		uploadEventImage(input: $input) {
			imageUrl
			aspectRatio
			clientMutationId
		}
	}
```

#### `RESCHEDULE_EVENT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `affectedOccurrences`
- `clientMutationId`
- `endTime`
- `event`
- `id`
- `mutation`
- `rescheduleEvent`
- `startTime`
- `updatedAt`

```graphql
mutation RescheduleEvent($input: RescheduleEventInput!) {
		rescheduleEvent(input: $input) {
			event {
				id
				startTime
				endTime
				updatedAt
			}
			affectedOccurrences
			clientMutationId
		}
	}
```

#### `ON_EVENT_UPDATE` (SUBSCRIPTION)

**Arguments:**
- `$eventId`

**Fields Used:**
- `currentAcceptanceCount`
- `endTime`
- `event`
- `eventUpdated`
- `id`
- `startTime`
- `status`
- `subscription`
- `title`
- `updateType`
- `updatedAt`
- `userId`

```graphql
subscription OnEventUpdate($eventId: UUID!) {
		eventUpdated(eventId: $eventId) {
			event {
				id
				title
				startTime
				endTime
				status
				currentAcceptanceCount
				updatedAt
			}
			updateType
			userId
		}
	}
```

#### `ON_WAITLIST_PROMOTION` (SUBSCRIPTION)

**Arguments:**
- `$userId`

**Fields Used:**
- `eventId`
- `eventTitle`
- `newPosition`
- `promoted`
- `subscription`
- `waitlistPromoted`

```graphql
subscription OnWaitlistPromotion($userId: UUID!) {
		waitlistPromoted(userId: $userId) {
			eventId
			eventTitle
			newPosition
			promoted
		}
	}
```

#### `GET_EVENT_COMMENTS` (QUERY)

**Arguments:**
- `$eventId`
- `$limit`
- `$offset`

**Fields Used:**
- `allEventComments`
- `condition`
- `content`
- `createdAt`
- `displayName`
- `employeeId`
- `eventId`
- `first`
- `hasNextPage`
- `hasPreviousPage`
- `id`
- `mentions`
- `nodes`
- `offset`
- `orderBy`
- `pageInfo`
- `query`
- `totalCount`
- `updatedAt`
- `userByEmployeeId`

```graphql
query GetEventComments($eventId: UUID!, $limit: Int = 20, $offset: Int = 0) {
		allEventComments(
			condition: { eventId: $eventId }
			first: $limit
			offset: $offset
			orderBy: CREATED_AT_DESC
		) {
			nodes {
				id
				eventId
				employeeId
				content
				mentions
				createdAt
				updatedAt
				userByEmployeeId {
					id
					displayName
				}
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
```

#### `GET_EVENT_HISTORY` (QUERY)

**Arguments:**
- `$eventId`
- `$limit`
- `$offset`

**Fields Used:**
- `allEventHistories`
- `changeType`
- `changedBy`
- `condition`
- `createdAt`
- `displayName`
- `eventId`
- `fieldName`
- `first`
- `hasNextPage`
- `hasPreviousPage`
- `id`
- `newValue`
- `nodes`
- `offset`
- `oldValue`
- `orderBy`
- `pageInfo`
- `query`
- `totalCount`
- *... and 1 more*

```graphql
query GetEventHistory($eventId: UUID!, $limit: Int = 25, $offset: Int = 0) {
		allEventHistories(
			condition: { eventId: $eventId }
			first: $limit
			offset: $offset
			orderBy: CREATED_AT_DESC
		) {
			nodes {
				id
				eventId
				changedBy
				fieldName
				oldValue
				newValue
				changeType
				createdAt
				userByChangedBy {
					id
					displayName
				}
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
```

#### `GET_USER_WAITLIST_STATUS` (QUERY)

**Arguments:**
- `$eventId`
- `$userId`

**Fields Used:**
- `allEventWaitlists`
- `id`
- `joinedAt`
- `nodes`
- `position`
- `query`

```graphql
query GetUserWaitlistStatus($eventId: UUID!, $userId: UUID!) {
		allEventWaitlists(condition: { eventId: $eventId, employeeId: $userId }) {
			nodes {
				id
				position
				joinedAt
			}
		}
	}
```

#### `CREATE_EVENT_COMMENT` (MUTATION)

**Arguments:**
- `$content`
- `$employeeId`
- `$eventId`
- `$mentions`

**Fields Used:**
- `content`
- `createEventComment`
- `createdAt`
- `displayName`
- `eventComment`
- `id`
- `input`
- `mentions`
- `mutation`
- `userByEmployeeId`

```graphql
mutation CreateEventComment($eventId: UUID!, $employeeId: UUID!, $content: String!, $mentions: [UUID]) {
		createEventComment(
			input: {
				eventComment: { eventId: $eventId, employeeId: $employeeId, content: $content, mentions: $mentions }
			}
		) {
			eventComment {
				id
				content
				mentions
				createdAt
				userByEmployeeId {
					id
					displayName
				}
			}
		}
	}
```

#### `UPDATE_EVENT_COMMENT` (MUTATION)

**Arguments:**
- `$commentId`
- `$content`
- `$mentions`

**Fields Used:**
- `content`
- `displayName`
- `eventComment`
- `id`
- `input`
- `mentions`
- `mutation`
- `updateEventCommentById`
- `updatedAt`
- `userByEmployeeId`

```graphql
mutation UpdateEventComment($commentId: UUID!, $content: String!, $mentions: [UUID]) {
		updateEventCommentById(
			input: { id: $commentId, eventCommentPatch: { content: $content, mentions: $mentions } }
		) {
			eventComment {
				id
				content
				mentions
				updatedAt
				userByEmployeeId {
					id
					displayName
				}
			}
		}
	}
```

#### `DELETE_EVENT_COMMENT` (MUTATION)

**Arguments:**
- `$commentId`

**Fields Used:**
- `deleteEventCommentById`
- `deletedEventCommentId`
- `mutation`

```graphql
mutation DeleteEventComment($commentId: UUID!) {
		deleteEventCommentById(input: { id: $commentId }) {
			deletedEventCommentId
		}
	}
```

#### `JOIN_EVENT_WAITLIST` (MUTATION)

**Arguments:**
- `$eventId`

**Fields Used:**
- `createEventWaitlist`
- `eventWaitlist`
- `id`
- `joinedAt`
- `mutation`
- `position`

```graphql
mutation JoinEventWaitlist($eventId: UUID!) {
		createEventWaitlist(input: { eventWaitlist: { eventId: $eventId } }) {
			eventWaitlist {
				id
				position
				joinedAt
			}
		}
	}
```

#### `LEAVE_EVENT_WAITLIST` (MUTATION)

**Arguments:**
- `$eventId`
- `$userId`

**Fields Used:**
- `deleteEventWaitlist`
- `deletedEventWaitlistId`
- `mutation`

```graphql
mutation LeaveEventWaitlist($eventId: UUID!, $userId: UUID!) {
		deleteEventWaitlist(input: { condition: { eventId: $eventId, employeeId: $userId } }) {
			deletedEventWaitlistId
		}
	}
```

### src/lib/graphql/goals-okrs-operations.ts

#### `GET_EMPLOYEE_GOALS` (QUERY)

**Arguments:**
- `$filter`
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `completedAt`
- `createdAt`
- `createdBy`
- `creator`
- `department`
- `description`
- `displayName`
- `email`
- `employee`
- `employeeGoals`
- `employeeId`
- `endCursor`
- `hasNextPage`
- `hasPreviousPage`
- `id`
- `jobTitle`
- `name`
- `nodes`
- `pageInfo`
- `priority`
- *... and 10 more*

```graphql
query GetEmployeeGoals(
		$first: Int = 20
		$offset: Int = 0
		$orderBy: [EmployeeGoalsOrderBy!] = [TARGET_DATE_ASC]
		$filter: EmployeeGoalFilter
	) {
		employeeGoals(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
				id
				employeeId
				employee {
					id
					displayName
					email
					jobTitle
					department {
						id
						name
					}
				}
				title
				description
				targetDate
				progress
				status
				priority
				quarter
				year
				createdBy
				creator {
					id
					displayName
					email
				}
				createdAt
				updatedAt
				completedAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
```

#### `GET_EMPLOYEE_GOAL_BY_ID` (QUERY)

**Arguments:**
- `$id`

**Fields Used:**
- `completedAt`
- `createdAt`
- `createdBy`
- `creator`
- `department`
- `description`
- `displayName`
- `email`
- `employee`
- `employeeGoal`
- `employeeId`
- `id`
- `jobTitle`
- `name`
- `priority`
- `progress`
- `quarter`
- `query`
- `status`
- `targetDate`
- *... and 3 more*

```graphql
query GetEmployeeGoalById($id: UUID!) {
		employeeGoal(id: $id) {
			id
			employeeId
			employee {
				id
				displayName
				email
				jobTitle
				department {
					id
					name
				}
			}
			title
			description
			targetDate
			progress
			status
			priority
			quarter
			year
			createdBy
			creator {
				id
				displayName
				email
			}
			createdAt
			updatedAt
			completedAt
		}
	}
```

#### `GET_GOAL_STATISTICS` (QUERY)

**Arguments:**
- `$departmentId`

**Fields Used:**
- `activeGoals`
- `completedGoals`
- `employee`
- `filter`
- `highPriorityGoals`
- `nodes`
- `overdueGoals`
- `progress`
- `query`
- `status`
- `targetDate`
- `totalCount`
- `totalGoals`

```graphql
query GetGoalStatistics($departmentId: UUID!) {
		totalGoals: employeeGoals(filter: { employee: { departmentId: { equalTo: $departmentId } } }) {
			totalCount
		}
		activeGoals: employeeGoals(
			filter: {
				status: { equalTo: "in_progress" }
				employee: { departmentId: { equalTo: $departmentId } }
			}
		) {
			totalCount
			nodes {
				progress
			}
		}
		completedGoals: employeeGoals(
			filter: {
				status: { equalTo: "completed" }
				employee: { departmentId: { equalTo: $departmentId } }
			}
		) {
			totalCount
		}
		overdueGoals: employeeGoals(
			filter: {
				status: { in: ["not_started", "in_progress"] }
				targetDate: { lessThan: "now()" }
				employee: { departmentId: { equalTo: $departmentId } }
			}
		) {
			totalCount
		}
		highPriorityGoals: employeeGoals(
			filter: { priority: { equalTo: "high" }, employee: { departmentId: { equalTo: $departmentId } } }
		) {
			totalCount
		}
	}
```

#### `CREATE_EMPLOYEE_GOAL` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `createEmployeeGoal`
- `createdAt`
- `createdBy`
- `creator`
- `description`
- `displayName`
- `email`
- `employee`
- `employeeGoal`
- `employeeId`
- `id`
- `jobTitle`
- `mutation`
- `priority`
- `progress`
- `quarter`
- `status`
- `targetDate`
- `title`
- *... and 1 more*

```graphql
mutation CreateEmployeeGoal($input: CreateEmployeeGoalInput!) {
		createEmployeeGoal(input: $input) {
			employeeGoal {
				id
				employeeId
				employee {
					id
					displayName
					email
					jobTitle
				}
				title
				description
				targetDate
				progress
				status
				priority
				quarter
				year
				createdBy
				creator {
					id
					displayName
					email
				}
				createdAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_EMPLOYEE_GOAL` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `completedAt`
- `description`
- `displayName`
- `email`
- `employee`
- `employeeGoal`
- `employeeId`
- `id`
- `mutation`
- `priority`
- `progress`
- `quarter`
- `status`
- `targetDate`
- `title`
- `updateEmployeeGoal`
- `updatedAt`
- `year`

```graphql
mutation UpdateEmployeeGoal($input: UpdateEmployeeGoalInput!) {
		updateEmployeeGoal(input: $input) {
			employeeGoal {
				id
				employeeId
				employee {
					id
					displayName
					email
				}
				title
				description
				targetDate
				progress
				status
				priority
				quarter
				year
				updatedAt
				completedAt
			}
			clientMutationId
		}
	}
```

#### `DELETE_EMPLOYEE_GOAL` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `deleteEmployeeGoal`
- `deletedEmployeeGoalId`
- `mutation`

```graphql
mutation DeleteEmployeeGoal($input: DeleteEmployeeGoalInput!) {
		deleteEmployeeGoal(input: $input) {
			deletedEmployeeGoalId
			clientMutationId
		}
	}
```

### src/lib/graphql/graphql/dashboard-operations.ts

#### `GET_DASHBOARD_STATS` (QUERY)

**Fields Used:**
- `activeEmployees`
- `dashboardStats`
- `lastUpdated`
- `pendingLeaveRequests`
- `query`
- `recentHires`
- `totalDepartments`
- `totalEmployees`
- `upcomingReviews`

```graphql
query GetDashboardStats {
		dashboardStats {
			totalEmployees
			activeEmployees
			totalDepartments
			pendingLeaveRequests
			recentHires
			upcomingReviews
			lastUpdated
		}
	}
```

#### `GET_DASHBOARD_ANALYTICS` (QUERY)

**Arguments:**
- `$period`

**Fields Used:**
- `analytics`
- `approved`
- `averageRating`
- `change`
- `completedReviews`
- `count`
- `date`
- `department`
- `departmentDistribution`
- `employeeGrowth`
- `leaveAnalytics`
- `pending`
- `pendingReviews`
- `percentage`
- `performanceMetrics`
- `query`
- `rejected`
- `total`

```graphql
query GetDashboardAnalytics($period: String = "30d") {
		analytics(period: $period) {
			employeeGrowth {
				date
				count
				change
			}
			departmentDistribution {
				department
				count
				percentage
			}
			leaveAnalytics {
				approved
				pending
				rejected
				total
			}
			performanceMetrics {
				averageRating
				completedReviews
				pendingReviews
			}
		}
	}
```

#### `GET_RECENT_ACTIVITIES` (QUERY)

**Arguments:**
- `$limit`

**Fields Used:**
- `activityType`
- `createdAt`
- `description`
- `id`
- `metadata`
- `nodes`
- `query`
- `recentActivities`
- `severity`
- `totalCount`
- `userId`
- `userName`

```graphql
query GetRecentActivities($limit: Int = 10) {
		recentActivities(first: $limit, orderBy: CREATED_AT_DESC) {
			nodes {
				id
				activityType
				description
				userId
				userName
				createdAt
				metadata
				severity
			}
			totalCount
		}
	}
```

#### `GET_UPCOMING_EVENTS` (QUERY)

**Arguments:**
- `$days`

**Fields Used:**
- `assignedTo`
- `department`
- `description`
- `eventType`
- `id`
- `isCompleted`
- `nodes`
- `priority`
- `query`
- `scheduledDate`
- `title`
- `totalCount`
- `upcomingEvents`

```graphql
query GetUpcomingEvents($days: Int = 30) {
		upcomingEvents(daysAhead: $days) {
			nodes {
				id
				eventType
				title
				description
				scheduledDate
				priority
				assignedTo
				department
				isCompleted
			}
			totalCount
		}
	}
```

#### `GET_EMPLOYEE_QUICK_STATS` (QUERY)

**Fields Used:**
- `birthdaysThisMonth`
- `employeeStats`
- `newThisMonth`
- `onLeaveToday`
- `query`
- `remoteWorkingToday`
- `workAnniversaries`

```graphql
query GetEmployeeQuickStats {
		employeeStats {
			newThisMonth
			birthdaysThisMonth
			workAnniversaries
			onLeaveToday
			remoteWorkingToday
		}
	}
```

#### `GET_DEPARTMENT_PERFORMANCE` (QUERY)

**Fields Used:**
- `activeProjects`
- `allDepartments`
- `averageRating`
- `budgetUtilization`
- `employeeCount`
- `id`
- `month`
- `name`
- `nodes`
- `productivity`
- `query`
- `rating`
- `recentPerformance`

```graphql
query GetDepartmentPerformance {
		allDepartments(orderBy: NAME_ASC) {
			nodes {
				id
				name
				employeeCount
				averageRating
				budgetUtilization
				activeProjects
				recentPerformance {
					month
					rating
					productivity
				}
			}
		}
	}
```

#### `GET_PENDING_APPROVALS` (QUERY)

**Arguments:**
- `$userId`

**Fields Used:**
- `amount`
- `category`
- `dueDate`
- `employeeName`
- `endDate`
- `expenseReports`
- `id`
- `leaveRequests`
- `leaveType`
- `pendingApprovals`
- `performanceReviews`
- `query`
- `reason`
- `reviewPeriod`
- `startDate`
- `status`
- `submittedAt`

```graphql
query GetPendingApprovals($userId: UUID!) {
		pendingApprovals(managerId: $userId) {
			leaveRequests {
				id
				employeeName
				leaveType
				startDate
				endDate
				reason
				submittedAt
			}
			expenseReports {
				id
				employeeName
				amount
				category
				submittedAt
			}
			performanceReviews {
				id
				employeeName
				reviewPeriod
				dueDate
				status
			}
		}
	}
```

#### `GET_MY_DASHBOARD` (QUERY)

**Arguments:**
- `$userId`

**Fields Used:**
- `annual`
- `avatar`
- `createdAt`
- `date`
- `deadlines`
- `department`
- `description`
- `displayName`
- `id`
- `isRead`
- `jobTitle`
- `leaveBalance`
- `manager`
- `meetings`
- `message`
- `myDashboard`
- `notifications`
- `personal`
- `profile`
- `query`
- *... and 7 more*

```graphql
query GetMyDashboard($userId: UUID!) {
		myDashboard(userId: $userId) {
			profile {
				id
				displayName
				department
				jobTitle
				manager
				avatar
			}
			leaveBalance {
				annual
				sick
				personal
				used
				remaining
			}
			upcomingEvents {
				meetings
				reviews
				deadlines
			}
			recentActivities {
				id
				type
				description
				date
			}
			notifications {
				id
				message
				type
				isRead
				createdAt
			}
		}
	}
```

#### `GET_TEAM_DASHBOARD` (QUERY)

**Arguments:**
- `$managerId`

**Fields Used:**
- `assignee`
- `date`
- `dueDate`
- `employees`
- `id`
- `lastActive`
- `leaveCalendar`
- `leaveType`
- `name`
- `performance`
- `priority`
- `productivity`
- `query`
- `role`
- `satisfaction`
- `status`
- `task`
- `teamDashboard`
- `teamMembers`
- `teamMetrics`
- *... and 2 more*

```graphql
query GetTeamDashboard($managerId: UUID!) {
		teamDashboard(managerId: $managerId) {
			teamMembers {
				id
				name
				role
				status
				lastActive
			}
			teamMetrics {
				productivity
				satisfaction
				turnover
				performance
			}
			upcomingDeadlines {
				id
				task
				assignee
				dueDate
				priority
			}
			leaveCalendar {
				date
				employees {
					id
					name
					leaveType
				}
			}
		}
	}
```

#### `GET_SYSTEM_HEALTH` (QUERY)

**Fields Used:**
- `activeUsers`
- `application`
- `backup`
- `connections`
- `cpuUsage`
- `database`
- `integrations`
- `lastBackup`
- `lastSync`
- `memoryUsage`
- `name`
- `nextScheduled`
- `query`
- `responseTime`
- `status`
- `systemHealth`
- `uptime`

```graphql
query GetSystemHealth {
		systemHealth {
			database {
				status
				responseTime
				connections
			}
			application {
				uptime
				memoryUsage
				cpuUsage
				activeUsers
			}
			backup {
				lastBackup
				status
				nextScheduled
			}
			integrations {
				name
				status
				lastSync
			}
		}
	}
```

#### `GET_NOTIFICATIONS_SUMMARY` (QUERY)

**Arguments:**
- `$userId`

**Fields Used:**
- `actionUrl`
- `categories`
- `count`
- `createdAt`
- `id`
- `isRead`
- `lastReceived`
- `message`
- `nodes`
- `notificationsSummary`
- `query`
- `recent`
- `title`
- `type`
- `unreadCount`

```graphql
query GetNotificationsSummary($userId: UUID!) {
		notificationsSummary(userId: $userId) {
			unreadCount
			categories {
				type
				count
				lastReceived
			}
			recent(first: 5) {
				nodes {
					id
					title
					message
					type
					isRead
					createdAt
					actionUrl
				}
			}
		}
	}
```

#### `UPDATE_DASHBOARD_PREFERENCES` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `id`
- `layout`
- `mutation`
- `notifications`
- `preferences`
- `refreshInterval`
- `theme`
- `updateDashboardPreferences`
- `updatedAt`
- `userId`
- `widgets`

```graphql
mutation UpdateDashboardPreferences($input: UpdateDashboardPreferencesInput!) {
		updateDashboardPreferences(input: $input) {
			preferences {
				id
				userId
				layout
				widgets
				refreshInterval
				theme
				notifications
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `MARK_NOTIFICATION_READ` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `id`
- `isRead`
- `markNotificationRead`
- `mutation`
- `notification`
- `readAt`

```graphql
mutation MarkNotificationRead($input: MarkNotificationReadInput!) {
		markNotificationRead(input: $input) {
			notification {
				id
				isRead
				readAt
			}
			clientMutationId
		}
	}
```

#### `DISMISS_NOTIFICATION` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `dismissNotification`
- `dismissedAt`
- `id`
- `isDismissed`
- `mutation`
- `notification`

```graphql
mutation DismissNotification($input: DismissNotificationInput!) {
		dismissNotification(input: $input) {
			notification {
				id
				isDismissed
				dismissedAt
			}
			clientMutationId
		}
	}
```

#### `CREATE_DASHBOARD_WIDGET` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `configuration`
- `createDashboardWidget`
- `createdAt`
- `id`
- `isVisible`
- `mutation`
- `name`
- `position`
- `size`
- `type`
- `widget`

```graphql
mutation CreateDashboardWidget($input: CreateDashboardWidgetInput!) {
		createDashboardWidget(input: $input) {
			widget {
				id
				name
				type
				configuration
				position
				size
				isVisible
				createdAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_DASHBOARD_WIDGET` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `configuration`
- `id`
- `isVisible`
- `mutation`
- `name`
- `position`
- `size`
- `type`
- `updateDashboardWidget`
- `updatedAt`
- `widget`

```graphql
mutation UpdateDashboardWidget($input: UpdateDashboardWidgetInput!) {
		updateDashboardWidget(input: $input) {
			widget {
				id
				name
				type
				configuration
				position
				size
				isVisible
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `DELETE_DASHBOARD_WIDGET` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `deleteDashboardWidget`
- `id`
- `mutation`
- `widget`

```graphql
mutation DeleteDashboardWidget($input: DeleteDashboardWidgetInput!) {
		deleteDashboardWidget(input: $input) {
			widget {
				id
			}
			clientMutationId
		}
	}
```

#### `GET_DASHBOARD_CONFIG` (QUERY)

**Arguments:**
- `$userId`

**Fields Used:**
- `autoRefresh`
- `compactMode`
- `configuration`
- `dashboardConfig`
- `height`
- `id`
- `isVisible`
- `layout`
- `permissions`
- `position`
- `query`
- `refreshInterval`
- `showWelcome`
- `theme`
- `title`
- `type`
- `widgets`
- `width`
- `x`
- `y`

```graphql
query GetDashboardConfig($userId: UUID!) {
		dashboardConfig(userId: $userId) {
			id
			layout
			widgets {
				id
				type
				title
				configuration
				position {
					x
					y
					width
					height
				}
				isVisible
				permissions
			}
			theme
			refreshInterval
			autoRefresh
			showWelcome
			compactMode
		}
	}
```

#### `DASHBOARD_UPDATES_SUBSCRIPTION` (SUBSCRIPTION)

**Arguments:**
- `$userId`

**Fields Used:**
- `dashboardUpdates`
- `data`
- `priority`
- `subscription`
- `timestamp`
- `type`

```graphql
subscription DashboardUpdates($userId: UUID!) {
		dashboardUpdates(userId: $userId) {
			type
			data
			timestamp
			priority
		}
	}
```

### src/lib/graphql/graphql/goals-okrs-operations.ts

#### `GET_TEAM_GOALS` (QUERY)

**Arguments:**
- `$filter`
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `completionPercentage`
- `createdAt`
- `currentValue`
- `description`
- `displayName`
- `email`
- `endCursor`
- `goalType`
- `hasNextPage`
- `hasPreviousPage`
- `id`
- `jobTitle`
- `keyResults`
- `name`
- `nodes`
- `owner`
- `pageInfo`
- `priority`
- `query`
- `startCursor`
- *... and 11 more*

```graphql
query GetTeamGoals(
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [TeamGoalsOrderBy!] = [CREATED_AT_DESC]
		$filter: TeamGoalFilter
	) {
		teamGoals(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
				id
				title
				description
				goalType
				status
				priority
				targetValue
				currentValue
				unit
				startDate
				targetDate
				completionPercentage
				team: department {
					id
					name
				}
				owner {
					id
					displayName
					email
					jobTitle
				}
				keyResults: goalKeyResults {
					nodes {
						id
						title
						description
						targetValue
						currentValue
						unit
						weight
						status
					}
					totalCount
				}
				createdAt
				updatedAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
```

#### `GET_GOAL_DETAILS` (QUERY)

**Arguments:**
- `$id`

**Fields Used:**
- `completionPercentage`
- `createdAt`
- `currentValue`
- `department`
- `departmentHead`
- `description`
- `displayName`
- `email`
- `employees`
- `goalType`
- `id`
- `jobTitle`
- `keyResults`
- `name`
- `nodes`
- `owner`
- `priority`
- `query`
- `startDate`
- `status`
- *... and 9 more*

```graphql
query GetGoalDetails($id: UUID!) {
		teamGoal(id: $id) {
			id
			title
			description
			goalType
			status
			priority
			targetValue
			currentValue
			unit
			startDate
			targetDate
			completionPercentage
			team: department {
				id
				name
				departmentHead {
					id
					displayName
					email
				}
				employees {
					totalCount
				}
			}
			owner {
				id
				displayName
				email
				jobTitle
				department {
					id
					name
				}
			}
			keyResults: goalKeyResults {
				nodes {
					id
					title
					description
					targetValue
					currentValue
					unit
					weight
					status
					createdAt
					updatedAt
				}
				totalCount
			}
			createdAt
			updatedAt
		}
	}
```

#### `GET_GOALS_BY_TEAM` (QUERY)

**Arguments:**
- `$first`
- `$orderBy`
- `$status`
- `$teamId`

**Fields Used:**
- `completionPercentage`
- `condition`
- `currentValue`
- `description`
- `displayName`
- `email`
- `filter`
- `first`
- `goalType`
- `id`
- `keyResults`
- `nodes`
- `orderBy`
- `owner`
- `priority`
- `query`
- `startDate`
- `status`
- `targetDate`
- `targetValue`
- *... and 4 more*

```graphql
query GetGoalsByTeam(
    $teamId: UUID!
    $status: GoalStatus
    $first: Int = 50
    $orderBy: [TeamGoalsOrderBy!] = [TARGET_DATE_ASC]
  ) {
    teamGoals(
      condition: { teamId: $teamId }
      filter: { status: $status ? { equalTo: $status } : null }
      first: $first
      orderBy: $orderBy
    ) {
      nodes {
        id
        title
        description
        goalType
        status
        priority
        targetValue
        currentValue
        unit
        startDate
        targetDate
        completionPercentage
        owner {
          id
          displayName
          email
        }
        keyResults: goalKeyResults {
          totalCount
        }
      }
      totalCount
    }
  }
```

#### `GET_GOALS_BY_OWNER` (QUERY)

**Arguments:**
- `$first`
- `$orderBy`
- `$ownerId`
- `$status`

**Fields Used:**
- `completionPercentage`
- `condition`
- `currentValue`
- `description`
- `filter`
- `first`
- `goalType`
- `id`
- `keyResults`
- `name`
- `nodes`
- `orderBy`
- `priority`
- `query`
- `startDate`
- `status`
- `targetDate`
- `targetValue`
- `team`
- `teamGoals`
- *... and 3 more*

```graphql
query GetGoalsByOwner(
    $ownerId: UUID!
    $status: GoalStatus
    $first: Int = 50
    $orderBy: [TeamGoalsOrderBy!] = [TARGET_DATE_ASC]
  ) {
    teamGoals(
      condition: { ownerId: $ownerId }
      filter: { status: $status ? { equalTo: $status } : null }
      first: $first
      orderBy: $orderBy
    ) {
      nodes {
        id
        title
        description
        goalType
        status
        priority
        targetValue
        currentValue
        unit
        startDate
        targetDate
        completionPercentage
        team: department {
          id
          name
        }
        keyResults: goalKeyResults {
          nodes {
            id
            title
            status
            currentValue
            targetValue
            unit
          }
        }
      }
      totalCount
    }
  }
```

#### `GET_KEY_RESULTS` (QUERY)

**Arguments:**
- `$goalId`
- `$orderBy`

**Fields Used:**
- `createdAt`
- `currentValue`
- `description`
- `goal`
- `goalKeyResults`
- `id`
- `nodes`
- `query`
- `status`
- `targetValue`
- `title`
- `unit`
- `updatedAt`
- `weight`

```graphql
query GetKeyResults($goalId: UUID!, $orderBy: [GoalKeyResultsOrderBy!] = [WEIGHT_DESC]) {
		goalKeyResults(condition: { goalId: $goalId }, orderBy: $orderBy) {
			nodes {
				id
				title
				description
				targetValue
				currentValue
				unit
				weight
				status
				goal: teamGoal {
					id
					title
					status
				}
				createdAt
				updatedAt
			}
		}
	}
```

#### `GET_OKR_OVERVIEW` (QUERY)

**Arguments:**
- `$quarter`
- `$teamId`
- `$year`

**Fields Used:**
- `completionPercentage`
- `currentValue`
- `displayName`
- `filter`
- `goalType`
- `greaterThanOrEqualTo`
- `id`
- `keyResults`
- `lessThanOrEqualTo`
- `name`
- `nodes`
- `owner`
- `priority`
- `query`
- `startDate`
- `status`
- `targetDate`
- `targetValue`
- `team`
- `teamGoals`
- *... and 5 more*

```graphql
query GetOKROverview(
    $teamId: UUID
    $quarter: String
    $year: Int
  ) {
    teamGoals(
      filter: {
        teamId: $teamId ? { equalTo: $teamId } : null
        goalType: { equalTo: "okr" }
        startDate: $quarter && $year ? {
          greaterThanOrEqualTo: "${year}-${quarter === 'Q1' ? '01' : quarter === 'Q2' ? '04' : quarter === 'Q3' ? '07' : '10'}-01"
        } : null
        targetDate: $quarter && $year ? {
          lessThanOrEqualTo: "${year}-${quarter === 'Q1' ? '03' : quarter === 'Q2' ? '06' : quarter === 'Q3' ? '09' : '12'}-31"
        } : null
      }
    ) {
      nodes {
        id
        title
        status
        priority
        targetValue
        currentValue
        unit
        completionPercentage
        targetDate
        team: department {
          id
          name
        }
        owner {
          id
          displayName
        }
        keyResults: goalKeyResults {
          nodes {
            id
            title
            status
            weight
            targetValue
            currentValue
          }
          totalCount
        }
      }
      totalCount
    }
  }
```

#### `CREATE_TEAM_GOAL` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `createTeamGoal`
- `createdAt`
- `currentValue`
- `description`
- `displayName`
- `goalType`
- `id`
- `mutation`
- `name`
- `owner`
- `priority`
- `startDate`
- `status`
- `targetDate`
- `targetValue`
- `team`
- `teamGoal`
- `title`
- `unit`

```graphql
mutation CreateTeamGoal($input: CreateTeamGoalInput!) {
		createTeamGoal(input: $input) {
			teamGoal {
				id
				title
				description
				goalType
				status
				priority
				targetValue
				currentValue
				unit
				startDate
				targetDate
				team: department {
					id
					name
				}
				owner {
					id
					displayName
				}
				createdAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_TEAM_GOAL` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `completionPercentage`
- `currentValue`
- `description`
- `id`
- `mutation`
- `priority`
- `status`
- `targetValue`
- `teamGoal`
- `title`
- `updateTeamGoal`
- `updatedAt`

```graphql
mutation UpdateTeamGoal($input: UpdateTeamGoalInput!) {
		updateTeamGoal(input: $input) {
			teamGoal {
				id
				title
				description
				status
				priority
				targetValue
				currentValue
				completionPercentage
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_GOAL_PROGRESS` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `completionPercentage`
- `currentValue`
- `id`
- `mutation`
- `status`
- `teamGoal`
- `updateTeamGoal`
- `updatedAt`

```graphql
mutation UpdateGoalProgress($input: UpdateTeamGoalInput!) {
		updateTeamGoal(input: $input) {
			teamGoal {
				id
				currentValue
				completionPercentage
				status
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `DELETE_TEAM_GOAL` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `deleteTeamGoal`
- `deletedTeamGoalId`
- `mutation`

```graphql
mutation DeleteTeamGoal($input: DeleteTeamGoalInput!) {
		deleteTeamGoal(input: $input) {
			deletedTeamGoalId
			clientMutationId
		}
	}
```

#### `CREATE_KEY_RESULT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `createGoalKeyResult`
- `createdAt`
- `currentValue`
- `description`
- `goal`
- `goalKeyResult`
- `id`
- `mutation`
- `status`
- `targetValue`
- `title`
- `unit`
- `weight`

```graphql
mutation CreateKeyResult($input: CreateGoalKeyResultInput!) {
		createGoalKeyResult(input: $input) {
			goalKeyResult {
				id
				title
				description
				targetValue
				currentValue
				unit
				weight
				status
				goal: teamGoal {
					id
					title
				}
				createdAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_KEY_RESULT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `currentValue`
- `description`
- `goalKeyResult`
- `id`
- `mutation`
- `status`
- `targetValue`
- `title`
- `updateGoalKeyResult`
- `updatedAt`
- `weight`

```graphql
mutation UpdateKeyResult($input: UpdateGoalKeyResultInput!) {
		updateGoalKeyResult(input: $input) {
			goalKeyResult {
				id
				title
				description
				targetValue
				currentValue
				weight
				status
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_KEY_RESULT_PROGRESS` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `currentValue`
- `goalKeyResult`
- `id`
- `mutation`
- `status`
- `updateGoalKeyResult`
- `updatedAt`

```graphql
mutation UpdateKeyResultProgress($input: UpdateGoalKeyResultInput!) {
		updateGoalKeyResult(input: $input) {
			goalKeyResult {
				id
				currentValue
				status
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `DELETE_KEY_RESULT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `deleteGoalKeyResult`
- `deletedGoalKeyResultId`
- `mutation`

```graphql
mutation DeleteKeyResult($input: DeleteGoalKeyResultInput!) {
		deleteGoalKeyResult(input: $input) {
			deletedGoalKeyResultId
			clientMutationId
		}
	}
```

### src/lib/graphql/graphql/leave-management-operations.ts

#### `GET_PENDING_LEAVE_REQUESTS` (QUERY)

**Arguments:**
- `$filter`
- `$first`
- `$managerId`
- `$offset`
- `$orderBy`
- `$status`

**Fields Used:**
- `condition`
- `createdAt`
- `daysRequested`
- `department`
- `displayName`
- `email`
- `employee`
- `endCursor`
- `endDate`
- `filter`
- `first`
- `hasNextPage`
- `hasPreviousPage`
- `id`
- `leaveRequests`
- `leaveType`
- `managerComments`
- `name`
- `nodes`
- `offset`
- *... and 9 more*

```graphql
query GetPendingLeaveRequests(
		$managerId: UUID!
		$status: String = "pending"
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [LeaveRequestsOrderBy!] = [CREATED_AT_ASC]
		$filter: LeaveRequestFilter
	) {
		leaveRequests(
			condition: { managerId: $managerId, status: $status }
			first: $first
			offset: $offset
			orderBy: $orderBy
			filter: $filter
		) {
			nodes {
				id
				employee {
					id
					displayName
					email
					department {
						id
						name
					}
				}
				leaveType
				startDate
				endDate
				daysRequested
				reason
				status
				managerComments
				createdAt
				updatedAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
```

#### `GET_LEAVE_REQUESTS` (QUERY)

**Arguments:**
- `$filter`
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `approvedAt`
- `approvedBy`
- `createdAt`
- `daysRequested`
- `department`
- `displayName`
- `email`
- `employee`
- `endCursor`
- `endDate`
- `hasNextPage`
- `hasPreviousPage`
- `id`
- `leaveRequests`
- `leaveType`
- `manager`
- `managerComments`
- `name`
- `nodes`
- `pageInfo`
- *... and 7 more*

```graphql
query GetLeaveRequests(
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [LeaveRequestsOrderBy!] = [CREATED_AT_DESC]
		$filter: LeaveRequestFilter
	) {
		leaveRequests(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
				id
				employee {
					id
					displayName
					email
					department {
						id
						name
					}
				}
				manager {
					id
					displayName
					email
				}
				leaveType
				startDate
				endDate
				daysRequested
				reason
				status
				managerComments
				approvedAt
				approvedBy {
					id
					displayName
				}
				createdAt
				updatedAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
```

#### `GET_LEAVE_REQUEST` (QUERY)

**Arguments:**
- `$id`

**Fields Used:**
- `approvedAt`
- `approvedBy`
- `createdAt`
- `daysRequested`
- `department`
- `displayName`
- `email`
- `employee`
- `endDate`
- `id`
- `leaveRequest`
- `leaveType`
- `manager`
- `managerComments`
- `name`
- `query`
- `reason`
- `startDate`
- `status`
- `updatedAt`

```graphql
query GetLeaveRequest($id: UUID!) {
		leaveRequest(id: $id) {
			id
			employee {
				id
				displayName
				email
				department {
					id
					name
				}
			}
			manager {
				id
				displayName
				email
			}
			leaveType
			startDate
			endDate
			daysRequested
			reason
			status
			managerComments
			approvedAt
			approvedBy {
				id
				displayName
			}
			createdAt
			updatedAt
		}
	}
```

#### `APPROVE_LEAVE_REQUEST` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `approveLeaveRequest`
- `approvedAt`
- `approvedBy`
- `clientMutationId`
- `displayName`
- `id`
- `leaveRequest`
- `managerComments`
- `mutation`
- `status`

```graphql
mutation ApproveLeaveRequest($input: ApproveLeaveRequestInput!) {
		approveLeaveRequest(input: $input) {
			leaveRequest {
				id
				status
				approvedAt
				managerComments
				approvedBy {
					id
					displayName
				}
			}
			clientMutationId
		}
	}
```

#### `DENY_LEAVE_REQUEST` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `deniedAt`
- `denyLeaveRequest`
- `id`
- `leaveRequest`
- `managerComments`
- `mutation`
- `status`

```graphql
mutation DenyLeaveRequest($input: DenyLeaveRequestInput!) {
		denyLeaveRequest(input: $input) {
			leaveRequest {
				id
				status
				deniedAt
				managerComments
			}
			clientMutationId
		}
	}
```

#### `CREATE_LEAVE_REQUEST` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `createLeaveRequest`
- `createdAt`
- `daysRequested`
- `displayName`
- `employee`
- `endDate`
- `id`
- `leaveRequest`
- `leaveType`
- `mutation`
- `reason`
- `startDate`
- `status`

```graphql
mutation CreateLeaveRequest($input: CreateLeaveRequestInput!) {
		createLeaveRequest(input: $input) {
			leaveRequest {
				id
				employee {
					id
					displayName
				}
				leaveType
				startDate
				endDate
				daysRequested
				reason
				status
				createdAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_LEAVE_REQUEST` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `daysRequested`
- `endDate`
- `id`
- `leaveRequest`
- `leaveType`
- `mutation`
- `reason`
- `startDate`
- `status`
- `updateLeaveRequest`
- `updatedAt`

```graphql
mutation UpdateLeaveRequest($input: UpdateLeaveRequestInput!) {
		updateLeaveRequest(input: $input) {
			leaveRequest {
				id
				leaveType
				startDate
				endDate
				daysRequested
				reason
				status
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `CANCEL_LEAVE_REQUEST` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `cancelLeaveRequest`
- `clientMutationId`
- `id`
- `leaveRequest`
- `mutation`
- `status`
- `updatedAt`

```graphql
mutation CancelLeaveRequest($input: CancelLeaveRequestInput!) {
		cancelLeaveRequest(input: $input) {
			leaveRequest {
				id
				status
				updatedAt
			}
			clientMutationId
		}
	}
```

### src/lib/graphql/graphql/performance-management-operations.ts

#### `GET_PERFORMANCE_REVIEWS` (QUERY)

**Arguments:**
- `$filter`
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `areasForImprovement`
- `collaboration`
- `communication`
- `completedAt`
- `createdAt`
- `department`
- `developmentPlan`
- `displayName`
- `email`
- `employee`
- `employeeSelfAssessment`
- `endCursor`
- `goalsAchievement`
- `goalsForNextPeriod`
- `hasNextPage`
- `hasPreviousPage`
- `id`
- `jobTitle`
- `leadership`
- `name`
- *... and 15 more*

```graphql
query GetPerformanceReviews(
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [PerformanceReviewsOrderBy!] = [CREATED_AT_DESC]
		$filter: PerformanceReviewFilter
	) {
		performanceReviews(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
				id
				employee {
					id
					displayName
					email
					jobTitle
					department {
						id
						name
					}
				}
				reviewer {
					id
					displayName
					email
					jobTitle
				}
				reviewPeriodStart
				reviewPeriodEnd
				status
				overallRating
				goalsAchievement
				collaboration
				communication
				leadership
				strengths
				areasForImprovement
				goalsForNextPeriod
				developmentPlan
				reviewNotes
				employeeSelfAssessment
				createdAt
				updatedAt
				submittedAt
				completedAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
```

#### `GET_PERFORMANCE_REVIEW` (QUERY)

**Arguments:**
- `$id`

**Fields Used:**
- `areasForImprovement`
- `collaboration`
- `communication`
- `completedAt`
- `createdAt`
- `department`
- `developmentPlan`
- `displayName`
- `email`
- `employee`
- `employeeSelfAssessment`
- `goalsAchievement`
- `goalsForNextPeriod`
- `hireDate`
- `id`
- `jobTitle`
- `leadership`
- `manager`
- `name`
- `overallRating`
- *... and 10 more*

```graphql
query GetPerformanceReview($id: UUID!) {
		performanceReview(id: $id) {
			id
			employee {
				id
				displayName
				email
				jobTitle
				hireDate
				department {
					id
					name
				}
				manager: userByManagerId {
					id
					displayName
					email
				}
			}
			reviewer {
				id
				displayName
				email
				jobTitle
				department {
					id
					name
				}
			}
			reviewPeriodStart
			reviewPeriodEnd
			status
			overallRating
			goalsAchievement
			collaboration
			communication
			leadership
			strengths
			areasForImprovement
			goalsForNextPeriod
			developmentPlan
			reviewNotes
			employeeSelfAssessment
			createdAt
			updatedAt
			submittedAt
			completedAt
		}
	}
```

#### `GET_PENDING_REVIEWS_FOR_MANAGER` (QUERY)

**Arguments:**
- `$first`
- `$managerId`
- `$offset`
- `$orderBy`

**Fields Used:**
- `condition`
- `createdAt`
- `department`
- `displayName`
- `email`
- `employee`
- `filter`
- `first`
- `id`
- `jobTitle`
- `name`
- `nodes`
- `offset`
- `orderBy`
- `overallRating`
- `performanceReviews`
- `query`
- `reviewPeriodEnd`
- `reviewPeriodStart`
- `status`
- *... and 2 more*

```graphql
query GetPendingReviewsForManager(
		$managerId: UUID!
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [PerformanceReviewsOrderBy!] = [CREATED_AT_ASC]
	) {
		performanceReviews(
			condition: { reviewerId: $managerId }
			filter: { status: { in: ["draft", "in_progress"] } }
			first: $first
			offset: $offset
			orderBy: $orderBy
		) {
			nodes {
				id
				employee {
					id
					displayName
					email
					jobTitle
					department {
						id
						name
					}
				}
				reviewPeriodStart
				reviewPeriodEnd
				status
				overallRating
				createdAt
				updatedAt
			}
			totalCount
		}
	}
```

#### `GET_TEAM_PERFORMANCE_OVERVIEW` (QUERY)

**Arguments:**
- `$departmentId`
- `$reviewPeriodEnd`
- `$reviewPeriodStart`

**Fields Used:**
- `collaboration`
- `communication`
- `completedAt`
- `departments`
- `displayName`
- `employees`
- `filter`
- `first`
- `goalsAchievement`
- `id`
- `leadership`
- `name`
- `nodes`
- `orderBy`
- `overallRating`
- `performanceReviews`
- `query`
- `reviewPeriodEnd`
- `reviewPeriodStart`
- `status`

```graphql
query GetTeamPerformanceOverview(
    $departmentId: UUID!
    $reviewPeriodStart: Date
    $reviewPeriodEnd: Date
  ) {
    departments(condition: { id: $departmentId }) {
      nodes {
        id
        name
        employees {
          nodes {
            id
            displayName
            performanceReviews(
              filter: {
                reviewPeriodStart: $reviewPeriodStart ? { greaterThanOrEqualTo: $reviewPeriodStart } : null
                reviewPeriodEnd: $reviewPeriodEnd ? { lessThanOrEqualTo: $reviewPeriodEnd } : null
                status: { equalTo: "completed" }
              }
              orderBy: [CREATED_AT_DESC]
              first: 1
            ) {
              nodes {
                id
                overallRating
                goalsAchievement
                collaboration
                communication
                leadership
                reviewPeriodStart
                reviewPeriodEnd
                completedAt
              }
            }
          }
        }
      }
    }
  }
```

#### `GET_REVIEW_ANALYTICS` (QUERY)

**Arguments:**
- `$departmentId`
- `$reviewPeriodEnd`
- `$reviewPeriodStart`

**Fields Used:**
- `collaboration`
- `communication`
- `department`
- `employee`
- `filter`
- `goalsAchievement`
- `id`
- `leadership`
- `name`
- `nodes`
- `overallRating`
- `performanceReviews`
- `query`
- `reviewPeriodEnd`
- `reviewPeriodStart`
- `status`
- `totalCount`

```graphql
query GetReviewAnalytics(
    $departmentId: UUID
    $reviewPeriodStart: Date
    $reviewPeriodEnd: Date
  ) {
    performanceReviews(
      filter: {
        reviewPeriodStart: $reviewPeriodStart ? { greaterThanOrEqualTo: $reviewPeriodStart } : null
        reviewPeriodEnd: $reviewPeriodEnd ? { lessThanOrEqualTo: $reviewPeriodEnd } : null
        status: { equalTo: "completed" }
        employee: $departmentId ? { departmentId: { equalTo: $departmentId } } : null
      }
    ) {
      nodes {
        id
        overallRating
        goalsAchievement
        collaboration
        communication
        leadership
        reviewPeriodStart
        reviewPeriodEnd
        employee {
          department {
            id
            name
          }
        }
      }
      totalCount
    }
  }
```

#### `CREATE_PERFORMANCE_REVIEW` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `createPerformanceReview`
- `createdAt`
- `displayName`
- `employee`
- `id`
- `mutation`
- `performanceReview`
- `reviewPeriodEnd`
- `reviewPeriodStart`
- `reviewer`
- `status`

```graphql
mutation CreatePerformanceReview($input: CreatePerformanceReviewInput!) {
		createPerformanceReview(input: $input) {
			performanceReview {
				id
				employee {
					id
					displayName
				}
				reviewer {
					id
					displayName
				}
				reviewPeriodStart
				reviewPeriodEnd
				status
				createdAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_PERFORMANCE_REVIEW` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `areasForImprovement`
- `clientMutationId`
- `collaboration`
- `communication`
- `developmentPlan`
- `goalsAchievement`
- `goalsForNextPeriod`
- `id`
- `leadership`
- `mutation`
- `overallRating`
- `performanceReview`
- `reviewNotes`
- `status`
- `strengths`
- `updatePerformanceReview`
- `updatedAt`

```graphql
mutation UpdatePerformanceReview($input: UpdatePerformanceReviewInput!) {
		updatePerformanceReview(input: $input) {
			performanceReview {
				id
				status
				overallRating
				goalsAchievement
				collaboration
				communication
				leadership
				strengths
				areasForImprovement
				goalsForNextPeriod
				developmentPlan
				reviewNotes
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `SUBMIT_PERFORMANCE_REVIEW` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `id`
- `mutation`
- `performanceReview`
- `status`
- `submittedAt`
- `updatePerformanceReview`
- `updatedAt`

```graphql
mutation SubmitPerformanceReview($input: UpdatePerformanceReviewInput!) {
		updatePerformanceReview(input: $input) {
			performanceReview {
				id
				status
				submittedAt
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `COMPLETE_PERFORMANCE_REVIEW` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `completedAt`
- `id`
- `mutation`
- `performanceReview`
- `status`
- `updatePerformanceReview`
- `updatedAt`

```graphql
mutation CompletePerformanceReview($input: UpdatePerformanceReviewInput!) {
		updatePerformanceReview(input: $input) {
			performanceReview {
				id
				status
				completedAt
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `ADD_SELF_ASSESSMENT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `employeeSelfAssessment`
- `id`
- `mutation`
- `performanceReview`
- `updatePerformanceReview`
- `updatedAt`

```graphql
mutation AddSelfAssessment($input: UpdatePerformanceReviewInput!) {
		updatePerformanceReview(input: $input) {
			performanceReview {
				id
				employeeSelfAssessment
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `DELETE_PERFORMANCE_REVIEW` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `deletePerformanceReview`
- `deletedPerformanceReviewId`
- `mutation`

```graphql
mutation DeletePerformanceReview($input: DeletePerformanceReviewInput!) {
		deletePerformanceReview(input: $input) {
			deletedPerformanceReviewId
			clientMutationId
		}
	}
```

### src/lib/graphql/graphql/postgraphile-operations.ts

#### `GET_USER_BY_ID` (QUERY)

**Arguments:**
- `$id`

**Fields Used:**
- `action`
- `assignedAt`
- `avatar`
- `createdAt`
- `department`
- `description`
- `displayName`
- `email`
- `firstName`
- `hireDate`
- `id`
- `isActive`
- `jobTitle`
- `lastName`
- `manager`
- `name`
- `nodes`
- `permissions`
- `phoneNumber`
- `profileByUserId`
- *... and 7 more*

```graphql
query GetUserById($id: UUID!) {
		userById(id: $id) {
			id
			email
			displayName
			firstName
			lastName
			isActive
			createdAt
			updatedAt
			userRolesByUserId {
				nodes {
					id
					roleId
					assignedAt
					roleByRoleId {
						id
						name
						description
						permissions {
							nodes {
								id
								name
								resource
								action
								description
							}
						}
					}
				}
			}
			profileByUserId {
				id
				phoneNumber
				department
				jobTitle
				manager
				hireDate
				avatar
			}
		}
	}
```

#### `GET_USER_ROLES` (QUERY)

**Arguments:**
- `$userId`

**Fields Used:**
- `action`
- `assignedAt`
- `assignedBy`
- `description`
- `id`
- `isActive`
- `level`
- `name`
- `nodes`
- `permissionByPermissionId`
- `query`
- `resource`
- `roleByRoleId`
- `roleId`
- `rolePermissionsByRoleId`
- `userRolesByUserId`

```graphql
query GetUserRoles($userId: UUID!) {
		userRolesByUserId(condition: { userId: $userId }) {
			nodes {
				id
				roleId
				assignedAt
				assignedBy
				roleByRoleId {
					id
					name
					description
					level
					isActive
					rolePermissionsByRoleId {
						nodes {
							permissionByPermissionId {
								id
								name
								resource
								action
								description
								isActive
							}
						}
					}
				}
			}
		}
	}
```

#### `GET_ALL_USERS` (QUERY)

**Arguments:**
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `address`
- `allUsers`
- `avatar`
- `createdAt`
- `department`
- `description`
- `displayName`
- `email`
- `emergencyContactName`
- `emergencyContactPhone`
- `firstName`
- `hireDate`
- `id`
- `isActive`
- `jobTitle`
- `lastName`
- `level`
- `manager`
- `name`
- `nodes`
- *... and 7 more*

```graphql
query GetAllUsers($first: Int, $offset: Int, $orderBy: [UsersOrderBy!]) {
		allUsers(first: $first, offset: $offset, orderBy: $orderBy) {
			nodes {
				id
				email
				displayName
				firstName
				lastName
				isActive
				createdAt
				updatedAt
				profileByUserId {
					id
					phoneNumber
					department
					jobTitle
					manager
					hireDate
					avatar
					emergencyContactName
					emergencyContactPhone
					address
				}
				userRolesByUserId {
					nodes {
						roleByRoleId {
							id
							name
							description
							level
						}
					}
				}
			}
			totalCount
		}
	}
```

#### `CREATE_USER` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `createUser`
- `createdAt`
- `displayName`
- `email`
- `firstName`
- `id`
- `isActive`
- `lastName`
- `mutation`
- `user`

```graphql
mutation CreateUser($input: CreateUserInput!) {
		createUser(input: $input) {
			user {
				id
				email
				displayName
				firstName
				lastName
				isActive
				createdAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_USER` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `displayName`
- `email`
- `firstName`
- `id`
- `isActive`
- `lastName`
- `mutation`
- `updateUserById`
- `updatedAt`
- `user`

```graphql
mutation UpdateUser($input: UpdateUserByIdInput!) {
		updateUserById(input: $input) {
			user {
				id
				email
				displayName
				firstName
				lastName
				isActive
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `ASSIGN_USER_ROLE` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `assignedAt`
- `assignedBy`
- `clientMutationId`
- `createUserRole`
- `description`
- `id`
- `mutation`
- `name`
- `roleByRoleId`
- `roleId`
- `userId`
- `userRole`

```graphql
mutation AssignUserRole($input: CreateUserRoleInput!) {
		createUserRole(input: $input) {
			userRole {
				id
				userId
				roleId
				assignedAt
				assignedBy
				roleByRoleId {
					id
					name
					description
				}
			}
			clientMutationId
		}
	}
```

#### `REMOVE_USER_ROLE` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `deleteUserRoleById`
- `id`
- `mutation`
- `roleId`
- `userId`
- `userRole`

```graphql
mutation RemoveUserRole($input: DeleteUserRoleByIdInput!) {
		deleteUserRoleById(input: $input) {
			userRole {
				id
				userId
				roleId
			}
			clientMutationId
		}
	}
```

#### `GET_ALL_ROLES` (QUERY)

**Fields Used:**
- `action`
- `allRoles`
- `createdAt`
- `description`
- `id`
- `isActive`
- `level`
- `name`
- `nodes`
- `permissionByPermissionId`
- `query`
- `resource`
- `rolePermissionsByRoleId`

```graphql
query GetAllRoles {
		allRoles(orderBy: [LEVEL_DESC, NAME_ASC]) {
			nodes {
				id
				name
				description
				level
				isActive
				createdAt
				rolePermissionsByRoleId {
					nodes {
						permissionByPermissionId {
							id
							name
							resource
							action
							description
							isActive
						}
					}
				}
			}
		}
	}
```

#### `GET_ALL_PERMISSIONS` (QUERY)

**Fields Used:**
- `action`
- `allPermissions`
- `createdAt`
- `description`
- `id`
- `isActive`
- `name`
- `nodes`
- `query`
- `resource`

```graphql
query GetAllPermissions {
		allPermissions(orderBy: [RESOURCE_ASC, ACTION_ASC]) {
			nodes {
				id
				name
				resource
				action
				description
				isActive
				createdAt
			}
		}
	}
```

### src/lib/graphql/graphql/reviews-operations.ts

#### `GET_ACTIVE_REVIEWS_FOR_EMPLOYEE` (QUERY)

**Arguments:**
- `$employeeId`
- `$reviewType`

**Fields Used:**
- `activeReviewsForEmployee`
- `createdAt`
- `employeeId`
- `id`
- `nodes`
- `notes`
- `query`
- `reviewPeriodEnd`
- `reviewPeriodStart`
- `reviewType`
- `reviewerId`
- `status`
- `totalCount`
- `updatedAt`

```graphql
query GetActiveReviewsForEmployee($employeeId: UUID!, $reviewType: ReviewType) {
		activeReviewsForEmployee(pEmployeeId: $employeeId, pReviewType: $reviewType) {
			nodes {
				id
				employeeId
				reviewerId
				reviewType
				status
				reviewPeriodStart
				reviewPeriodEnd
				notes
				createdAt
				updatedAt
			}
			totalCount
		}
	}
```

#### `GET_DIRECT_REPORTS` (QUERY)

**Arguments:**
- `$managerId`

**Fields Used:**
- `departmentId`
- `directReports`
- `displayName`
- `email`
- `firstName`
- `id`
- `jobTitle`
- `lastName`
- `managerId`
- `nodes`
- `query`
- `role`
- `totalCount`

```graphql
query GetDirectReports($managerId: UUID!) {
		directReports(pManagerId: $managerId) {
			nodes {
				id
				email
				firstName
				lastName
				displayName
				jobTitle
				departmentId
				managerId
				role
			}
			totalCount
		}
	}
```

#### `GET_REVIEW_TYPES_METADATA` (QUERY)

**Fields Used:**
- `description`
- `displayOrder`
- `label`
- `nodes`
- `query`
- `reviewTypesMetadata`
- `value`

```graphql
query GetReviewTypesMetadata {
		reviewTypesMetadata {
			nodes {
				value
				label
				description
				displayOrder
			}
		}
	}
```

#### `GET_PERFORMANCE_REVIEW` (QUERY)

**Arguments:**
- `$id`

**Fields Used:**
- `createdAt`
- `deleted`
- `description`
- `displayName`
- `email`
- `employee`
- `employeeId`
- `goal`
- `goalId`
- `id`
- `jobTitle`
- `nodes`
- `notes`
- `performanceReview`
- `progressPercentage`
- `query`
- `reviewGoals`
- `reviewId`
- `reviewPeriodEnd`
- `reviewPeriodStart`
- *... and 7 more*

```graphql
query GetPerformanceReview($id: UUID!) {
		performanceReview(id: $id) {
			id
			employeeId
			reviewerId
			reviewType
			status
			reviewPeriodStart
			reviewPeriodEnd
			notes
			createdAt
			updatedAt
			employee: user {
				id
				displayName
				email
				jobTitle
			}
			reviewer {
				id
				displayName
				email
			}
			reviewGoals {
				nodes {
					id
					reviewId
					goalId
					goal: employeeGoal {
						id
						employeeId
						title
						description
						targetDate
						status
						progressPercentage
						deleted
					}
				}
			}
		}
	}
```

#### `GET_PERFORMANCE_REVIEWS` (QUERY)

**Arguments:**
- `$condition`
- `$filter`
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `condition`
- `createdAt`
- `displayName`
- `email`
- `employee`
- `employeeId`
- `endCursor`
- `filter`
- `first`
- `hasNextPage`
- `hasPreviousPage`
- `id`
- `jobTitle`
- `nodes`
- `notes`
- `offset`
- `orderBy`
- `pageInfo`
- `performanceReviews`
- `query`
- *... and 9 more*

```graphql
query GetPerformanceReviews(
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [PerformanceReviewsOrderBy!] = [CREATED_AT_DESC]
		$condition: PerformanceReviewCondition
		$filter: PerformanceReviewFilter
	) {
		performanceReviews(
			first: $first
			offset: $offset
			orderBy: $orderBy
			condition: $condition
			filter: $filter
		) {
			nodes {
				id
				employeeId
				reviewerId
				reviewType
				status
				reviewPeriodStart
				reviewPeriodEnd
				notes
				createdAt
				updatedAt
				employee: user {
					id
					displayName
					email
					jobTitle
				}
				reviewer {
					id
					displayName
					email
				}
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
```

#### `GET_EMPLOYEE_GOALS` (QUERY)

**Arguments:**
- `$employeeId`
- `$first`
- `$orderBy`

**Fields Used:**
- `condition`
- `createdAt`
- `createdBy`
- `description`
- `employeeGoals`
- `employeeId`
- `first`
- `id`
- `nodes`
- `orderBy`
- `progressPercentage`
- `query`
- `status`
- `targetDate`
- `title`
- `totalCount`
- `updatedAt`

```graphql
query GetEmployeeGoals(
		$employeeId: UUID!
		$first: Int = 50
		$orderBy: [EmployeeGoalsOrderBy!] = [TARGET_DATE_ASC]
	) {
		employeeGoals(
			condition: { employeeId: $employeeId, deleted: false }
			first: $first
			orderBy: $orderBy
		) {
			nodes {
				id
				employeeId
				title
				description
				targetDate
				status
				progressPercentage
				createdAt
				updatedAt
				createdBy
			}
			totalCount
		}
	}
```

#### `CREATE_REVIEW_WITH_GOALS` (MUTATION)

**Arguments:**
- `$employeeId`
- `$goalIds`
- `$newGoals`
- `$notes`
- `$reviewPeriodEnd`
- `$reviewPeriodStart`
- `$reviewType`

**Fields Used:**
- `createReviewWithGoals`
- `input`
- `json`
- `mutation`
- `pEmployeeId`
- `pGoalIds`
- `pNewGoals`
- `pNotes`
- `pReviewPeriodEnd`
- `pReviewPeriodStart`
- `pReviewType`

```graphql
mutation CreateReviewWithGoals(
		$employeeId: UUID!
		$reviewType: ReviewType!
		$reviewPeriodStart: Date
		$reviewPeriodEnd: Date
		$goalIds: [UUID!]
		$newGoals: JSON
		$notes: String
	) {
		createReviewWithGoals(
			input: {
				pEmployeeId: $employeeId
				pReviewType: $reviewType
				pReviewPeriodStart: $reviewPeriodStart
				pReviewPeriodEnd: $reviewPeriodEnd
				pGoalIds: $goalIds
				pNewGoals: $newGoals
				pNotes: $notes
			}
		) {
			json
		}
	}
```

#### `UPDATE_REVIEW_DRAFT` (MUTATION)

**Arguments:**
- `$id`
- `$notes`
- `$reviewPeriodEnd`
- `$reviewPeriodStart`
- `$reviewType`

**Fields Used:**
- `input`
- `json`
- `mutation`
- `pId`
- `pNotes`
- `pReviewPeriodEnd`
- `pReviewPeriodStart`
- `pReviewType`
- `updateReviewDraft`

```graphql
mutation UpdateReviewDraft(
		$id: UUID!
		$reviewType: ReviewType
		$reviewPeriodStart: Date
		$reviewPeriodEnd: Date
		$notes: String
	) {
		updateReviewDraft(
			input: {
				pId: $id
				pReviewType: $reviewType
				pReviewPeriodStart: $reviewPeriodStart
				pReviewPeriodEnd: $reviewPeriodEnd
				pNotes: $notes
			}
		) {
			json
		}
	}
```

#### `UPDATE_REVIEW_STATUS` (MUTATION)

**Arguments:**
- `$id`
- `$status`

**Fields Used:**
- `json`
- `mutation`
- `updateReviewStatus`

```graphql
mutation UpdateReviewStatus($id: UUID!, $status: ReviewStatus!) {
		updateReviewStatus(input: { pId: $id, pStatus: $status }) {
			json
		}
	}
```

#### `SOFT_DELETE_GOAL` (MUTATION)

**Arguments:**
- `$id`

**Fields Used:**
- `json`
- `mutation`
- `softDeleteGoal`

```graphql
mutation SoftDeleteGoal($id: UUID!) {
		softDeleteGoal(input: { pId: $id }) {
			json
		}
	}
```

#### `LINK_GOAL_TO_REVIEW` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `createReviewGoal`
- `createdAt`
- `goalId`
- `id`
- `mutation`
- `reviewGoal`
- `reviewId`

```graphql
mutation LinkGoalToReview($input: CreateReviewGoalInput!) {
		createReviewGoal(input: $input) {
			reviewGoal {
				id
				reviewId
				goalId
				createdAt
			}
			clientMutationId
		}
	}
```

#### `UNLINK_GOAL_FROM_REVIEW` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `deleteReviewGoal`
- `deletedReviewGoalId`
- `mutation`

```graphql
mutation UnlinkGoalFromReview($input: DeleteReviewGoalInput!) {
		deleteReviewGoal(input: $input) {
			deletedReviewGoalId
			clientMutationId
		}
	}
```

### src/lib/graphql/graphql/team-management-operations.ts

#### `GET_ALL_TEAMS` (QUERY)

**Arguments:**
- `$filter`
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `activeEmployees`
- `createdAt`
- `departmentHead`
- `departments`
- `description`
- `displayName`
- `email`
- `employees`
- `endCursor`
- `hasNextPage`
- `hasPreviousPage`
- `id`
- `jobTitle`
- `name`
- `nodes`
- `pageInfo`
- `parentDepartmentId`
- `query`
- `startCursor`
- `subDepartments`
- *... and 2 more*

```graphql
query GetAllTeams(
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [DepartmentsOrderBy!] = [NAME_ASC]
		$filter: DepartmentFilter
	) {
		departments(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
				id
				name
				description
				parentDepartmentId
				departmentHead {
					id
					displayName
					email
					jobTitle
				}
				employees {
					totalCount
				}
				activeEmployees: employees(condition: { isActive: true }) {
					totalCount
				}
				subDepartments: departmentsByParentDepartmentId {
					totalCount
				}
				createdAt
				updatedAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
```

#### `GET_TEAM_DETAILS` (QUERY)

**Arguments:**
- `$id`

**Fields Used:**
- `activeEmployees`
- `createdAt`
- `department`
- `departmentHead`
- `description`
- `displayName`
- `email`
- `employeeCount`
- `employees`
- `hireDate`
- `id`
- `isActive`
- `jobTitle`
- `managerId`
- `name`
- `nodes`
- `parentDepartment`
- `parentDepartmentId`
- `phone`
- `query`
- *... and 3 more*

```graphql
query GetTeamDetails($id: UUID!) {
		department(id: $id) {
			id
			name
			description
			parentDepartmentId
			parentDepartment {
				id
				name
			}
			departmentHead {
				id
				displayName
				email
				jobTitle
				phone
			}
			employees {
				nodes {
					id
					displayName
					email
					jobTitle
					isActive
					hireDate
					managerId
				}
				totalCount
			}
			activeEmployees: employees(condition: { isActive: true }) {
				totalCount
			}
			subDepartments: departmentsByParentDepartmentId {
				nodes {
					id
					name
					description
					employeeCount: employees {
						totalCount
					}
				}
				totalCount
			}
			createdAt
			updatedAt
		}
	}
```

#### `GET_TEAM_HIERARCHY` (QUERY)

**Arguments:**
- `$rootDepartmentId`

**Fields Used:**
- `activeEmployees`
- `departmentHead`
- `departments`
- `description`
- `displayName`
- `employeeCount`
- `employees`
- `id`
- `jobTitle`
- `name`
- `nodes`
- `parentDepartmentId`
- `query`
- `subDepartments`
- `totalCount`

```graphql
query GetTeamHierarchy($rootDepartmentId: UUID) {
		departments(condition: { parentDepartmentId: $rootDepartmentId }, orderBy: [NAME_ASC]) {
			nodes {
				id
				name
				description
				parentDepartmentId
				departmentHead {
					id
					displayName
					jobTitle
				}
				employees {
					totalCount
				}
				activeEmployees: employees(condition: { isActive: true }) {
					totalCount
				}
				subDepartments: departmentsByParentDepartmentId {
					nodes {
						id
						name
						employeeCount: employees {
							totalCount
						}
					}
				}
			}
		}
	}
```

#### `SEARCH_TEAMS` (QUERY)

**Arguments:**
- `$filter`
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `activeEmployees`
- `createdAt`
- `departmentHead`
- `departments`
- `description`
- `displayName`
- `email`
- `employees`
- `id`
- `jobTitle`
- `name`
- `nodes`
- `parentDepartmentId`
- `query`
- `totalCount`
- `updatedAt`

```graphql
query SearchTeams(
		$filter: DepartmentFilter
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [DepartmentsOrderBy!] = [NAME_ASC]
	) {
		departments(filter: $filter, first: $first, offset: $offset, orderBy: $orderBy) {
			nodes {
				id
				name
				description
				parentDepartmentId
				departmentHead {
					id
					displayName
					email
					jobTitle
				}
				employees {
					totalCount
				}
				activeEmployees: employees(condition: { isActive: true }) {
					totalCount
				}
				createdAt
				updatedAt
			}
			totalCount
		}
	}
```

#### `CREATE_TEAM` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `createDepartment`
- `createdAt`
- `department`
- `departmentHead`
- `description`
- `displayName`
- `email`
- `employees`
- `id`
- `mutation`
- `name`
- `parentDepartmentId`
- `totalCount`

```graphql
mutation CreateTeam($input: CreateDepartmentInput!) {
		createDepartment(input: $input) {
			department {
				id
				name
				description
				parentDepartmentId
				departmentHead {
					id
					displayName
					email
				}
				employees {
					totalCount
				}
				createdAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_TEAM` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `department`
- `departmentHead`
- `description`
- `displayName`
- `email`
- `employees`
- `id`
- `mutation`
- `name`
- `parentDepartmentId`
- `totalCount`
- `updateDepartment`
- `updatedAt`

```graphql
mutation UpdateTeam($input: UpdateDepartmentInput!) {
		updateDepartment(input: $input) {
			department {
				id
				name
				description
				parentDepartmentId
				departmentHead {
					id
					displayName
					email
				}
				employees {
					totalCount
				}
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `DELETE_TEAM` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `deleteDepartment`
- `deletedDepartmentId`
- `mutation`

```graphql
mutation DeleteTeam($input: DeleteDepartmentInput!) {
		deleteDepartment(input: $input) {
			deletedDepartmentId
			clientMutationId
		}
	}
```

#### `ASSIGN_DEPARTMENT_HEAD` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `department`
- `departmentHead`
- `displayName`
- `email`
- `id`
- `jobTitle`
- `mutation`
- `name`
- `updateDepartment`
- `updatedAt`

```graphql
mutation AssignDepartmentHead($input: UpdateDepartmentInput!) {
		updateDepartment(input: $input) {
			department {
				id
				name
				departmentHead {
					id
					displayName
					email
					jobTitle
				}
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `MOVE_EMPLOYEE_TO_TEAM` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `department`
- `displayName`
- `id`
- `mutation`
- `name`
- `updateUser`
- `updatedAt`
- `user`

```graphql
mutation MoveEmployeeToTeam($input: UpdateUserInput!) {
		updateUser(input: $input) {
			user {
				id
				displayName
				department {
					id
					name
				}
				updatedAt
			}
			clientMutationId
		}
	}
```

### src/lib/graphql/graphql/team-reports-operations.ts

#### `GET_TEAM_REPORTS` (QUERY)

**Arguments:**
- `$filter`
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `createdAt`
- `data`
- `dateFrom`
- `dateTo`
- `displayName`
- `email`
- `endCursor`
- `generatedBy`
- `hasNextPage`
- `hasPreviousPage`
- `id`
- `isScheduled`
- `name`
- `nodes`
- `pageInfo`
- `parameters`
- `query`
- `reportType`
- `scheduleCron`
- `startCursor`
- *... and 7 more*

```graphql
query GetTeamReports(
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [TeamReportsOrderBy!] = [CREATED_AT_DESC]
		$filter: TeamReportFilter
	) {
		teamReports(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
				id
				title
				reportType
				status
				dateFrom
				dateTo
				summary
				isScheduled
				scheduleCron
				team: department {
					id
					name
				}
				generatedBy {
					id
					displayName
					email
				}
				parameters
				data
				createdAt
				updatedAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
```

#### `GET_TEAM_REPORT` (QUERY)

**Arguments:**
- `$id`

**Fields Used:**
- `createdAt`
- `data`
- `dateFrom`
- `dateTo`
- `departmentHead`
- `displayName`
- `email`
- `employees`
- `generatedBy`
- `id`
- `isScheduled`
- `jobTitle`
- `name`
- `parameters`
- `query`
- `reportType`
- `scheduleCron`
- `status`
- `summary`
- `team`
- *... and 4 more*

```graphql
query GetTeamReport($id: UUID!) {
		teamReport(id: $id) {
			id
			title
			reportType
			status
			dateFrom
			dateTo
			summary
			isScheduled
			scheduleCron
			team: department {
				id
				name
				departmentHead {
					id
					displayName
					email
				}
				employees {
					totalCount
				}
			}
			generatedBy {
				id
				displayName
				email
				jobTitle
			}
			parameters
			data
			createdAt
			updatedAt
		}
	}
```

#### `GET_REPORTS_BY_TEAM` (QUERY)

**Arguments:**
- `$first`
- `$orderBy`
- `$reportType`
- `$teamId`

**Fields Used:**
- `condition`
- `createdAt`
- `dateFrom`
- `dateTo`
- `displayName`
- `filter`
- `first`
- `generatedBy`
- `id`
- `isScheduled`
- `nodes`
- `orderBy`
- `query`
- `reportType`
- `status`
- `summary`
- `teamReports`
- `title`
- `totalCount`

```graphql
query GetReportsByTeam(
    $teamId: UUID!
    $reportType: ReportType
    $first: Int = 50
    $orderBy: [TeamReportsOrderBy!] = [CREATED_AT_DESC]
  ) {
    teamReports(
      condition: { teamId: $teamId }
      filter: { reportType: $reportType ? { equalTo: $reportType } : null }
      first: $first
      orderBy: $orderBy
    ) {
      nodes {
        id
        title
        reportType
        status
        dateFrom
        dateTo
        summary
        isScheduled
        generatedBy {
          id
          displayName
        }
        createdAt
      }
      totalCount
    }
  }
```

#### `GET_SCHEDULED_REPORTS` (QUERY)

**Arguments:**
- `$first`
- `$orderBy`

**Fields Used:**
- `createdAt`
- `displayName`
- `generatedBy`
- `id`
- `name`
- `nodes`
- `parameters`
- `query`
- `reportType`
- `scheduleCron`
- `status`
- `team`
- `teamReports`
- `title`
- `totalCount`
- `updatedAt`

```graphql
query GetScheduledReports($first: Int = 50, $orderBy: [TeamReportsOrderBy!] = [UPDATED_AT_DESC]) {
		teamReports(condition: { isScheduled: true }, first: $first, orderBy: $orderBy) {
			nodes {
				id
				title
				reportType
				status
				scheduleCron
				team: department {
					id
					name
				}
				generatedBy {
					id
					displayName
				}
				parameters
				createdAt
				updatedAt
			}
			totalCount
		}
	}
```

#### `GET_REPORTS_DASHBOARD` (QUERY)

**Arguments:**
- `$dateFrom`
- `$dateTo`
- `$teamId`

**Fields Used:**
- `createdAt`
- `data`
- `dateFrom`
- `dateTo`
- `displayName`
- `filter`
- `generatedBy`
- `id`
- `name`
- `nodes`
- `query`
- `reportType`
- `status`
- `team`
- `teamId`
- `teamReports`
- `title`
- `totalCount`

```graphql
query GetReportsDashboard(
    $teamId: UUID
    $dateFrom: Date
    $dateTo: Date
  ) {
    teamReports(
      filter: {
        teamId: $teamId ? { equalTo: $teamId } : null
        dateFrom: $dateFrom ? { greaterThanOrEqualTo: $dateFrom } : null
        dateTo: $dateTo ? { lessThanOrEqualTo: $dateTo } : null
        status: { equalTo: "completed" }
      }
    ) {
      nodes {
        id
        title
        reportType
        dateFrom
        dateTo
        team: department {
          id
          name
        }
        generatedBy {
          id
          displayName
        }
        data
        createdAt
      }
      totalCount
    }
  }
```

#### `SEARCH_REPORTS` (QUERY)

**Arguments:**
- `$dateFrom`
- `$dateTo`
- `$first`
- `$generatedBy`
- `$isScheduled`
- `$orderBy`
- `$reportType`
- `$searchTerm`
- `$status`
- `$teamId`

**Fields Used:**
- `createdAt`
- `dateFrom`
- `dateTo`
- `displayName`
- `filter`
- `first`
- `generatedBy`
- `id`
- `isScheduled`
- `name`
- `nodes`
- `orderBy`
- `query`
- `reportType`
- `status`
- `summary`
- `team`
- `teamId`
- `teamReports`
- `title`
- *... and 1 more*

```graphql
query SearchReports(
    $searchTerm: String
    $reportType: ReportType
    $teamId: UUID
    $generatedBy: UUID
    $isScheduled: Boolean
    $status: ReportStatus
    $dateFrom: Date
    $dateTo: Date
    $first: Int = 50
    $orderBy: [TeamReportsOrderBy!] = [CREATED_AT_DESC]
  ) {
    teamReports(
      filter: {
        title: $searchTerm ? { includesInsensitive: $searchTerm } : null
        reportType: $reportType ? { equalTo: $reportType } : null
        teamId: $teamId ? { equalTo: $teamId } : null
        generatedBy: $generatedBy ? { equalTo: $generatedBy } : null
        isScheduled: $isScheduled != null ? { equalTo: $isScheduled } : null
        status: $status ? { equalTo: $status } : null
        dateFrom: $dateFrom ? { greaterThanOrEqualTo: $dateFrom } : null
        dateTo: $dateTo ? { lessThanOrEqualTo: $dateTo } : null
      }
      first: $first
      orderBy: $orderBy
    ) {
      nodes {
        id
        title
        reportType
        status
        dateFrom
        dateTo
        summary
        isScheduled
        team: department {
          id
          name
        }
        generatedBy {
          id
          displayName
        }
        createdAt
      }
      totalCount
    }
  }
```

#### `GENERATE_TEAM_REPORT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `createTeamReport`
- `createdAt`
- `dateFrom`
- `dateTo`
- `displayName`
- `generatedBy`
- `id`
- `mutation`
- `name`
- `parameters`
- `reportType`
- `status`
- `team`
- `teamReport`
- `title`

```graphql
mutation GenerateTeamReport($input: CreateTeamReportInput!) {
		createTeamReport(input: $input) {
			teamReport {
				id
				title
				reportType
				status
				dateFrom
				dateTo
				team: department {
					id
					name
				}
				generatedBy {
					id
					displayName
				}
				parameters
				createdAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_TEAM_REPORT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `data`
- `id`
- `mutation`
- `status`
- `summary`
- `teamReport`
- `title`
- `updateTeamReport`
- `updatedAt`

```graphql
mutation UpdateTeamReport($input: UpdateTeamReportInput!) {
		updateTeamReport(input: $input) {
			teamReport {
				id
				title
				status
				summary
				data
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `SCHEDULE_REPORT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `id`
- `isScheduled`
- `mutation`
- `scheduleCron`
- `teamReport`
- `title`
- `updateTeamReport`
- `updatedAt`

```graphql
mutation ScheduleReport($input: UpdateTeamReportInput!) {
		updateTeamReport(input: $input) {
			teamReport {
				id
				title
				isScheduled
				scheduleCron
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `DELETE_TEAM_REPORT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `deleteTeamReport`
- `deletedTeamReportId`
- `mutation`

```graphql
mutation DeleteTeamReport($input: DeleteTeamReportInput!) {
		deleteTeamReport(input: $input) {
			deletedTeamReportId
			clientMutationId
		}
	}
```

#### `REGENERATE_REPORT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `data`
- `id`
- `mutation`
- `status`
- `summary`
- `teamReport`
- `updateTeamReport`
- `updatedAt`

```graphql
mutation RegenerateReport($input: UpdateTeamReportInput!) {
		updateTeamReport(input: $input) {
			teamReport {
				id
				status
				data
				summary
				updatedAt
			}
			clientMutationId
		}
	}
```

### src/lib/graphql/leave-management-operations.ts

#### `GET_PENDING_LEAVE_REQUESTS` (QUERY)

**Arguments:**
- `$filter`
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `createdAt`
- `department`
- `displayName`
- `email`
- `employee`
- `employeeId`
- `endCursor`
- `endDate`
- `hasNextPage`
- `hasPreviousPage`
- `id`
- `jobTitle`
- `leaveRequests`
- `leaveType`
- `name`
- `nodes`
- `pageInfo`
- `query`
- `reason`
- `reviewNotes`
- *... and 9 more*

```graphql
query GetPendingLeaveRequests(
		$first: Int = 20
		$offset: Int = 0
		$orderBy: [LeaveRequestsOrderBy!] = [CREATED_AT_DESC]
		$filter: LeaveRequestFilter
	) {
		leaveRequests(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
				id
				employeeId
				employee {
					id
					displayName
					email
					jobTitle
					department {
						id
						name
					}
				}
				leaveType
				startDate
				endDate
				totalDays
				reason
				status
				reviewedBy
				reviewer {
					id
					displayName
					email
				}
				reviewNotes
				reviewedAt
				createdAt
				updatedAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
```

#### `GET_LEAVE_REQUEST_BY_ID` (QUERY)

**Arguments:**
- `$id`

**Fields Used:**
- `createdAt`
- `department`
- `displayName`
- `email`
- `employee`
- `employeeId`
- `endDate`
- `id`
- `jobTitle`
- `leaveRequest`
- `leaveType`
- `name`
- `query`
- `reason`
- `reviewNotes`
- `reviewedAt`
- `reviewedBy`
- `reviewer`
- `startDate`
- `status`
- *... and 2 more*

```graphql
query GetLeaveRequestById($id: UUID!) {
		leaveRequest(id: $id) {
			id
			employeeId
			employee {
				id
				displayName
				email
				jobTitle
				department {
					id
					name
				}
			}
			leaveType
			startDate
			endDate
			totalDays
			reason
			status
			reviewedBy
			reviewer {
				id
				displayName
				email
			}
			reviewNotes
			reviewedAt
			createdAt
			updatedAt
		}
	}
```

#### `GET_LEAVE_STATISTICS` (QUERY)

**Arguments:**
- `$departmentId`

**Fields Used:**
- `allLeaveRequests`
- `approvedLeaveRequests`
- `filter`
- `nodes`
- `pendingLeaveRequests`
- `query`
- `rejectedLeaveRequests`
- `totalCount`
- `totalDays`

```graphql
query GetLeaveStatistics($departmentId: UUID!) {
		pendingLeaveRequests: leaveRequests(
			filter: { status: { equalTo: "pending" }, employee: { departmentId: { equalTo: $departmentId } } }
		) {
			totalCount
		}
		approvedLeaveRequests: leaveRequests(
			filter: { status: { equalTo: "approved" }, employee: { departmentId: { equalTo: $departmentId } } }
		) {
			totalCount
		}
		rejectedLeaveRequests: leaveRequests(
			filter: { status: { equalTo: "rejected" }, employee: { departmentId: { equalTo: $departmentId } } }
		) {
			totalCount
		}
		allLeaveRequests: leaveRequests(
			filter: { employee: { departmentId: { equalTo: $departmentId } } }
		) {
			totalCount
			nodes {
				totalDays
			}
		}
	}
```

#### `APPROVE_LEAVE_REQUEST` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `displayName`
- `email`
- `employee`
- `employeeId`
- `endDate`
- `id`
- `leaveRequest`
- `leaveType`
- `mutation`
- `reviewNotes`
- `reviewedAt`
- `reviewedBy`
- `reviewer`
- `startDate`
- `status`
- `totalDays`
- `updateLeaveRequest`
- `updatedAt`

```graphql
mutation ApproveLeaveRequest($input: UpdateLeaveRequestInput!) {
		updateLeaveRequest(input: $input) {
			leaveRequest {
				id
				employeeId
				employee {
					id
					displayName
					email
				}
				leaveType
				startDate
				endDate
				totalDays
				status
				reviewedBy
				reviewer {
					id
					displayName
					email
				}
				reviewNotes
				reviewedAt
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `REJECT_LEAVE_REQUEST` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `displayName`
- `email`
- `employee`
- `employeeId`
- `endDate`
- `id`
- `leaveRequest`
- `leaveType`
- `mutation`
- `reviewNotes`
- `reviewedAt`
- `reviewedBy`
- `reviewer`
- `startDate`
- `status`
- `totalDays`
- `updateLeaveRequest`
- `updatedAt`

```graphql
mutation RejectLeaveRequest($input: UpdateLeaveRequestInput!) {
		updateLeaveRequest(input: $input) {
			leaveRequest {
				id
				employeeId
				employee {
					id
					displayName
					email
				}
				leaveType
				startDate
				endDate
				totalDays
				status
				reviewedBy
				reviewer {
					id
					displayName
					email
				}
				reviewNotes
				reviewedAt
				updatedAt
			}
			clientMutationId
		}
	}
```

### src/lib/graphql/notifications-operations.ts

#### `GET_USER_NOTIFICATIONS` (QUERY)

**Arguments:**
- `$condition`
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `allNotifications`
- `category`
- `condition`
- `createdAt`
- `deliveredAt`
- `first`
- `hasNextPage`
- `hasPreviousPage`
- `id`
- `message`
- `nodes`
- `offset`
- `orderBy`
- `pageInfo`
- `query`
- `readAt`
- `readStatus`
- `recipientId`
- `relatedResourceId`
- `relatedResourceType`
- *... and 3 more*

```graphql
query GetUserNotifications(
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [NotificationsOrderBy!] = [CREATED_AT_DESC]
		$condition: NotificationCondition
	) {
		allNotifications(
			first: $first
			offset: $offset
			orderBy: $orderBy
			condition: $condition
		) {
			nodes {
				id
				recipientId
				type
				category
				title
				message
				relatedResourceType
				relatedResourceId
				readStatus
				deliveredAt
				readAt
				createdAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
```

#### `GET_UNREAD_COUNT` (QUERY)

**Arguments:**
- `$condition`

**Fields Used:**
- `allNotifications`
- `query`
- `totalCount`

```graphql
query GetUnreadCount($condition: NotificationCondition) {
		allNotifications(condition: $condition) {
			totalCount
		}
	}
```

#### `GET_NOTIFICATION_BY_ID` (QUERY)

**Arguments:**
- `$id`

**Fields Used:**
- `category`
- `createdAt`
- `deliveredAt`
- `id`
- `message`
- `notificationById`
- `query`
- `readAt`
- `readStatus`
- `recipientId`
- `relatedResourceId`
- `relatedResourceType`
- `title`
- `type`

```graphql
query GetNotificationById($id: UUID!) {
		notificationById(id: $id) {
			id
			recipientId
			type
			category
			title
			message
			relatedResourceType
			relatedResourceId
			readStatus
			deliveredAt
			readAt
			createdAt
		}
	}
```

#### `MARK_NOTIFICATION_READ` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `id`
- `mutation`
- `notification`
- `readAt`
- `readStatus`
- `updateNotification`

```graphql
mutation MarkNotificationRead($input: UpdateNotificationInput!) {
		updateNotification(input: $input) {
			notification {
				id
				readStatus
				readAt
			}
			clientMutationId
		}
	}
```

#### `MARK_ALL_READ` (MUTATION)

**Arguments:**
- `$condition`
- `$patch`

**Fields Used:**
- `id`
- `mutation`
- `notifications`
- `readAt`
- `readStatus`
- `updateNotifications`

```graphql
mutation MarkAllRead($condition: NotificationCondition!, $patch: NotificationPatch!) {
		updateNotifications(condition: $condition, patch: $patch) {
			notifications {
				id
				readStatus
				readAt
			}
		}
	}
```

#### `DELETE_NOTIFICATION` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `deleteNotification`
- `deletedNotificationId`
- `mutation`

```graphql
mutation DeleteNotification($input: DeleteNotificationInput!) {
		deleteNotification(input: $input) {
			deletedNotificationId
			clientMutationId
		}
	}
```

### src/lib/graphql/performance-management-operations.ts

#### `GET_PERFORMANCE_REVIEWS` (QUERY)

**Arguments:**
- `$filter`
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `areasForImprovement`
- `collaboration`
- `comments`
- `communication`
- `createdAt`
- `department`
- `displayName`
- `email`
- `employee`
- `employeeId`
- `endCursor`
- `goalsAchievement`
- `hasNextPage`
- `hasPreviousPage`
- `id`
- `jobTitle`
- `leadership`
- `name`
- `nodes`
- `overallRating`
- *... and 13 more*

```graphql
query GetPerformanceReviews(
		$first: Int = 20
		$offset: Int = 0
		$orderBy: [PerformanceReviewsOrderBy!] = [REVIEW_DATE_DESC]
		$filter: PerformanceReviewFilter
	) {
		performanceReviews(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
				id
				employeeId
				employee {
					id
					displayName
					email
					jobTitle
					department {
						id
						name
					}
				}
				reviewerId
				reviewer {
					id
					displayName
					email
				}
				reviewPeriod
				reviewDate
				overallRating
				goalsAchievement
				collaboration
				communication
				leadership
				technicalSkills
				strengths
				areasForImprovement
				comments
				status
				createdAt
				updatedAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
```

#### `GET_PERFORMANCE_REVIEW_BY_ID` (QUERY)

**Arguments:**
- `$id`

**Fields Used:**
- `areasForImprovement`
- `collaboration`
- `comments`
- `communication`
- `createdAt`
- `department`
- `displayName`
- `email`
- `employee`
- `employeeId`
- `goalsAchievement`
- `id`
- `jobTitle`
- `leadership`
- `name`
- `overallRating`
- `performanceReview`
- `query`
- `reviewDate`
- `reviewPeriod`
- *... and 6 more*

```graphql
query GetPerformanceReviewById($id: UUID!) {
		performanceReview(id: $id) {
			id
			employeeId
			employee {
				id
				displayName
				email
				jobTitle
				department {
					id
					name
				}
			}
			reviewerId
			reviewer {
				id
				displayName
				email
			}
			reviewPeriod
			reviewDate
			overallRating
			goalsAchievement
			collaboration
			communication
			leadership
			technicalSkills
			strengths
			areasForImprovement
			comments
			status
			createdAt
			updatedAt
		}
	}
```

#### `GET_PERFORMANCE_STATISTICS` (QUERY)

**Arguments:**
- `$departmentId`

**Fields Used:**
- `collaboration`
- `communication`
- `completedReviews`
- `employee`
- `filter`
- `goalsAchievement`
- `inProgressReviews`
- `leadership`
- `nodes`
- `overallRating`
- `overdueReviews`
- `query`
- `status`
- `technicalSkills`
- `totalCount`
- `totalReviews`

```graphql
query GetPerformanceStatistics($departmentId: UUID!) {
		totalReviews: performanceReviews(
			filter: { employee: { departmentId: { equalTo: $departmentId } } }
		) {
			totalCount
		}
		completedReviews: performanceReviews(
			filter: {
				status: { equalTo: "completed" }
				employee: { departmentId: { equalTo: $departmentId } }
			}
		) {
			totalCount
			nodes {
				overallRating
				goalsAchievement
				collaboration
				communication
				leadership
				technicalSkills
			}
		}
		inProgressReviews: performanceReviews(
			filter: {
				status: { equalTo: "in_progress" }
				employee: { departmentId: { equalTo: $departmentId } }
			}
		) {
			totalCount
		}
		overdueReviews: performanceReviews(
			filter: {
				status: { equalTo: "overdue" }
				employee: { departmentId: { equalTo: $departmentId } }
			}
		) {
			totalCount
		}
	}
```

#### `CREATE_PERFORMANCE_REVIEW` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `areasForImprovement`
- `clientMutationId`
- `collaboration`
- `comments`
- `communication`
- `createPerformanceReview`
- `createdAt`
- `displayName`
- `email`
- `employee`
- `employeeId`
- `goalsAchievement`
- `id`
- `jobTitle`
- `leadership`
- `mutation`
- `overallRating`
- `performanceReview`
- `reviewDate`
- `reviewPeriod`
- *... and 5 more*

```graphql
mutation CreatePerformanceReview($input: CreatePerformanceReviewInput!) {
		createPerformanceReview(input: $input) {
			performanceReview {
				id
				employeeId
				employee {
					id
					displayName
					email
					jobTitle
				}
				reviewerId
				reviewer {
					id
					displayName
					email
				}
				reviewPeriod
				reviewDate
				overallRating
				goalsAchievement
				collaboration
				communication
				leadership
				technicalSkills
				strengths
				areasForImprovement
				comments
				status
				createdAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_PERFORMANCE_REVIEW` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `areasForImprovement`
- `clientMutationId`
- `collaboration`
- `comments`
- `communication`
- `displayName`
- `email`
- `employee`
- `employeeId`
- `goalsAchievement`
- `id`
- `leadership`
- `mutation`
- `overallRating`
- `performanceReview`
- `reviewDate`
- `reviewPeriod`
- `reviewer`
- `reviewerId`
- `status`
- *... and 4 more*

```graphql
mutation UpdatePerformanceReview($input: UpdatePerformanceReviewInput!) {
		updatePerformanceReview(input: $input) {
			performanceReview {
				id
				employeeId
				employee {
					id
					displayName
					email
				}
				reviewerId
				reviewer {
					id
					displayName
					email
				}
				reviewPeriod
				reviewDate
				overallRating
				goalsAchievement
				collaboration
				communication
				leadership
				technicalSkills
				strengths
				areasForImprovement
				comments
				status
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `DELETE_PERFORMANCE_REVIEW` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `deletePerformanceReview`
- `deletedPerformanceReviewId`
- `mutation`

```graphql
mutation DeletePerformanceReview($input: DeletePerformanceReviewInput!) {
		deletePerformanceReview(input: $input) {
			deletedPerformanceReviewId
			clientMutationId
		}
	}
```

### src/lib/graphql/postgraphile-operations.ts

#### `GET_USER_BY_ID` (QUERY)

**Arguments:**
- `$id`

**Fields Used:**
- `action`
- `assignedAt`
- `avatar`
- `createdAt`
- `department`
- `description`
- `displayName`
- `email`
- `firstName`
- `hireDate`
- `id`
- `isActive`
- `jobTitle`
- `lastName`
- `manager`
- `name`
- `nodes`
- `permissions`
- `phoneNumber`
- `profileByUserId`
- *... and 7 more*

```graphql
query GetUserById($id: UUID!) {
		userById(id: $id) {
			id
			email
			displayName
			firstName
			lastName
			isActive
			createdAt
			updatedAt
			userRolesByUserId {
				nodes {
					id
					roleId
					assignedAt
					roleByRoleId {
						id
						name
						description
						permissions {
							nodes {
								id
								name
								resource
								action
								description
							}
						}
					}
				}
			}
			profileByUserId {
				id
				phoneNumber
				department
				jobTitle
				manager
				hireDate
				avatar
			}
		}
	}
```

#### `GET_USER_ROLES` (QUERY)

**Arguments:**
- `$userId`

**Fields Used:**
- `action`
- `assignedAt`
- `assignedBy`
- `description`
- `id`
- `isActive`
- `level`
- `name`
- `nodes`
- `permissionByPermissionId`
- `query`
- `resource`
- `roleByRoleId`
- `roleId`
- `rolePermissionsByRoleId`
- `userRolesByUserId`

```graphql
query GetUserRoles($userId: UUID!) {
		userRolesByUserId(condition: { userId: $userId }) {
			nodes {
				id
				roleId
				assignedAt
				assignedBy
				roleByRoleId {
					id
					name
					description
					level
					isActive
					rolePermissionsByRoleId {
						nodes {
							permissionByPermissionId {
								id
								name
								resource
								action
								description
								isActive
							}
						}
					}
				}
			}
		}
	}
```

#### `GET_ALL_USERS` (QUERY)

**Arguments:**
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `address`
- `allUsers`
- `avatar`
- `createdAt`
- `department`
- `description`
- `displayName`
- `email`
- `emergencyContactName`
- `emergencyContactPhone`
- `firstName`
- `hireDate`
- `id`
- `isActive`
- `jobTitle`
- `lastName`
- `level`
- `manager`
- `name`
- `nodes`
- *... and 7 more*

```graphql
query GetAllUsers($first: Int, $offset: Int, $orderBy: [UsersOrderBy!]) {
		allUsers(first: $first, offset: $offset, orderBy: $orderBy) {
			nodes {
				id
				email
				displayName
				firstName
				lastName
				isActive
				createdAt
				updatedAt
				profileByUserId {
					id
					phoneNumber
					department
					jobTitle
					manager
					hireDate
					avatar
					emergencyContactName
					emergencyContactPhone
					address
				}
				userRolesByUserId {
					nodes {
						roleByRoleId {
							id
							name
							description
							level
						}
					}
				}
			}
			totalCount
		}
	}
```

#### `CREATE_USER` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `createUser`
- `createdAt`
- `displayName`
- `email`
- `firstName`
- `id`
- `isActive`
- `lastName`
- `mutation`
- `user`

```graphql
mutation CreateUser($input: CreateUserInput!) {
		createUser(input: $input) {
			user {
				id
				email
				displayName
				firstName
				lastName
				isActive
				createdAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_USER` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `displayName`
- `email`
- `firstName`
- `id`
- `isActive`
- `lastName`
- `mutation`
- `updateUserById`
- `updatedAt`
- `user`

```graphql
mutation UpdateUser($input: UpdateUserByIdInput!) {
		updateUserById(input: $input) {
			user {
				id
				email
				displayName
				firstName
				lastName
				isActive
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `ASSIGN_USER_ROLE` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `assignedAt`
- `assignedBy`
- `clientMutationId`
- `createUserRole`
- `description`
- `id`
- `mutation`
- `name`
- `roleByRoleId`
- `roleId`
- `userId`
- `userRole`

```graphql
mutation AssignUserRole($input: CreateUserRoleInput!) {
		createUserRole(input: $input) {
			userRole {
				id
				userId
				roleId
				assignedAt
				assignedBy
				roleByRoleId {
					id
					name
					description
				}
			}
			clientMutationId
		}
	}
```

#### `REMOVE_USER_ROLE` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `deleteUserRoleById`
- `id`
- `mutation`
- `roleId`
- `userId`
- `userRole`

```graphql
mutation RemoveUserRole($input: DeleteUserRoleByIdInput!) {
		deleteUserRoleById(input: $input) {
			userRole {
				id
				userId
				roleId
			}
			clientMutationId
		}
	}
```

#### `GET_ALL_ROLES` (QUERY)

**Fields Used:**
- `action`
- `allRoles`
- `createdAt`
- `description`
- `id`
- `isActive`
- `level`
- `name`
- `nodes`
- `permissionByPermissionId`
- `query`
- `resource`
- `rolePermissionsByRoleId`

```graphql
query GetAllRoles {
		allRoles(orderBy: [LEVEL_DESC, NAME_ASC]) {
			nodes {
				id
				name
				description
				level
				isActive
				createdAt
				rolePermissionsByRoleId {
					nodes {
						permissionByPermissionId {
							id
							name
							resource
							action
							description
							isActive
						}
					}
				}
			}
		}
	}
```

#### `GET_ALL_PERMISSIONS` (QUERY)

**Fields Used:**
- `action`
- `allPermissions`
- `createdAt`
- `description`
- `id`
- `isActive`
- `name`
- `nodes`
- `query`
- `resource`

```graphql
query GetAllPermissions {
		allPermissions(orderBy: [RESOURCE_ASC, ACTION_ASC]) {
			nodes {
				id
				name
				resource
				action
				description
				isActive
				createdAt
			}
		}
	}
```

### src/lib/graphql/reports-operations.ts

#### `GET_HR_REPORTS` (QUERY)

**Arguments:**
- `$filter`
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `category`
- `createdAt`
- `creator`
- `creatorId`
- `data`
- `department`
- `departmentId`
- `displayName`
- `email`
- `endCursor`
- `filters`
- `generatedAt`
- `hasNextPage`
- `hasPreviousPage`
- `hrReports`
- `id`
- `name`
- `nodes`
- `pageInfo`
- `query`
- *... and 7 more*

```graphql
query GetHRReports(
		$first: Int = 20
		$offset: Int = 0
		$orderBy: [HrReportsOrderBy!] = [CREATED_AT_DESC]
		$filter: HrReportFilter
	) {
		hrReports(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
				id
				creatorId
				creator {
					id
					displayName
					email
				}
				departmentId
				department {
					id
					name
				}
				title
				reportType
				category
				filters
				data
				status
				scheduledAt
				generatedAt
				createdAt
				updatedAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
```

#### `GET_HR_REPORT_BY_ID` (QUERY)

**Arguments:**
- `$id`

**Fields Used:**
- `category`
- `createdAt`
- `creator`
- `creatorId`
- `data`
- `department`
- `departmentId`
- `displayName`
- `email`
- `filters`
- `generatedAt`
- `hrReport`
- `id`
- `name`
- `query`
- `reportType`
- `scheduledAt`
- `status`
- `title`
- `updatedAt`

```graphql
query GetHRReportById($id: UUID!) {
		hrReport(id: $id) {
			id
			creatorId
			creator {
				id
				displayName
				email
			}
			departmentId
			department {
				id
				name
			}
			title
			reportType
			category
			filters
			data
			status
			scheduledAt
			generatedAt
			createdAt
			updatedAt
		}
	}
```

#### `GET_REPORT_ANALYTICS` (QUERY)

**Arguments:**
- `$departmentId`

**Fields Used:**
- `activeReports`
- `category`
- `completedReports`
- `filter`
- `generatedAt`
- `nodes`
- `query`
- `reportType`
- `scheduledReports`
- `totalCount`
- `totalReports`

```graphql
query GetReportAnalytics($departmentId: UUID!) {
		totalReports: hrReports(filter: { departmentId: { equalTo: $departmentId } }) {
			totalCount
		}
		activeReports: hrReports(
			filter: { status: { equalTo: "active" }, departmentId: { equalTo: $departmentId } }
		) {
			totalCount
		}
		scheduledReports: hrReports(
			filter: { status: { equalTo: "scheduled" }, departmentId: { equalTo: $departmentId } }
		) {
			totalCount
		}
		completedReports: hrReports(
			filter: { status: { equalTo: "completed" }, departmentId: { equalTo: $departmentId } }
		) {
			totalCount
			nodes {
				reportType
				category
				generatedAt
			}
		}
	}
```

#### `CREATE_HR_REPORT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `category`
- `clientMutationId`
- `createHrReport`
- `createdAt`
- `creator`
- `creatorId`
- `data`
- `department`
- `departmentId`
- `displayName`
- `email`
- `filters`
- `hrReport`
- `id`
- `mutation`
- `name`
- `reportType`
- `scheduledAt`
- `status`
- `title`

```graphql
mutation CreateHRReport($input: CreateHrReportInput!) {
		createHrReport(input: $input) {
			hrReport {
				id
				creatorId
				creator {
					id
					displayName
					email
				}
				departmentId
				department {
					id
					name
				}
				title
				reportType
				category
				filters
				data
				status
				scheduledAt
				createdAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_HR_REPORT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `category`
- `clientMutationId`
- `creator`
- `creatorId`
- `data`
- `departmentId`
- `displayName`
- `email`
- `filters`
- `hrReport`
- `id`
- `mutation`
- `reportType`
- `scheduledAt`
- `status`
- `title`
- `updateHrReport`
- `updatedAt`

```graphql
mutation UpdateHRReport($input: UpdateHrReportInput!) {
		updateHrReport(input: $input) {
			hrReport {
				id
				creatorId
				creator {
					id
					displayName
					email
				}
				departmentId
				title
				reportType
				category
				filters
				data
				status
				scheduledAt
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `DELETE_HR_REPORT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `deleteHrReport`
- `deletedHrReportId`
- `mutation`

```graphql
mutation DeleteHRReport($input: DeleteHrReportInput!) {
		deleteHrReport(input: $input) {
			deletedHrReportId
			clientMutationId
		}
	}
```

### src/lib/graphql/settings-operations.ts

#### `GET_USER_SETTINGS` (QUERY)

**Arguments:**
- `$userId`

**Fields Used:**
- `allowDirectMessages`
- `analyticsOptOut`
- `appearance`
- `avatar`
- `bio`
- `colorScheme`
- `compactView`
- `createdAt`
- `darkMode`
- `dataSharing`
- `dateFormat`
- `department`
- `displayName`
- `email`
- `firstName`
- `fontSize`
- `id`
- `jobTitle`
- `language`
- `lastName`
- *... and 22 more*

```graphql
query GetUserSettings($userId: UUID!) {
		user(id: $userId) {
			id
			email
			displayName
			firstName
			lastName
			phoneNumber
			jobTitle
			department {
				id
				name
			}
			profile {
				id
				bio
				avatar
				timezone
				locale
				dateFormat
				timeFormat
			}
			preferences {
				id
				theme
				compactView
				language
				notifications {
					email
					push
					sms
					leaveReminders
					performanceUpdates
					systemAlerts
					teamUpdates
				}
				privacy {
					profileVisibility
					showOnlineStatus
					allowDirectMessages
					dataSharing
					analyticsOptOut
				}
				appearance {
					darkMode
					fontSize
					colorScheme
					sidebarCollapsed
				}
			}
			createdAt
			updatedAt
		}
	}
```

#### `GET_NOTIFICATION_SETTINGS` (QUERY)

**Arguments:**
- `$userId`

**Fields Used:**
- `email`
- `id`
- `leaveReminders`
- `notifications`
- `performanceUpdates`
- `preferences`
- `push`
- `query`
- `sms`
- `systemAlerts`
- `teamUpdates`
- `user`

```graphql
query GetNotificationSettings($userId: UUID!) {
		user(id: $userId) {
			id
			preferences {
				notifications {
					email
					push
					sms
					leaveReminders
					performanceUpdates
					systemAlerts
					teamUpdates
				}
			}
		}
	}
```

#### `UPDATE_USER_PROFILE` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `avatar`
- `bio`
- `clientMutationId`
- `displayName`
- `email`
- `firstName`
- `id`
- `jobTitle`
- `lastName`
- `locale`
- `mutation`
- `phoneNumber`
- `profile`
- `timezone`
- `updateUserProfile`
- `updatedAt`
- `user`

```graphql
mutation UpdateUserProfile($input: UpdateUserProfileInput!) {
		updateUserProfile(input: $input) {
			user {
				id
				email
				displayName
				firstName
				lastName
				phoneNumber
				jobTitle
				profile {
					bio
					avatar
					timezone
					locale
				}
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_USER_PREFERENCES` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `allowDirectMessages`
- `analyticsOptOut`
- `appearance`
- `clientMutationId`
- `colorScheme`
- `compactView`
- `darkMode`
- `dataSharing`
- `email`
- `fontSize`
- `id`
- `language`
- `leaveReminders`
- `mutation`
- `notifications`
- `performanceUpdates`
- `privacy`
- `profileVisibility`
- `push`
- `showOnlineStatus`
- *... and 8 more*

```graphql
mutation UpdateUserPreferences($input: UpdateUserPreferencesInput!) {
		updateUserPreferences(input: $input) {
			userPreferences {
				id
				theme
				compactView
				language
				notifications {
					email
					push
					sms
					leaveReminders
					performanceUpdates
					systemAlerts
					teamUpdates
				}
				privacy {
					profileVisibility
					showOnlineStatus
					allowDirectMessages
					dataSharing
					analyticsOptOut
				}
				appearance {
					darkMode
					fontSize
					colorScheme
					sidebarCollapsed
				}
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_NOTIFICATION_SETTINGS` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `email`
- `leaveReminders`
- `mutation`
- `notificationSettings`
- `performanceUpdates`
- `push`
- `sms`
- `systemAlerts`
- `teamUpdates`
- `updateNotificationSettings`
- `updatedAt`

```graphql
mutation UpdateNotificationSettings($input: UpdateNotificationSettingsInput!) {
		updateNotificationSettings(input: $input) {
			notificationSettings {
				email
				push
				sms
				leaveReminders
				performanceUpdates
				systemAlerts
				teamUpdates
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_PRIVACY_SETTINGS` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `allowDirectMessages`
- `analyticsOptOut`
- `clientMutationId`
- `dataSharing`
- `mutation`
- `privacySettings`
- `profileVisibility`
- `showOnlineStatus`
- `updatePrivacySettings`
- `updatedAt`

```graphql
mutation UpdatePrivacySettings($input: UpdatePrivacySettingsInput!) {
		updatePrivacySettings(input: $input) {
			privacySettings {
				profileVisibility
				showOnlineStatus
				allowDirectMessages
				dataSharing
				analyticsOptOut
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_APPEARANCE_SETTINGS` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `appearanceSettings`
- `clientMutationId`
- `colorScheme`
- `darkMode`
- `fontSize`
- `mutation`
- `sidebarCollapsed`
- `updateAppearanceSettings`
- `updatedAt`

```graphql
mutation UpdateAppearanceSettings($input: UpdateAppearanceSettingsInput!) {
		updateAppearanceSettings(input: $input) {
			appearanceSettings {
				darkMode
				fontSize
				colorScheme
				sidebarCollapsed
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `CHANGE_PASSWORD` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `changePassword`
- `clientMutationId`
- `message`
- `mutation`
- `success`

```graphql
mutation ChangePassword($input: ChangePasswordInput!) {
		changePassword(input: $input) {
			success
			message
			clientMutationId
		}
	}
```

#### `EXPORT_USER_DATA` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `expiresAt`
- `exportUrl`
- `exportUserData`
- `mutation`

```graphql
mutation ExportUserData($input: ExportUserDataInput!) {
		exportUserData(input: $input) {
			exportUrl
			expiresAt
			clientMutationId
		}
	}
```

### src/lib/graphql/subscriptions.ts

#### `ON_DEPARTMENT_CHANGE` (SUBSCRIPTION)

**Arguments:**
- `$userId`

**Fields Used:**
- `department`
- `departmentId`
- `id`
- `name`
- `subscription`
- `updatedAt`
- `userUpdated`

```graphql
subscription OnDepartmentChange($userId: UUID!) {
		userUpdated(userId: $userId) {
			id
			departmentId
			department {
				id
				name
			}
			updatedAt
		}
	}
```

#### `ON_ROLE_CHANGE` (SUBSCRIPTION)

**Arguments:**
- `$userId`

**Fields Used:**
- `assignedAt`
- `id`
- `name`
- `permissions`
- `role`
- `roleId`
- `subscription`
- `userId`
- `userRoleChanged`

```graphql
subscription OnRoleChange($userId: UUID!) {
		userRoleChanged(userId: $userId) {
			userId
			roleId
			role {
				id
				name
				permissions
			}
			assignedAt
		}
	}
```

### src/lib/graphql/tasks-operations.ts

#### `GET_ALL_TASKS` (QUERY)

**Arguments:**
- `$condition`
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `allTasks`
- `archived`
- `archivedAt`
- `archivedBy`
- `assigneeId`
- `createdAt`
- `creatorId`
- `description`
- `displayName`
- `dueDate`
- `email`
- `endCursor`
- `hasNextPage`
- `hasPreviousPage`
- `id`
- `isSystem`
- `name`
- `nodeId`
- `nodes`
- `pageInfo`
- *... and 13 more*

```graphql
query GetAllTasks(
		$first: Int = 20
		$offset: Int = 0
		$orderBy: [TasksOrderBy!] = [CREATED_AT_DESC]
		$condition: TaskCondition
	) {
		allTasks(first: $first, offset: $offset, orderBy: $orderBy, condition: $condition) {
			nodes {
				id
				nodeId
				title
				description
				assigneeId
				creatorId
				taskTypeId
				status
				priority
				dueDate
				parentTaskId
				archived
				archivedAt
				archivedBy
				requiresManualReassignment
				createdAt
				updatedAt
				userByAssigneeId {
					id
					displayName
					email
				}
				userByCreatorId {
					id
					displayName
					email
				}
				taskTypeByTaskTypeId {
					id
					name
					description
					isSystem
				}
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
```

#### `GET_MY_TASKS` (QUERY)

**Arguments:**
- `$condition`
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `allTasks`
- `archived`
- `assigneeId`
- `createdAt`
- `creatorId`
- `description`
- `displayName`
- `dueDate`
- `email`
- `hasNextPage`
- `hasPreviousPage`
- `id`
- `name`
- `nodeId`
- `nodes`
- `pageInfo`
- `parentTaskId`
- `priority`
- `query`
- `requiresManualReassignment`
- *... and 8 more*

```graphql
query GetMyTasks(
		$first: Int = 20
		$offset: Int = 0
		$orderBy: [TasksOrderBy!] = [DUE_DATE_ASC, PRIORITY_DESC]
		$condition: TaskCondition
	) {
		allTasks(first: $first, offset: $offset, orderBy: $orderBy, condition: $condition) {
			nodes {
				id
				nodeId
				title
				description
				assigneeId
				creatorId
				taskTypeId
				status
				priority
				dueDate
				parentTaskId
				archived
				requiresManualReassignment
				createdAt
				updatedAt
				userByAssigneeId {
					id
					displayName
					email
				}
				userByCreatorId {
					id
					displayName
					email
				}
				taskTypeByTaskTypeId {
					id
					name
					description
				}
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
```

#### `GET_TASK_HIERARCHY` (QUERY)

**Arguments:**
- `$taskId`

**Fields Used:**
- `archived`
- `archivedAt`
- `archivedBy`
- `assigneeId`
- `availabilityStatus`
- `blockedTaskId`
- `blockingTaskId`
- `createdAt`
- `creatorId`
- `dependencyType`
- `description`
- `displayName`
- `dueDate`
- `email`
- `id`
- `lastChecked`
- `linkedResourcesByTaskId`
- `name`
- `nodeId`
- `nodes`
- *... and 19 more*

```graphql
query GetTaskHierarchy($taskId: UUID!) {
		taskById(id: $taskId) {
			id
			nodeId
			title
			description
			assigneeId
			creatorId
			taskTypeId
			status
			priority
			dueDate
			parentTaskId
			archived
			archivedAt
			archivedBy
			requiresManualReassignment
			createdAt
			updatedAt
			userByAssigneeId {
				id
				displayName
				email
			}
			userByCreatorId {
				id
				displayName
				email
			}
			taskTypeByTaskTypeId {
				id
				name
				description
			}
			tasksByParentTaskId {
				nodes {
					id
					nodeId
					title
					description
					assigneeId
					creatorId
					status
					priority
					dueDate
					parentTaskId
					archived
					createdAt
					updatedAt
					userByAssigneeId {
						id
						displayName
						email
					}
					tasksByParentTaskId {
						nodes {
							id
							title
							status
							priority
							dueDate
							parentTaskId
						}
						totalCount
					}
				}
				totalCount
			}
			linkedResourcesByTaskId {
				nodes {
					id
					resourceType
					resourceId
					resourceTitle
					availabilityStatus
					lastChecked
					createdAt
				}
			}
			taskDependenciesByBlockedTaskId {
				nodes {
					id
					blockingTaskId
					blockedTaskId
					dependencyType
					createdAt
					taskByBlockingTaskId {
						id
						title
						status
					}
				}
			}
		}
	}
```

#### `GET_TASK_AUDIT_ENTRIES` (QUERY)

**Arguments:**
- `$first`
- `$offset`
- `$taskId`

**Fields Used:**
- `actionType`
- `allTaskAuditEntries`
- `changedFields`
- `condition`
- `displayName`
- `email`
- `first`
- `id`
- `newValues`
- `nodes`
- `offset`
- `orderBy`
- `query`
- `taskId`
- `timestamp`
- `totalCount`
- `userByUserId`
- `userId`

```graphql
query GetTaskAuditEntries($taskId: UUID!, $first: Int = 50, $offset: Int = 0) {
		allTaskAuditEntries(
			condition: { taskId: $taskId }
			first: $first
			offset: $offset
			orderBy: TIMESTAMP_DESC
		) {
			nodes {
				id
				taskId
				actionType
				changedFields
				newValues
				userId
				timestamp
				userByUserId {
					id
					displayName
					email
				}
			}
			totalCount
		}
	}
```

#### `GET_ALL_TASK_TYPES` (QUERY)

**Fields Used:**
- `allTaskTypes`
- `createdAt`
- `createdBy`
- `description`
- `id`
- `isSystem`
- `name`
- `nodes`
- `query`
- `totalCount`

```graphql
query GetAllTaskTypes {
		allTaskTypes(orderBy: NAME_ASC) {
			nodes {
				id
				name
				description
				isSystem
				createdAt
				createdBy
			}
			totalCount
		}
	}
```

#### `GET_ORPHANED_TASKS` (QUERY)

**Arguments:**
- `$first`
- `$offset`

**Fields Used:**
- `allTasks`
- `assigneeId`
- `condition`
- `createdAt`
- `creatorId`
- `displayName`
- `first`
- `id`
- `nodes`
- `offset`
- `orderBy`
- `query`
- `status`
- `title`
- `totalCount`
- `userByAssigneeId`

```graphql
query GetOrphanedTasks($first: Int = 50, $offset: Int = 0) {
		allTasks(
			condition: { parentTaskId: null }
			first: $first
			offset: $offset
			orderBy: CREATED_AT_DESC
		) {
			nodes {
				id
				title
				status
				assigneeId
				creatorId
				createdAt
				userByAssigneeId {
					id
					displayName
				}
			}
			totalCount
		}
	}
```

#### `GET_TASKS_WITH_DEPENDENCIES` (QUERY)

**Arguments:**
- `$first`
- `$offset`

**Fields Used:**
- `allTasks`
- `blockedTaskId`
- `blockingTaskId`
- `dependencyType`
- `dueDate`
- `id`
- `nodes`
- `priority`
- `query`
- `status`
- `taskByBlockedTaskId`
- `taskByBlockingTaskId`
- `taskDependenciesByBlockedTaskId`
- `taskDependenciesByBlockingTaskId`
- `title`
- `totalCount`

```graphql
query GetTasksWithDependencies($first: Int = 20, $offset: Int = 0) {
		allTasks(first: $first, offset: $offset, orderBy: CREATED_AT_DESC) {
			nodes {
				id
				title
				status
				priority
				dueDate
				taskDependenciesByBlockingTaskId {
					nodes {
						id
						blockedTaskId
						dependencyType
						taskByBlockedTaskId {
							id
							title
							status
						}
					}
					totalCount
				}
				taskDependenciesByBlockedTaskId {
					nodes {
						id
						blockingTaskId
						dependencyType
						taskByBlockingTaskId {
							id
							title
							status
						}
					}
					totalCount
				}
			}
			totalCount
		}
	}
```

#### `CREATE_TASK` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `archived`
- `assigneeId`
- `clientMutationId`
- `createTask`
- `createdAt`
- `creatorId`
- `description`
- `displayName`
- `dueDate`
- `email`
- `id`
- `mutation`
- `name`
- `nodeId`
- `parentTaskId`
- `priority`
- `requiresManualReassignment`
- `status`
- `task`
- `taskTypeByTaskTypeId`
- *... and 5 more*

```graphql
mutation CreateTask($input: CreateTaskInput!) {
		createTask(input: $input) {
			task {
				id
				nodeId
				title
				description
				assigneeId
				creatorId
				taskTypeId
				status
				priority
				dueDate
				parentTaskId
				archived
				requiresManualReassignment
				createdAt
				updatedAt
				userByAssigneeId {
					id
					displayName
					email
				}
				userByCreatorId {
					id
					displayName
					email
				}
				taskTypeByTaskTypeId {
					id
					name
					description
				}
			}
			clientMutationId
		}
	}
```

#### `UPDATE_TASK` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `archived`
- `archivedAt`
- `archivedBy`
- `assigneeId`
- `clientMutationId`
- `creatorId`
- `description`
- `displayName`
- `dueDate`
- `email`
- `id`
- `mutation`
- `name`
- `nodeId`
- `parentTaskId`
- `priority`
- `requiresManualReassignment`
- `status`
- `task`
- `taskTypeByTaskTypeId`
- *... and 5 more*

```graphql
mutation UpdateTask($input: UpdateTaskByIdInput!) {
		updateTaskById(input: $input) {
			task {
				id
				nodeId
				title
				description
				assigneeId
				creatorId
				taskTypeId
				status
				priority
				dueDate
				parentTaskId
				archived
				archivedAt
				archivedBy
				requiresManualReassignment
				updatedAt
				userByAssigneeId {
					id
					displayName
					email
				}
				taskTypeByTaskTypeId {
					id
					name
					description
				}
			}
			clientMutationId
		}
	}
```

#### `DELETE_TASK` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `archived`
- `archivedAt`
- `archivedBy`
- `clientMutationId`
- `id`
- `mutation`
- `nodeId`
- `task`
- `title`
- `updateTaskById`

```graphql
mutation DeleteTask($input: UpdateTaskByIdInput!) {
		updateTaskById(input: $input) {
			task {
				id
				nodeId
				title
				archived
				archivedAt
				archivedBy
			}
			clientMutationId
		}
	}
```

#### `REASSIGN_TASK` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `assigneeId`
- `clientMutationId`
- `displayName`
- `email`
- `id`
- `mutation`
- `nodeId`
- `status`
- `task`
- `title`
- `updateTaskById`
- `updatedAt`
- `userByAssigneeId`

```graphql
mutation ReassignTask($input: UpdateTaskByIdInput!) {
		updateTaskById(input: $input) {
			task {
				id
				nodeId
				title
				assigneeId
				status
				updatedAt
				userByAssigneeId {
					id
					displayName
					email
				}
			}
			clientMutationId
		}
	}
```

#### `CREATE_TASK_DEPENDENCY` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `blockedTaskId`
- `blockingTaskId`
- `clientMutationId`
- `createTaskDependency`
- `createdAt`
- `dependencyType`
- `id`
- `mutation`
- `status`
- `taskByBlockedTaskId`
- `taskByBlockingTaskId`
- `taskDependency`
- `title`

```graphql
mutation CreateTaskDependency($input: CreateTaskDependencyInput!) {
		createTaskDependency(input: $input) {
			taskDependency {
				id
				blockingTaskId
				blockedTaskId
				dependencyType
				createdAt
				taskByBlockingTaskId {
					id
					title
					status
				}
				taskByBlockedTaskId {
					id
					title
					status
				}
			}
			clientMutationId
		}
	}
```

#### `DELETE_TASK_DEPENDENCY` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `deleteTaskDependency`
- `deletedTaskDependencyId`
- `mutation`

```graphql
mutation DeleteTaskDependency($input: DeleteTaskDependencyInput!) {
		deleteTaskDependency(input: $input) {
			deletedTaskDependencyId
			clientMutationId
		}
	}
```

#### `CREATE_LINKED_RESOURCE` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `availabilityStatus`
- `clientMutationId`
- `createLinkedResource`
- `createdAt`
- `id`
- `lastChecked`
- `linkedResource`
- `mutation`
- `resourceId`
- `resourceTitle`
- `resourceType`
- `taskId`

```graphql
mutation CreateLinkedResource($input: CreateLinkedResourceInput!) {
		createLinkedResource(input: $input) {
			linkedResource {
				id
				taskId
				resourceType
				resourceId
				resourceTitle
				availabilityStatus
				lastChecked
				createdAt
			}
			clientMutationId
		}
	}
```

#### `DELETE_LINKED_RESOURCE` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `deleteLinkedResource`
- `deletedLinkedResourceId`
- `mutation`

```graphql
mutation DeleteLinkedResource($input: DeleteLinkedResourceInput!) {
		deleteLinkedResource(input: $input) {
			deletedLinkedResourceId
			clientMutationId
		}
	}
```

#### `UPDATE_LINKED_RESOURCE_STATUS` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `availabilityStatus`
- `clientMutationId`
- `id`
- `lastChecked`
- `linkedResource`
- `mutation`
- `resourceId`
- `resourceTitle`
- `resourceType`
- `updateLinkedResourceById`

```graphql
mutation UpdateLinkedResourceStatus($input: UpdateLinkedResourceByIdInput!) {
		updateLinkedResourceById(input: $input) {
			linkedResource {
				id
				resourceType
				resourceId
				resourceTitle
				availabilityStatus
				lastChecked
			}
			clientMutationId
		}
	}
```

#### `CREATE_TASK_TYPE` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `createTaskType`
- `createdAt`
- `createdBy`
- `description`
- `id`
- `isSystem`
- `mutation`
- `name`
- `taskType`

```graphql
mutation CreateTaskType($input: CreateTaskTypeInput!) {
		createTaskType(input: $input) {
			taskType {
				id
				name
				description
				isSystem
				createdAt
				createdBy
			}
			clientMutationId
		}
	}
```

### src/lib/graphql/tasks-query-optimizer.ts

#### `TASK_CORE_FRAGMENT` (QUERY)

**Fields Used:**
- `archived`
- `assigneeId`
- `createdAt`
- `dueDate`
- `fragment`
- `id`
- `nodeId`
- `parentTaskId`
- `priority`
- `status`
- `title`
- `updatedAt`

```graphql
fragment TaskCoreFields on Task {
		id
		nodeId
		title
		status
		priority
		dueDate
		assigneeId
		parentTaskId
		archived
		createdAt
		updatedAt
	}
```

#### `TASK_WITH_ASSIGNEE_FRAGMENT` (QUERY)

**Fields Used:**
- `displayName`
- `email`
- `fragment`
- `id`
- `userByAssigneeId`

```graphql
fragment TaskWithAssigneeFields on Task {
		...TaskCoreFields
		userByAssigneeId {
			id
			displayName
			email
		}
	}
```

#### `TASK_WITH_TYPE_FRAGMENT` (QUERY)

**Fields Used:**
- `description`
- `fragment`
- `id`
- `name`
- `taskTypeByTaskTypeId`
- `taskTypeId`

```graphql
fragment TaskWithTypeFields on Task {
		...TaskCoreFields
		taskTypeId
		taskTypeByTaskTypeId {
			id
			name
			description
		}
	}
```

#### `TASK_FULL_FRAGMENT` (QUERY)

**Fields Used:**
- `archived`
- `archivedAt`
- `archivedBy`
- `assigneeId`
- `createdAt`
- `creatorId`
- `description`
- `displayName`
- `dueDate`
- `email`
- `fragment`
- `id`
- `name`
- `nodeId`
- `parentTaskId`
- `priority`
- `requiresManualReassignment`
- `status`
- `taskTypeByTaskTypeId`
- `taskTypeId`
- *... and 4 more*

```graphql
fragment TaskFullFields on Task {
		id
		nodeId
		title
		description
		assigneeId
		creatorId
		taskTypeId
		status
		priority
		dueDate
		parentTaskId
		archived
		archivedAt
		archivedBy
		requiresManualReassignment
		createdAt
		updatedAt
		userByAssigneeId {
			id
			displayName
			email
		}
		userByCreatorId {
			id
			displayName
			email
		}
		taskTypeByTaskTypeId {
			id
			name
			description
		}
	}
```

#### `GET_TASKS_MINIMAL` (QUERY)

**Arguments:**
- `$condition`
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `allTasks`
- `hasNextPage`
- `hasPreviousPage`
- `nodes`
- `pageInfo`
- `query`
- `totalCount`

```graphql
${TASK_CORE_FRAGMENT}
	query GetTasksMinimal(
		$first: Int = 20
		$offset: Int = 0
		$orderBy: [TasksOrderBy!] = [CREATED_AT_DESC]
		$condition: TaskCondition
	) {
		allTasks(first: $first, offset: $offset, orderBy: $orderBy, condition: $condition) {
			nodes {
				...TaskCoreFields
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
```

#### `GET_TASKS_WITH_ASSIGNEES` (QUERY)

**Arguments:**
- `$condition`
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `allTasks`
- `endCursor`
- `hasNextPage`
- `hasPreviousPage`
- `nodes`
- `pageInfo`
- `query`
- `startCursor`
- `totalCount`

```graphql
${TASK_WITH_ASSIGNEE_FRAGMENT}
	query GetTasksWithAssignees(
		$first: Int = 20
		$offset: Int = 0
		$orderBy: [TasksOrderBy!] = [DUE_DATE_ASC, PRIORITY_DESC]
		$condition: TaskCondition
	) {
		allTasks(first: $first, offset: $offset, orderBy: $orderBy, condition: $condition) {
			nodes {
				...TaskWithAssigneeFields
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
```

#### `GET_TASK_DETAIL` (QUERY)

**Arguments:**
- `$taskId`

**Fields Used:**
- `query`
- `taskById`

```graphql
${TASK_FULL_FRAGMENT}
	query GetTaskDetail($taskId: UUID!) {
		taskById(id: $taskId) {
			...TaskFullFields
		}
	}
```

#### `GET_TASK_WITH_SUBTASK_COUNT` (QUERY)

**Arguments:**
- `$taskId`

**Fields Used:**
- `displayName`
- `id`
- `nodes`
- `query`
- `status`
- `taskById`
- `tasksByParentTaskId`
- `totalCount`
- `userByAssigneeId`

```graphql
${TASK_CORE_FRAGMENT}
	query GetTaskWithSubtaskCount($taskId: UUID!) {
		taskById(id: $taskId) {
			...TaskCoreFields
			userByAssigneeId {
				id
				displayName
			}
			tasksByParentTaskId {
				totalCount
				nodes {
					id
					status
				}
			}
		}
	}
```

#### `GET_TASK_HIERARCHY_SHALLOW` (QUERY)

**Arguments:**
- `$taskId`

**Fields Used:**
- `description`
- `displayName`
- `email`
- `id`
- `name`
- `nodes`
- `query`
- `taskById`
- `taskTypeByTaskTypeId`
- `tasksByParentTaskId`
- `totalCount`
- `userByAssigneeId`

```graphql
${TASK_CORE_FRAGMENT}
	query GetTaskHierarchyShallow($taskId: UUID!) {
		taskById(id: $taskId) {
			...TaskCoreFields
			description
			userByAssigneeId {
				id
				displayName
				email
			}
			taskTypeByTaskTypeId {
				id
				name
			}
			tasksByParentTaskId {
				nodes {
					...TaskCoreFields
					userByAssigneeId {
						id
						displayName
					}
					tasksByParentTaskId {
						totalCount
					}
				}
				totalCount
			}
		}
	}
```

#### `GET_TASKS_BY_STATUS` (QUERY)

**Arguments:**
- `$after`
- `$first`
- `$orderBy`
- `$status`

**Fields Used:**
- `after`
- `allTasks`
- `condition`
- `endCursor`
- `first`
- `hasNextPage`
- `nodes`
- `orderBy`
- `pageInfo`
- `query`
- `totalCount`

```graphql
${TASK_WITH_ASSIGNEE_FRAGMENT}
	query GetTasksByStatus(
		$status: TaskStatus!
		$first: Int = 20
		$after: Cursor
		$orderBy: [TasksOrderBy!] = [DUE_DATE_ASC]
	) {
		allTasks(
			first: $first
			after: $after
			condition: { status: $status, archived: false }
			orderBy: $orderBy
		) {
			nodes {
				...TaskWithAssigneeFields
			}
			pageInfo {
				hasNextPage
				endCursor
			}
			totalCount
		}
	}
```

#### `GET_OVERDUE_TASKS` (QUERY)

**Arguments:**
- `$currentDate`
- `$first`

**Fields Used:**
- `allTasks`
- `condition`
- `displayName`
- `filter`
- `first`
- `id`
- `nodes`
- `orderBy`
- `query`
- `totalCount`
- `userByAssigneeId`

```graphql
${TASK_CORE_FRAGMENT}
	query GetOverdueTasks($currentDate: Datetime!, $first: Int = 10) {
		allTasks(
			first: $first
			condition: { archived: false }
			filter: { dueDate: { lessThan: $currentDate }, status: { notIn: ["Completed", "Cancelled"] } }
			orderBy: DUE_DATE_ASC
		) {
			nodes {
				...TaskCoreFields
				userByAssigneeId {
					id
					displayName
				}
			}
			totalCount
		}
	}
```

#### `GET_TASK_STATISTICS` (QUERY)

**Arguments:**
- `$condition`

**Fields Used:**
- `allTasks`
- `blocked`
- `completed`
- `inProgress`
- `notStarted`
- `query`
- `totalCount`

```graphql
query GetTaskStatistics($condition: TaskCondition) {
		allTasks(condition: $condition) {
			totalCount
		}
		notStarted: allTasks(condition: { ...($condition), status: "Not Started" }) {
			totalCount
		}
		inProgress: allTasks(condition: { ...($condition), status: "In Progress" }) {
			totalCount
		}
		blocked: allTasks(condition: { ...($condition), status: "Blocked" }) {
			totalCount
		}
		completed: allTasks(condition: { ...($condition), status: "Completed" }) {
			totalCount
		}
	}
```

#### `GET_MY_TASKS_OPTIMIZED` (QUERY)

**Arguments:**
- `$assigneeId`
- `$first`
- `$orderBy`

**Fields Used:**
- `allTasks`
- `condition`
- `first`
- `hasNextPage`
- `nodes`
- `orderBy`
- `pageInfo`
- `query`
- `tasksByParentTaskId`
- `totalCount`

```graphql
${TASK_WITH_TYPE_FRAGMENT}
	query GetMyTasksOptimized(
		$assigneeId: UUID!
		$first: Int = 20
		$orderBy: [TasksOrderBy!] = [DUE_DATE_ASC, PRIORITY_DESC]
	) {
		allTasks(
			first: $first
			condition: { assigneeId: $assigneeId, archived: false }
			orderBy: $orderBy
		) {
			nodes {
				...TaskWithTypeFields
				tasksByParentTaskId {
					totalCount
				}
			}
			totalCount
			pageInfo {
				hasNextPage
			}
		}
	}
```

#### `GET_TASK_DEPENDENCIES_MINIMAL` (QUERY)

**Arguments:**
- `$taskId`

**Fields Used:**
- `blockingTaskId`
- `id`
- `nodes`
- `query`
- `status`
- `taskByBlockingTaskId`
- `taskById`
- `taskDependenciesByBlockedTaskId`
- `title`
- `totalCount`

```graphql
query GetTaskDependenciesMinimal($taskId: UUID!) {
		taskById(id: $taskId) {
			id
			title
			status
			taskDependenciesByBlockedTaskId {
				nodes {
					id
					blockingTaskId
					taskByBlockingTaskId {
						id
						title
						status
					}
				}
				totalCount
			}
		}
	}
```

#### `GET_TASKS_STATUS_BATCH` (QUERY)

**Arguments:**
- `$taskIds`

**Fields Used:**
- `allTasks`
- `archived`
- `id`
- `nodes`
- `query`
- `status`

```graphql
query GetTasksStatusBatch($taskIds: [UUID!]!) {
		allTasks(condition: { id: { in: $taskIds } }) {
			nodes {
				id
				status
				archived
			}
		}
	}
```

### src/lib/graphql/team-management-operations.ts

#### `GET_ALL_TEAMS` (QUERY)

**Arguments:**
- `$filter`
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `activeEmployees`
- `createdAt`
- `departmentHead`
- `departments`
- `description`
- `displayName`
- `email`
- `employees`
- `endCursor`
- `hasNextPage`
- `hasPreviousPage`
- `id`
- `jobTitle`
- `name`
- `nodes`
- `pageInfo`
- `parentDepartmentId`
- `query`
- `startCursor`
- `subDepartments`
- *... and 2 more*

```graphql
query GetAllTeams(
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [DepartmentsOrderBy!] = [NAME_ASC]
		$filter: DepartmentFilter
	) {
		departments(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
				id
				name
				description
				parentDepartmentId
				departmentHead {
					id
					displayName
					email
					jobTitle
				}
				employees {
					totalCount
				}
				activeEmployees: employees(condition: { isActive: true }) {
					totalCount
				}
				subDepartments: departmentsByParentDepartmentId {
					totalCount
				}
				createdAt
				updatedAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
```

#### `GET_TEAM_DETAILS` (QUERY)

**Arguments:**
- `$id`

**Fields Used:**
- `activeEmployees`
- `createdAt`
- `department`
- `departmentHead`
- `description`
- `displayName`
- `email`
- `employeeCount`
- `employees`
- `hireDate`
- `id`
- `isActive`
- `jobTitle`
- `managerId`
- `name`
- `nodes`
- `parentDepartment`
- `parentDepartmentId`
- `phone`
- `query`
- *... and 3 more*

```graphql
query GetTeamDetails($id: UUID!) {
		department(id: $id) {
			id
			name
			description
			parentDepartmentId
			parentDepartment {
				id
				name
			}
			departmentHead {
				id
				displayName
				email
				jobTitle
				phone
			}
			employees {
				nodes {
					id
					displayName
					email
					jobTitle
					isActive
					hireDate
					managerId
				}
				totalCount
			}
			activeEmployees: employees(condition: { isActive: true }) {
				totalCount
			}
			subDepartments: departmentsByParentDepartmentId {
				nodes {
					id
					name
					description
					employeeCount: employees {
						totalCount
					}
				}
				totalCount
			}
			createdAt
			updatedAt
		}
	}
```

#### `GET_TEAM_HIERARCHY` (QUERY)

**Arguments:**
- `$rootDepartmentId`

**Fields Used:**
- `activeEmployees`
- `departmentHead`
- `departments`
- `description`
- `displayName`
- `employeeCount`
- `employees`
- `id`
- `jobTitle`
- `name`
- `nodes`
- `parentDepartmentId`
- `query`
- `subDepartments`
- `totalCount`

```graphql
query GetTeamHierarchy($rootDepartmentId: UUID) {
		departments(condition: { parentDepartmentId: $rootDepartmentId }, orderBy: [NAME_ASC]) {
			nodes {
				id
				name
				description
				parentDepartmentId
				departmentHead {
					id
					displayName
					jobTitle
				}
				employees {
					totalCount
				}
				activeEmployees: employees(condition: { isActive: true }) {
					totalCount
				}
				subDepartments: departmentsByParentDepartmentId {
					nodes {
						id
						name
						employeeCount: employees {
							totalCount
						}
					}
				}
			}
		}
	}
```

#### `SEARCH_TEAMS` (QUERY)

**Arguments:**
- `$filter`
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `activeEmployees`
- `createdAt`
- `departmentHead`
- `departments`
- `description`
- `displayName`
- `email`
- `employees`
- `id`
- `jobTitle`
- `name`
- `nodes`
- `parentDepartmentId`
- `query`
- `totalCount`
- `updatedAt`

```graphql
query SearchTeams(
		$filter: DepartmentFilter
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [DepartmentsOrderBy!] = [NAME_ASC]
	) {
		departments(filter: $filter, first: $first, offset: $offset, orderBy: $orderBy) {
			nodes {
				id
				name
				description
				parentDepartmentId
				departmentHead {
					id
					displayName
					email
					jobTitle
				}
				employees {
					totalCount
				}
				activeEmployees: employees(condition: { isActive: true }) {
					totalCount
				}
				createdAt
				updatedAt
			}
			totalCount
		}
	}
```

#### `CREATE_TEAM` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `createDepartment`
- `createdAt`
- `department`
- `departmentHead`
- `description`
- `displayName`
- `email`
- `employees`
- `id`
- `mutation`
- `name`
- `parentDepartmentId`
- `totalCount`

```graphql
mutation CreateTeam($input: CreateDepartmentInput!) {
		createDepartment(input: $input) {
			department {
				id
				name
				description
				parentDepartmentId
				departmentHead {
					id
					displayName
					email
				}
				employees {
					totalCount
				}
				createdAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_TEAM` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `department`
- `departmentHead`
- `description`
- `displayName`
- `email`
- `employees`
- `id`
- `mutation`
- `name`
- `parentDepartmentId`
- `totalCount`
- `updateDepartment`
- `updatedAt`

```graphql
mutation UpdateTeam($input: UpdateDepartmentInput!) {
		updateDepartment(input: $input) {
			department {
				id
				name
				description
				parentDepartmentId
				departmentHead {
					id
					displayName
					email
				}
				employees {
					totalCount
				}
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `DELETE_TEAM` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `deleteDepartment`
- `deletedDepartmentId`
- `mutation`

```graphql
mutation DeleteTeam($input: DeleteDepartmentInput!) {
		deleteDepartment(input: $input) {
			deletedDepartmentId
			clientMutationId
		}
	}
```

#### `ASSIGN_DEPARTMENT_HEAD` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `department`
- `departmentHead`
- `displayName`
- `email`
- `id`
- `jobTitle`
- `mutation`
- `name`
- `updateDepartment`
- `updatedAt`

```graphql
mutation AssignDepartmentHead($input: UpdateDepartmentInput!) {
		updateDepartment(input: $input) {
			department {
				id
				name
				departmentHead {
					id
					displayName
					email
					jobTitle
				}
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `MOVE_EMPLOYEE_TO_TEAM` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `department`
- `displayName`
- `id`
- `mutation`
- `name`
- `updateUser`
- `updatedAt`
- `user`

```graphql
mutation MoveEmployeeToTeam($input: UpdateUserInput!) {
		updateUser(input: $input) {
			user {
				id
				displayName
				department {
					id
					name
				}
				updatedAt
			}
			clientMutationId
		}
	}
```

### src/lib/graphql/team-reports-operations.ts

#### `GET_TEAM_REPORTS` (QUERY)

**Arguments:**
- `$filter`
- `$first`
- `$offset`
- `$orderBy`

**Fields Used:**
- `createdAt`
- `data`
- `dateFrom`
- `dateTo`
- `displayName`
- `email`
- `endCursor`
- `generatedBy`
- `hasNextPage`
- `hasPreviousPage`
- `id`
- `isScheduled`
- `name`
- `nodes`
- `pageInfo`
- `parameters`
- `query`
- `reportType`
- `scheduleCron`
- `startCursor`
- *... and 7 more*

```graphql
query GetTeamReports(
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [TeamReportsOrderBy!] = [CREATED_AT_DESC]
		$filter: TeamReportFilter
	) {
		teamReports(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
				id
				title
				reportType
				status
				dateFrom
				dateTo
				summary
				isScheduled
				scheduleCron
				team: department {
					id
					name
				}
				generatedBy {
					id
					displayName
					email
				}
				parameters
				data
				createdAt
				updatedAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
```

#### `GET_TEAM_REPORT` (QUERY)

**Arguments:**
- `$id`

**Fields Used:**
- `createdAt`
- `data`
- `dateFrom`
- `dateTo`
- `departmentHead`
- `displayName`
- `email`
- `employees`
- `generatedBy`
- `id`
- `isScheduled`
- `jobTitle`
- `name`
- `parameters`
- `query`
- `reportType`
- `scheduleCron`
- `status`
- `summary`
- `team`
- *... and 4 more*

```graphql
query GetTeamReport($id: UUID!) {
		teamReport(id: $id) {
			id
			title
			reportType
			status
			dateFrom
			dateTo
			summary
			isScheduled
			scheduleCron
			team: department {
				id
				name
				departmentHead {
					id
					displayName
					email
				}
				employees {
					totalCount
				}
			}
			generatedBy {
				id
				displayName
				email
				jobTitle
			}
			parameters
			data
			createdAt
			updatedAt
		}
	}
```

#### `GET_REPORTS_BY_TEAM` (QUERY)

**Arguments:**
- `$first`
- `$orderBy`
- `$reportType`
- `$teamId`

**Fields Used:**
- `condition`
- `createdAt`
- `dateFrom`
- `dateTo`
- `displayName`
- `filter`
- `first`
- `generatedBy`
- `id`
- `isScheduled`
- `nodes`
- `orderBy`
- `query`
- `reportType`
- `status`
- `summary`
- `teamReports`
- `title`
- `totalCount`

```graphql
query GetReportsByTeam(
    $teamId: UUID!
    $reportType: ReportType
    $first: Int = 50
    $orderBy: [TeamReportsOrderBy!] = [CREATED_AT_DESC]
  ) {
    teamReports(
      condition: { teamId: $teamId }
      filter: { reportType: $reportType ? { equalTo: $reportType } : null }
      first: $first
      orderBy: $orderBy
    ) {
      nodes {
        id
        title
        reportType
        status
        dateFrom
        dateTo
        summary
        isScheduled
        generatedBy {
          id
          displayName
        }
        createdAt
      }
      totalCount
    }
  }
```

#### `GET_SCHEDULED_REPORTS` (QUERY)

**Arguments:**
- `$first`
- `$orderBy`

**Fields Used:**
- `createdAt`
- `displayName`
- `generatedBy`
- `id`
- `name`
- `nodes`
- `parameters`
- `query`
- `reportType`
- `scheduleCron`
- `status`
- `team`
- `teamReports`
- `title`
- `totalCount`
- `updatedAt`

```graphql
query GetScheduledReports($first: Int = 50, $orderBy: [TeamReportsOrderBy!] = [UPDATED_AT_DESC]) {
		teamReports(condition: { isScheduled: true }, first: $first, orderBy: $orderBy) {
			nodes {
				id
				title
				reportType
				status
				scheduleCron
				team: department {
					id
					name
				}
				generatedBy {
					id
					displayName
				}
				parameters
				createdAt
				updatedAt
			}
			totalCount
		}
	}
```

#### `GET_REPORTS_DASHBOARD` (QUERY)

**Arguments:**
- `$dateFrom`
- `$dateTo`
- `$teamId`

**Fields Used:**
- `createdAt`
- `data`
- `dateFrom`
- `dateTo`
- `displayName`
- `filter`
- `generatedBy`
- `id`
- `name`
- `nodes`
- `query`
- `reportType`
- `status`
- `team`
- `teamId`
- `teamReports`
- `title`
- `totalCount`

```graphql
query GetReportsDashboard(
    $teamId: UUID
    $dateFrom: Date
    $dateTo: Date
  ) {
    teamReports(
      filter: {
        teamId: $teamId ? { equalTo: $teamId } : null
        dateFrom: $dateFrom ? { greaterThanOrEqualTo: $dateFrom } : null
        dateTo: $dateTo ? { lessThanOrEqualTo: $dateTo } : null
        status: { equalTo: "completed" }
      }
    ) {
      nodes {
        id
        title
        reportType
        dateFrom
        dateTo
        team: department {
          id
          name
        }
        generatedBy {
          id
          displayName
        }
        data
        createdAt
      }
      totalCount
    }
  }
```

#### `SEARCH_REPORTS` (QUERY)

**Arguments:**
- `$dateFrom`
- `$dateTo`
- `$first`
- `$generatedBy`
- `$isScheduled`
- `$orderBy`
- `$reportType`
- `$searchTerm`
- `$status`
- `$teamId`

**Fields Used:**
- `createdAt`
- `dateFrom`
- `dateTo`
- `displayName`
- `filter`
- `first`
- `generatedBy`
- `id`
- `isScheduled`
- `name`
- `nodes`
- `orderBy`
- `query`
- `reportType`
- `status`
- `summary`
- `team`
- `teamId`
- `teamReports`
- `title`
- *... and 1 more*

```graphql
query SearchReports(
    $searchTerm: String
    $reportType: ReportType
    $teamId: UUID
    $generatedBy: UUID
    $isScheduled: Boolean
    $status: ReportStatus
    $dateFrom: Date
    $dateTo: Date
    $first: Int = 50
    $orderBy: [TeamReportsOrderBy!] = [CREATED_AT_DESC]
  ) {
    teamReports(
      filter: {
        title: $searchTerm ? { includesInsensitive: $searchTerm } : null
        reportType: $reportType ? { equalTo: $reportType } : null
        teamId: $teamId ? { equalTo: $teamId } : null
        generatedBy: $generatedBy ? { equalTo: $generatedBy } : null
        isScheduled: $isScheduled != null ? { equalTo: $isScheduled } : null
        status: $status ? { equalTo: $status } : null
        dateFrom: $dateFrom ? { greaterThanOrEqualTo: $dateFrom } : null
        dateTo: $dateTo ? { lessThanOrEqualTo: $dateTo } : null
      }
      first: $first
      orderBy: $orderBy
    ) {
      nodes {
        id
        title
        reportType
        status
        dateFrom
        dateTo
        summary
        isScheduled
        team: department {
          id
          name
        }
        generatedBy {
          id
          displayName
        }
        createdAt
      }
      totalCount
    }
  }
```

#### `GENERATE_TEAM_REPORT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `createTeamReport`
- `createdAt`
- `dateFrom`
- `dateTo`
- `displayName`
- `generatedBy`
- `id`
- `mutation`
- `name`
- `parameters`
- `reportType`
- `status`
- `team`
- `teamReport`
- `title`

```graphql
mutation GenerateTeamReport($input: CreateTeamReportInput!) {
		createTeamReport(input: $input) {
			teamReport {
				id
				title
				reportType
				status
				dateFrom
				dateTo
				team: department {
					id
					name
				}
				generatedBy {
					id
					displayName
				}
				parameters
				createdAt
			}
			clientMutationId
		}
	}
```

#### `UPDATE_TEAM_REPORT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `data`
- `id`
- `mutation`
- `status`
- `summary`
- `teamReport`
- `title`
- `updateTeamReport`
- `updatedAt`

```graphql
mutation UpdateTeamReport($input: UpdateTeamReportInput!) {
		updateTeamReport(input: $input) {
			teamReport {
				id
				title
				status
				summary
				data
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `SCHEDULE_REPORT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `id`
- `isScheduled`
- `mutation`
- `scheduleCron`
- `teamReport`
- `title`
- `updateTeamReport`
- `updatedAt`

```graphql
mutation ScheduleReport($input: UpdateTeamReportInput!) {
		updateTeamReport(input: $input) {
			teamReport {
				id
				title
				isScheduled
				scheduleCron
				updatedAt
			}
			clientMutationId
		}
	}
```

#### `DELETE_TEAM_REPORT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `deleteTeamReport`
- `deletedTeamReportId`
- `mutation`

```graphql
mutation DeleteTeamReport($input: DeleteTeamReportInput!) {
		deleteTeamReport(input: $input) {
			deletedTeamReportId
			clientMutationId
		}
	}
```

#### `REGENERATE_REPORT` (MUTATION)

**Arguments:**
- `$input`

**Fields Used:**
- `clientMutationId`
- `data`
- `id`
- `mutation`
- `status`
- `summary`
- `teamReport`
- `updateTeamReport`
- `updatedAt`

```graphql
mutation RegenerateReport($input: UpdateTeamReportInput!) {
		updateTeamReport(input: $input) {
			teamReport {
				id
				status
				data
				summary
				updatedAt
			}
			clientMutationId
		}
	}
```

---

## Database Schema

### `hr_public.activity_logs`

**Columns:**

- `id`: uuid DEFAULT uuid_generate_v
- `user_id`: uuid NOT NULL
- `employee_id`: uuid
- `action`: character varying(
- `resource_type`: character varying(
- `resource_id`: uuid
- `details`: jsonb
- `created_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL

### `hr_public.attendance_records`

**Columns:**

- `id`: uuid DEFAULT uuid_generate_v
- `user_id`: uuid NOT NULL
- `date`: date NOT NULL
- `clock_in`: timestamp with time zone
- `clock_out`: timestamp with time zone
- `hours_worked`: numeric(
- `status`: character varying(
- `notes`: text
- `created_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
- `updated_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL

### `hr_public.compensation_bands`

**Columns:**

- `id`: uuid DEFAULT uuid_generate_v
- `band_name`: character varying(
- `min_salary`: numeric(
- `max_salary`: numeric(
- `currency`: character varying(
- `created_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
- `updated_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL

### `hr_public.departments`

**Columns:**

- `id`: uuid DEFAULT uuid_generate_v
- `name`: character varying(
- `description`: text
- `manager_id`: uuid
- `created_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
- `updated_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL

### `hr_public.employee_goals`

**Columns:**

- `id`: uuid DEFAULT uuid_generate_v
- `employee_id`: uuid NOT NULL
- `title`: character varying(
- `description`: text
- `target_date`: date
- `status`: character varying(
- `progress_percentage`: integer DEFAULT
- `created_by`: uuid
- `created_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
- `updated_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL

### `hr_public.event_attendees`

**Columns:**

- `id`: uuid DEFAULT uuid_generate_v
- `event_id`: uuid NOT NULL
- `employee_id`: uuid NOT NULL
- `response_status`: hr_public
- `is_required`: boolean DEFAULT false NOT NULL
- `created_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL

### `hr_public.events`

**Columns:**

- `id`: uuid DEFAULT uuid_generate_v
- `title`: character varying(
- `description`: text
- `event_type`: hr_public
- `status`: hr_public
- `visibility_type`: hr_public
- `start_time`: timestamp with time zone NOT NULL
- `end_time`: timestamp with time zone NOT NULL
- `all_day`: boolean DEFAULT false NOT NULL
- `location`: character varying(
- `is_public`: boolean DEFAULT true NOT NULL
- `color`: character varying(
- `organizer_id`: uuid NOT NULL
- `created_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
- `updated_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL

### `hr_public.leave_requests`

**Columns:**

- `id`: uuid DEFAULT uuid_generate_v
- `employee_id`: uuid NOT NULL
- `manager_id`: uuid
- `leave_type`: hr_public
- `start_date`: date NOT NULL
- `end_date`: date NOT NULL
- `days_requested`: integer NOT NULL
- `status`: hr_public
- `reason`: text
- `manager_comments`: text
- `created_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
- `updated_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL

### `hr_public.payroll_records`

**Columns:**

- `id`: uuid DEFAULT uuid_generate_v
- `employee_id`: uuid NOT NULL
- `pay_period_start`: date NOT NULL
- `pay_period_end`: date NOT NULL
- `gross_pay`: numeric(
- `net_pay`: numeric(
- `processed_by`: uuid
- `created_by`: uuid
- `created_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
- `updated_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL

### `hr_public.performance_reviews`

**Columns:**

- `id`: uuid DEFAULT uuid_generate_v
- `employee_id`: uuid NOT NULL
- `reviewer_id`: uuid NOT NULL
- `review_period`: character varying(
- `status`: hr_public
- `overall_rating`: numeric(
- `goals`: text
- `achievements`: text
- `areas_for_improvement`: text
- `manager_feedback`: text
- `created_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
- `updated_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL

### `hr_public.review_templates`

**Columns:**

- `id`: uuid DEFAULT uuid_generate_v
- `name`: character varying(
- `description`: text
- `sections`: jsonb
- `is_active`: boolean DEFAULT true NOT NULL
- `created_by_id`: uuid
- `created_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
- `updated_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL

### `hr_public.tasks`

**Columns:**


### `hr_public.time_off_balances`

**Columns:**

- `id`: uuid DEFAULT uuid_generate_v
- `employee_id`: uuid NOT NULL
- `policy_id`: uuid NOT NULL
- `balance_days`: numeric(
- `used_days`: numeric(
- `year`: integer NOT NULL
- `created_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
- `updated_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL

### `hr_public.time_off_policies`

**Columns:**

- `id`: uuid DEFAULT uuid_generate_v
- `name`: character varying(
- `description`: text
- `days_per_year`: integer NOT NULL
- `requires_approval`: boolean DEFAULT true NOT NULL
- `created_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
- `updated_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL

### `hr_public.user_role_assignments`

**Columns:**

- `id`: uuid DEFAULT uuid_generate_v
- `user_id`: uuid NOT NULL
- `role_name`: character varying(
- `assigned_by`: uuid
- `created_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL

### `hr_public.users`

**Columns:**

- `id`: uuid DEFAULT uuid_generate_v
- `email`: character varying(
- `password_hash`: character varying(
- `first_name`: character varying(
- `last_name`: character varying(
- `full_name`: character varying(
- `phone`: character varying(
- `role`: character varying(
- `department_id`: uuid
- `manager_id`: uuid
- `is_active`: boolean DEFAULT true NOT NULL
- `status`: hr_public
- `failed_login_attempts`: integer DEFAULT
- `locked_until`: timestamp with time zone
- `last_login`: timestamp with time zone
- `hire_date`: timestamp with time zone
- `termination_date`: timestamp with time zone
- `created_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
- `updated_at`: timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
- `deleted_at`: timestamp with time zone

---

## Rust API Resolvers

Total resolvers implemented: 337

- `active_encryption_keys()`
- `active_review_cycles()`
- `active_time_off_policies()`
- `activity_log()`
- `activity_logs()`
- `activity_logs_by_action()`
- `activity_logs_by_resource_type()`
- `activity_logs_by_user()`
- `activity_logs_count()`
- `all_events()`
- `approve_leave_request()`
- `assign_permission_to_role()`
- `assign_role_to_user()`
- `assign_task_to_user()`
- `attendance_record()`
- `attendance_records()`
- `attendance_records_by_date_range()`
- `attendance_records_by_employee()`
- `attendance_records_by_status()`
- `attendance_records_count()`
- `bulk_rollback_batch()`
- `bulk_rollback_batches()`
- `bulk_rollback_batches_by_status()`
- `bulk_rollback_batches_count()`
- `bulk_rollback_item()`
- `bulk_rollback_items_by_batch()`
- `bulk_rollback_items_by_status()`
- `bulk_rollback_items_count()`
- `cancel_leave_request()`
- `change_task_status()`
- `compensation_band()`
- `compensation_bands()`
- `compensation_bands_by_currency()`
- `compensation_bands_count()`
- `create_activity_log()`
- `create_attendance_record()`
- `create_bulk_rollback_batch()`
- `create_bulk_rollback_item()`
- `create_compensation_band()`
- `create_department()`
- `create_document()`
- `create_document_access_log()`
- `create_document_assignment()`
- `create_document_category()`
- `create_document_version()`
- `create_emergency_contact()`
- `create_employee_certification()`
- `create_employee_goal()`
- `create_employee_skill()`
- `create_employee_vehicle()`
- `create_encrypted_file_storage()`
- `create_encryption_key()`
- `create_event()`
- `create_event_attendee()`
- `create_event_comment()`
- `create_event_history()`
- `create_event_waitlist()`
- `create_hr_report()`
- `create_leave_balance()`
- `create_leave_request()`
- `create_leave_type()`
- `create_linked_resource()`
- `create_payroll_record()`
- `create_performance_review()`
- `create_permission()`
- `create_review_cycle()`
- `create_review_feedback()`
- `create_review_goal()`
- `create_review_template()`
- `create_role()`
- `create_rollback_request()`
- `create_task()`
- `create_task_dependency()`
- `create_task_type()`
- `create_time_off_policy()`
- `create_user()`
- `dashboard_summary()`
- `delete_attendance_record()`
- `delete_compensation_band()`
- `delete_department()`
- `delete_document()`
- `delete_document_assignment()`
- `delete_document_category()`
- `delete_emergency_contact()`
- `delete_employee_certification()`
- `delete_employee_goal()`
- `delete_employee_skill()`
- `delete_employee_vehicle()`
- `delete_event()`
- `delete_event_attendee()`
- `delete_event_comment()`
- `delete_event_waitlist()`
- `delete_leave_request()`
- `delete_leave_type()`
- `delete_linked_resource()`
- `delete_performance_review()`
- `delete_permission()`
- `delete_review_cycle()`
- `delete_review_feedback()`
- `delete_review_goal()`
- `delete_review_template()`
- `delete_role()`
- `delete_task()`
- `delete_task_dependency()`
- `delete_task_type()`
- `delete_time_off_policy()`
- `delete_user()`
- `department()`
- `department_metric()`
- `department_metrics()`
- `department_metrics_by_performance()`
- `department_metrics_by_size()`
- `department_metrics_count()`
- `departments()`
- `departments_by_parent()`
- `departments_count()`
- `document()`
- `document_access_log()`
- `document_access_logs_by_document()`
- `document_access_logs_by_type()`
- `document_access_logs_by_user()`
- `document_access_logs_count()`
- `document_assignment()`
- `document_assignments_by_department()`
- `document_assignments_by_document()`
- `document_assignments_by_user()`
- `document_assignments_count()`
- `document_categories()`
- `document_categories_by_parent()`
- `document_categories_count()`
- `document_category()`
- `document_version()`
- `document_versions_by_document()`
- `document_versions_count()`
- `documents()`
- `documents_by_category()`
- `documents_by_uploader()`
- `documents_count()`
- `emergency_contact()`
- `emergency_contacts()`
- `emergency_contacts_by_employee()`
- `emergency_contacts_count()`
- `employee_certification()`
- `employee_certifications()`
- `employee_certifications_by_employee()`
- `employee_certifications_count()`
- `employee_goal()`
- `employee_goals()`
- `employee_goals_by_employee()`
- `employee_goals_by_status()`
- `employee_goals_count()`
- `employee_skill()`
- `employee_skills()`
- `employee_skills_by_employee()`
- `employee_skills_by_proficiency()`
- `employee_skills_count()`
- `employee_vehicle()`
- `employee_vehicles()`
- `employee_vehicles_by_employee()`
- `employee_vehicles_count()`
- `encrypted_file_storage()`
- `encrypted_file_storage_by_document()`
- `encrypted_file_storages_by_key()`
- `encrypted_file_storages_count()`
- `encryption_key()`
- `encryption_keys()`
- `encryption_keys_count()`
- `end_cursor()`
- `event()`
- `event_attendee()`
- `event_attendees()`
- `event_attendees_by_employee()`
- `event_attendees_by_event()`
- `event_attendees_count()`
- `events()`
- `events_by_creator()`
- `events_by_date_range()`
- `events_count()`
- `expired_certifications()`
- `expiring_certifications()`
- `goal_statistic_by_user()`
- `goal_statistics()`
- `goal_statistics_by_department()`
- `goal_statistics_by_period()`
- `goal_statistics_count()`
- `has_next_page()`
- `has_previous_page()`
- `hr_report()`
- `hr_reports()`
- `hr_reports_by_generator()`
- `hr_reports_by_type()`
- `hr_reports_count()`
- `incomplete_attendance_records()`
- `latest_document_version()`
- `leave_balance()`
- `leave_balance_by_user_and_type()`
- `leave_balances_by_user()`
- `leave_request()`
- `leave_requests_by_date_range()`
- `leave_requests_by_user()`
- `leave_requests_count()`
- `leave_type()`
- `leave_types()`
- `leave_types_count()`
- `linked_resource()`
- `linked_resources_by_task()`
- `linked_resources_by_type()`
- `linked_resources_by_uploader()`
- `nodes()`
- `notification()`
- `notifications()`
- `notifications_by_category()`
- `notifications_by_resource()`
- `notifications_by_type()`
- `notifications_count()`
- `overdue_employee_goals()`
- `overdue_performance_reviews()`
- `overdue_tasks()`
- `page_info()`
- `past_events()`
- `payroll_record()`
- `payroll_records()`
- `payroll_records_by_employee()`
- `payroll_records_by_period()`
- `payroll_records_count()`
- `pending_leave_requests()`
- `performance_review()`
- `performance_reviews()`
- `performance_reviews_by_cycle()`
- `performance_reviews_by_employee()`
- `performance_reviews_by_reviewer()`
- `performance_reviews_count()`
- `permission()`
- `permissions()`
- `permissions_by_resource()`
- `permissions_count()`
- `primary_emergency_contact()`
- `recurring_events()`
- `reject_leave_request()`
- `remove_permission_from_role()`
- `remove_role_from_user()`
- `report_analytics()`
- `report_analytics_by_date_range()`
- `report_analytics_by_department()`
- `report_analytics_by_month()`
- `report_analytics_count()`
- `review_cycle()`
- `review_cycles()`
- `review_cycles_by_type()`
- `review_cycles_count()`
- `review_feedback()`
- `review_feedback_by_provider()`
- `review_feedback_by_review()`
- `review_feedback_count()`
- `review_goal()`
- `review_goals_by_review()`
- `review_goals_count()`
- `role()`
- `role_assignments()`
- `roles()`
- `roles_by_min_level()`
- `roles_count()`
- `rollback_request()`
- `rollback_requests()`
- `rollback_requests_by_requester()`
- `rollback_requests_by_status()`
- `rollback_requests_count()`
- `root_departments()`
- `root_document_categories()`
- `start_cursor()`
- `task()`
- `task_assignee()`
- `task_assignees_by_task()`
- `task_assignees_by_user()`
- `task_audit_entries()`
- `task_audit_entries_by_action()`
- `task_audit_entries_by_user()`
- `task_dependencies_by_task()`
- `task_dependency()`
- `task_prerequisites()`
- `tasks()`
- `tasks_by_assignee()`
- `tasks_by_creator()`
- `tasks_by_department()`
- `tasks_by_priority()`
- `tasks_by_status()`
- `tasks_count()`
- `time_off_policies()`
- `time_off_policies_by_leave_type()`
- `time_off_policies_count()`
- `time_off_policy()`
- `total_count()`
- `unassign_task_from_user()`
- `unread_notifications()`
- `unread_notifications_count()`
- `upcoming_events()`
- `update_attendance_record()`
- `update_bulk_rollback_batch()`
- `update_bulk_rollback_item()`
- `update_compensation_band()`
- `update_department()`
- `update_document()`
- `update_document_category()`
- `update_emergency_contact()`
- `update_employee_goal()`
- `update_employee_skill()`
- `update_employee_vehicle()`
- `update_event()`
- `update_event_attendee()`
- `update_event_comment()`
- `update_event_waitlist()`
- `update_leave_balance()`
- `update_leave_request()`
- `update_leave_type()`
- `update_linked_resource()`
- `update_performance_review()`
- `update_permission()`
- `update_review_cycle()`
- `update_review_feedback()`
- `update_review_goal()`
- `update_review_template()`
- `update_role()`
- `update_rollback_request()`
- `update_task()`
- `update_task_assignee()`
- `update_task_dependency()`
- `update_task_type()`
- `update_time_off_policy()`
- `update_user()`
- `user()`
- `user_role_assignment()`
- `user_role_assignments()`
- `users()`
- `users_by_department()`
- `users_by_manager()`
- `users_count()`
- `verified_employee_skills()`

---

## Alignment Analysis

### Missing Rust Resolvers

These GraphQL operations don't have corresponding Rust resolvers:

- `add_self_assessment`
- `assign_department_head`
- `assign_user_role`
- `change_password`
- `complete_performance_review`
- `create_dashboard_widget`
- `create_department_mutation`
- `create_employee_mutation`
- `create_event_full`
- `create_event_notification`
- `create_key_result`
- `create_review_with_goals`
- `create_team`
- `create_team_goal`
- `dashboard_updates_subscription`
- `deactivate_employee_mutation`
- `delete_dashboard_widget`
- `delete_department_mutation`
- `delete_hr_report`
- `delete_key_result`
- `delete_notification`
- `delete_team`
- `delete_team_goal`
- `delete_team_report`
- `deny_leave_request`
- `dismiss_notification`
- `export_user_data`
- `generate_team_report`
- `get_active_reviews_for_employee`
- `get_activities_by_date_range`
- `get_activity_log_by_id`
- `get_all_events`
- `get_all_permissions`
- `get_all_roles`
- `get_all_task_types`
- `get_all_tasks`
- `get_all_teams`
- `get_all_users`
- `get_audit_logs`
- `get_dashboard_analytics`
- `get_dashboard_config`
- `get_dashboard_stats`
- `get_department_by_id_query`
- `get_department_hierarchy_query`
- `get_department_performance`
- `get_departments_query`
- `get_direct_reports`
- `get_employee_by_id_query`
- `get_employee_dashboard_query`
- `get_employee_goal_by_id`
- `get_employee_goals`
- `get_employee_quick_stats`
- `get_employees_query`
- `get_event_by_id`
- `get_event_comments`
- `get_event_details`
- `get_event_history`
- `get_events_for_calendar`
- `get_goal_details`
- `get_goal_statistics`
- `get_goals_by_owner`
- `get_goals_by_team`
- `get_hr_report_by_id`
- `get_hr_reports`
- `get_key_results`
- `get_leave_request`
- `get_leave_request_by_id`
- `get_leave_requests`
- `get_leave_statistics`
- `get_my_dashboard`
- `get_my_tasks`
- `get_my_tasks_optimized`
- `get_notification_by_id`
- `get_notification_preferences`
- `get_notification_settings`
- `get_notifications_summary`
- `get_okr_overview`
- `get_orphaned_tasks`
- `get_overdue_tasks`
- `get_pending_approvals`
- `get_pending_leave_requests`
- `get_pending_reminders`
- `get_pending_reviews_for_manager`
- `get_performance_review`
- `get_performance_review_by_id`
- `get_performance_reviews`
- `get_performance_statistics`
- `get_recent_activities`
- `get_report_analytics`
- `get_reports_by_team`
- `get_reports_dashboard`
- `get_resource_activity_history`
- `get_review_analytics`
- `get_review_types_metadata`
- `get_scheduled_reports`
- `get_system_health`
- `get_task_audit_entries`
- `get_task_dependencies_minimal`
- `get_task_detail`
- `get_task_hierarchy`
- `get_task_hierarchy_shallow`
- `get_task_statistics`
- `get_task_with_subtask_count`
- `get_tasks_by_status`
- `get_tasks_minimal`
- `get_tasks_status_batch`
- `get_tasks_with_assignees`
- `get_tasks_with_dependencies`
- `get_team_dashboard`
- `get_team_details`
- `get_team_goals`
- `get_team_hierarchy`
- `get_team_performance_overview`
- `get_team_report`
- `get_team_reports`
- `get_unread_count`
- `get_upcoming_events`
- `get_user_activities`
- `get_user_by_id`
- `get_user_events`
- `get_user_notifications`
- `get_user_roles`
- `get_user_settings`
- `get_user_waitlist_status`
- `invite_attendees`
- `join_event_waitlist`
- `join_waitlist`
- `leave_event_waitlist`
- `link_goal_to_review`
- `login_mutation`
- `logout_mutation`
- `mark_all_read`
- `mark_notification_read`
- `move_employee_to_team`
- `on_department_change`
- `on_event_update`
- `on_role_change`
- `on_waitlist_promotion`
- `post_event_comment`
- `reassign_task`
- `refresh_token_mutation`
- `regenerate_report`
- `remove_user_role`
- `reschedule_event`
- `rsvp_to_event`
- `schedule_report`
- `search_reports`
- `search_teams`
- `soft_delete_goal`
- `submit_performance_review`
- `task_core_fragment`
- `task_full_fragment`
- `task_with_assignee_fragment`
- `task_with_type_fragment`
- `unlink_goal_from_review`
- `update_appearance_settings`
- `update_dashboard_preferences`
- `update_dashboard_widget`
- `update_department_mutation`
- `update_employee_mutation`
- `update_event_full`
- `update_event_reminder`
- `update_goal_progress`
- `update_hr_report`
- `update_key_result`
- `update_key_result_progress`
- `update_linked_resource_status`
- `update_notification_preferences`
- `update_notification_settings`
- `update_privacy_settings`
- `update_review_draft`
- `update_review_status`
- `update_rsvp_status`
- `update_team`
- `update_team_goal`
- `update_team_report`
- `update_user_preferences`
- `update_user_profile`
- `upload_event_image`
- `verify_token_query`

### Potentially Unreferenced Tables

These database tables might not be queried by frontend:

- `leave_requests`
- `review_templates`
- `time_off_balances`
- `time_off_policies`
