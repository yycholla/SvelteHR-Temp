import { parse } from 'graphql';
import type { SubscriptionScenario } from './types';

/**
 * HR-specific subscription scenarios for testing
 */
export const HR_SUBSCRIPTION_SCENARIOS: SubscriptionScenario[] = [
	// Employee status updates
	{
		name: 'employee_status_updates',
		description: 'Test real-time employee status changes',
		subscription: parse(`
      subscription EmployeeStatusUpdates($departmentId: ID!) {
        employeeStatusChanged(departmentId: $departmentId) {
          id
          userId
          status
          lastUpdated
          department {
            id
            name
          }
        }
      }
    `),
		expectedMessages: 3,
		maxDuration: 15000,
		triggers: [
			{
				delay: 1000,
				action: 'mutation',
				operation: parse(`
          mutation UpdateEmployeeStatus($id: ID!, $status: EmployeeStatus!) {
            updateEmployee(input: { id: $id, patch: { status: $status } }) {
              employee {
                id
                status
              }
            }
          }
        `),
				variables: { id: 'emp-1', status: 'ACTIVE' }
			}
		],
		validation: (messages) => ({
			valid: messages.length >= 1 && messages.every((m) => m.employeeStatusChanged),
			errors: messages.length === 0 ? ['No messages received'] : [],
			warnings: []
		})
	},

	// Leave request notifications
	{
		name: 'leave_request_notifications',
		description: 'Test leave request approval notifications',
		subscription: parse(`
      subscription LeaveRequestNotifications($userId: ID!) {
        leaveRequestStatusChanged(userId: $userId) {
          id
          employee {
            id
            user {
              name
            }
          }
          status
          approver {
            id
            user {
              name
            }
          }
          updatedAt
        }
      }
    `),
		expectedMessages: 2,
		maxDuration: 20000,
		triggers: [
			{
				delay: 2000,
				action: 'mutation',
				operation: parse(`
          mutation ApproveLeaveRequest($id: ID!, $approverId: ID!) {
            approveLeaveRequest(input: { requestId: $id, approverId: $approverId }) {
              leaveRequest {
                id
                status
              }
            }
          }
        `),
				variables: { id: 'leave-1', approverId: 'manager-1' }
			}
		],
		validation: (messages) => ({
			valid: messages.some((m) => m.leaveRequestStatusChanged?.status === 'APPROVED'),
			errors: [],
			warnings: messages.length === 0 ? ['No approval notifications received'] : []
		})
	},

	// Performance review updates
	{
		name: 'performance_review_updates',
		description: 'Test performance review real-time updates',
		subscription: parse(`
      subscription PerformanceReviewUpdates($employeeId: ID!) {
        performanceReviewUpdated(employeeId: $employeeId) {
          id
          employee {
            id
          }
          reviewer {
            id
          }
          status
          score
          updatedAt
        }
      }
    `),
		expectedMessages: 1,
		maxDuration: 10000,
		triggers: [
			{
				delay: 1500,
				action: 'mutation',
				operation: parse(`
          mutation UpdatePerformanceReview($id: ID!, $score: Float!, $status: ReviewStatus!) {
            updatePerformanceReview(input: { id: $id, patch: { score: $score, status: $status } }) {
              performanceReview {
                id
                score
                status
              }
            }
          }
        `),
				variables: { id: 'review-1', score: 4.5, status: 'COMPLETED' }
			}
		],
		validation: (messages) => ({
			valid: messages.length >= 1 && messages.every((m) => m.performanceReviewUpdated?.score > 0),
			errors: messages.length === 0 ? ['No performance review updates received'] : [],
			warnings: []
		})
	},

	// Team notifications
	{
		name: 'team_notifications',
		description: 'Test team-wide notification broadcasting',
		subscription: parse(`
      subscription TeamNotifications($teamId: ID!) {
        teamNotification(teamId: $teamId) {
          id
          type
          title
          message
          priority
          sender {
            id
            name
          }
          timestamp
        }
      }
    `),
		expectedMessages: 2,
		maxDuration: 12000,
		triggers: [
			{
				delay: 1000,
				action: 'mutation',
				operation: parse(`
          mutation SendTeamNotification($teamId: ID!, $title: String!, $message: String!) {
            sendTeamNotification(input: { teamId: $teamId, title: $title, message: $message }) {
              notification {
                id
                title
              }
            }
          }
        `),
				variables: {
					teamId: 'team-1',
					title: 'Test Notification',
					message: 'This is a test notification'
				}
			}
		],
		validation: (messages) => ({
			valid: messages.some((m) => m.teamNotification?.title === 'Test Notification'),
			errors: [],
			warnings: []
		})
	}
];
