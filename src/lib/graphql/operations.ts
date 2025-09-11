/**
 * GraphQL Operations for MountainHR
 * 
 * Centralized GraphQL queries, mutations, and subscriptions that align
 * with the contract tests and provide type-safe operations for the frontend.
 */

// =============================================================================
// Authentication Operations
// =============================================================================

export const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      accessToken
      refreshToken
      expiresIn
      user {
        id
        email
        displayName
        firstName
        lastName
        onboardingStatus
        isActive
        roles {
          id
          name
          permissions {
            name
            resource
            action
            scope
          }
        }
        department {
          id
          name
        }
        jobInfo {
          title
          hireDate
          employmentType
        }
      }
    }
  }
`;

export const REFRESH_TOKEN_MUTATION = `
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      accessToken
      refreshToken
      expiresIn
    }
  }
`;

export const LOGOUT_MUTATION = `
  mutation Logout {
    logout
  }
`;

export const ME_QUERY = `
  query Me {
    me {
      id
      email
      displayName
      firstName
      lastName
      onboardingStatus
      isActive
      roles {
        id
        name
        permissions {
          name
          resource
          action
          scope
        }
      }
      department {
        id
        name
      }
      jobInfo {
        title
        hireDate
        employmentType
      }
      contactInfo {
        phoneNumber
        addressCity
        emergencyContactName
      }
    }
  }
`;

export const VALIDATE_TOKEN_QUERY = `
  query ValidateToken {
    validateToken {
      id
      email
      roles {
        name
      }
    }
  }
`;

export const MY_PERMISSIONS_QUERY = `
  query GetMyPermissions {
    myPermissions {
      name
      resource
      action
      scope
    }
  }
`;

// =============================================================================
// User Management Operations
// =============================================================================

export const GET_USERS_QUERY = `
  query GetUsers {
    users {
      id
      username
      email
      displayName
      firstName
      lastName
      onboardingStatus
      isActive
      employeeId
      jobTitle
      createdAt
      updatedAt
    }
  }
`;

export const GET_USER_DETAILS_QUERY = `
  query GetUserDetails($id: ID!) {
    user(id: $id) {
      id
      username
      email
      displayName
      firstName
      lastName
      onboardingStatus
      isActive
      employeeId
      jobTitle
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_USER_MUTATION = `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      username
      email
      displayName
      firstName
      lastName
      onboardingStatus
      isActive
      createdAt
    }
  }
`;

export const UPDATE_USER_MUTATION = `
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      username
      email
      displayName
      firstName
      lastName
      isActive
      updatedAt
    }
  }
`;

export const DEACTIVATE_USER_MUTATION = `
  mutation DeactivateUser($id: ID!, $reason: String) {
    deactivateUser(id: $id, reason: $reason) {
      id
      isActive
      updatedAt
    }
  }
`;

export const ASSIGN_ROLE_MUTATION = `
  mutation AssignRole($userId: ID!, $roleId: ID!) {
    assignRole(userId: $userId, roleId: $roleId) {
      id
      user {
        id
        displayName
      }
      role {
        name
      }
      isActive
      createdAt
    }
  }
`;

// =============================================================================
// Task Management Operations
// =============================================================================

export const GET_TASKS_QUERY = `
  query GetTasks($filter: TaskFilter, $sort: SortInput, $pagination: PaginationInput) {
    tasks(filter: $filter, sort: $sort, pagination: $pagination) {
      edges {
        node {
          id
          title
          description
          status
          priority
          dueDate
          completionDate
          assignedTo {
            displayName
          }
          createdBy {
            displayName
          }
          completionPercentage
          isOverdue
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_TASK_DETAILS_QUERY = `
  query GetTaskDetails($id: ID!) {
    task(id: $id) {
      id
      title
      description
      status
      priority
      dueDate
      assignedTo {
        id
        displayName
      }
      createdBy {
        displayName
      }
      parentTask {
        id
        title
      }
      subtasks {
        id
        title
        status
      }
      dependencies {
        id
        title
        status
      }
      completionPercentage
      estimatedHours
      actualHours
      attachments {
        id
        filename
        url
      }
      comments {
        id
        content
        author {
          displayName
        }
        createdAt
      }
    }
  }
`;

export const CREATE_TASK_MUTATION = `
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {
      id
      title
      description
      status
      priority
      dueDate
      assignedTo {
        id
        displayName
      }
      createdBy {
        displayName
      }
      estimatedHours
      createdAt
    }
  }
`;

export const UPDATE_TASK_MUTATION = `
  mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) {
    updateTask(id: $id, input: $input) {
      id
      status
      actualHours
      completionPercentage
      updatedAt
    }
  }
`;

export const COMPLETE_TASK_MUTATION = `
  mutation CompleteTask($id: ID!) {
    completeTask(id: $id) {
      id
      status
      completionDate
      completionPercentage
      updatedAt
    }
  }
`;

export const DELETE_TASK_MUTATION = `
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id)
  }
`;

export const GET_MY_TASKS_QUERY = `
  query GetMyTasks($filter: TaskFilter, $sort: SortInput, $pagination: PaginationInput) {
    myTasks(filter: $filter, sort: $sort, pagination: $pagination) {
      edges {
        node {
          id
          title
          description
          status
          priority
          dueDate
          completionDate
          createdBy {
            displayName
          }
          progress
          completionPercentage
          isOverdue
          estimatedHours
          actualHours
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_MY_LEAVE_REQUESTS_QUERY = `
  query GetMyLeaveRequests($filter: LeaveRequestFilter, $sort: SortInput, $pagination: PaginationInput) {
    myLeaveRequests(filter: $filter, sort: $sort, pagination: $pagination) {
      edges {
        node {
          id
          requestNumber
          leaveType {
            id
            name
            code
          }
          startDate
          endDate
          totalDays
          reason
          status
          urgency
          isEmergency
          submittedAt
          approvedAt
          approver {
            displayName
          }
          employee {
            id
            displayName
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_PENDING_LEAVE_REQUESTS_QUERY = `
  query GetPendingLeaveRequests($filter: LeaveRequestFilter, $sort: SortInput, $pagination: PaginationInput) {
    pendingLeaveRequests(filter: $filter, sort: $sort, pagination: $pagination) {
      edges {
        node {
          id
          requestNumber
          employee {
            id
            displayName
            department {
              name
            }
          }
          leaveType {
            name
            code
          }
          startDate
          endDate
          totalDays
          status
          urgency
          isEmergency
          submittedAt
          reason
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_DASHBOARD_TASKS_QUERY = `
  query GetDashboardTasks {
    dashboardData {
      upcomingTasks {
        id
        title
        dueDate
        priority
        isOverdue
      }
      quickStats {
        pendingTasks
        completedTasksThisWeek
        overdueTasksCount
      }
    }
  }
`;

// =============================================================================
// Department Management Operations
// =============================================================================

export const GET_DEPARTMENTS_QUERY = `
  query GetDepartments {
    departments {
      id
      name
      description
      isActive
      employeeCount
      createdAt
      updatedAt
    }
  }
`;

export const GET_DEPARTMENT_DETAILS_QUERY = `
  query GetDepartmentDetails($id: ID!) {
    department(id: $id) {
      id
      name
      code
      description
      isActive
      parentDepartment {
        id
        name
        code
      }
      childDepartments {
        id
        name
        code
        employeeCount
        manager {
          displayName
        }
      }
      manager {
        id
        displayName
        email
        jobTitle
      }
      employees {
        id
        displayName
        email
        jobTitle
        hireDate
        isActive
      }
      employeeCount
      budget
      budgetUtilized
      createdAt
      updatedAt
      createdBy {
        displayName
      }
    }
  }
`;

export const CREATE_DEPARTMENT_MUTATION = `
  mutation CreateDepartment($input: CreateDepartmentInput!) {
    createDepartment(input: $input) {
      id
      name
      code
      description
      parentDepartment {
        id
        name
      }
      manager {
        id
        displayName
      }
      budget
      isActive
      createdAt
    }
  }
`;

export const UPDATE_DEPARTMENT_MUTATION = `
  mutation UpdateDepartment($id: ID!, $input: UpdateDepartmentInput!) {
    updateDepartment(id: $id, input: $input) {
      id
      name
      description
      manager {
        id
        displayName
      }
      budget
      updatedAt
    }
  }
`;

export const ARCHIVE_DEPARTMENT_MUTATION = `
  mutation ArchiveDepartment($id: ID!) {
    archiveDepartment(id: $id) {
      id
      name
      isArchived
      archivedAt
    }
  }
`;

export const ASSIGN_DEPARTMENT_HEAD_MUTATION = `
  mutation AssignDepartmentHead($departmentId: ID!, $employeeId: ID!) {
    assignDepartmentHead(departmentId: $departmentId, employeeId: $employeeId) {
      id
      name
      manager {
        id
        displayName
        email
      }
      updatedAt
    }
  }
`;

export const TRANSFER_EMPLOYEE_MUTATION = `
  mutation TransferEmployee($employeeId: ID!, $toDepartmentId: ID!, $effectiveDate: DateTime) {
    transferEmployee(employeeId: $employeeId, toDepartmentId: $toDepartmentId, effectiveDate: $effectiveDate) {
      id
      employee {
        id
        displayName
      }
      fromDepartment {
        id
        name
      }
      toDepartment {
        id
        name
      }
      effectiveDate
      transferReason
      createdAt
    }
  }
`;

export const GET_DEPARTMENT_BUDGET_QUERY = `
  query GetDepartmentBudget($departmentId: ID!, $year: Int) {
    departmentBudget(departmentId: $departmentId, year: $year) {
      id
      department {
        id
        name
      }
      totalBudget
      allocatedBudget
      spentBudget
      remainingBudget
      year
      categories {
        name
        budgeted
        spent
        remaining
      }
    }
  }
`;

export const UPDATE_DEPARTMENT_BUDGET_MUTATION = `
  mutation UpdateDepartmentBudget($departmentId: ID!, $input: UpdateBudgetInput!) {
    updateDepartmentBudget(departmentId: $departmentId, input: $input) {
      id
      department {
        id
        name
      }
      totalBudget
      allocatedBudget
      year
      updatedAt
    }
  }
`;

export const GET_DEPARTMENT_ANALYTICS_QUERY = `
  query GetDepartmentAnalytics($departmentId: ID!, $period: AnalyticsPeriod!) {
    departmentAnalytics(departmentId: $departmentId, period: $period) {
      employeeCount
      totalBudget
      budgetUtilization
      newHires
      terminations
      averagePerformanceScore
      taskCompletionRate
      attendanceRate
      leaveUtilization
      topPerformers {
        id
        displayName
        performanceScore
      }
      recentActivity {
        type
        description
        timestamp
        actor {
          displayName
        }
      }
    }
  }
`;

// =============================================================================
// Leave Management Operations
// =============================================================================

export const GET_LEAVE_BALANCES_QUERY = `
  query GetLeaveBalances($employeeId: ID) {
    leaveBalances(employeeId: $employeeId) {
      id
      employee {
        id
        displayName
      }
      leaveType {
        id
        name
        code
        maxDaysPerYear
        carryOverLimit
      }
      totalDaysAllocated
      daysUsed
      daysRemaining
      daysCarriedOver
      accruedThisYear
      lastAccrualDate
      expirationDate
    }
  }
`;

export const SUBMIT_LEAVE_REQUEST_MUTATION = `
  mutation SubmitLeaveRequest($input: SubmitLeaveRequestInput!) {
    submitLeaveRequest(input: $input) {
      id
      requestNumber
      employee {
        id
        displayName
      }
      leaveType {
        id
        name
      }
      startDate
      endDate
      totalDays
      reason
      status
      urgency
      emergencyContact {
        name
        phone
        relationship
      }
      submittedAt
      approvalWorkflow {
        approvers {
          id
          displayName
          role
          order
        }
      }
    }
  }
`;

export const GET_LEAVE_REQUESTS_QUERY = `
  query GetLeaveRequests($filter: LeaveRequestFilter, $sort: SortInput, $pagination: PaginationInput) {
    leaveRequests(filter: $filter, sort: $sort, pagination: $pagination) {
      edges {
        node {
          id
          requestNumber
          employee {
            id
            displayName
            department {
              name
            }
          }
          leaveType {
            name
            code
          }
          startDate
          endDate
          totalDays
          status
          urgency
          isEmergency
          submittedAt
          approvedAt
          approver {
            displayName
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const APPROVE_LEAVE_REQUEST_MUTATION = `
  mutation ApproveLeaveRequest($requestId: ID!, $input: ApproveLeaveInput!) {
    approveLeaveRequest(requestId: $requestId, input: $input) {
      id
      status
      approver {
        id
        displayName
      }
      approvedAt
      approvalComments
      nextApprover {
        id
        displayName
        role
      }
      workflowComplete
      notificationsSent
    }
  }
`;

export const REJECT_LEAVE_REQUEST_MUTATION = `
  mutation RejectLeaveRequest($requestId: ID!, $input: RejectLeaveInput!) {
    rejectLeaveRequest(requestId: $requestId, input: $input) {
      id
      status
      rejectedBy {
        id
        displayName
      }
      rejectedAt
      rejectionReason
      rejectionComments
    }
  }
`;

export const SUBMIT_EMERGENCY_LEAVE_MUTATION = `
  mutation SubmitEmergencyLeave($input: SubmitEmergencyLeaveInput!) {
    submitEmergencyLeave(input: $input) {
      id
      isEmergency
      urgency
      status
      autoApprovalStatus
      effectiveImmediately
      notificationsSent
      emergencyContact {
        name
        phone
      }
      medicalCertificateRequired
    }
  }
`;

export const CANCEL_LEAVE_REQUEST_MUTATION = `
  mutation CancelLeaveRequest($requestId: ID!, $reason: String) {
    cancelLeaveRequest(requestId: $requestId, reason: $reason) {
      id
      status
      cancelledAt
      cancellationReason
      balanceRestored
      refundedDays
    }
  }
`;

// =============================================================================
// Attendance Management Operations
// =============================================================================

export const CLOCK_IN_MUTATION = `
  mutation ClockIn($input: ClockInInput!) {
    clockIn(input: $input) {
      id
      employee {
        id
        displayName
      }
      clockInTime
      location {
        latitude
        longitude
        address
      }
      deviceInfo {
        type
        identifier
        ipAddress
      }
      workLocation
      notes
      isLate
      scheduledStartTime
      actualStartTime
    }
  }
`;

export const CLOCK_OUT_MUTATION = `
  mutation ClockOut($input: ClockOutInput!) {
    clockOut(input: $input) {
      id
      clockOutTime
      totalHours
      regularHours
      overtimeHours
      breakDuration
      productivity {
        tasksCompleted
        goalsAchieved
        workSummary
      }
      location {
        address
      }
      isEarlyDeparture
      scheduledEndTime
      actualEndTime
    }
  }
`;

export const GET_ATTENDANCE_RECORDS_QUERY = `
  query GetAttendanceRecords($filter: AttendanceFilter, $pagination: PaginationInput) {
    attendanceRecords(filter: $filter, pagination: $pagination) {
      edges {
        node {
          id
          date
          clockInTime
          clockOutTime
          totalHours
          regularHours
          overtimeHours
          breakDuration
          status
          tardiness
          earlyDeparture
          workLocation
          productivity {
            tasksCompleted
            workSummary
          }
          approver {
            displayName
          }
          adjustments {
            reason
            adjustedBy {
              displayName
            }
            adjustmentTime
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const CREATE_WORK_SCHEDULE_MUTATION = `
  mutation CreateWorkSchedule($input: CreateWorkScheduleInput!) {
    createWorkSchedule(input: $input) {
      id
      employee {
        id
        displayName
      }
      shift {
        id
        name
        startTime
        endTime
        workDays
      }
      effectiveFrom
      effectiveTo
      scheduleType
      workPattern {
        hoursPerDay
        workDaysPerWeek
        flexibleHours
      }
      breaks {
        name
        startTime
        duration
        isPaid
      }
      isActive
    }
  }
`;

export const START_BREAK_MUTATION = `
  mutation StartBreak($input: StartBreakInput!) {
    startBreak(input: $input) {
      id
      breakType
      startTime
      scheduledDuration
      isActive
    }
  }
`;

export const GET_OVERTIME_REPORT_QUERY = `
  query GetOvertimeReport($filter: OvertimeReportFilter!) {
    overtimeReport(filter: $filter) {
      reportPeriod {
        start
        end
      }
      employees {
        employee {
          id
          displayName
        }
        regularHours
        overtimeHours
        overtimeRate
        complianceStatus
        alerts {
          type
          severity
          message
          threshold
        }
        weeklyBreakdown {
          week
          regularHours
          overtimeHours
        }
      }
      departmentTotals {
        totalRegularHours
        totalOvertimeHours
        overtimeCost
        complianceViolations
      }
    }
  }
`;

export const START_REMOTE_WORK_MUTATION = `
  mutation StartRemoteWork($input: StartRemoteWorkInput!) {
    startRemoteWork(input: $input) {
      id
      workLocation
      remoteLocation {
        description
        isApproved
        homeOfficeSetup
      }
      connectivityCheck {
        internetSpeed
        vpnConnected
        systemAccess
      }
      dailyGoals
      productivityMetrics {
        taskTargets
        meetingSchedule
      }
      startTime
    }
  }
`;

// =============================================================================
// HR Requests Operations
// =============================================================================

export const SUBMIT_HR_REQUEST_MUTATION = `
  mutation SubmitHRRequest($input: SubmitHRRequestInput!) {
    submitHRRequest(input: $input) {
      id
      requestNumber
      requestType {
        id
        name
        category
        approvalLevels
      }
      employee {
        id
        displayName
      }
      title
      description
      priority
      status
      attachments {
        id
        filename
        url
        fileType
        uploadedAt
      }
      submittedAt
      dueDate
      approvalWorkflow {
        currentLevel
        approvers {
          id
          displayName
          role
          order
          status
        }
      }
    }
  }
`;

export const GET_HR_REQUESTS_QUERY = `
  query GetHRRequests($filter: HRRequestFilter, $sort: SortInput, $pagination: PaginationInput) {
    hrRequests(filter: $filter, sort: $sort, pagination: $pagination) {
      edges {
        node {
          id
          requestNumber
          requestType {
            name
            category
          }
          employee {
            id
            displayName
            department {
              name
            }
          }
          title
          priority
          status
          submittedAt
          dueDate
          isOverdue
          currentApprover {
            displayName
            role
          }
          approvalProgress {
            completed
            total
            percentage
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const APPROVE_HR_REQUEST_MUTATION = `
  mutation ApproveHRRequest($requestId: ID!, $input: ApproveHRRequestInput!) {
    approveHRRequest(requestId: $requestId, input: $input) {
      id
      status
      approver {
        id
        displayName
      }
      approvedAt
      approvalComments
      approvalDecision {
        decision
        conditions
        effectiveDate
      }
      nextApprover {
        id
        displayName
        role
        notificationSent
      }
      workflowComplete
      finalDecision {
        approved
        implementationDate
        followUpActions
      }
    }
  }
`;

export const REJECT_HR_REQUEST_MUTATION = `
  mutation RejectHRRequest($requestId: ID!, $input: RejectHRRequestInput!) {
    rejectHRRequest(requestId: $requestId, input: $input) {
      id
      status
      rejectedBy {
        id
        displayName
      }
      rejectedAt
      rejectionReason
      rejectionCategory
      detailedFeedback
      appealProcess {
        available
        deadline
        instructions
      }
      notificationsSent
    }
  }
`;

export const GET_HR_REQUEST_TEMPLATES_QUERY = `
  query GetHRRequestTemplates($category: String) {
    hrRequestTemplates(category: $category) {
      id
      name
      category
      description
      isActive
      requiredFields {
        name
        type
        label
        required
        validation
        options
      }
      attachmentTypes
      approvalLevels
      estimatedProcessingTime
      instructions
      examples
      relatedPolicies {
        name
        url
      }
    }
  }
`;

export const GET_REQUEST_STATUS_QUERY = `
  query GetRequestStatus($requestId: ID!) {
    hrRequest(id: $requestId) {
      id
      requestNumber
      status
      currentStep
      timeline {
        step
        status
        actor {
          displayName
          role
        }
        timestamp
        comments
        duration
        attachments {
          filename
          url
        }
      }
      estimatedCompletion
      actualCompletion
      delays {
        reason
        duration
        impact
      }
      notifications {
        type
        sentTo
        sentAt
        status
      }
    }
  }
`;

// =============================================================================
// Schema Introspection Operations
// =============================================================================

export const SCHEMA_INTROSPECTION_QUERY = `
  query SchemaIntrospection {
    __schema {
      types {
        name
        kind
      }
    }
  }
`;

export const REQUIRED_TYPES_QUERY = `
  query RequiredTypes {
    __schema {
      types {
        name
      }
    }
  }
`;

export const QUERY_OPERATIONS_QUERY = `
  query QueryOperations {
    __schema {
      queryType {
        fields {
          name
          type {
            name
          }
        }
      }
    }
  }
`;

export const MUTATION_OPERATIONS_QUERY = `
  query MutationOperations {
    __schema {
      mutationType {
        fields {
          name
        }
      }
    }
  }
`;

// =============================================================================
// Notification Operations
// =============================================================================

export const GET_NOTIFICATIONS_QUERY = `
  query GetNotifications($filter: NotificationFilter, $pagination: PaginationInput) {
    notifications(filter: $filter, pagination: $pagination) {
      edges {
        node {
          id
          title
          message
          type
          priority
          isRead
          createdAt
          updatedAt
          actionUrl
          metadata
          expiresAt
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_NOTIFICATION_PREFERENCES_QUERY = `
  query GetNotificationPreferences {
    notificationPreferences {
      id
      userId
      emailNotifications
      pushNotifications
      smsNotifications
      categories {
        category
        enabled
        methods
      }
      quietHours {
        enabled
        startTime
        endTime
        timezone
      }
      frequency {
        digest
        immediate
        batched
      }
    }
  }
`;

export const UPDATE_NOTIFICATION_PREFERENCES_MUTATION = `
  mutation UpdateNotificationPreferences($input: UpdateNotificationPreferencesInput!) {
    updateNotificationPreferences(input: $input) {
      id
      emailNotifications
      pushNotifications
      smsNotifications
      updatedAt
    }
  }
`;

export const MARK_NOTIFICATION_READ_MUTATION = `
  mutation MarkNotificationRead($notificationId: ID!) {
    markNotificationRead(notificationId: $notificationId) {
      id
      isRead
      readAt
    }
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ_MUTATION = `
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead {
      count
      updatedAt
    }
  }
`;

export const DELETE_NOTIFICATION_MUTATION = `
  mutation DeleteNotification($notificationId: ID!) {
    deleteNotification(notificationId: $notificationId)
  }
`;

export const SEND_TEST_NOTIFICATION_MUTATION = `
  mutation SendTestNotification($input: SendTestNotificationInput!) {
    sendTestNotification(input: $input) {
      id
      status
      sentAt
      deliveryStatus
    }
  }
`;

export const SUBSCRIBE_NOTIFICATIONS = `
  subscription SubscribeNotifications($userId: ID!) {
    notificationReceived(userId: $userId) {
      id
      title
      message
      type
      priority
      createdAt
      actionUrl
      metadata
      isRead
    }
  }
`;

export const GET_NOTIFICATION_ANALYTICS_QUERY = `
  query GetNotificationAnalytics($period: AnalyticsPeriod!) {
    notificationAnalytics(period: $period) {
      totalSent
      totalRead
      readRate
      averageReadTime
      topCategories {
        category
        count
        readRate
      }
      deliverySuccess
      failedDeliveries {
        reason
        count
      }
      userEngagement {
        activeUsers
        clickThroughRate
        unsubscribeRate
      }
      timeDistribution {
        hour
        count
        readRate
      }
    }
  }
`;

// =============================================================================
// Subscription Operations
// =============================================================================

export const TASK_UPDATED_SUBSCRIPTION = `
  subscription TaskUpdated {
    taskUpdated {
      id
      title
      status
      assignedTo {
        id
        displayName
      }
      completionPercentage
    }
  }
`;

export const NOTIFICATION_SUBSCRIPTION = `
  subscription NotificationReceived($userId: ID!) {
    notificationReceived(userId: $userId) {
      id
      type
      title
      message
      priority
      createdAt
      actionUrl
    }
  }
`;

export const ATTENDANCE_UPDATE_SUBSCRIPTION = `
  subscription AttendanceUpdate($departmentId: ID!) {
    attendanceUpdate(departmentId: $departmentId) {
      employee {
        id
        displayName
      }
      clockInTime
      clockOutTime
      status
      workLocation
    }
  }
`;

export const LEAVE_STATUS_SUBSCRIPTION = `
  subscription LeaveStatusUpdate($employeeId: ID!) {
    leaveStatusUpdate(employeeId: $employeeId) {
      requestId
      status
      approver {
        displayName
      }
      comments
      updatedAt
    }
  }
`;

// =============================================================================
// Utility Functions
// =============================================================================

export const buildPaginationVariables = (page: number = 1, pageSize: number = 20) => ({
  pagination: {
    first: pageSize,
    after: page > 1 ? btoa(`cursor:${(page - 1) * pageSize}`) : undefined
  }
});

export const buildSortVariables = (field: string, direction: 'ASC' | 'DESC' = 'ASC') => ({
  sort: { field, direction }
});

export const buildFilterVariables = (filters: Record<string, any>) => ({
  filter: Object.fromEntries(
    Object.entries(filters).filter(([_, value]) => 
      value !== null && value !== undefined && value !== ''
    )
  )
});

export const extractEdges = <T>(connection: any): T[] => {
  return connection?.edges?.map((edge: any) => edge.node) || [];
};

export const extractPageInfo = (connection: any) => {
  return connection?.pageInfo || {
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null
  };
};

// Export all operations
export default {
  // Authentication
  LOGIN_MUTATION,
  REFRESH_TOKEN_MUTATION,
  LOGOUT_MUTATION,
  ME_QUERY,
  VALIDATE_TOKEN_QUERY,
  MY_PERMISSIONS_QUERY,

  // Users
  GET_USERS_QUERY,
  GET_USER_DETAILS_QUERY,
  CREATE_USER_MUTATION,
  UPDATE_USER_MUTATION,
  DEACTIVATE_USER_MUTATION,
  ASSIGN_ROLE_MUTATION,

  // Tasks
  GET_TASKS_QUERY,
  GET_TASK_DETAILS_QUERY,
  CREATE_TASK_MUTATION,
  UPDATE_TASK_MUTATION,
  COMPLETE_TASK_MUTATION,
  DELETE_TASK_MUTATION,
  GET_MY_TASKS_QUERY,
  GET_DASHBOARD_TASKS_QUERY,

  // Departments
  GET_DEPARTMENTS_QUERY,
  GET_DEPARTMENT_DETAILS_QUERY,
  CREATE_DEPARTMENT_MUTATION,
  UPDATE_DEPARTMENT_MUTATION,
  ARCHIVE_DEPARTMENT_MUTATION,
  ASSIGN_DEPARTMENT_HEAD_MUTATION,
  TRANSFER_EMPLOYEE_MUTATION,
  GET_DEPARTMENT_BUDGET_QUERY,
  UPDATE_DEPARTMENT_BUDGET_MUTATION,
  GET_DEPARTMENT_ANALYTICS_QUERY,

  // Leave
  GET_LEAVE_BALANCES_QUERY,
  SUBMIT_LEAVE_REQUEST_MUTATION,
  GET_LEAVE_REQUESTS_QUERY,
  GET_MY_LEAVE_REQUESTS_QUERY,
  GET_PENDING_LEAVE_REQUESTS_QUERY,
  APPROVE_LEAVE_REQUEST_MUTATION,
  REJECT_LEAVE_REQUEST_MUTATION,
  SUBMIT_EMERGENCY_LEAVE_MUTATION,
  CANCEL_LEAVE_REQUEST_MUTATION,

  // Attendance
  CLOCK_IN_MUTATION,
  CLOCK_OUT_MUTATION,
  GET_ATTENDANCE_RECORDS_QUERY,
  CREATE_WORK_SCHEDULE_MUTATION,
  START_BREAK_MUTATION,
  GET_OVERTIME_REPORT_QUERY,
  START_REMOTE_WORK_MUTATION,

  // HR Requests
  SUBMIT_HR_REQUEST_MUTATION,
  GET_HR_REQUESTS_QUERY,
  APPROVE_HR_REQUEST_MUTATION,
  REJECT_HR_REQUEST_MUTATION,
  GET_HR_REQUEST_TEMPLATES_QUERY,
  GET_REQUEST_STATUS_QUERY,

  // Notifications
  GET_NOTIFICATIONS_QUERY,
  GET_NOTIFICATION_PREFERENCES_QUERY,
  UPDATE_NOTIFICATION_PREFERENCES_MUTATION,
  MARK_NOTIFICATION_READ_MUTATION,
  MARK_ALL_NOTIFICATIONS_READ_MUTATION,
  DELETE_NOTIFICATION_MUTATION,
  SEND_TEST_NOTIFICATION_MUTATION,
  SUBSCRIBE_NOTIFICATIONS,
  GET_NOTIFICATION_ANALYTICS_QUERY,

  // Schema
  SCHEMA_INTROSPECTION_QUERY,
  REQUIRED_TYPES_QUERY,
  QUERY_OPERATIONS_QUERY,
  MUTATION_OPERATIONS_QUERY,

  // Subscriptions
  TASK_UPDATED_SUBSCRIPTION,
  NOTIFICATION_SUBSCRIPTION,
  ATTENDANCE_UPDATE_SUBSCRIPTION,
  LEAVE_STATUS_SUBSCRIPTION,

  // Utilities
  buildPaginationVariables,
  buildSortVariables,
  buildFilterVariables,
  extractEdges,
  extractPageInfo
};

