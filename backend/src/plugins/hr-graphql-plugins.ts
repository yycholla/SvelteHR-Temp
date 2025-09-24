/**
 * HR-Specific GraphQL Plugins for PostGraphile
 *
 * Provides custom resolvers and middleware for HR user journeys functionality
 * including time tracking, leave management, goals, and performance reviews.
 */

import { makeExtendSchemaPlugin, gql } from 'graphile-utils';
import { GraphQLResolveInfo } from 'graphql';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  InputValidator,
  ValidationSchemas,
  handleValidationError,
  ValidationErrorCodes,
  HRValidationError
} from './hr-validation-plugin';

// JWT Secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'development-jwt-secret-change-in-production';

// Extend the GraphQL schema with HR-specific types and operations
export const HRExtensionsPlugin = makeExtendSchemaPlugin(build => {
  const { pgSql: sql } = build;

  return {
    typeDefs: gql`
      # Logout type
      type LogoutPayload {
        success: Boolean!
        message: String!
      }

      # Input types for HR operations
      input TimeEntryFilter {
        employeeId: UUID
        projectId: UUID
        startDate: Date
        endDate: Date
        status: String
      }

      input LeaveRequestFilter {
        employeeId: UUID
        leaveType: String
        status: String
        startDate: Date
        endDate: Date
      }

      input GoalFilter {
        employeeId: UUID
        goalType: String
        status: String
        includeCompleted: Boolean
      }

      # Custom query types
      type TimeEntrySummary {
        totalHours: Float!
        billableHours: Float!
        regularHours: Float!
        overtimeHours: Float!
        entriesCount: Int!
        approvedEntries: Int!
        pendingEntries: Int!
      }

      type NotificationStats {
        totalUnread: Int!
        highPriorityUnread: Int!
        actionRequiredUnread: Int!
        overdueActions: Int!
        totalToday: Int!
      }

      extend type Query {
        # Time tracking queries
        myTimeEntries(filter: TimeEntryFilter): [TimeEntry!]
        timeEntrySummary(
          employeeId: UUID
          startDate: Date
          endDate: Date
        ): TimeEntrySummary

        # Leave management queries
        myLeaveRequests(filter: LeaveRequestFilter): [LeaveRequest!]
        teamLeaveRequests(
          managerId: UUID!
          status: String
        ): [LeaveRequest!]
        leaveBalanceQuery(
          employeeId: UUID!
          leaveType: String!
          year: Int
        ): Float

        # Goal management queries
        myGoals(filter: GoalFilter): [Goal!]
        teamGoalsOverview(managerId: UUID!): JSON

        # Notification queries
        myNotifications(
          status: String
          notificationType: String
          limit: Int
          offset: Int
        ): [Notification!]
        notificationStats: NotificationStats

        # Dashboard data
        employeeDashboardData: JSON
        managerDashboardData: JSON
      }

      extend type Mutation {
        # Authentication mutations
        logout: LogoutPayload

        # Time entry mutations
        submitTimeEntry(timeEntryId: UUID!): TimeEntry
        approveTimeEntry(timeEntryId: UUID!): TimeEntry
        rejectTimeEntry(
          timeEntryId: UUID!
          reason: String!
        ): TimeEntry

        # Leave request mutations
        submitLeaveRequest(leaveRequestId: UUID!): LeaveRequest
        approveLeaveRequest(leaveRequestId: UUID!): LeaveRequest
        rejectLeaveRequest(
          leaveRequestId: UUID!
          reason: String!
        ): LeaveRequest
        cancelLeaveRequest(leaveRequestId: UUID!): LeaveRequest

        # Goal mutations
        updateGoalProgress(
          goalId: UUID!
          progress: Int!
          notes: String
        ): Goal
        completeGoal(goalId: UUID!): Goal

        # Note: Notification mutations are provided by database functions
        # markNotificationsRead, createNotification etc. are auto-generated
      }
    `,

    resolvers: {
      Query: {
        // Time tracking resolvers
        myTimeEntries: async (
          _parent,
          args,
          context,
          _resolveInfo
        ) => {
          const { pgClient } = context;
          const userId = context.jwtClaims?.user_id;

          if (!userId) {
            throw new Error('Authentication required');
          }

          const query = sql.fragment`
            SELECT * FROM hr_public.time_entries
            WHERE employee_id = ${sql.value(userId)}
            ${args.filter?.startDate ? sql.fragment`AND entry_date >= ${sql.value(args.filter.startDate)}` : sql.fragment``}
            ${args.filter?.endDate ? sql.fragment`AND entry_date <= ${sql.value(args.filter.endDate)}` : sql.fragment``}
            ${args.filter?.status ? sql.fragment`AND status = ${sql.value(args.filter.status)}` : sql.fragment``}
            ORDER BY entry_date DESC, created_at DESC
          `;

          const { rows } = await pgClient.query(sql.compile(query));
          return rows;
        },

        timeEntrySummary: async (
          _parent,
          args,
          context,
          _resolveInfo
        ) => {
          const { pgClient } = context;
          const employeeId = args.employeeId || context.jwtClaims?.user_id;

          const { rows } = await pgClient.query(
            'SELECT * FROM hr_public.get_time_entry_stats($1, $2, $3)',
            [employeeId, args.startDate, args.endDate]
          );
          return rows[0];
        },

        // Leave management resolvers
        myLeaveRequests: async (
          _parent,
          args,
          context,
          _resolveInfo
        ) => {
          const { pgClient } = context;
          const userId = context.jwtClaims?.user_id;

          if (!userId) {
            throw new Error('Authentication required');
          }

          const { rows } = await pgClient.query(
            'SELECT * FROM hr_public.get_my_leave_requests($1, $2, $3)',
            [userId, args.filter?.status, args.filter?.leaveType]
          );
          return rows;
        },

        teamLeaveRequests: async (
          _parent,
          args,
          context,
          _resolveInfo
        ) => {
          const { pgClient } = context;
          const managerId = args.managerId || context.jwtClaims?.user_id;

          // Verify manager role
          if (context.jwtClaims?.role_level < 60) {
            throw new Error('Manager access required');
          }

          const { rows } = await pgClient.query(
            'SELECT * FROM hr_public.get_team_leave_requests($1, $2)',
            [managerId, args.status]
          );
          return rows;
        },

        leaveBalanceQuery: async (
          _parent,
          args,
          context,
          _resolveInfo
        ) => {
          const { pgClient } = context;
          const { rows } = await pgClient.query(
            'SELECT hr_public.get_leave_balance($1, $2, $3) as balance',
            [args.employeeId, args.leaveType, args.year]
          );
          return rows[0]?.balance || 0;
        },

        // Goal management resolvers
        myGoals: async (
          _parent,
          args,
          context,
          _resolveInfo
        ) => {
          const { pgClient } = context;
          const userId = context.jwtClaims?.user_id;

          if (!userId) {
            throw new Error('Authentication required');
          }

          const { rows } = await pgClient.query(
            'SELECT * FROM hr_public.get_employee_goals($1, $2, $3)',
            [userId, args.filter?.status, args.filter?.includeCompleted]
          );
          return rows;
        },

        // Notification resolvers
        myNotifications: async (
          _parent,
          args,
          context,
          _resolveInfo
        ) => {
          const { pgClient } = context;
          const userId = context.jwtClaims?.user_id;

          if (!userId) {
            throw new Error('Authentication required');
          }

          const { rows } = await pgClient.query(
            'SELECT * FROM hr_public.get_user_notifications($1, $2, $3, $4, $5)',
            [userId, args.status, args.notificationType, args.limit || 50, args.offset || 0]
          );
          return rows;
        },

        notificationStats: async (
          _parent,
          _args,
          context,
          _resolveInfo
        ) => {
          const { pgClient } = context;
          const userId = context.jwtClaims?.user_id;

          if (!userId) {
            throw new Error('Authentication required');
          }

          const { rows } = await pgClient.query(
            'SELECT * FROM hr_public.get_notification_stats($1)',
            [userId]
          );
          return rows[0];
        },

        // Dashboard resolvers
        employeeDashboardData: async (
          _parent,
          _args,
          context,
          _resolveInfo
        ) => {
          const { pgClient } = context;
          const userId = context.jwtClaims?.user_id;

          if (!userId) {
            throw new Error('Authentication required');
          }

          // Aggregate dashboard data
          const [timeStats, notifications, goals, leaveBalance] = await Promise.all([
            pgClient.query('SELECT * FROM hr_public.get_time_entry_stats($1, NULL, NULL)', [userId]),
            pgClient.query('SELECT * FROM hr_public.get_notification_stats($1)', [userId]),
            pgClient.query('SELECT * FROM hr_public.get_employee_goals($1, $2, $3)', [userId, 'ACTIVE', false]),
            pgClient.query('SELECT hr_public.get_leave_balance($1, $2, NULL) as balance', [userId, 'VACATION'])
          ]);

          return {
            timeTracking: timeStats.rows[0],
            notifications: notifications.rows[0],
            activeGoals: goals.rows,
            leaveBalance: leaveBalance.rows[0]?.balance || 0
          };
        }
      },

      Mutation: {
        // Authentication mutations
        logout: async (
          _parent,
          _args,
          context,
          _resolveInfo
        ) => {
          const { pgClient } = context;
          const userId = context.jwtClaims?.user_id;

          if (userId) {
            // Log logout action
            await pgClient.query(
              'INSERT INTO hr_public.security_audit_log (user_id, event_type, description, ip_address, success) VALUES ($1, $2, $3, $4, $5)',
              [userId, 'LOGOUT', 'User logged out', context.req?.ip || null, true]
            );
          }

          return {
            success: true,
            message: 'Successfully logged out'
          };
        },

        // Time entry mutations with business logic
        submitTimeEntry: async (
          _parent,
          args,
          context,
          _resolveInfo
        ) => {
          const { pgClient } = context;
          const userId = context.jwtClaims?.user_id;

          if (!userId) {
            throw new Error('Authentication required');
          }

          // Get time entry details for validation
          const timeEntryQuery = await pgClient.query(
            `SELECT * FROM hr_public.time_entries WHERE id = $1 AND employee_id = $2`,
            [args.timeEntryId, userId]
          );

          if (timeEntryQuery.rows.length === 0) {
            throw new Error('Time entry not found or access denied');
          }

          const timeEntry = timeEntryQuery.rows[0];

          // Business Logic Validation
          // 1. Check if time entry is in valid status for submission
          if (timeEntry.status !== 'DRAFT') {
            throw new Error('Only draft time entries can be submitted');
          }

          // 2. Validate total hours are reasonable (0-24 hours)
          if (timeEntry.total_hours <= 0 || timeEntry.total_hours > 24) {
            throw new Error('Total hours must be between 0 and 24');
          }

          // 3. Check for overlapping time entries on the same date
          const overlapQuery = await pgClient.query(
            `SELECT id FROM hr_public.time_entries
             WHERE employee_id = $1
             AND entry_date = $2
             AND id != $3
             AND status != 'CANCELLED'
             AND (
               (start_time <= $4 AND end_time > $4) OR
               (start_time < $5 AND end_time >= $5) OR
               (start_time >= $4 AND end_time <= $5)
             )`,
            [userId, timeEntry.entry_date, args.timeEntryId, timeEntry.start_time, timeEntry.end_time]
          );

          if (overlapQuery.rows.length > 0) {
            throw new Error('Time entry overlaps with existing entry on the same date');
          }

          // 4. Prevent submission of future-dated entries beyond 1 day
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          if (new Date(timeEntry.entry_date) > tomorrow) {
            throw new Error('Cannot submit time entries more than 1 day in the future');
          }

          // 5. Prevent submission of entries older than 30 days (configurable business rule)
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - 30);
          if (new Date(timeEntry.entry_date) < cutoffDate) {
            throw new Error('Cannot submit time entries older than 30 days');
          }

          // Submit the time entry
          const { rows } = await pgClient.query(
            `UPDATE hr_public.time_entries
             SET status = 'SUBMITTED', submitted_at = NOW(), updated_at = NOW()
             WHERE id = $1 AND employee_id = $2
             RETURNING *`,
            [args.timeEntryId, userId]
          );

          // Log the submission for audit purposes
          await pgClient.query(
            'INSERT INTO hr_public.security_audit_log (user_id, event_type, description, success) VALUES ($1, $2, $3, $4)',
            [userId, 'TIME_ENTRY_SUBMIT', `Submitted time entry ${args.timeEntryId} for ${timeEntry.total_hours} hours`, true]
          );

          return rows[0];
        },

        approveTimeEntry: async (
          _parent,
          args,
          context,
          _resolveInfo
        ) => {
          const { pgClient } = context;

          // Verify manager role
          if (context.jwtClaims?.role_level < 60) {
            throw new Error('Manager access required');
          }

          const { rows } = await pgClient.query(
            `UPDATE hr_public.time_entries
             SET status = 'APPROVED', approved_by = $2, approved_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [args.timeEntryId, context.jwtClaims?.user_id]
          );

          if (rows.length === 0) {
            throw new Error('Time entry not found');
          }

          return rows[0];
        },

        rejectTimeEntry: async (
          _parent,
          args,
          context,
          _resolveInfo
        ) => {
          try {
            // Input validation
            ValidationSchemas.timeEntry.validateReject(args);

            const { pgClient } = context;
            const managerId = context.jwtClaims?.user_id;

            // Authentication and authorization validation
            if (!managerId) {
              throw new HRValidationError(
                'Authentication required',
                ValidationErrorCodes.INSUFFICIENT_PERMISSION
              );
            }

            if (context.jwtClaims?.role_level < 60) {
              throw new HRValidationError(
                'Manager access required to reject time entries',
                ValidationErrorCodes.INSUFFICIENT_PERMISSION,
                undefined,
                { requiredRoleLevel: 60, actualRoleLevel: context.jwtClaims?.role_level }
              );
            }
          } catch (error) {
            handleValidationError(error);
          }

          // Get time entry details for validation and notification
          const timeEntryQuery = await pgClient.query(
            `SELECT te.*, u.display_name as employee_name, p.name as project_name
             FROM hr_public.time_entries te
             JOIN hr_public.users u ON te.employee_id = u.id
             LEFT JOIN hr_public.projects p ON te.project_id = p.id
             WHERE te.id = $1`,
            [args.timeEntryId]
          );

          if (timeEntryQuery.rows.length === 0) {
            throw new Error('Time entry not found');
          }

          const timeEntry = timeEntryQuery.rows[0];

          // Business Logic Validation
          // 1. Check if time entry is in valid status for rejection
          if (timeEntry.status !== 'SUBMITTED' && timeEntry.status !== 'PENDING') {
            throw new Error('Only submitted or pending time entries can be rejected');
          }

          // 2. Validate manager has authority to reject this employee's time entry
          const managerCheck = await pgClient.query(
            `SELECT 1 FROM hr_public.users
             WHERE id = $1 AND (manager_id = $2 OR department_id IN (
               SELECT department_id FROM hr_public.users WHERE id = $2
             ) OR $3 >= 80)`, // Allow HR (role_level >= 80) to reject any time entry
            [timeEntry.employee_id, managerId, context.jwtClaims?.role_level || 0]
          );

          if (managerCheck.rows.length === 0) {
            throw new Error('You do not have authority to reject this employee\'s time entry');
          }

          // 3. Validate rejection reason is provided and meaningful
          if (!args.reason || args.reason.trim().length < 5) {
            throw new Error('A detailed rejection reason (minimum 5 characters) is required');
          }

          // 4. Prevent rejection of very old time entries (business rule - 90 days)
          const rejectionCutoffDate = new Date();
          rejectionCutoffDate.setDate(rejectionCutoffDate.getDate() - 90);
          if (new Date(timeEntry.entry_date) < rejectionCutoffDate) {
            throw new Error('Cannot reject time entries older than 90 days. Please contact HR for historical adjustments.');
          }

          // Begin transaction for rejection and notification
          await pgClient.query('BEGIN');

          try {
            // Reject the time entry with reason
            const { rows } = await pgClient.query(
              `UPDATE hr_public.time_entries
               SET status = 'REJECTED',
                   approved_by = $2,
                   approved_at = NOW(),
                   rejection_reason = $3,
                   updated_by = $2,
                   updated_at = NOW()
               WHERE id = $1
               RETURNING *`,
              [args.timeEntryId, managerId, args.reason.trim()]
            );

            // Create notification for employee about rejection
            await pgClient.query(
              'SELECT hr_public.create_notification($1, $2, $3, $4, $5, $6)',
              [
                timeEntry.employee_id,
                managerId,
                'Time Entry Rejected',
                `Your time entry for ${timeEntry.total_hours} hours on ${timeEntry.entry_date}${timeEntry.project_name ? ` (Project: ${timeEntry.project_name})` : ''} has been rejected. Reason: ${args.reason}`,
                'TIME_ENTRY_REJECTED',
                'HIGH'
              ]
            );

            // Log rejection for audit purposes
            await pgClient.query(
              'INSERT INTO hr_public.security_audit_log (user_id, event_type, description, success) VALUES ($1, $2, $3, $4)',
              [
                managerId,
                'TIME_ENTRY_REJECT',
                `Rejected time entry for ${timeEntry.employee_name}: ${timeEntry.total_hours} hours on ${timeEntry.entry_date}. Reason: ${args.reason}`,
                true
              ]
            );

            await pgClient.query('COMMIT');
            return rows[0];

          } catch (error) {
            await pgClient.query('ROLLBACK');
            throw error;
          }
        },

        // Leave request mutations with business logic
        approveLeaveRequest: async (
          _parent,
          args,
          context,
          _resolveInfo
        ) => {
          const { pgClient } = context;
          const managerId = context.jwtClaims?.user_id;

          // Verify manager role
          if (context.jwtClaims?.role_level < 60) {
            throw new Error('Manager access required');
          }

          if (!managerId) {
            throw new Error('Authentication required');
          }

          // Get leave request details for validation
          const leaveQuery = await pgClient.query(
            `SELECT lr.*, u.display_name as employee_name
             FROM hr_public.leave_requests lr
             JOIN hr_public.users u ON lr.employee_id = u.id
             WHERE lr.id = $1`,
            [args.leaveRequestId]
          );

          if (leaveQuery.rows.length === 0) {
            throw new Error('Leave request not found');
          }

          const leaveRequest = leaveQuery.rows[0];

          // Business Logic Validation
          // 1. Check if leave request is in valid status for approval
          if (leaveRequest.status !== 'PENDING') {
            throw new Error('Only pending leave requests can be approved');
          }

          // 2. Validate manager has authority to approve this employee's leave
          const managerCheck = await pgClient.query(
            `SELECT 1 FROM hr_public.users
             WHERE id = $1 AND (manager_id = $2 OR department_id IN (
               SELECT department_id FROM hr_public.users WHERE id = $2
             ))`,
            [leaveRequest.employee_id, managerId]
          );

          if (managerCheck.rows.length === 0) {
            throw new Error('You do not have authority to approve this employee\'s leave request');
          }

          // 3. Check available leave balance
          const currentYear = new Date().getFullYear();
          const balanceQuery = await pgClient.query(
            'SELECT hr_public.get_leave_balance($1, $2, $3) as balance',
            [leaveRequest.employee_id, leaveRequest.leave_type, currentYear]
          );

          const availableBalance = balanceQuery.rows[0]?.balance || 0;
          const requestedDays = leaveRequest.total_days || 0;

          if (availableBalance < requestedDays) {
            throw new Error(`Insufficient leave balance. Available: ${availableBalance} days, Requested: ${requestedDays} days`);
          }

          // 4. Check for conflicting approved leave requests
          const conflictQuery = await pgClient.query(
            `SELECT id FROM hr_public.leave_requests
             WHERE employee_id = $1
             AND id != $2
             AND status = 'APPROVED'
             AND (
               (start_date <= $3 AND end_date >= $3) OR
               (start_date <= $4 AND end_date >= $4) OR
               (start_date >= $3 AND end_date <= $4)
             )`,
            [leaveRequest.employee_id, args.leaveRequestId, leaveRequest.start_date, leaveRequest.end_date]
          );

          if (conflictQuery.rows.length > 0) {
            throw new Error('Leave request conflicts with existing approved leave');
          }

          // 5. Validate date range is logical
          if (new Date(leaveRequest.end_date) < new Date(leaveRequest.start_date)) {
            throw new Error('End date must be after start date');
          }

          // Begin transaction for approval and balance update
          await pgClient.query('BEGIN');

          try {
            // Approve the leave request
            const { rows } = await pgClient.query(
              `UPDATE hr_public.leave_requests
               SET status = 'APPROVED',
                   approved_by = $2,
                   approved_at = NOW(),
                   leave_balance_before = $3,
                   leave_balance_after = $4,
                   updated_at = NOW()
               WHERE id = $1
               RETURNING *`,
              [args.leaveRequestId, managerId, availableBalance, availableBalance - requestedDays]
            );

            // Update leave balance
            await pgClient.query(
              `UPDATE hr_public.leave_balances
               SET used_days = used_days + $3,
                   updated_at = NOW()
               WHERE employee_id = $1 AND leave_type = $2 AND year = $4`,
              [leaveRequest.employee_id, leaveRequest.leave_type, requestedDays, currentYear]
            );

            // Create notification for employee
            await pgClient.query(
              'SELECT hr_public.create_notification($1, $2, $3, $4, $5, $6)',
              [
                leaveRequest.employee_id,
                managerId,
                'Leave Request Approved',
                `Your ${leaveRequest.leave_type} leave request from ${leaveRequest.start_date} to ${leaveRequest.end_date} has been approved.`,
                'LEAVE_APPROVED',
                'NORMAL'
              ]
            );

            // Log approval for audit purposes
            await pgClient.query(
              'INSERT INTO hr_public.security_audit_log (user_id, event_type, description, success) VALUES ($1, $2, $3, $4)',
              [managerId, 'LEAVE_APPROVED', `Approved ${requestedDays} days of ${leaveRequest.leave_type} leave for ${leaveRequest.employee_name} (${leaveRequest.start_date} to ${leaveRequest.end_date})`, true]
            );

            await pgClient.query('COMMIT');
            return rows[0];

          } catch (error) {
            await pgClient.query('ROLLBACK');
            throw error;
          }
        },

        rejectLeaveRequest: async (
          _parent,
          args,
          context,
          _resolveInfo
        ) => {
          try {
            // Input validation
            ValidationSchemas.leaveRequest.validateReject(args);

            const { pgClient } = context;
            const managerId = context.jwtClaims?.user_id;

            // Authentication and authorization validation
            if (!managerId) {
              throw new HRValidationError(
                'Authentication required',
                ValidationErrorCodes.INSUFFICIENT_PERMISSION
              );
            }

            if (context.jwtClaims?.role_level < 60) {
              throw new HRValidationError(
                'Manager access required to reject leave requests',
                ValidationErrorCodes.INSUFFICIENT_PERMISSION,
                undefined,
                { requiredRoleLevel: 60, actualRoleLevel: context.jwtClaims?.role_level }
              );
            }
          } catch (error) {
            handleValidationError(error);
          }

          // Get leave request details for validation and notification
          const leaveQuery = await pgClient.query(
            `SELECT lr.*, u.display_name as employee_name, u.email as employee_email
             FROM hr_public.leave_requests lr
             JOIN hr_public.users u ON lr.employee_id = u.id
             WHERE lr.id = $1`,
            [args.leaveRequestId]
          );

          if (leaveQuery.rows.length === 0) {
            throw new Error('Leave request not found');
          }

          const leaveRequest = leaveQuery.rows[0];

          // Business Logic Validation
          // 1. Check if leave request is in valid status for rejection
          if (leaveRequest.status !== 'PENDING') {
            throw new Error('Only pending leave requests can be rejected');
          }

          // 2. Validate manager has authority to reject this employee's leave request
          const managerCheck = await pgClient.query(
            `SELECT 1 FROM hr_public.users
             WHERE id = $1 AND (manager_id = $2 OR department_id IN (
               SELECT department_id FROM hr_public.users WHERE id = $2
             ) OR $3 >= 80)`, // Allow HR (role_level >= 80) to reject any leave request
            [leaveRequest.employee_id, managerId, context.jwtClaims?.role_level || 0]
          );

          if (managerCheck.rows.length === 0) {
            throw new Error('You do not have authority to reject this employee\'s leave request');
          }

          // 3. Validate rejection reason is provided and meaningful
          if (!args.reason || args.reason.trim().length < 10) {
            throw new Error('A detailed rejection reason (minimum 10 characters) is required for leave request rejections');
          }

          // 4. Check if rejection is being made too late (within 24 hours of start date)
          const startDate = new Date(leaveRequest.start_date);
          const now = new Date();
          const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);

          if (hoursUntilStart < 24 && hoursUntilStart > 0) {
            // Allow rejection but create a high-priority notification
            console.warn(`Late rejection warning: Leave request ${args.leaveRequestId} rejected with less than 24 hours notice`);
          }

          // 5. Prevent rejection of very old leave requests (business rule - 180 days)
          const rejectionCutoffDate = new Date();
          rejectionCutoffDate.setDate(rejectionCutoffDate.getDate() - 180);
          if (new Date(leaveRequest.created_at) < rejectionCutoffDate) {
            throw new Error('Cannot reject leave requests older than 180 days. Please contact HR for historical adjustments.');
          }

          // Begin transaction for rejection and notifications
          await pgClient.query('BEGIN');

          try {
            // Reject the leave request with reason
            const { rows } = await pgClient.query(
              `UPDATE hr_public.leave_requests
               SET status = 'REJECTED',
                   approved_by = $2,
                   approved_at = NOW(),
                   rejection_reason = $3,
                   updated_at = NOW()
               WHERE id = $1
               RETURNING *`,
              [args.leaveRequestId, managerId, args.reason.trim()]
            );

            // Create notification for employee about rejection
            const priorityLevel = hoursUntilStart < 24 && hoursUntilStart > 0 ? 'URGENT' : 'HIGH';
            await pgClient.query(
              'SELECT hr_public.create_notification($1, $2, $3, $4, $5, $6)',
              [
                leaveRequest.employee_id,
                managerId,
                'Leave Request Rejected',
                `Your ${leaveRequest.leave_type} leave request from ${leaveRequest.start_date} to ${leaveRequest.end_date} has been rejected. Reason: ${args.reason.trim()}${hoursUntilStart < 24 && hoursUntilStart > 0 ? ' (Short notice rejection)' : ''}`,
                'LEAVE_REJECTED',
                priorityLevel
              ]
            );

            // Create notification for HR if this is a short-notice rejection
            if (hoursUntilStart < 24 && hoursUntilStart > 0) {
              await pgClient.query(
                'SELECT hr_public.create_notification($1, $2, $3, $4, $5, $6)',
                [
                  null, // Send to all HR users (role_level >= 80)
                  managerId,
                  'Short Notice Leave Rejection Alert',
                  `Manager rejected leave request for ${leaveRequest.employee_name} with less than 24 hours notice. Leave period: ${leaveRequest.start_date} to ${leaveRequest.end_date}. Reason: ${args.reason.trim()}`,
                  'HR_ALERT',
                  'URGENT'
                ]
              );
            }

            // Log rejection for audit purposes
            await pgClient.query(
              'INSERT INTO hr_public.security_audit_log (user_id, event_type, description, success) VALUES ($1, $2, $3, $4)',
              [
                managerId,
                'LEAVE_REJECTED',
                `Rejected leave request for ${leaveRequest.employee_name}: ${leaveRequest.leave_type} from ${leaveRequest.start_date} to ${leaveRequest.end_date} (${leaveRequest.total_days || 0} days). Reason: ${args.reason.trim()}${hoursUntilStart < 24 && hoursUntilStart > 0 ? ' (SHORT NOTICE)' : ''}`,
                true
              ]
            );

            await pgClient.query('COMMIT');
            return rows[0];

          } catch (error) {
            await pgClient.query('ROLLBACK');
            throw error;
          }
        },

        cancelLeaveRequest: async (
          _parent,
          args,
          context,
          _resolveInfo
        ) => {
          const { pgClient } = context;

          const { rows } = await pgClient.query(
            `UPDATE hr_public.leave_requests
             SET status = 'CANCELLED', updated_at = NOW()
             WHERE id = $1 AND (employee_id = $2 OR user_id = $2)
             RETURNING *`,
            [args.leaveRequestId, context.jwtClaims?.user_id]
          );

          if (rows.length === 0) {
            throw new Error('Leave request not found or access denied');
          }

          return rows[0];
        },

        // Goal mutations with business logic
        updateGoalProgress: async (
          _parent,
          args,
          context,
          _resolveInfo
        ) => {
          const { pgClient } = context;
          const userId = context.jwtClaims?.user_id;

          if (!userId) {
            throw new Error('Authentication required');
          }

          // Get goal details for validation
          const goalQuery = await pgClient.query(
            `SELECT g.*, u.display_name as employee_name, m.display_name as manager_name
             FROM hr_public.goals g
             JOIN hr_public.users u ON g.employee_id = u.id
             LEFT JOIN hr_public.users m ON g.manager_id = m.id
             WHERE g.id = $1`,
            [args.goalId]
          );

          if (goalQuery.rows.length === 0) {
            throw new Error('Goal not found');
          }

          const goal = goalQuery.rows[0];

          // Business Logic Validation
          // 1. Check if user has permission to update this goal
          const isOwner = goal.employee_id === userId;
          const isManager = goal.manager_id === userId || context.jwtClaims?.role_level >= 60;

          if (!isOwner && !isManager) {
            throw new Error('You do not have permission to update this goal');
          }

          // 2. Validate goal status allows updates
          if (goal.status === 'COMPLETED' || goal.status === 'CANCELLED') {
            throw new Error('Cannot update progress on completed or cancelled goals');
          }

          // 3. Validate progress percentage is within valid range
          if (args.progress < 0 || args.progress > 100) {
            throw new Error('Progress percentage must be between 0 and 100');
          }

          // 4. Check if goal is overdue and provide warning
          const now = new Date();
          const dueDate = new Date(goal.due_date);
          const isOverdue = dueDate < now && goal.status !== 'COMPLETED';

          // 5. Prevent decreasing progress without manager approval (business rule)
          if (goal.progress_percentage && args.progress < goal.progress_percentage && !isManager) {
            throw new Error('Only managers can decrease goal progress. Current progress: ' + goal.progress_percentage + '%');
          }

          // 6. Auto-complete goal if progress reaches 100%
          let newStatus = goal.status;
          let completedAt = goal.completed_at;

          if (args.progress === 100 && goal.status !== 'COMPLETED') {
            newStatus = 'COMPLETED';
            completedAt = new Date();
          }

          // Begin transaction for progress update
          await pgClient.query('BEGIN');

          try {
            // Update goal progress
            const { rows } = await pgClient.query(
              `UPDATE hr_public.goals
               SET progress_percentage = $2,
                   last_update_notes = $3,
                   last_update_date = CURRENT_DATE,
                   status = $4,
                   completed_at = $5,
                   updated_by = $6,
                   updated_at = NOW()
               WHERE id = $1
               RETURNING *`,
              [args.goalId, args.progress, args.notes, newStatus, completedAt, userId]
            );

            // Create progress tracking record
            await pgClient.query(
              `INSERT INTO hr_public.goal_progress_updates (
                goal_id, updated_by, old_progress, new_progress, notes, created_at
              ) VALUES ($1, $2, $3, $4, $5, NOW())`,
              [args.goalId, userId, goal.progress_percentage || 0, args.progress, args.notes]
            );

            // Notify manager of progress update (if employee updating their own goal)
            if (isOwner && goal.manager_id && goal.manager_id !== userId) {
              await pgClient.query(
                'SELECT hr_public.create_notification($1, $2, $3, $4, $5, $6)',
                [
                  goal.manager_id,
                  userId,
                  'Goal Progress Updated',
                  `${goal.employee_name} updated progress on "${goal.title}" to ${args.progress}%${isOverdue ? ' (Goal is overdue)' : ''}`,
                  'GOAL_PROGRESS',
                  isOverdue ? 'HIGH' : 'NORMAL'
                ]
              );
            }

            // Notify employee of goal completion (if manager completed it)
            if (newStatus === 'COMPLETED' && !isOwner && goal.employee_id) {
              await pgClient.query(
                'SELECT hr_public.create_notification($1, $2, $3, $4, $5, $6)',
                [
                  goal.employee_id,
                  userId,
                  'Goal Completed',
                  `Your goal "${goal.title}" has been marked as completed!`,
                  'GOAL_COMPLETED',
                  'NORMAL'
                ]
              );
            }

            // Log progress update for audit purposes
            await pgClient.query(
              'INSERT INTO hr_public.security_audit_log (user_id, event_type, description, success) VALUES ($1, $2, $3, $4)',
              [
                userId,
                'GOAL_PROGRESS_UPDATE',
                `Updated goal "${goal.title}" progress from ${goal.progress_percentage || 0}% to ${args.progress}% for ${goal.employee_name}${newStatus === 'COMPLETED' ? ' (Goal completed)' : ''}`,
                true
              ]
            );

            await pgClient.query('COMMIT');
            return rows[0];

          } catch (error) {
            await pgClient.query('ROLLBACK');
            throw error;
          }
        },

        // Note: Notification mutations are automatically generated from database functions
      }
    }
  };
});

// Plugin to add HR-specific context and validation
export const HRContextPlugin = (builder) => {
  // Add HR context to the GraphQL context
  builder.hook('build', (build) => {
    build.hrContext = {
      hasManagerAccess: (roleLevel) => {
        return (roleLevel || 0) >= 60;
      },
      hasHRAccess: (roleLevel) => {
        return (roleLevel || 0) >= 80;
      },
      hasAdminAccess: (roleLevel) => {
        return (roleLevel || 0) >= 100;
      }
    };
    return build;
  });

  return builder;
};

// Export all HR plugins
export const hrPlugins = [
  HRExtensionsPlugin,
  HRContextPlugin
];