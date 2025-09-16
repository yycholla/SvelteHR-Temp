/**
 * Hasura GraphQL Operations
 * Centralized GraphQL queries, mutations, and subscriptions for the HR system
 */

import { gql } from '@urql/svelte';

// =============================================================================
// AUTHENTICATION OPERATIONS  
// =============================================================================

export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    users(limit: 1) {
      id
      email
      displayName
      jobTitle
      onboardingStatus
      createdAt
      lastLoginAt
      departmentId
      managerId
      roles: user_roles {
        role
      }
      department {
        id
        name
      }
      manager {
        id
        displayName
        email
      }
    }
  }
`;

// =============================================================================
// USER/EMPLOYEE MANAGEMENT
// =============================================================================

export const GET_EMPLOYEES_LIST = gql`
  query GetEmployeesList(
    $limit: Int = 50
    $offset: Int = 0
    $where: users_bool_exp = {}
    $orderBy: [users_order_by!] = [{ displayName: asc }]
  ) {
    users(
      limit: $limit
      offset: $offset
      where: $where
      order_by: $orderBy
    ) {
      id
      email
      displayName
      jobTitle
      onboardingStatus
      createdAt
      lastLoginAt
      departmentId
      managerId
      roles: user_roles {
        role
      }
      department {
        id
        name
      }
      manager {
        id
        displayName
        email
      }
      directReports: users_aggregate(where: { managerId: { _eq: $id } }) {
        aggregate {
          count
        }
      }
    }
    users_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

export const GET_EMPLOYEE_DETAILS = gql`
  query GetEmployeeDetails($id: uuid!) {
    users_by_pk(id: $id) {
      id
      email
      displayName
      jobTitle
      onboardingStatus
      createdAt
      updatedAt
      lastLoginAt
      departmentId
      managerId
      roles: user_roles {
        id
        role
        assignedAt
        assignedBy {
          displayName
          email
        }
      }
      department {
        id
        name
        description
      }
      manager {
        id
        displayName
        email
        jobTitle
      }
      directReports: users(order_by: { displayName: asc }) {
        id
        displayName
        email
        jobTitle
      }
      personalInfo: personal_information {
        firstName
        lastName
        phoneNumber
        dateOfBirth
        emergencyContactName
        emergencyContactPhone
        address
      }
      contactInfo: contact_information {
        workEmail
        personalEmail
        workPhone
        personalPhone
        slackUserId
        linkedinProfile
      }
      jobInfo: job_information {
        employeeId
        startDate
        endDate
        employmentType
        workLocation
        timeZone
        salary
        currency
        benefitsEligible
        vacationDays
        sickDays
      }
      compensation: compensation {
        baseSalary
        currency
        effectiveDate
        bonus
        equity
        benefitsValue
        totalCompensation
      }
    }
  }
`;

export const SEARCH_EMPLOYEES = gql`
  query SearchEmployees(
    $searchTerm: String!
    $limit: Int = 20
  ) {
    search_employees(
      args: { search_term: $searchTerm }
      limit: $limit
    ) {
      id
      email
      displayName
      jobTitle
      departmentName: department {
        name
      }
      relevance
    }
  }
`;

export const CREATE_EMPLOYEE = gql`
  mutation CreateEmployee($input: users_insert_input!) {
    insert_users_one(object: $input) {
      id
      email
      displayName
      jobTitle
      onboardingStatus
      departmentId
      managerId
      createdAt
    }
  }
`;

export const UPDATE_EMPLOYEE = gql`
  mutation UpdateEmployee(
    $id: uuid!
    $updates: users_set_input!
  ) {
    update_users_by_pk(
      pk_columns: { id: $id }
      _set: $updates
    ) {
      id
      email
      displayName
      jobTitle
      onboardingStatus
      departmentId
      managerId
      updatedAt
    }
  }
`;

export const DEACTIVATE_EMPLOYEE = gql`
  mutation DeactivateEmployee($id: uuid!) {
    update_users_by_pk(
      pk_columns: { id: $id }
      _set: { 
        onboardingStatus: "terminated"
        updatedAt: "now()"
      }
    ) {
      id
      onboardingStatus
      updatedAt
    }
  }
`;

// =============================================================================
// DEPARTMENT MANAGEMENT
// =============================================================================

export const GET_DEPARTMENTS_LIST = gql`
  query GetDepartmentsList {
    departments(order_by: { name: asc }) {
      id
      name
      description
      parentDepartmentId
      createdAt
      updatedAt
      employeeCount: users_aggregate {
        aggregate {
          count
        }
      }
      manager: users(where: { user_roles: { role: { _eq: "manager" } } }, limit: 1) {
        id
        displayName
        email
      }
      parentDepartment {
        id
        name
      }
      childDepartments: departments {
        id
        name
        employeeCount: users_aggregate {
          aggregate {
            count
          }
        }
      }
    }
  }
`;

export const GET_DEPARTMENT_DETAILS = gql`
  query GetDepartmentDetails($id: uuid!) {
    departments_by_pk(id: $id) {
      id
      name
      description
      parentDepartmentId
      createdAt
      updatedAt
      parentDepartment {
        id
        name
      }
      childDepartments: departments(order_by: { name: asc }) {
        id
        name
        description
        employeeCount: users_aggregate {
          aggregate {
            count
          }
        }
      }
      employees: users(order_by: { displayName: asc }) {
        id
        displayName
        email
        jobTitle
        onboardingStatus
        roles: user_roles {
          role
        }
      }
      managers: users(
        where: { user_roles: { role: { _eq: "manager" } } }
        order_by: { displayName: asc }
      ) {
        id
        displayName
        email
        jobTitle
      }
    }
  }
`;

export const CREATE_DEPARTMENT = gql`
  mutation CreateDepartment($input: departments_insert_input!) {
    insert_departments_one(object: $input) {
      id
      name
      description
      parentDepartmentId
      createdAt
    }
  }
`;

export const UPDATE_DEPARTMENT = gql`
  mutation UpdateDepartment(
    $id: uuid!
    $updates: departments_set_input!
  ) {
    update_departments_by_pk(
      pk_columns: { id: $id }
      _set: $updates
    ) {
      id
      name
      description
      parentDepartmentId
      updatedAt
    }
  }
`;

// =============================================================================
// ROLE MANAGEMENT
// =============================================================================

export const GET_USER_ROLES = gql`
  query GetUserRoles($userId: uuid!) {
    user_roles(where: { userId: { _eq: $userId } }) {
      id
      role
      assignedAt
      assignedBy {
        displayName
        email
      }
      user {
        displayName
        email
      }
    }
  }
`;

export const ASSIGN_USER_ROLE = gql`
  mutation AssignUserRole($input: user_roles_insert_input!) {
    insert_user_roles_one(object: $input) {
      id
      role
      assignedAt
      user {
        id
        displayName
        email
      }
    }
  }
`;

export const REMOVE_USER_ROLE = gql`
  mutation RemoveUserRole($id: uuid!) {
    delete_user_roles_by_pk(id: $id) {
      id
      role
      user {
        displayName
        email
      }
    }
  }
`;

export const GET_ROLE_ASSIGNMENTS = gql`
  query GetRoleAssignments {
    user_role_assignments {
      id
      userId
      roleId
      assignedAt
      assignedBy {
        displayName
        email
      }
      user {
        displayName
        email
        jobTitle
      }
      role {
        name
        description
        permissions
      }
    }
  }
`;

// =============================================================================
// ONBOARDING OPERATIONS
// =============================================================================

export const GET_ONBOARDING_TASKS = gql`
  query GetOnboardingTasks($userId: uuid!) {
    users_by_pk(id: $userId) {
      id
      onboardingStatus
      personalInfo: personal_information {
        firstName
        lastName
        phoneNumber
      }
      contactInfo: contact_information {
        workEmail
        workPhone
      }
      jobInfo: job_information {
        employeeId
        startDate
        employmentType
      }
    }
  }
`;

export const UPDATE_ONBOARDING_STATUS = gql`
  mutation UpdateOnboardingStatus(
    $userId: uuid!
    $status: String!
  ) {
    update_users_by_pk(
      pk_columns: { id: $userId }
      _set: { onboardingStatus: $status }
    ) {
      id
      onboardingStatus
      updatedAt
    }
  }
`;

// =============================================================================
// DASHBOARD/ANALYTICS OPERATIONS  
// =============================================================================

export const GET_DASHBOARD_STATS = gql`
  query GetDashboardStats {
    totalEmployees: users_aggregate {
      aggregate {
        count
      }
    }
    activeEmployees: users_aggregate(
      where: { onboardingStatus: { _neq: "terminated" } }
    ) {
      aggregate {
        count
      }
    }
    pendingOnboarding: users_aggregate(
      where: { onboardingStatus: { _in: ["invited", "in_progress"] } }
    ) {
      aggregate {
        count
      }
    }
    departmentCount: departments_aggregate {
      aggregate {
        count
      }
    }
    recentHires: users(
      where: { createdAt: { _gte: "now() - interval '30 days'" } }
      order_by: { createdAt: desc }
      limit: 5
    ) {
      id
      displayName
      jobTitle
      createdAt
      department {
        name
      }
    }
  }
`;

// =============================================================================
// REAL-TIME SUBSCRIPTIONS
// =============================================================================

export const SUBSCRIBE_TO_USER_UPDATES = gql`
  subscription SubscribeToUserUpdates($userId: uuid!) {
    users_by_pk(id: $userId) {
      id
      onboardingStatus
      lastLoginAt
      updatedAt
    }
  }
`;

export const SUBSCRIBE_TO_DEPARTMENT_CHANGES = gql`
  subscription SubscribeToDepartmentChanges {
    departments {
      id
      name
      updatedAt
      employeeCount: users_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

export const SUBSCRIBE_TO_NEW_EMPLOYEES = gql`
  subscription SubscribeToNewEmployees {
    users(
      where: { createdAt: { _gte: "now() - interval '1 hour'" } }
      order_by: { createdAt: desc }
    ) {
      id
      displayName
      email
      jobTitle
      createdAt
      onboardingStatus
      department {
        name
      }
    }
  }
`;

// =============================================================================
// LEAVE MANAGEMENT OPERATIONS
// =============================================================================

export const GET_MY_LEAVE_REQUESTS = gql`
  query GetMyLeaveRequests {
    leave_requests(
      order_by: { createdAt: desc }
    ) {
      id
      type
      status
      startDate
      endDate
      totalDays
      reason
      approvalNotes
      rejectionReason
      cancellationReason
      createdAt
      updatedAt
      employee {
        id
        displayName
        email
        jobTitle
        department {
          name
        }
      }
      approvedBy {
        id
        displayName
        email
      }
    }
  }
`;

export const GET_PENDING_LEAVE_REQUESTS = gql`
  query GetPendingLeaveRequests {
    leave_requests(
      where: { status: { _eq: "PENDING" } }
      order_by: { createdAt: asc }
    ) {
      id
      type
      status
      startDate
      endDate
      totalDays
      reason
      createdAt
      employee {
        id
        displayName
        email
        jobTitle
        department {
          name
        }
        manager {
          id
          displayName
          email
        }
      }
    }
  }
`;

export const GET_LEAVE_REQUEST_BY_ID = gql`
  query GetLeaveRequestById($id: uuid!) {
    leave_request: leave_requests_by_pk(id: $id) {
      id
      type
      status
      startDate
      endDate
      totalDays
      reason
      approvalNotes
      rejectionReason
      cancellationReason
      createdAt
      updatedAt
      employee {
        id
        displayName
        email
        jobTitle
        phoneNumber
        department {
          name
        }
        manager {
          id
          displayName
          email
        }
      }
      approvedBy {
        id
        displayName
        email
      }
    }
  }
`;

export const CREATE_LEAVE_REQUEST = gql`
  mutation CreateLeaveRequest($object: leave_requests_insert_input!) {
    insert_leave_requests_one(object: $object) {
      id
      type
      status
      startDate
      endDate
      totalDays
      reason
      createdAt
      employee {
        id
        displayName
        email
      }
    }
  }
`;

export const UPDATE_LEAVE_REQUEST = gql`
  mutation UpdateLeaveRequest(
    $id: uuid!
    $changes: leave_requests_set_input!
  ) {
    update_leave_requests_by_pk(
      pk_columns: { id: $id }
      _set: $changes
    ) {
      id
      type
      status
      startDate
      endDate
      totalDays
      reason
      updatedAt
      employee {
        id
        displayName
        email
      }
    }
  }
`;

export const APPROVE_LEAVE_REQUEST = gql`
  mutation ApproveLeaveRequest(
    $id: uuid!
    $approvalNotes: String
  ) {
    update_leave_requests_by_pk(
      pk_columns: { id: $id }
      _set: { 
        status: "APPROVED"
        approvalNotes: $approvalNotes
        updatedAt: "now()"
      }
    ) {
      id
      status
      approvalNotes
      updatedAt
      employee {
        id
        displayName
        email
      }
    }
  }
`;

export const REJECT_LEAVE_REQUEST = gql`
  mutation RejectLeaveRequest(
    $id: uuid!
    $rejectionReason: String!
  ) {
    update_leave_requests_by_pk(
      pk_columns: { id: $id }
      _set: { 
        status: "REJECTED"
        rejectionReason: $rejectionReason
        updatedAt: "now()"
      }
    ) {
      id
      status
      rejectionReason
      updatedAt
      employee {
        id
        displayName
        email
      }
    }
  }
`;

export const CANCEL_LEAVE_REQUEST = gql`
  mutation CancelLeaveRequest(
    $id: uuid!
    $cancellationReason: String
  ) {
    update_leave_requests_by_pk(
      pk_columns: { id: $id }
      _set: { 
        status: "CANCELLED"
        cancellationReason: $cancellationReason
        updatedAt: "now()"
      }
    ) {
      id
      status
      cancellationReason
      updatedAt
      employee {
        id
        displayName
        email
      }
    }
  }
`;

export const GET_LEAVE_BALANCE = gql`
  query GetLeaveBalance($userId: uuid) {
    leave_balances(
      where: { userId: { _eq: $userId } }
    ) {
      id
      userId
      leaveType
      totalAllocation
      used
      available
      carryOver
      year
      updatedAt
      user {
        id
        displayName
        email
      }
    }
  }
`;

export const GET_LEAVE_TYPES = gql`
  query GetLeaveTypes {
    leave_types {
      id
      name
      code
      description
      maxDaysPerYear
      carryOverAllowed
      maxCarryOverDays
      requiresApproval
      advanceNoticeRequired
      isActive
      createdAt
    }
  }
`;