/* eslint-disable */
import * as types from './graphql';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
	'\n  mutation AuthenticateUser($email: String!, $password: String!) {\n    authenticate(input: { email: $email, password: $password }) {\n      jwtToken\n      query {\n        currentUserId\n      }\n    }\n  }\n': typeof types.AuthenticateUserDocument;
	'\n  query GetCurrentUser {\n    currentUserId\n  }\n': typeof types.GetCurrentUserDocument;
	'\n  query GetUserById($id: UUID!) {\n    userById(id: $id) {\n      id\n      email\n      displayName\n      onboardingStatus\n      createdAt\n      lastLogin\n      isActive\n    }\n  }\n': typeof types.GetUserByIdDocument;
	'\n  query GetAllUsers($first: Int = 50) {\n    allUsers(first: $first) {\n      nodes {\n        id\n        email\n        displayName\n        onboardingStatus\n        createdAt\n        lastLogin\n        isActive\n      }\n      totalCount\n    }\n  }\n': typeof types.GetAllUsersDocument;
	'\n  query GetAllDepartments {\n    allDepartments {\n      nodes {\n        id\n        name\n        description\n        parentDepartmentId\n        createdAt\n        updatedAt\n      }\n      totalCount\n    }\n  }\n': typeof types.GetAllDepartmentsDocument;
	'\n  query GetDepartmentById($id: UUID!) {\n    departmentById(id: $id) {\n      id\n      name\n      description\n      parentDepartmentId\n      createdAt\n      updatedAt\n    }\n  }\n': typeof types.GetDepartmentByIdDocument;
	'\n  mutation UpdateUser($id: UUID!, $patch: UserPatch!) {\n    updateUserById(input: { id: $id, userPatch: $patch }) {\n      user {\n        id\n        email\n        displayName\n        onboardingStatus\n        updatedAt\n      }\n    }\n  }\n': typeof types.UpdateUserDocument;
	'\n  query GetAllRoles {\n    allUserRoles(orderBy: NAME_ASC) {\n      nodes {\n        id\n        name\n        description\n        level\n        isActive\n        createdAt\n      }\n    }\n  }\n': typeof types.GetAllRolesDocument;
	'\n  query GetUserRoles($userId: UUID!) {\n    allUserRoleAssignments(condition: { userId: $userId }) {\n      nodes {\n        id\n        userId\n        roleId\n        assignedBy\n        isActive\n        validFrom\n        validUntil\n        createdAt\n        userRoleByRoleId {\n          id\n          name\n          description\n          level\n        }\n        userByUserId {\n          id\n          displayName\n          email\n        }\n        userByAssignedBy {\n          id\n          displayName\n          email\n        }\n      }\n    }\n  }\n': typeof types.GetUserRolesDocument;
	'\n  mutation AssignUserRole($input: CreateUserRoleAssignmentInput!) {\n    createUserRoleAssignment(input: $input) {\n      userRoleAssignment {\n        id\n        userId\n        roleId\n        assignedBy\n        isActive\n        validFrom\n        validUntil\n        createdAt\n        userRoleByRoleId {\n          id\n          name\n          description\n          level\n        }\n        userByUserId {\n          id\n          displayName\n          email\n        }\n      }\n    }\n  }\n': typeof types.AssignUserRoleDocument;
	'\n  mutation UpdateUserRoleAssignment($id: UUID!, $patch: UserRoleAssignmentPatch!) {\n    updateUserRoleAssignmentById(input: { id: $id, userRoleAssignmentPatch: $patch }) {\n      userRoleAssignment {\n        id\n        isActive\n        validUntil\n        userRoleByRoleId {\n          name\n          level\n        }\n      }\n    }\n  }\n': typeof types.UpdateUserRoleAssignmentDocument;
	'\n  mutation RevokeUserRole($id: UUID!) {\n    updateUserRoleAssignmentById(\n      input: { \n        id: $id, \n        userRoleAssignmentPatch: { \n          isActive: false\n        } \n      }\n    ) {\n      userRoleAssignment {\n        id\n        isActive\n        userRoleByRoleId {\n          name\n        }\n        userByUserId {\n          displayName\n          email\n        }\n      }\n    }\n  }\n': typeof types.RevokeUserRoleDocument;
	'\n  query GetWorkflowDefinitions($first: Int = 50) {\n    allWorkflowDefinitions(first: $first, orderBy: [NAME_ASC]) {\n      nodes {\n        id\n        name\n        description\n        category\n        triggerType\n        triggerConditions\n        isTemplate\n        timeoutMinutes\n        maxRetries\n        retryDelayMinutes\n        status\n        version\n        createdAt\n        updatedAt\n        userByCreatedBy {\n          id\n          displayName\n          email\n        }\n        departmentByDepartmentId {\n          id\n          name\n        }\n      }\n      totalCount\n    }\n  }\n': typeof types.GetWorkflowDefinitionsDocument;
	'\n  query GetWorkflowDefinitionById($id: UUID!) {\n    workflowDefinitionById(id: $id) {\n      id\n      name\n      description\n      category\n      triggerType\n      triggerConditions\n      definition\n      isTemplate\n      timeoutMinutes\n      maxRetries\n      retryDelayMinutes\n      status\n      version\n      parentWorkflowId\n      createdBy\n      departmentId\n      createdAt\n      updatedAt\n      userByCreatedBy {\n        id\n        displayName\n        email\n      }\n      departmentByDepartmentId {\n        id\n        name\n      }\n      workflowDefinitionByParentWorkflowId {\n        id\n        name\n      }\n      workflowInstancesByWorkflowDefinitionId(first: 10) {\n        nodes {\n          id\n          status\n          createdAt\n        }\n        totalCount\n      }\n    }\n  }\n': typeof types.GetWorkflowDefinitionByIdDocument;
	'\n  query GetWorkflowInstances($first: Int = 50) {\n    allWorkflowInstances(first: $first) {\n      nodes {\n        id\n        workflowDefinitionId\n        triggerData\n        contextData\n        status\n        completedAt\n        startedAt\n        createdAt\n        updatedAt\n        workflowDefinitionByWorkflowDefinitionId {\n          id\n          name\n          category\n        }\n        userByTriggeredByUserId {\n          id\n          displayName\n          email\n        }\n      }\n      totalCount\n    }\n  }\n': typeof types.GetWorkflowInstancesDocument;
	'\n  query GetWorkflowTasks($first: Int = 50, $condition: WorkflowTaskCondition) {\n    allWorkflowTasks(first: $first, condition: $condition) {\n      nodes {\n        id\n        workflowInstanceId\n        taskType\n        title\n        description\n        assignedToId\n        status\n        priority\n        dueDate\n        completedAt\n        createdAt\n        workflowInstanceByWorkflowInstanceId {\n          id\n          workflowDefinitionByWorkflowDefinitionId {\n            name\n            category\n          }\n        }\n        userByAssignedToId {\n          id\n          displayName\n          email\n        }\n      }\n      totalCount\n    }\n  }\n': typeof types.GetWorkflowTasksDocument;
	'\n  mutation CreateWorkflowDefinition($input: CreateWorkflowDefinitionInput!) {\n    createWorkflowDefinition(input: $input) {\n      workflowDefinition {\n        id\n        name\n        description\n        category\n        triggerType\n        triggerConditions\n        definition\n        isTemplate\n        timeoutMinutes\n        maxRetries\n        retryDelayMinutes\n        status\n        version\n        createdAt\n        userByCreatedBy {\n          id\n          displayName\n          email\n        }\n      }\n    }\n  }\n': typeof types.CreateWorkflowDefinitionDocument;
	'\n  mutation UpdateWorkflowDefinition($id: UUID!, $patch: WorkflowDefinitionPatch!) {\n    updateWorkflowDefinitionById(input: { id: $id, workflowDefinitionPatch: $patch }) {\n      workflowDefinition {\n        id\n        name\n        description\n        category\n        triggerType\n        triggerConditions\n        definition\n        status\n        version\n        updatedAt\n      }\n    }\n  }\n': typeof types.UpdateWorkflowDefinitionDocument;
	'\n  mutation StartWorkflowInstance($input: CreateWorkflowInstanceInput!) {\n    createWorkflowInstance(input: $input) {\n      workflowInstance {\n        id\n        workflowDefinitionId\n        triggerData\n        contextData\n        status\n        createdAt\n        workflowDefinitionByWorkflowDefinitionId {\n          name\n          category\n        }\n      }\n    }\n  }\n': typeof types.StartWorkflowInstanceDocument;
	'\n  mutation UpdateWorkflowTask($id: UUID!, $patch: WorkflowTaskPatch!) {\n    updateWorkflowTaskById(input: { id: $id, workflowTaskPatch: $patch }) {\n      workflowTask {\n        id\n        status\n        completedAt\n        updatedAt\n      }\n    }\n  }\n': typeof types.UpdateWorkflowTaskDocument;
	'\n  query GetAuditLogs($first: Int = 50, $orderBy: [AuditLogsOrderBy!] = [ID_DESC]) {\n    allAuditLogs(first: $first, orderBy: $orderBy) {\n      nodes {\n        id\n        actionType\n        tableName\n        recordId\n        oldValues\n        newValues\n        ipAddress\n        userAgent\n        createdAt\n        userId\n        sessionId\n        userByUserId {\n          id\n          displayName\n          email\n        }\n        userSessionBySessionId {\n          id\n          userAgent\n          ipAddress\n        }\n      }\n      totalCount\n    }\n  }\n': typeof types.GetAuditLogsDocument;
	'\n  query GetAuditLogById($id: UUID!) {\n    auditLogById(id: $id) {\n      id\n      actionType\n      tableName\n      recordId\n      oldValues\n      newValues\n      ipAddress\n      userAgent\n      createdAt\n      userId\n      sessionId\n      changedFields\n      containsPii\n      dataClassification\n      legalBasis\n      userByUserId {\n        id\n        displayName\n        email\n      }\n      userSessionBySessionId {\n        id\n        userAgent\n        ipAddress\n      }\n    }\n  }\n': typeof types.GetAuditLogByIdDocument;
	'\n  query GetSecurityEvents($first: Int = 50, $orderBy: [SecurityEventsOrderBy!] = [ID_DESC]) {\n    allSecurityEvents(first: $first, orderBy: $orderBy) {\n      nodes {\n        id\n        eventType\n        eventMessage\n        eventCategory\n        ipAddress\n        isSuspicious\n        riskScore\n        createdAt\n        userId\n        sessionId\n        eventData\n        requiresInvestigation\n        autoResolved\n        resolvedAt\n        resolvedBy\n        userAgent\n        userByUserId {\n          id\n          displayName\n          email\n        }\n      }\n      totalCount\n    }\n  }\n': typeof types.GetSecurityEventsDocument;
	'\n  query GetSuspiciousActivities($first: Int = 50) {\n    allSecurityEvents(\n      first: $first\n      orderBy: [RISK_SCORE_DESC]\n    ) {\n      nodes {\n        id\n        eventType\n        eventMessage\n        eventCategory\n        ipAddress\n        isSuspicious\n        riskScore\n        createdAt\n        userId\n        sessionId\n        eventData\n        requiresInvestigation\n        userAgent\n        userByUserId {\n          id\n          displayName\n          email\n        }\n      }\n      totalCount\n    }\n  }\n': typeof types.GetSuspiciousActivitiesDocument;
	'\n  query GetUserActivityLog($userId: UUID!, $first: Int = 50) {\n    userById(id: $userId) {\n      auditLogsByUserId(\n        first: $first\n        orderBy: [ID_DESC]\n      ) {\n        nodes {\n          id\n          actionType\n          tableName\n          recordId\n          oldValues\n          newValues\n          ipAddress\n          createdAt\n          changedFields\n          containsPii\n        }\n        totalCount\n      }\n    }\n  }\n': typeof types.GetUserActivityLogDocument;
	'\n  query GetSecurityMetrics {\n    totalUsers: allUsers {\n      totalCount\n    }\n    \n    recentSecurityEvents: allSecurityEvents(first: 1000) {\n      totalCount\n      nodes {\n        eventType\n        isSuspicious\n        riskScore\n        createdAt\n      }\n    }\n    \n    recentAuditLogs: allAuditLogs(first: 1000) {\n      totalCount\n      nodes {\n        actionType\n        tableName\n        createdAt\n        containsPii\n      }\n    }\n  }\n': typeof types.GetSecurityMetricsDocument;
};
const documents: Documents = {
	'\n  mutation AuthenticateUser($email: String!, $password: String!) {\n    authenticate(input: { email: $email, password: $password }) {\n      jwtToken\n      query {\n        currentUserId\n      }\n    }\n  }\n':
		types.AuthenticateUserDocument,
	'\n  query GetCurrentUser {\n    currentUserId\n  }\n': types.GetCurrentUserDocument,
	'\n  query GetUserById($id: UUID!) {\n    userById(id: $id) {\n      id\n      email\n      displayName\n      onboardingStatus\n      createdAt\n      lastLogin\n      isActive\n    }\n  }\n':
		types.GetUserByIdDocument,
	'\n  query GetAllUsers($first: Int = 50) {\n    allUsers(first: $first) {\n      nodes {\n        id\n        email\n        displayName\n        onboardingStatus\n        createdAt\n        lastLogin\n        isActive\n      }\n      totalCount\n    }\n  }\n':
		types.GetAllUsersDocument,
	'\n  query GetAllDepartments {\n    allDepartments {\n      nodes {\n        id\n        name\n        description\n        parentDepartmentId\n        createdAt\n        updatedAt\n      }\n      totalCount\n    }\n  }\n':
		types.GetAllDepartmentsDocument,
	'\n  query GetDepartmentById($id: UUID!) {\n    departmentById(id: $id) {\n      id\n      name\n      description\n      parentDepartmentId\n      createdAt\n      updatedAt\n    }\n  }\n':
		types.GetDepartmentByIdDocument,
	'\n  mutation UpdateUser($id: UUID!, $patch: UserPatch!) {\n    updateUserById(input: { id: $id, userPatch: $patch }) {\n      user {\n        id\n        email\n        displayName\n        onboardingStatus\n        updatedAt\n      }\n    }\n  }\n':
		types.UpdateUserDocument,
	'\n  query GetAllRoles {\n    allUserRoles(orderBy: NAME_ASC) {\n      nodes {\n        id\n        name\n        description\n        level\n        isActive\n        createdAt\n      }\n    }\n  }\n':
		types.GetAllRolesDocument,
	'\n  query GetUserRoles($userId: UUID!) {\n    allUserRoleAssignments(condition: { userId: $userId }) {\n      nodes {\n        id\n        userId\n        roleId\n        assignedBy\n        isActive\n        validFrom\n        validUntil\n        createdAt\n        userRoleByRoleId {\n          id\n          name\n          description\n          level\n        }\n        userByUserId {\n          id\n          displayName\n          email\n        }\n        userByAssignedBy {\n          id\n          displayName\n          email\n        }\n      }\n    }\n  }\n':
		types.GetUserRolesDocument,
	'\n  mutation AssignUserRole($input: CreateUserRoleAssignmentInput!) {\n    createUserRoleAssignment(input: $input) {\n      userRoleAssignment {\n        id\n        userId\n        roleId\n        assignedBy\n        isActive\n        validFrom\n        validUntil\n        createdAt\n        userRoleByRoleId {\n          id\n          name\n          description\n          level\n        }\n        userByUserId {\n          id\n          displayName\n          email\n        }\n      }\n    }\n  }\n':
		types.AssignUserRoleDocument,
	'\n  mutation UpdateUserRoleAssignment($id: UUID!, $patch: UserRoleAssignmentPatch!) {\n    updateUserRoleAssignmentById(input: { id: $id, userRoleAssignmentPatch: $patch }) {\n      userRoleAssignment {\n        id\n        isActive\n        validUntil\n        userRoleByRoleId {\n          name\n          level\n        }\n      }\n    }\n  }\n':
		types.UpdateUserRoleAssignmentDocument,
	'\n  mutation RevokeUserRole($id: UUID!) {\n    updateUserRoleAssignmentById(\n      input: { \n        id: $id, \n        userRoleAssignmentPatch: { \n          isActive: false\n        } \n      }\n    ) {\n      userRoleAssignment {\n        id\n        isActive\n        userRoleByRoleId {\n          name\n        }\n        userByUserId {\n          displayName\n          email\n        }\n      }\n    }\n  }\n':
		types.RevokeUserRoleDocument,
	'\n  query GetWorkflowDefinitions($first: Int = 50) {\n    allWorkflowDefinitions(first: $first, orderBy: [NAME_ASC]) {\n      nodes {\n        id\n        name\n        description\n        category\n        triggerType\n        triggerConditions\n        isTemplate\n        timeoutMinutes\n        maxRetries\n        retryDelayMinutes\n        status\n        version\n        createdAt\n        updatedAt\n        userByCreatedBy {\n          id\n          displayName\n          email\n        }\n        departmentByDepartmentId {\n          id\n          name\n        }\n      }\n      totalCount\n    }\n  }\n':
		types.GetWorkflowDefinitionsDocument,
	'\n  query GetWorkflowDefinitionById($id: UUID!) {\n    workflowDefinitionById(id: $id) {\n      id\n      name\n      description\n      category\n      triggerType\n      triggerConditions\n      definition\n      isTemplate\n      timeoutMinutes\n      maxRetries\n      retryDelayMinutes\n      status\n      version\n      parentWorkflowId\n      createdBy\n      departmentId\n      createdAt\n      updatedAt\n      userByCreatedBy {\n        id\n        displayName\n        email\n      }\n      departmentByDepartmentId {\n        id\n        name\n      }\n      workflowDefinitionByParentWorkflowId {\n        id\n        name\n      }\n      workflowInstancesByWorkflowDefinitionId(first: 10) {\n        nodes {\n          id\n          status\n          createdAt\n        }\n        totalCount\n      }\n    }\n  }\n':
		types.GetWorkflowDefinitionByIdDocument,
	'\n  query GetWorkflowInstances($first: Int = 50) {\n    allWorkflowInstances(first: $first) {\n      nodes {\n        id\n        workflowDefinitionId\n        triggerData\n        contextData\n        status\n        completedAt\n        startedAt\n        createdAt\n        updatedAt\n        workflowDefinitionByWorkflowDefinitionId {\n          id\n          name\n          category\n        }\n        userByTriggeredByUserId {\n          id\n          displayName\n          email\n        }\n      }\n      totalCount\n    }\n  }\n':
		types.GetWorkflowInstancesDocument,
	'\n  query GetWorkflowTasks($first: Int = 50, $condition: WorkflowTaskCondition) {\n    allWorkflowTasks(first: $first, condition: $condition) {\n      nodes {\n        id\n        workflowInstanceId\n        taskType\n        title\n        description\n        assignedToId\n        status\n        priority\n        dueDate\n        completedAt\n        createdAt\n        workflowInstanceByWorkflowInstanceId {\n          id\n          workflowDefinitionByWorkflowDefinitionId {\n            name\n            category\n          }\n        }\n        userByAssignedToId {\n          id\n          displayName\n          email\n        }\n      }\n      totalCount\n    }\n  }\n':
		types.GetWorkflowTasksDocument,
	'\n  mutation CreateWorkflowDefinition($input: CreateWorkflowDefinitionInput!) {\n    createWorkflowDefinition(input: $input) {\n      workflowDefinition {\n        id\n        name\n        description\n        category\n        triggerType\n        triggerConditions\n        definition\n        isTemplate\n        timeoutMinutes\n        maxRetries\n        retryDelayMinutes\n        status\n        version\n        createdAt\n        userByCreatedBy {\n          id\n          displayName\n          email\n        }\n      }\n    }\n  }\n':
		types.CreateWorkflowDefinitionDocument,
	'\n  mutation UpdateWorkflowDefinition($id: UUID!, $patch: WorkflowDefinitionPatch!) {\n    updateWorkflowDefinitionById(input: { id: $id, workflowDefinitionPatch: $patch }) {\n      workflowDefinition {\n        id\n        name\n        description\n        category\n        triggerType\n        triggerConditions\n        definition\n        status\n        version\n        updatedAt\n      }\n    }\n  }\n':
		types.UpdateWorkflowDefinitionDocument,
	'\n  mutation StartWorkflowInstance($input: CreateWorkflowInstanceInput!) {\n    createWorkflowInstance(input: $input) {\n      workflowInstance {\n        id\n        workflowDefinitionId\n        triggerData\n        contextData\n        status\n        createdAt\n        workflowDefinitionByWorkflowDefinitionId {\n          name\n          category\n        }\n      }\n    }\n  }\n':
		types.StartWorkflowInstanceDocument,
	'\n  mutation UpdateWorkflowTask($id: UUID!, $patch: WorkflowTaskPatch!) {\n    updateWorkflowTaskById(input: { id: $id, workflowTaskPatch: $patch }) {\n      workflowTask {\n        id\n        status\n        completedAt\n        updatedAt\n      }\n    }\n  }\n':
		types.UpdateWorkflowTaskDocument,
	'\n  query GetAuditLogs($first: Int = 50, $orderBy: [AuditLogsOrderBy!] = [ID_DESC]) {\n    allAuditLogs(first: $first, orderBy: $orderBy) {\n      nodes {\n        id\n        actionType\n        tableName\n        recordId\n        oldValues\n        newValues\n        ipAddress\n        userAgent\n        createdAt\n        userId\n        sessionId\n        userByUserId {\n          id\n          displayName\n          email\n        }\n        userSessionBySessionId {\n          id\n          userAgent\n          ipAddress\n        }\n      }\n      totalCount\n    }\n  }\n':
		types.GetAuditLogsDocument,
	'\n  query GetAuditLogById($id: UUID!) {\n    auditLogById(id: $id) {\n      id\n      actionType\n      tableName\n      recordId\n      oldValues\n      newValues\n      ipAddress\n      userAgent\n      createdAt\n      userId\n      sessionId\n      changedFields\n      containsPii\n      dataClassification\n      legalBasis\n      userByUserId {\n        id\n        displayName\n        email\n      }\n      userSessionBySessionId {\n        id\n        userAgent\n        ipAddress\n      }\n    }\n  }\n':
		types.GetAuditLogByIdDocument,
	'\n  query GetSecurityEvents($first: Int = 50, $orderBy: [SecurityEventsOrderBy!] = [ID_DESC]) {\n    allSecurityEvents(first: $first, orderBy: $orderBy) {\n      nodes {\n        id\n        eventType\n        eventMessage\n        eventCategory\n        ipAddress\n        isSuspicious\n        riskScore\n        createdAt\n        userId\n        sessionId\n        eventData\n        requiresInvestigation\n        autoResolved\n        resolvedAt\n        resolvedBy\n        userAgent\n        userByUserId {\n          id\n          displayName\n          email\n        }\n      }\n      totalCount\n    }\n  }\n':
		types.GetSecurityEventsDocument,
	'\n  query GetSuspiciousActivities($first: Int = 50) {\n    allSecurityEvents(\n      first: $first\n      orderBy: [RISK_SCORE_DESC]\n    ) {\n      nodes {\n        id\n        eventType\n        eventMessage\n        eventCategory\n        ipAddress\n        isSuspicious\n        riskScore\n        createdAt\n        userId\n        sessionId\n        eventData\n        requiresInvestigation\n        userAgent\n        userByUserId {\n          id\n          displayName\n          email\n        }\n      }\n      totalCount\n    }\n  }\n':
		types.GetSuspiciousActivitiesDocument,
	'\n  query GetUserActivityLog($userId: UUID!, $first: Int = 50) {\n    userById(id: $userId) {\n      auditLogsByUserId(\n        first: $first\n        orderBy: [ID_DESC]\n      ) {\n        nodes {\n          id\n          actionType\n          tableName\n          recordId\n          oldValues\n          newValues\n          ipAddress\n          createdAt\n          changedFields\n          containsPii\n        }\n        totalCount\n      }\n    }\n  }\n':
		types.GetUserActivityLogDocument,
	'\n  query GetSecurityMetrics {\n    totalUsers: allUsers {\n      totalCount\n    }\n    \n    recentSecurityEvents: allSecurityEvents(first: 1000) {\n      totalCount\n      nodes {\n        eventType\n        isSuspicious\n        riskScore\n        createdAt\n      }\n    }\n    \n    recentAuditLogs: allAuditLogs(first: 1000) {\n      totalCount\n      nodes {\n        actionType\n        tableName\n        createdAt\n        containsPii\n      }\n    }\n  }\n':
		types.GetSecurityMetricsDocument
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  mutation AuthenticateUser($email: String!, $password: String!) {\n    authenticate(input: { email: $email, password: $password }) {\n      jwtToken\n      query {\n        currentUserId\n      }\n    }\n  }\n'
): typeof import('./graphql').AuthenticateUserDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  query GetCurrentUser {\n    currentUserId\n  }\n'
): typeof import('./graphql').GetCurrentUserDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  query GetUserById($id: UUID!) {\n    userById(id: $id) {\n      id\n      email\n      displayName\n      onboardingStatus\n      createdAt\n      lastLogin\n      isActive\n    }\n  }\n'
): typeof import('./graphql').GetUserByIdDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  query GetAllUsers($first: Int = 50) {\n    allUsers(first: $first) {\n      nodes {\n        id\n        email\n        displayName\n        onboardingStatus\n        createdAt\n        lastLogin\n        isActive\n      }\n      totalCount\n    }\n  }\n'
): typeof import('./graphql').GetAllUsersDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  query GetAllDepartments {\n    allDepartments {\n      nodes {\n        id\n        name\n        description\n        parentDepartmentId\n        createdAt\n        updatedAt\n      }\n      totalCount\n    }\n  }\n'
): typeof import('./graphql').GetAllDepartmentsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  query GetDepartmentById($id: UUID!) {\n    departmentById(id: $id) {\n      id\n      name\n      description\n      parentDepartmentId\n      createdAt\n      updatedAt\n    }\n  }\n'
): typeof import('./graphql').GetDepartmentByIdDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  mutation UpdateUser($id: UUID!, $patch: UserPatch!) {\n    updateUserById(input: { id: $id, userPatch: $patch }) {\n      user {\n        id\n        email\n        displayName\n        onboardingStatus\n        updatedAt\n      }\n    }\n  }\n'
): typeof import('./graphql').UpdateUserDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  query GetAllRoles {\n    allUserRoles(orderBy: NAME_ASC) {\n      nodes {\n        id\n        name\n        description\n        level\n        isActive\n        createdAt\n      }\n    }\n  }\n'
): typeof import('./graphql').GetAllRolesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  query GetUserRoles($userId: UUID!) {\n    allUserRoleAssignments(condition: { userId: $userId }) {\n      nodes {\n        id\n        userId\n        roleId\n        assignedBy\n        isActive\n        validFrom\n        validUntil\n        createdAt\n        userRoleByRoleId {\n          id\n          name\n          description\n          level\n        }\n        userByUserId {\n          id\n          displayName\n          email\n        }\n        userByAssignedBy {\n          id\n          displayName\n          email\n        }\n      }\n    }\n  }\n'
): typeof import('./graphql').GetUserRolesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  mutation AssignUserRole($input: CreateUserRoleAssignmentInput!) {\n    createUserRoleAssignment(input: $input) {\n      userRoleAssignment {\n        id\n        userId\n        roleId\n        assignedBy\n        isActive\n        validFrom\n        validUntil\n        createdAt\n        userRoleByRoleId {\n          id\n          name\n          description\n          level\n        }\n        userByUserId {\n          id\n          displayName\n          email\n        }\n      }\n    }\n  }\n'
): typeof import('./graphql').AssignUserRoleDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  mutation UpdateUserRoleAssignment($id: UUID!, $patch: UserRoleAssignmentPatch!) {\n    updateUserRoleAssignmentById(input: { id: $id, userRoleAssignmentPatch: $patch }) {\n      userRoleAssignment {\n        id\n        isActive\n        validUntil\n        userRoleByRoleId {\n          name\n          level\n        }\n      }\n    }\n  }\n'
): typeof import('./graphql').UpdateUserRoleAssignmentDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  mutation RevokeUserRole($id: UUID!) {\n    updateUserRoleAssignmentById(\n      input: { \n        id: $id, \n        userRoleAssignmentPatch: { \n          isActive: false\n        } \n      }\n    ) {\n      userRoleAssignment {\n        id\n        isActive\n        userRoleByRoleId {\n          name\n        }\n        userByUserId {\n          displayName\n          email\n        }\n      }\n    }\n  }\n'
): typeof import('./graphql').RevokeUserRoleDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  query GetWorkflowDefinitions($first: Int = 50) {\n    allWorkflowDefinitions(first: $first, orderBy: [NAME_ASC]) {\n      nodes {\n        id\n        name\n        description\n        category\n        triggerType\n        triggerConditions\n        isTemplate\n        timeoutMinutes\n        maxRetries\n        retryDelayMinutes\n        status\n        version\n        createdAt\n        updatedAt\n        userByCreatedBy {\n          id\n          displayName\n          email\n        }\n        departmentByDepartmentId {\n          id\n          name\n        }\n      }\n      totalCount\n    }\n  }\n'
): typeof import('./graphql').GetWorkflowDefinitionsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  query GetWorkflowDefinitionById($id: UUID!) {\n    workflowDefinitionById(id: $id) {\n      id\n      name\n      description\n      category\n      triggerType\n      triggerConditions\n      definition\n      isTemplate\n      timeoutMinutes\n      maxRetries\n      retryDelayMinutes\n      status\n      version\n      parentWorkflowId\n      createdBy\n      departmentId\n      createdAt\n      updatedAt\n      userByCreatedBy {\n        id\n        displayName\n        email\n      }\n      departmentByDepartmentId {\n        id\n        name\n      }\n      workflowDefinitionByParentWorkflowId {\n        id\n        name\n      }\n      workflowInstancesByWorkflowDefinitionId(first: 10) {\n        nodes {\n          id\n          status\n          createdAt\n        }\n        totalCount\n      }\n    }\n  }\n'
): typeof import('./graphql').GetWorkflowDefinitionByIdDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  query GetWorkflowInstances($first: Int = 50) {\n    allWorkflowInstances(first: $first) {\n      nodes {\n        id\n        workflowDefinitionId\n        triggerData\n        contextData\n        status\n        completedAt\n        startedAt\n        createdAt\n        updatedAt\n        workflowDefinitionByWorkflowDefinitionId {\n          id\n          name\n          category\n        }\n        userByTriggeredByUserId {\n          id\n          displayName\n          email\n        }\n      }\n      totalCount\n    }\n  }\n'
): typeof import('./graphql').GetWorkflowInstancesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  query GetWorkflowTasks($first: Int = 50, $condition: WorkflowTaskCondition) {\n    allWorkflowTasks(first: $first, condition: $condition) {\n      nodes {\n        id\n        workflowInstanceId\n        taskType\n        title\n        description\n        assignedToId\n        status\n        priority\n        dueDate\n        completedAt\n        createdAt\n        workflowInstanceByWorkflowInstanceId {\n          id\n          workflowDefinitionByWorkflowDefinitionId {\n            name\n            category\n          }\n        }\n        userByAssignedToId {\n          id\n          displayName\n          email\n        }\n      }\n      totalCount\n    }\n  }\n'
): typeof import('./graphql').GetWorkflowTasksDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  mutation CreateWorkflowDefinition($input: CreateWorkflowDefinitionInput!) {\n    createWorkflowDefinition(input: $input) {\n      workflowDefinition {\n        id\n        name\n        description\n        category\n        triggerType\n        triggerConditions\n        definition\n        isTemplate\n        timeoutMinutes\n        maxRetries\n        retryDelayMinutes\n        status\n        version\n        createdAt\n        userByCreatedBy {\n          id\n          displayName\n          email\n        }\n      }\n    }\n  }\n'
): typeof import('./graphql').CreateWorkflowDefinitionDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  mutation UpdateWorkflowDefinition($id: UUID!, $patch: WorkflowDefinitionPatch!) {\n    updateWorkflowDefinitionById(input: { id: $id, workflowDefinitionPatch: $patch }) {\n      workflowDefinition {\n        id\n        name\n        description\n        category\n        triggerType\n        triggerConditions\n        definition\n        status\n        version\n        updatedAt\n      }\n    }\n  }\n'
): typeof import('./graphql').UpdateWorkflowDefinitionDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  mutation StartWorkflowInstance($input: CreateWorkflowInstanceInput!) {\n    createWorkflowInstance(input: $input) {\n      workflowInstance {\n        id\n        workflowDefinitionId\n        triggerData\n        contextData\n        status\n        createdAt\n        workflowDefinitionByWorkflowDefinitionId {\n          name\n          category\n        }\n      }\n    }\n  }\n'
): typeof import('./graphql').StartWorkflowInstanceDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  mutation UpdateWorkflowTask($id: UUID!, $patch: WorkflowTaskPatch!) {\n    updateWorkflowTaskById(input: { id: $id, workflowTaskPatch: $patch }) {\n      workflowTask {\n        id\n        status\n        completedAt\n        updatedAt\n      }\n    }\n  }\n'
): typeof import('./graphql').UpdateWorkflowTaskDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  query GetAuditLogs($first: Int = 50, $orderBy: [AuditLogsOrderBy!] = [ID_DESC]) {\n    allAuditLogs(first: $first, orderBy: $orderBy) {\n      nodes {\n        id\n        actionType\n        tableName\n        recordId\n        oldValues\n        newValues\n        ipAddress\n        userAgent\n        createdAt\n        userId\n        sessionId\n        userByUserId {\n          id\n          displayName\n          email\n        }\n        userSessionBySessionId {\n          id\n          userAgent\n          ipAddress\n        }\n      }\n      totalCount\n    }\n  }\n'
): typeof import('./graphql').GetAuditLogsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  query GetAuditLogById($id: UUID!) {\n    auditLogById(id: $id) {\n      id\n      actionType\n      tableName\n      recordId\n      oldValues\n      newValues\n      ipAddress\n      userAgent\n      createdAt\n      userId\n      sessionId\n      changedFields\n      containsPii\n      dataClassification\n      legalBasis\n      userByUserId {\n        id\n        displayName\n        email\n      }\n      userSessionBySessionId {\n        id\n        userAgent\n        ipAddress\n      }\n    }\n  }\n'
): typeof import('./graphql').GetAuditLogByIdDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  query GetSecurityEvents($first: Int = 50, $orderBy: [SecurityEventsOrderBy!] = [ID_DESC]) {\n    allSecurityEvents(first: $first, orderBy: $orderBy) {\n      nodes {\n        id\n        eventType\n        eventMessage\n        eventCategory\n        ipAddress\n        isSuspicious\n        riskScore\n        createdAt\n        userId\n        sessionId\n        eventData\n        requiresInvestigation\n        autoResolved\n        resolvedAt\n        resolvedBy\n        userAgent\n        userByUserId {\n          id\n          displayName\n          email\n        }\n      }\n      totalCount\n    }\n  }\n'
): typeof import('./graphql').GetSecurityEventsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  query GetSuspiciousActivities($first: Int = 50) {\n    allSecurityEvents(\n      first: $first\n      orderBy: [RISK_SCORE_DESC]\n    ) {\n      nodes {\n        id\n        eventType\n        eventMessage\n        eventCategory\n        ipAddress\n        isSuspicious\n        riskScore\n        createdAt\n        userId\n        sessionId\n        eventData\n        requiresInvestigation\n        userAgent\n        userByUserId {\n          id\n          displayName\n          email\n        }\n      }\n      totalCount\n    }\n  }\n'
): typeof import('./graphql').GetSuspiciousActivitiesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  query GetUserActivityLog($userId: UUID!, $first: Int = 50) {\n    userById(id: $userId) {\n      auditLogsByUserId(\n        first: $first\n        orderBy: [ID_DESC]\n      ) {\n        nodes {\n          id\n          actionType\n          tableName\n          recordId\n          oldValues\n          newValues\n          ipAddress\n          createdAt\n          changedFields\n          containsPii\n        }\n        totalCount\n      }\n    }\n  }\n'
): typeof import('./graphql').GetUserActivityLogDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
	source: '\n  query GetSecurityMetrics {\n    totalUsers: allUsers {\n      totalCount\n    }\n    \n    recentSecurityEvents: allSecurityEvents(first: 1000) {\n      totalCount\n      nodes {\n        eventType\n        isSuspicious\n        riskScore\n        createdAt\n      }\n    }\n    \n    recentAuditLogs: allAuditLogs(first: 1000) {\n      totalCount\n      nodes {\n        actionType\n        tableName\n        createdAt\n        containsPii\n      }\n    }\n  }\n'
): typeof import('./graphql').GetSecurityMetricsDocument;

export function graphql(source: string) {
	return (documents as any)[source] ?? {};
}
