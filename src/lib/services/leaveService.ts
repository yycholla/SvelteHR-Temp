import { writable, derived, get } from 'svelte/store';
import { client } from '$lib/graphql/client';
import type { LeaveRequest, LeaveBalance, LeaveType, ApprovalStatus, RequestUrgency } from '$lib/types';
import {
  GET_LEAVE_BALANCES_QUERY,
  SUBMIT_LEAVE_REQUEST_MUTATION,
  GET_LEAVE_REQUESTS_QUERY,
  APPROVE_LEAVE_REQUEST_MUTATION,
  REJECT_LEAVE_REQUEST_MUTATION,
  SUBMIT_EMERGENCY_LEAVE_MUTATION,
  CANCEL_LEAVE_REQUEST_MUTATION,
  buildPaginationVariables,
  buildSortVariables,
  buildFilterVariables,
  extractEdges,
  extractPageInfo
} from '$lib/graphql/operations';

/**
 * Leave Management Service for MountainHR
 * 
 * Provides comprehensive leave management including:
 * - Leave request submission and approval
 * - Balance tracking and accruals
 * - Emergency leave handling
 * - Multi-level approval workflows
 * - Calendar integration and conflict detection
 */

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface LeaveRequestFilter {
  employeeId?: string;
  status?: ApprovalStatus[];
  leaveTypeId?: string;
  department?: string;
  urgency?: RequestUrgency[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  submittedDateRange?: {
    start?: string;
    end?: string;
  };
  isEmergency?: boolean;
}

export interface SubmitLeaveRequestInput {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  isEmergency?: boolean;
  medicalEvidence?: string;
  workCoverage?: {
    coveringEmployeeId?: string;
    coverageNotes?: string;
  };
  attachments?: Array<{
    filename: string;
    url: string;
    fileType: string;
  }>;
}

export interface ApproveLeaveInput {
  comments?: string;
  conditions?: string;
  effectiveDate?: string;
  delegateWork?: boolean;
  coveringEmployee?: string;
  followUpActions?: string[];
}

export interface RejectLeaveInput {
  reason: string;
  comments: string;
  category?: string;
  allowAppeal?: boolean;
  suggestedActions?: string[];
}

export interface EmergencyLeaveInput extends SubmitLeaveRequestInput {
  emergencyDetails: string;
  medicalCertificateWillProvide: boolean;
  immediateStart: boolean;
}

export interface LeaveServiceState {
  leaveRequests: LeaveRequest[];
  currentRequest: LeaveRequest | null;
  leaveBalances: LeaveBalance[];
  leaveTypes: LeaveType[];
  pendingApprovals: LeaveRequest[];
  upcomingLeave: LeaveRequest[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  filters: LeaveRequestFilter;
  pagination: {
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  sorting: {
    field: string;
    direction: 'ASC' | 'DESC';
  };
}

// =============================================================================
// Store Implementation
// =============================================================================

const createLeaveService = () => {
  const initialState: LeaveServiceState = {
    leaveRequests: [],
    currentRequest: null,
    leaveBalances: [],
    leaveTypes: [],
    pendingApprovals: [],
    upcomingLeave: [],
    totalCount: 0,
    isLoading: false,
    error: null,
    filters: {},
    pagination: {
      currentPage: 1,
      pageSize: 20,
      hasNextPage: false,
      hasPreviousPage: false
    },
    sorting: {
      field: 'submittedAt',
      direction: 'DESC'
    }
  };

  const { subscribe, set, update } = writable(initialState);

  return {
    subscribe,

    // =============================================================================
    // Leave Balance Management
    // =============================================================================

    async loadLeaveBalances(employeeId?: string) {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.query(GET_LEAVE_BALANCES_QUERY, { employeeId }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to load leave balances');
        }

        const balances = result.data.leaveBalances;

        update(state => ({
          ...state,
          leaveBalances: balances,
          isLoading: false
        }));

        return balances;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to load leave balances';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    // =============================================================================
    // Leave Request Management
    // =============================================================================

    async loadLeaveRequests(options?: {
      filters?: LeaveRequestFilter;
      pagination?: { page?: number; pageSize?: number };
      sorting?: { field?: string; direction?: 'ASC' | 'DESC' };
      reset?: boolean;
    }) {
      const { filters = {}, pagination = {}, sorting = {}, reset = false } = options || {};

      update(state => ({
        ...state,
        isLoading: true,
        error: null,
        ...(reset && { leaveRequests: [], currentPage: 1 })
      }));

      try {
        const currentState = get({ subscribe });
        
        const variables = {
          ...buildFilterVariables(filters),
          ...buildPaginationVariables(
            pagination.page || currentState.pagination.currentPage,
            pagination.pageSize || currentState.pagination.pageSize
          ),
          ...buildSortVariables(
            sorting.field || currentState.sorting.field,
            sorting.direction || currentState.sorting.direction
          )
        };

        const result = await client.query(GET_LEAVE_REQUESTS_QUERY, variables).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to load leave requests');
        }

        const requests = extractEdges<LeaveRequest>(result.data.leaveRequests);
        const pageInfo = extractPageInfo(result.data.leaveRequests);

        update(state => ({
          ...state,
          leaveRequests: reset ? requests : [...state.leaveRequests, ...requests],
          totalCount: result.data.leaveRequests.totalCount,
          pendingApprovals: requests.filter(req => 
            req.status === ApprovalStatus.PENDING || 
            req.status === ApprovalStatus.IN_REVIEW
          ),
          upcomingLeave: requests.filter(req => 
            req.status === ApprovalStatus.APPROVED &&
            new Date(req.startDate) > new Date()
          ),
          isLoading: false,
          filters: { ...state.filters, ...filters },
          pagination: {
            ...state.pagination,
            currentPage: pagination.page || state.pagination.currentPage,
            pageSize: pagination.pageSize || state.pagination.pageSize,
            hasNextPage: pageInfo.hasNextPage,
            hasPreviousPage: pageInfo.hasPreviousPage
          },
          sorting: {
            field: sorting.field || state.sorting.field,
            direction: sorting.direction || state.sorting.direction
          }
        }));

        return { requests, totalCount: result.data.leaveRequests.totalCount };
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to load leave requests';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async getMyLeaveRequests() {
      return this.loadLeaveRequests({
        filters: { employeeId: 'current-user-id' },
        reset: true
      });
    },

    async getPendingApprovals() {
      return this.loadLeaveRequests({
        filters: { 
          status: [ApprovalStatus.PENDING, ApprovalStatus.IN_REVIEW],
          department: 'current-manager-department'
        },
        reset: true
      });
    },

    // =============================================================================
    // Leave Request Submission
    // =============================================================================

    async submitLeaveRequest(input: SubmitLeaveRequestInput): Promise<LeaveRequest> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        // Validate leave balance first
        const hasBalance = await this.validateLeaveBalance(
          input.leaveTypeId, 
          input.startDate, 
          input.endDate
        );
        
        if (!hasBalance.valid) {
          throw new Error(hasBalance.error);
        }

        const result = await client.mutation(SUBMIT_LEAVE_REQUEST_MUTATION, { input }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to submit leave request');
        }

        const newRequest = result.data.submitLeaveRequest;

        update(state => ({
          ...state,
          leaveRequests: [newRequest, ...state.leaveRequests],
          totalCount: state.totalCount + 1,
          isLoading: false
        }));

        return newRequest;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to submit leave request';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async submitEmergencyLeave(input: EmergencyLeaveInput): Promise<LeaveRequest> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.mutation(SUBMIT_EMERGENCY_LEAVE_MUTATION, { input }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to submit emergency leave');
        }

        const emergencyRequest = result.data.submitEmergencyLeave;

        update(state => ({
          ...state,
          leaveRequests: [emergencyRequest, ...state.leaveRequests],
          totalCount: state.totalCount + 1,
          isLoading: false
        }));

        return emergencyRequest;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to submit emergency leave';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    // =============================================================================
    // Leave Request Approval
    // =============================================================================

    async approveLeaveRequest(requestId: string, input: ApproveLeaveInput): Promise<LeaveRequest> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.mutation(APPROVE_LEAVE_REQUEST_MUTATION, {
          requestId,
          input
        }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to approve leave request');
        }

        const approvedRequest = result.data.approveLeaveRequest;

        update(state => ({
          ...state,
          leaveRequests: state.leaveRequests.map(request => 
            request.id === requestId ? { ...request, ...approvedRequest } : request
          ),
          currentRequest: state.currentRequest?.id === requestId 
            ? { ...state.currentRequest, ...approvedRequest } 
            : state.currentRequest,
          pendingApprovals: state.pendingApprovals.filter(req => req.id !== requestId),
          upcomingLeave: approvedRequest.workflowComplete && approvedRequest.status === ApprovalStatus.APPROVED
            ? [...state.upcomingLeave, { ...state.leaveRequests.find(r => r.id === requestId)!, ...approvedRequest }]
            : state.upcomingLeave,
          isLoading: false
        }));

        return approvedRequest;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to approve leave request';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async rejectLeaveRequest(requestId: string, input: RejectLeaveInput): Promise<LeaveRequest> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.mutation(REJECT_LEAVE_REQUEST_MUTATION, {
          requestId,
          input
        }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to reject leave request');
        }

        const rejectedRequest = result.data.rejectLeaveRequest;

        update(state => ({
          ...state,
          leaveRequests: state.leaveRequests.map(request => 
            request.id === requestId ? { ...request, ...rejectedRequest } : request
          ),
          currentRequest: state.currentRequest?.id === requestId 
            ? { ...state.currentRequest, ...rejectedRequest } 
            : state.currentRequest,
          pendingApprovals: state.pendingApprovals.filter(req => req.id !== requestId),
          isLoading: false
        }));

        return rejectedRequest;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to reject leave request';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    // =============================================================================
    // Leave Request Cancellation
    // =============================================================================

    async cancelLeaveRequest(requestId: string, reason?: string): Promise<LeaveRequest> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.mutation(CANCEL_LEAVE_REQUEST_MUTATION, {
          requestId,
          reason
        }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to cancel leave request');
        }

        const cancelledRequest = result.data.cancelLeaveRequest;

        update(state => ({
          ...state,
          leaveRequests: state.leaveRequests.map(request => 
            request.id === requestId ? { ...request, ...cancelledRequest } : request
          ),
          currentRequest: state.currentRequest?.id === requestId 
            ? { ...state.currentRequest, ...cancelledRequest } 
            : state.currentRequest,
          upcomingLeave: state.upcomingLeave.filter(req => req.id !== requestId),
          isLoading: false
        }));

        // Refresh leave balances if balance was restored
        if (cancelledRequest.balanceRestored) {
          await this.loadLeaveBalances();
        }

        return cancelledRequest;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to cancel leave request';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    // =============================================================================
    // Validation and Business Logic
    // =============================================================================

    async validateLeaveBalance(leaveTypeId: string, startDate: string, endDate: string): Promise<{
      valid: boolean;
      availableDays?: number;
      requestedDays?: number;
      error?: string;
    }> {
      const currentState = get({ subscribe });
      const balance = currentState.leaveBalances.find(b => b.leaveType.id === leaveTypeId);
      
      if (!balance) {
        return { valid: false, error: 'Leave type not found' };
      }

      const requestedDays = this.calculateLeaveDays(startDate, endDate);
      
      if (requestedDays > balance.daysRemaining) {
        return { 
          valid: false, 
          availableDays: balance.daysRemaining,
          requestedDays,
          error: `Insufficient leave balance. Available: ${balance.daysRemaining} days, Requested: ${requestedDays} days`
        };
      }

      return { valid: true, availableDays: balance.daysRemaining, requestedDays };
    },

    calculateLeaveDays(startDate: string, endDate: string): number {
      const start = new Date(startDate);
      const end = new Date(endDate);
      let days = 0;
      
      const current = new Date(start);
      while (current <= end) {
        // Only count weekdays (Monday-Friday)
        if (current.getDay() >= 1 && current.getDay() <= 5) {
          days++;
        }
        current.setDate(current.getDate() + 1);
      }
      
      return days;
    },

    checkDateConflicts(startDate: string, endDate: string): LeaveRequest[] {
      const currentState = get({ subscribe });
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      return currentState.leaveRequests.filter(request => {
        if (request.status === ApprovalStatus.REJECTED || request.status === ApprovalStatus.CANCELLED) {
          return false;
        }
        
        const requestStart = new Date(request.startDate);
        const requestEnd = new Date(request.endDate);
        
        // Check for overlap
        return start <= requestEnd && end >= requestStart;
      });
    },

    async checkTeamAvailability(startDate: string, endDate: string, departmentId?: string): Promise<{
      availableTeammates: number;
      totalTeamSize: number;
      conflictingLeave: LeaveRequest[];
      coverageSuggestions: string[];
    }> {
      // This would integrate with team management service
      // For now, return mock data structure
      return {
        availableTeammates: 8,
        totalTeamSize: 10,
        conflictingLeave: this.checkDateConflicts(startDate, endDate),
        coverageSuggestions: [
          'Consider assigning tasks to John Doe',
          'Schedule project milestone before leave starts',
          'Arrange handover meeting with team lead'
        ]
      };
    },

    // =============================================================================
    // Analytics and Reporting
    // =============================================================================

    getLeaveUtilizationByType(): { [leaveType: string]: { used: number; available: number; percentage: number } } {
      const currentState = get({ subscribe });
      const utilization: { [leaveType: string]: { used: number; available: number; percentage: number } } = {};
      
      currentState.leaveBalances.forEach(balance => {
        const used = balance.daysUsed;
        const available = balance.totalDaysAllocated;
        const percentage = available > 0 ? (used / available) * 100 : 0;
        
        utilization[balance.leaveType.name] = {
          used,
          available,
          percentage
        };
      });
      
      return utilization;
    },

    getUpcomingLeaveCount(): number {
      const currentState = get({ subscribe });
      return currentState.upcomingLeave.length;
    },

    getPendingApprovalCount(): number {
      const currentState = get({ subscribe });
      return currentState.pendingApprovals.length;
    },

    getLeaveRequestsByMonth(): { [month: string]: number } {
      const currentState = get({ subscribe });
      const monthCounts: { [month: string]: number } = {};
      
      currentState.leaveRequests.forEach(request => {
        const month = new Date(request.startDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        });
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      });
      
      return monthCounts;
    },

    // =============================================================================
    // State Management
    // =============================================================================

    clearCurrentRequest() {
      update(state => ({ ...state, currentRequest: null }));
    },

    clearError() {
      update(state => ({ ...state, error: null }));
    },

    resetFilters() {
      update(state => ({
        ...state,
        filters: {},
        pagination: { ...initialState.pagination },
        sorting: { ...initialState.sorting }
      }));
    },

    // =============================================================================
    // Utility Methods
    // =============================================================================

    getRequestById(requestId: string): LeaveRequest | undefined {
      const currentState = get({ subscribe });
      return currentState.leaveRequests.find(request => request.id === requestId);
    },

    getBalanceByLeaveType(leaveTypeId: string): LeaveBalance | undefined {
      const currentState = get({ subscribe });
      return currentState.leaveBalances.find(balance => balance.leaveType.id === leaveTypeId);
    },

    isWithinNoticePolicy(startDate: string, leaveTypeId: string): boolean {
      // Business logic for notice requirements
      const noticeRequiredDays = 14; // 2 weeks notice
      const requestDate = new Date(startDate);
      const today = new Date();
      const daysUntilLeave = Math.ceil((requestDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysUntilLeave >= noticeRequiredDays;
    }
  };
};

// =============================================================================
// Create Service Instance
// =============================================================================

export const leaveService = createLeaveService();

// =============================================================================
// Derived Stores
// =============================================================================

export const leaveRequests = derived(leaveService, $leaveService => $leaveService.leaveRequests);

export const currentLeaveRequest = derived(leaveService, $leaveService => $leaveService.currentRequest);

export const leaveBalances = derived(leaveService, $leaveService => $leaveService.leaveBalances);

export const myLeaveBalance = derived(leaveService, $leaveService => $leaveService.leaveBalances);

export const pendingApprovals = derived(leaveService, $leaveService => $leaveService.pendingApprovals);

export const upcomingLeave = derived(leaveService, $leaveService => $leaveService.upcomingLeave);

export const isLoadingLeave = derived(leaveService, $leaveService => $leaveService.isLoading);

export const leaveError = derived(leaveService, $leaveService => $leaveService.error);

export const approvedLeaveRequests = derived(leaveRequests, $requests => 
  $requests.filter(request => request.status === ApprovalStatus.APPROVED)
);

export const myLeaveRequests = derived(leaveRequests, $requests => 
  $requests.filter(request => request.employee.id === 'current-user-id')
);

export const emergencyLeaveRequests = derived(leaveRequests, $requests => 
  $requests.filter(request => request.isEmergency)
);

// Additional derived store for pending leave requests that current user can approve
export const pendingLeaveRequests = derived(leaveService, $leaveService => 
  $leaveService.leaveRequests.filter(request => 
    request.status === ApprovalStatus.PENDING && 
    // Filter for requests the current user can approve (would need user context)
    true // For now, show all pending requests
  )
);

// Function to get upcoming leaves (leaves starting in the next 7 days)
export const getUpcomingLeaves = () => {
  const currentState = get(leaveService);
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  return currentState.leaveRequests.filter(request => {
    if (request.status !== ApprovalStatus.APPROVED) {
      return false;
    }
    
    const startDate = new Date(request.startDate);
    const today = new Date();
    
    // Check if leave starts within the next 7 days
    return startDate >= today && startDate <= sevenDaysFromNow;
  });
};

// =============================================================================
// Export Service as Default
// =============================================================================

export default leaveService;