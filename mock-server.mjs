/**
 * Mock GraphQL server for SvelteHR testing
 * Responds to all GraphQL queries/mutations with realistic mock data
 */
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import jwt from 'jsonwebtoken';

const PORT = 4000;

// Load RSA keys for JWT
const JWT_PRIVATE_KEY = fs.readFileSync('/tmp/jwt_private.pem', 'utf-8');
const JWT_PUBLIC_KEY = fs.readFileSync('/tmp/jwt_public.pem', 'utf-8');

// UUIDs for consistent mock data
const ADMIN_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const DEPT_ENGINEERING_ID = '550e8400-e29b-41d4-a716-446655440010';
const DEPT_HR_ID = '550e8400-e29b-41d4-a716-446655440011';
const DEPT_MARKETING_ID = '550e8400-e29b-41d4-a716-446655440012';
const TASK1_ID = '550e8400-e29b-41d4-a716-446655440020';
const TASK2_ID = '550e8400-e29b-41d4-a716-446655440021';
const TASK3_ID = '550e8400-e29b-41d4-a716-446655440022';
const EVENT1_ID = '550e8400-e29b-41d4-a716-446655440030';
const EVENT2_ID = '550e8400-e29b-41d4-a716-446655440031';
const DOC1_ID = '550e8400-e29b-41d4-a716-446655440040';
const USER2_ID = '550e8400-e29b-41d4-a716-446655440002';
const USER3_ID = '550e8400-e29b-41d4-a716-446655440003';
const NOTIFICATION1_ID = '550e8400-e29b-41d4-a716-446655440050';
const REVIEW1_ID = '550e8400-e29b-41d4-a716-446655440060';
const TASKTYPE1_ID = '550e8400-e29b-41d4-a716-446655440070';

const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();
const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString();

function generateAccessToken(userId = ADMIN_USER_ID) {
  return jwt.sign({
    sub: userId,
    user_id: userId,
    email: 'admin@sveltehr.com',
    roles: ['admin', 'hr_manager'],
    permissions: [
      'employees:read', 'employees:write', 'employees:delete',
      'departments:read', 'departments:write', 'departments:delete',
      'tasks:read', 'tasks:write', 'tasks:delete',
      'events:read', 'events:write', 'events:delete',
      'documents:read', 'documents:write', 'documents:delete',
      'admin:read', 'admin:write',
      'reports:read', 'reports:write',
      'reviews:read', 'reviews:write',
      'leave:read', 'leave:write', 'leave:approve',
      'onboarding:read', 'onboarding:write',
      'training:read', 'training:write',
      'compliance:read', 'compliance:write',
      'notifications:read', 'notifications:write',
      'settings:read', 'settings:write',
      'audit:read', 'users:read', 'users:write',
      'permissions:read', 'permissions:write',
      'sidebar:dashboard', 'sidebar:employees', 'sidebar:departments',
      'sidebar:tasks', 'sidebar:events', 'sidebar:documents',
      'sidebar:reviews', 'sidebar:training', 'sidebar:onboarding',
      'sidebar:admin', 'sidebar:settings', 'sidebar:reports',
      'sidebar:leave', 'sidebar:compliance', 'sidebar:management',
      'sidebar:teams', 'sidebar:notifications', 'sidebar:audit'
    ],
    display_name: 'Admin User',
    displayName: 'Admin User',
    department_id: DEPT_ENGINEERING_ID,
    iss: 'sveltehr',
    aud: 'sveltehr-app'
  }, JWT_PRIVATE_KEY, { algorithm: 'RS256', expiresIn: '24h' });
}

// Mock data
const mockUser = (id = ADMIN_USER_ID, overrides = {}) => ({
  id,
  email: overrides.email || 'admin@sveltehr.com',
  firstName: overrides.firstName || 'Admin',
  lastName: overrides.lastName || 'User',
  displayName: overrides.displayName || 'Admin User',
  fullName: overrides.fullName || 'Admin User',
  role: overrides.role || 'admin',
  phone: '555-0100',
  alternatePhone: null,
  jobTitle: overrides.jobTitle || 'System Administrator',
  status: 'active',
  departmentId: overrides.departmentId || DEPT_ENGINEERING_ID,
  managerId: null,
  hireDate: '2024-01-15T00:00:00Z',
  isActive: true,
  themePreference: 'system',
  createdAt: lastMonth,
  updatedAt: now,
  department: overrides.department || { id: DEPT_ENGINEERING_ID, name: 'Engineering', description: 'Software Engineering', employeeCount: 15, managerId: id, createdAt: lastMonth, updatedAt: now },
  manager: null,
  directReports: [],
  addresses: [],
  primaryAddress: null,
  roles: overrides.roles || [{ id: '1', name: 'admin', displayName: 'Administrator', description: 'Full system access', permissions: { nodes: [{ resource: '*', action: '*' }] } }],
  ...overrides
});

const mockUsers = [
  mockUser(ADMIN_USER_ID),
  mockUser(USER2_ID, { firstName: 'Jane', lastName: 'Smith', displayName: 'Jane Smith', fullName: 'Jane Smith', email: 'jane@sveltehr.com', jobTitle: 'HR Manager', role: 'hr_manager', departmentId: DEPT_HR_ID, department: { id: DEPT_HR_ID, name: 'Human Resources', description: 'HR Department', employeeCount: 5, managerId: USER2_ID, createdAt: lastMonth, updatedAt: now } }),
  mockUser(USER3_ID, { firstName: 'Bob', lastName: 'Johnson', displayName: 'Bob Johnson', fullName: 'Bob Johnson', email: 'bob@sveltehr.com', jobTitle: 'Marketing Lead', role: 'employee', departmentId: DEPT_MARKETING_ID, managerId: ADMIN_USER_ID, department: { id: DEPT_MARKETING_ID, name: 'Marketing', description: 'Marketing Department', employeeCount: 8, managerId: USER3_ID, createdAt: lastMonth, updatedAt: now } }),
];

const mockDepartments = [
  { id: DEPT_ENGINEERING_ID, name: 'Engineering', description: 'Software Engineering Department', parentDepartmentId: null, managerId: ADMIN_USER_ID, createdAt: lastMonth, updatedAt: now, manager: mockUsers[0], employees: mockUsers.slice(0, 1), employeeCount: 15 },
  { id: DEPT_HR_ID, name: 'Human Resources', description: 'HR Department', parentDepartmentId: null, managerId: USER2_ID, createdAt: lastMonth, updatedAt: now, manager: mockUsers[1], employees: mockUsers.slice(1, 2), employeeCount: 5 },
  { id: DEPT_MARKETING_ID, name: 'Marketing', description: 'Marketing Department', parentDepartmentId: null, managerId: USER3_ID, createdAt: lastMonth, updatedAt: now, manager: mockUsers[2], employees: mockUsers.slice(2, 3), employeeCount: 8 },
];

const mockTaskTypes = [
  { id: TASKTYPE1_ID, name: 'General', description: 'General tasks', color: '#3B82F6', icon: 'clipboard', isSystem: true, isActive: true, sortOrder: 1, createdAt: lastMonth, updatedAt: now },
];

const mockTasks = [
  { id: TASK1_ID, title: 'Review Q1 Reports', description: 'Review quarterly performance reports', taskTypeId: TASKTYPE1_ID, requiresManualReassignment: false, assigneeId: ADMIN_USER_ID, status: 'IN_PROGRESS', priority: 'HIGH', dueDate: nextWeek, completedAt: null, estimatedHours: 4, actualHours: 2, tags: ['quarterly', 'reports'], departmentId: DEPT_ENGINEERING_ID, creatorId: USER2_ID, parentTaskId: null, archived: false, archivedAt: null, archivedBy: null, createdAt: yesterday, updatedAt: now, deletedAt: null, creator: mockUsers[1], assignee: mockUsers[0], parentTask: null, isOverdue: false, isCompleted: false, isBlocked: false, archivedByUser: null, department: mockDepartments[0], taskType: mockTaskTypes[0], subtasks: [], blocksTasks: [], blockedByTasks: [], hoursUntilDue: 168, progressPercentage: 50, assigneeCount: 1, dependencyCount: 0, resourceCount: 0 },
  { id: TASK2_ID, title: 'Update Employee Handbook', description: 'Annual update of the employee handbook', taskTypeId: TASKTYPE1_ID, requiresManualReassignment: false, assigneeId: USER2_ID, status: 'TODO', priority: 'MEDIUM', dueDate: nextWeek, completedAt: null, estimatedHours: 8, actualHours: 0, tags: ['documentation'], departmentId: DEPT_HR_ID, creatorId: ADMIN_USER_ID, parentTaskId: null, archived: false, archivedAt: null, archivedBy: null, createdAt: yesterday, updatedAt: now, deletedAt: null, creator: mockUsers[0], assignee: mockUsers[1], parentTask: null, isOverdue: false, isCompleted: false, isBlocked: false, archivedByUser: null, department: mockDepartments[1], taskType: mockTaskTypes[0], subtasks: [], blocksTasks: [], blockedByTasks: [], hoursUntilDue: 168, progressPercentage: 0, assigneeCount: 1, dependencyCount: 0, resourceCount: 0 },
  { id: TASK3_ID, title: 'Prepare Marketing Campaign', description: 'Spring marketing campaign preparation', taskTypeId: TASKTYPE1_ID, requiresManualReassignment: false, assigneeId: USER3_ID, status: 'DONE', priority: 'LOW', dueDate: yesterday, completedAt: yesterday, estimatedHours: 12, actualHours: 10, tags: ['marketing', 'campaign'], departmentId: DEPT_MARKETING_ID, creatorId: ADMIN_USER_ID, parentTaskId: null, archived: false, archivedAt: null, archivedBy: null, createdAt: lastMonth, updatedAt: yesterday, deletedAt: null, creator: mockUsers[0], assignee: mockUsers[2], parentTask: null, isOverdue: false, isCompleted: true, isBlocked: false, archivedByUser: null, department: mockDepartments[2], taskType: mockTaskTypes[0], subtasks: [], blocksTasks: [], blockedByTasks: [], hoursUntilDue: null, progressPercentage: 100, assigneeCount: 1, dependencyCount: 0, resourceCount: 0 },
];

const mockEvents = [
  { id: EVENT1_ID, nodeId: 'event1', title: 'Team Standup', description: 'Daily standup meeting', location: 'Conference Room A', startTime: now, endTime: new Date(Date.now() + 3600000).toISOString(), eventType: 'MEETING', isAllDay: false, allDay: false, status: 'SCHEDULED', isPublic: true, color: '#3B82F6', organizerId: ADMIN_USER_ID, createdBy: ADMIN_USER_ID, recurrenceRule: null, recurrencePattern: null, recurrenceEndDate: null, capacity: 20, imageUrl: null, imageAspectRatio: null, createdAt: lastMonth, updatedAt: now, deletedAt: null, organizer: mockUsers[0], creator: mockUsers[0], userByOrganizerId: mockUsers[0], attendees: [], eventAttendeesByEventId: { nodes: [], totalCount: 0 }, attendeeCount: 5, acceptedCount: 4, currentAcceptanceCount: 4, isAtCapacity: false, availableSpots: 15, isRecurring: false },
  { id: EVENT2_ID, nodeId: 'event2', title: 'Company All-Hands', description: 'Monthly all-hands meeting', location: 'Main Auditorium', startTime: nextWeek, endTime: new Date(Date.now() + 8 * 86400000).toISOString(), eventType: 'COMPANY', isAllDay: false, allDay: false, status: 'SCHEDULED', isPublic: true, color: '#10B981', organizerId: USER2_ID, createdBy: USER2_ID, recurrenceRule: null, recurrencePattern: null, recurrenceEndDate: null, capacity: 100, imageUrl: null, imageAspectRatio: null, createdAt: yesterday, updatedAt: now, deletedAt: null, organizer: mockUsers[1], creator: mockUsers[1], userByOrganizerId: mockUsers[1], attendees: [], eventAttendeesByEventId: { nodes: [], totalCount: 0 }, attendeeCount: 45, acceptedCount: 40, currentAcceptanceCount: 40, isAtCapacity: false, availableSpots: 55, isRecurring: false },
];

const mockNotifications = [
  { id: NOTIFICATION1_ID, userId: ADMIN_USER_ID, type: 'TASK_ASSIGNED', title: 'New Task Assigned', message: 'You have been assigned "Review Q1 Reports"', isRead: false, readAt: null, actionUrl: '/dashboard/tasks/' + TASK1_ID, metadata: null, createdAt: yesterday, updatedAt: now },
];

const mockDocuments = [
  { id: DOC1_ID, title: 'Employee Handbook 2025', description: 'Official employee handbook', fileName: 'employee-handbook-2025.pdf', fileType: 'application/pdf', fileSize: 2500000, filePath: '/documents/employee-handbook-2025.pdf', category: 'POLICY', status: 'PUBLISHED', version: '2.0', uploadedBy: USER2_ID, departmentId: DEPT_HR_ID, isConfidential: false, expiresAt: null, tags: ['handbook', 'policy'], createdAt: lastMonth, updatedAt: now, deletedAt: null, uploader: mockUsers[1] },
];

const mockRoles = [
  { id: '1', name: 'admin', displayName: 'Administrator', description: 'Full system access', isSystem: true, createdAt: lastMonth, updatedAt: now, permissions: { nodes: [{ id: '1', resource: '*', action: '*', description: 'Full access' }] } },
  { id: '2', name: 'hr_manager', displayName: 'HR Manager', description: 'HR management access', isSystem: true, createdAt: lastMonth, updatedAt: now, permissions: { nodes: [{ id: '2', resource: 'employees', action: 'read', description: 'Read employees' }] } },
  { id: '3', name: 'employee', displayName: 'Employee', description: 'Basic employee access', isSystem: true, createdAt: lastMonth, updatedAt: now, permissions: { nodes: [{ id: '3', resource: 'profile', action: 'read', description: 'Read own profile' }] } },
];

const mockSystemSettings = [
  { key: 'company_name', value: 'SvelteHR Demo', category: 'general', description: 'Company name', updatedAt: now },
  { key: 'theme', value: 'light', category: 'appearance', description: 'Default theme', updatedAt: now },
  { key: 'timezone', value: 'America/Denver', category: 'general', description: 'Default timezone', updatedAt: now },
];

const mockLeaveTypes = [
  { id: '1', name: 'Annual Leave', description: 'Paid annual leave', defaultDays: 20, isActive: true, createdAt: lastMonth, updatedAt: now },
  { id: '2', name: 'Sick Leave', description: 'Paid sick leave', defaultDays: 10, isActive: true, createdAt: lastMonth, updatedAt: now },
];

// Resolve GraphQL queries based on operation name and query content
function resolveQuery(body) {
  const { query, operationName, variables } = body;
  const q = (query || '').toLowerCase();
  const op = (operationName || '').toLowerCase();

  // Introspection
  if (q.includes('__schema') || q.includes('__type')) {
    // Return the full introspection schema
    try {
      const schema = JSON.parse(fs.readFileSync('/home/user/workspace/sveltehr/rust_schema_introspection.json', 'utf-8'));
      return { data: schema.data || schema };
    } catch {
      return { data: { __schema: { types: [] } } };
    }
  }

  // Auth operations
  if (q.includes('authenticate') || q.includes('login') || op.includes('login')) {
    const token = generateAccessToken();
    return { data: { authenticate: { jwtToken: token, refreshToken: crypto.randomUUID(), user: mockUsers[0], expiresAt: new Date(Date.now() + 900000).toISOString(), sessionInfo: { sessionId: crypto.randomUUID(), deviceInfo: { userAgent: 'mock', platform: 'mock', browser: 'mock', ipAddress: '127.0.0.1' }, location: { country: 'US', city: 'Denver', timezone: 'America/Denver' } } }, login: { jwtToken: token, refreshToken: crypto.randomUUID(), user: mockUsers[0], expiresAt: new Date(Date.now() + 900000).toISOString() } } };
  }

  if (q.includes('refreshtoken') || q.includes('refreshsession') || op.includes('refresh')) {
    const token = generateAccessToken();
    return { data: { refreshToken: { jwtToken: token, refreshToken: crypto.randomUUID(), expiresAt: new Date(Date.now() + 900000).toISOString(), user: mockUsers[0] }, refreshSession: { jwtToken: token, refreshToken: crypto.randomUUID(), expiresAt: new Date(Date.now() + 900000).toISOString(), user: mockUsers[0] } } };
  }

  if (q.includes('logout') || op.includes('logout')) {
    return { data: { logout: { success: true } } };
  }

  // Me / current user
  if (op.includes('getme') || op.includes('currentuser') || op.includes('myprofile') || op.includes('getusersettings') || op.includes('getuserprofile') || (q.includes('{ me {') || q.includes('{ me{'))) {
    return { data: { me: mockUsers[0] } };
  }

  if (q.includes('authstatus') || op.includes('authstatus')) {
    return { data: { authStatus: { authenticated: true, userId: ADMIN_USER_ID, roles: ['admin'], permissions: ['*:*'] } } };
  }

  if (q.includes('mysession') || op.includes('mysession')) {
    return { data: { mySession: { userId: ADMIN_USER_ID, email: 'admin@sveltehr.com', roles: ['admin'] } } };
  }

  // Users
  if ((q.includes('query') && q.includes('users')) || op.includes('getusers') || op.includes('listusers') || op.includes('allusers') || op.includes('fetchusers')) {
    return { data: { users: mockUsers } };
  }
  if (op.includes('getuser') || (q.includes('user(') && !q.includes('users'))) {
    const id = variables?.id || ADMIN_USER_ID;
    return { data: { user: mockUsers.find(u => u.id === id) || mockUsers[0] } };
  }

  // Departments
  if (q.includes('departments') || op.includes('department')) {
    if (q.includes('department(') && variables?.id) {
      return { data: { department: mockDepartments.find(d => d.id === variables.id) || mockDepartments[0] } };
    }
    return { data: { departments: mockDepartments } };
  }

  // Tasks
  if (q.includes('tasktypes') || op.includes('tasktype')) {
    if (variables?.id) {
      return { data: { taskType: mockTaskTypes[0] } };
    }
    return { data: { taskTypes: mockTaskTypes } };
  }
  if (q.includes('tasks') || op.includes('task')) {
    if ((q.includes('task(') || op.includes('gettask')) && variables?.id) {
      return { data: { task: mockTasks.find(t => t.id === variables.id) || mockTasks[0] } };
    }
    return { data: { tasks: mockTasks } };
  }

  // Events
  if (q.includes('events') || op.includes('event')) {
    if ((q.includes('event(') || op.includes('getevent')) && variables?.id) {
      return { data: { event: mockEvents.find(e => e.id === variables.id) || mockEvents[0] } };
    }
    if (q.includes('eventattendees') || op.includes('attendee')) {
      return { data: { eventAttendees: [] } };
    }
    if (q.includes('eventcomments') || op.includes('comment')) {
      return { data: { eventComments: [] } };
    }
    if (q.includes('eventhistories') || op.includes('history')) {
      return { data: { eventHistories: [] } };
    }
    if (q.includes('eventwaitlist') || op.includes('waitlist')) {
      return { data: { eventWaitlists: [] } };
    }
    return { data: { events: mockEvents } };
  }

  // Notifications
  if (q.includes('notifications') || op.includes('notification')) {
    return { data: { notifications: mockNotifications } };
  }

  // Documents
  if (q.includes('documents') || op.includes('document')) {
    if (variables?.id) {
      return { data: { document: mockDocuments[0] } };
    }
    return { data: { documents: mockDocuments } };
  }

  // Leave
  if (q.includes('leaverequest') || op.includes('leave')) {
    if (q.includes('leavebalances') || op.includes('balance')) {
      return { data: { leaveBalances: [{ id: '1', userId: ADMIN_USER_ID, leaveTypeId: '1', totalDays: 20, usedDays: 5, pendingDays: 2, remainingDays: 13, year: 2026, leaveType: mockLeaveTypes[0] }] } };
    }
    if (q.includes('leavetypes') || op.includes('leavetype')) {
      return { data: { leaveTypes: mockLeaveTypes } };
    }
    return { data: { leaveRequests: [] } };
  }

  // Performance reviews
  if (q.includes('performancereview') || op.includes('review') || op.includes('performance')) {
    if (variables?.id) {
      return { data: { performanceReview: { id: REVIEW1_ID, employeeId: USER2_ID, reviewerId: ADMIN_USER_ID, period: 'Q1 2026', status: 'IN_PROGRESS', overallRating: null, createdAt: lastMonth, updatedAt: now } } };
    }
    return { data: { performanceReviews: [] } };
  }

  // Roles & permissions
  if (q.includes('roles') || op.includes('role')) {
    if (variables?.id || variables?.name) {
      return { data: { role: mockRoles[0], roleByName: mockRoles[0] } };
    }
    return { data: { roles: mockRoles } };
  }
  if (q.includes('permissions') || op.includes('permission')) {
    return { data: { permissions: mockRoles[0].permissions.nodes } };
  }

  // Goals
  if (q.includes('goals') || q.includes('employeegoals') || op.includes('goal')) {
    return { data: { employeeGoals: [] } };
  }

  // Attendance
  if (q.includes('attendance') || op.includes('attendance')) {
    return { data: { attendanceRecords: [] } };
  }

  // Activity logs
  if (q.includes('activitylog') || op.includes('activity')) {
    if (variables?.id) {
      return { data: { activityLog: { id: '1', action: 'LOGIN', userId: ADMIN_USER_ID, details: 'User logged in', createdAt: now } } };
    }
    return { data: { activityLogs: [] } };
  }

  // Sync Health monitoring
  if (q.includes('synchealth') || op.includes('synchealth') || op.includes('health')) {
    return { data: { syncHealth: {
      syncHealthStatus: {
        uptimePercentage: 99.9,
        avgSyncDurationMs: 1250,
        totalSyncs24H: 48,
        successRate: 98.5,
        errorRate: 1.5,
        lastSuccessfulSync: now,
        currentStatus: 'healthy',
        activeAlertsCount: 0
      },
      syncHealthMetrics: [],
      syncHealthAlerts: [],
      resolveHealthAlert: { success: true, message: 'Alert resolved', alertId: variables?.alertId || '1' },
      testHealthCheck: { success: true, currentStatus: 'healthy', alertsTriggered: 0, uptimePercentage: 99.9, errorRate: 1.5 }
    } } };
  }

  // System settings
  if (q.includes('systemsettings') || op.includes('settings')) {
    return { data: { systemSettings: mockSystemSettings, systemSettingsByCategory: mockSystemSettings } };
  }

  // Emergency contacts
  if (q.includes('emergencycontact') || op.includes('emergency')) {
    return { data: { emergencyContacts: [] } };
  }

  // Vehicles
  if (q.includes('vehicle') || op.includes('vehicle')) {
    return { data: { employeeVehicles: [] } };
  }

  // HR Reports
  if (q.includes('hrreport') || op.includes('report')) {
    return { data: { hrReports: [], hrReport: null } };
  }

  // Employee statistics
  if (q.includes('employeestatistic') || op.includes('statistic')) {
    return { data: { employeeStatistics: [], latestEmployeeStatistics: { totalEmployees: 28, activeEmployees: 25, departmentCount: 3, averageTenure: 2.5 } } };
  }

  // Addresses
  if (q.includes('address') || op.includes('address')) {
    return { data: { userAddresses: [], userAddress: null, userPrimaryAddress: null } };
  }

  // Rollback
  if (q.includes('rollback') || op.includes('rollback')) {
    return { data: { rollbackRequests: [], rollbackRequestsCount: 0 } };
  }

  // CSRF token
  if (q.includes('csrftoken') || op.includes('csrf')) {
    return { data: { csrfToken: crypto.randomUUID() } };
  }

  // Mutations - return success responses
  if (q.includes('mutation')) {
    // Create event
    if (q.includes('createevent') || op.includes('createevent')) {
      const newEvent = { ...mockEvents[0], id: crypto.randomUUID(), title: variables?.input?.title || 'New Event', description: variables?.input?.description || '', createdAt: now, updatedAt: now };
      return { data: { createEvent: newEvent } };
    }
    // Update event
    if (q.includes('updateevent') || op.includes('updateevent')) {
      return { data: { updateEvent: { ...mockEvents[0], ...(variables?.input || {}) } } };
    }
    // Delete event
    if (q.includes('deleteevent') || op.includes('deleteevent')) {
      return { data: { deleteEvent: { success: true, id: variables?.id || EVENT1_ID } } };
    }
    // Create task
    if (q.includes('createtask') || op.includes('createtask')) {
      return { data: { createTask: { ...mockTasks[0], id: crypto.randomUUID(), title: variables?.input?.title || 'New Task' } } };
    }
    // Update task
    if (q.includes('updatetask') || op.includes('updatetask')) {
      return { data: { updateTask: { ...mockTasks[0], ...(variables?.input || {}) } } };
    }
    // Upload document
    if (q.includes('uploaddocument') || q.includes('createdocument') || op.includes('upload') || op.includes('createdocument')) {
      return { data: { uploadDocument: { ...mockDocuments[0], id: crypto.randomUUID() }, createDocument: { ...mockDocuments[0], id: crypto.randomUUID() } } };
    }

    // Generic mutation fallback - return success
    return { data: { success: true } };
  }

  // Default fallback for unmatched queries
  console.log(`[MOCK] Unmatched query: op=${operationName}, query preview: ${(query || '').slice(0, 200)}`);
  return { data: {} };
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-CSRF-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // Upload endpoint
  if (req.url === '/api/upload') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, filePath: '/uploads/mock-file.pdf', fileUrl: '/uploads/mock-file.pdf' }));
    return;
  }

  // Roles endpoint
  if (req.url === '/api/roles') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(mockRoles));
    return;
  }

  // Users endpoint
  if (req.url === '/api/users') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(mockUsers));
    return;
  }

  // GraphQL endpoint
  if (req.url === '/graphql' || req.url === '/api/graphql') {
    // GET = playground
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><h1>Mock GraphQL Playground</h1><p>POST queries to this endpoint</p></body></html>');
      return;
    }

    // POST = query
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        const result = resolveQuery(parsed);
        console.log(`[MOCK] ${parsed.operationName || 'anonymous'} -> ${Object.keys(result.data || {}).join(', ')}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error('[MOCK] Parse error:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errors: [{ message: 'Invalid request' }] }));
      }
    });
    return;
  }

  // Default 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[MOCK] GraphQL server running on http://localhost:${PORT}/graphql`);
  console.log(`[MOCK] Health check: http://localhost:${PORT}/health`);

  // Print a token for testing
  const token = generateAccessToken();
  console.log(`[MOCK] Test JWT token generated (24h expiry)`);
  // Write token to file for the frontend .env
  fs.writeFileSync('/tmp/mock_access_token.txt', token);
  console.log(`[MOCK] Token saved to /tmp/mock_access_token.txt`);
});
