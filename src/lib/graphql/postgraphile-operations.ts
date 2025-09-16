/**
 * PostGraphile GraphQL Operations
 * Simplified version for initial testing and compatibility
 */

import { gql } from '@urql/svelte';

// =============================================================================
// AUTHENTICATION OPERATIONS  
// =============================================================================

export const AUTHENTICATE_USER = gql`
  mutation AuthenticateUser($email: String!, $password: String!) {
    authenticate(input: { email: $email, password: $password }) {
      jwtToken
      query {
        currentUserId
      }
    }
  }
`;

// =============================================================================
// BASIC USER OPERATIONS  
// =============================================================================

export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    currentUserId
  }
`;

export const GET_USER_BY_ID = gql`
  query GetUserById($id: UUID!) {
    user(id: $id) {
      id
      email
      displayName
      onboardingStatus
      createdAt
      lastLogin
      isActive
    }
  }
`;

export const GET_ALL_USERS = gql`
  query GetAllUsers($first: Int = 50) {
    users(first: $first) {
      nodes {
        id
        email
        displayName
        onboardingStatus
        createdAt
        lastLogin
        isActive
      }
      totalCount
    }
  }
`;

// =============================================================================
// BASIC DEPARTMENT OPERATIONS
// =============================================================================

export const GET_ALL_DEPARTMENTS = gql`
  query GetAllDepartments {
    allDepartments {
      nodes {
        id
        name
        description
        parentDepartmentId
        createdAt
        updatedAt
      }
      totalCount
    }
  }
`;

export const GET_DEPARTMENT_BY_ID = gql`
  query GetDepartmentById($id: UUID!) {
    departmentById(id: $id) {
      id
      name
      description
      parentDepartmentId
      createdAt
      updatedAt
    }
  }
`;

// =============================================================================
// BASIC MUTATION OPERATIONS
// =============================================================================

export const UPDATE_USER = gql`
  mutation UpdateUser($id: UUID!, $patch: UserPatch!) {
    updateUserById(input: { id: $id, userPatch: $patch }) {
      user {
        id
        email
        displayName
        onboardingStatus
        updatedAt
      }
    }
  }
`;

// =============================================================================
// ROLE MANAGEMENT OPERATIONS
// =============================================================================

export const GET_ALL_ROLES = gql`
  query GetAllRoles {
    allUserRoles(orderBy: NAME_ASC) {
      nodes {
        id
        name
        description
        level
        isActive
        createdAt
      }
    }
  }
`;

export const GET_USER_ROLES = gql`
  query GetUserRoles($userId: UUID!) {
    userRoleAssignments(condition: { userId: $userId }) {
      nodes {
        id
        userId
        roleId
        assignedBy
        isActive
        validFrom
        validUntil
        createdAt
      }
    }
  }
`;

export const ASSIGN_USER_ROLE = gql`
  mutation AssignUserRole($input: CreateUserRoleAssignmentInput!) {
    createUserRoleAssignment(input: $input) {
      userRoleAssignment {
        id
        userId
        roleId
        assignedBy
        isActive
        validFrom
        validUntil
        createdAt
        userRoleByRoleId {
          id
          name
          description
          level
        }
        userByUserId {
          id
          displayName
          email
        }
      }
    }
  }
`;

export const UPDATE_USER_ROLE_ASSIGNMENT = gql`
  mutation UpdateUserRoleAssignment($id: UUID!, $patch: UserRoleAssignmentPatch!) {
    updateUserRoleAssignmentById(input: { id: $id, userRoleAssignmentPatch: $patch }) {
      userRoleAssignment {
        id
        isActive
        validUntil
        userRoleByRoleId {
          name
          level
        }
      }
    }
  }
`;

export const REVOKE_USER_ROLE = gql`
  mutation RevokeUserRole($id: UUID!) {
    updateUserRoleAssignmentById(
      input: { 
        id: $id, 
        userRoleAssignmentPatch: { 
          isActive: false
        } 
      }
    ) {
      userRoleAssignment {
        id
        isActive
        userRoleByRoleId {
          name
        }
        userByUserId {
          displayName
          email
        }
      }
    }
  }
`;

// =============================================================================
// WORKFLOW AUTOMATION OPERATIONS
// =============================================================================

export const GET_WORKFLOW_DEFINITIONS = gql`
  query GetWorkflowDefinitions($first: Int = 50) {
    allWorkflowDefinitions(first: $first, orderBy: [NAME_ASC]) {
      nodes {
        id
        name
        description
        category
        triggerType
        triggerConditions
        isTemplate
        timeoutMinutes
        maxRetries
        retryDelayMinutes
        status
        version
        createdAt
        updatedAt
        userByCreatedBy {
          id
          displayName
          email
        }
        departmentByDepartmentId {
          id
          name
        }
      }
      totalCount
    }
  }
`;

export const GET_WORKFLOW_DEFINITION_BY_ID = gql`
  query GetWorkflowDefinitionById($id: UUID!) {
    workflowDefinitionById(id: $id) {
      id
      name
      description
      category
      triggerType
      triggerConditions
      definition
      isTemplate
      timeoutMinutes
      maxRetries
      retryDelayMinutes
      status
      version
      parentWorkflowId
      createdBy
      departmentId
      createdAt
      updatedAt
      userByCreatedBy {
        id
        displayName
        email
      }
      departmentByDepartmentId {
        id
        name
      }
      workflowDefinitionByParentWorkflowId {
        id
        name
      }
      workflowInstancesByWorkflowDefinitionId(first: 10) {
        nodes {
          id
          status
          createdAt
        }
        totalCount
      }
    }
  }
`;

export const GET_WORKFLOW_INSTANCES = gql`
  query GetWorkflowInstances($first: Int = 50) {
    allWorkflowInstances(first: $first) {
      nodes {
        id
        workflowDefinitionId
        triggerData
        contextData
        status
        completedAt
        startedAt
        createdAt
        updatedAt
        workflowDefinitionByWorkflowDefinitionId {
          id
          name
          category
        }
        userByTriggeredByUserId {
          id
          displayName
          email
        }
      }
      totalCount
    }
  }
`;

export const GET_WORKFLOW_TASKS = gql`
  query GetWorkflowTasks($first: Int = 50, $condition: WorkflowTaskCondition) {
    allWorkflowTasks(first: $first, condition: $condition) {
      nodes {
        id
        workflowInstanceId
        taskType
        title
        description
        assignedToId
        status
        priority
        dueDate
        completedAt
        createdAt
        workflowInstanceByWorkflowInstanceId {
          id
          workflowDefinitionByWorkflowDefinitionId {
            name
            category
          }
        }
        userByAssignedToId {
          id
          displayName
          email
        }
      }
      totalCount
    }
  }
`;

export const CREATE_WORKFLOW_DEFINITION = gql`
  mutation CreateWorkflowDefinition($input: CreateWorkflowDefinitionInput!) {
    createWorkflowDefinition(input: $input) {
      workflowDefinition {
        id
        name
        description
        category
        triggerType
        triggerConditions
        definition
        isTemplate
        timeoutMinutes
        maxRetries
        retryDelayMinutes
        status
        version
        createdAt
        userByCreatedBy {
          id
          displayName
          email
        }
      }
    }
  }
`;

export const UPDATE_WORKFLOW_DEFINITION = gql`
  mutation UpdateWorkflowDefinition($id: UUID!, $patch: WorkflowDefinitionPatch!) {
    updateWorkflowDefinitionById(input: { id: $id, workflowDefinitionPatch: $patch }) {
      workflowDefinition {
        id
        name
        description
        category
        triggerType
        triggerConditions
        definition
        status
        version
        updatedAt
      }
    }
  }
`;

export const START_WORKFLOW_INSTANCE = gql`
  mutation StartWorkflowInstance($input: CreateWorkflowInstanceInput!) {
    createWorkflowInstance(input: $input) {
      workflowInstance {
        id
        workflowDefinitionId
        triggerData
        contextData
        status
        createdAt
        workflowDefinitionByWorkflowDefinitionId {
          name
          category
        }
      }
    }
  }
`;

export const UPDATE_WORKFLOW_TASK = gql`
  mutation UpdateWorkflowTask($id: UUID!, $patch: WorkflowTaskPatch!) {
    updateWorkflowTaskById(input: { id: $id, workflowTaskPatch: $patch }) {
      workflowTask {
        id
        status
        completedAt
        updatedAt
      }
    }
  }
`;

// =============================================================================
// SECURITY & COMPLIANCE OPERATIONS
// =============================================================================

export const GET_AUDIT_LOGS = gql`
  query GetAuditLogs($first: Int = 50, $orderBy: [AuditLogsOrderBy!] = [ID_DESC]) {
    allAuditLogs(first: $first, orderBy: $orderBy) {
      nodes {
        id
        actionType
        tableName
        recordId
        oldValues
        newValues
        ipAddress
        userAgent
        createdAt
        userId
        sessionId
        userByUserId {
          id
          displayName
          email
        }
        userSessionBySessionId {
          id
          userAgent
          ipAddress
        }
      }
      totalCount
    }
  }
`;

export const GET_AUDIT_LOG_BY_ID = gql`
  query GetAuditLogById($id: UUID!) {
    auditLogById(id: $id) {
      id
      actionType
      tableName
      recordId
      oldValues
      newValues
      ipAddress
      userAgent
      createdAt
      userId
      sessionId
      changedFields
      containsPii
      dataClassification
      legalBasis
      userByUserId {
        id
        displayName
        email
      }
      userSessionBySessionId {
        id
        userAgent
        ipAddress
      }
    }
  }
`;

export const GET_SECURITY_EVENTS = gql`
  query GetSecurityEvents($first: Int = 50, $orderBy: [SecurityEventsOrderBy!] = [ID_DESC]) {
    allSecurityEvents(first: $first, orderBy: $orderBy) {
      nodes {
        id
        eventType
        eventMessage
        eventCategory
        ipAddress
        isSuspicious
        riskScore
        createdAt
        userId
        sessionId
        eventData
        requiresInvestigation
        autoResolved
        resolvedAt
        resolvedBy
        userAgent
        userByUserId {
          id
          displayName
          email
        }
      }
      totalCount
    }
  }
`;

export const GET_SUSPICIOUS_ACTIVITIES = gql`
  query GetSuspiciousActivities($first: Int = 50) {
    allSecurityEvents(
      first: $first
      orderBy: [RISK_SCORE_DESC]
    ) {
      nodes {
        id
        eventType
        eventMessage
        eventCategory
        ipAddress
        isSuspicious
        riskScore
        createdAt
        userId
        sessionId
        eventData
        requiresInvestigation
        userAgent
        userByUserId {
          id
          displayName
          email
        }
      }
      totalCount
    }
  }
`;

export const GET_USER_ACTIVITY_LOG = gql`
  query GetUserActivityLog($userId: UUID!, $first: Int = 50) {
    user(id: $userId) {
      auditLogsByUserId(
        first: $first
        orderBy: [ID_DESC]
      ) {
        nodes {
          id
          actionType
          tableName
          recordId
          oldValues
          newValues
          ipAddress
          createdAt
          changedFields
          containsPii
        }
        totalCount
      }
    }
  }
`;

export const GET_SECURITY_METRICS = gql`
  query GetSecurityMetrics {
    totalUsers: users {
      totalCount
    }
    
    recentSecurityEvents: allSecurityEvents(first: 1000) {
      totalCount
      nodes {
        eventType
        isSuspicious
        riskScore
        createdAt
      }
    }
    
    recentAuditLogs: allAuditLogs(first: 1000) {
      totalCount
      nodes {
        actionType
        tableName
        createdAt
        containsPii
      }
    }
  }
`;