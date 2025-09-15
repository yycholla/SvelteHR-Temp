import { writable, derived } from 'svelte/store';
import { hasuraClient } from '$lib/graphql/hasura-client';
import { 
  GET_MY_LEAVE_REQUESTS,
  GET_PENDING_LEAVE_REQUESTS,
  CREATE_LEAVE_REQUEST,
  UPDATE_LEAVE_REQUEST,
  GET_LEAVE_REQUEST_BY_ID,
  APPROVE_LEAVE_REQUEST,
  REJECT_LEAVE_REQUEST,
  CANCEL_LEAVE_REQUEST,
  GET_LEAVE_BALANCE,
  GET_LEAVE_TYPES
} from '$lib/graphql/hasura-operations';
import { currentUser } from './auth';
import type { 
  LeaveRequest, 
  LeaveType, 
  LeaveStatus, 
  LeaveBalance,
  CreateLeaveRequestInput,
  UpdateLeaveRequestInput 
} from '$lib/types';

// Stores
export const myLeaveRequests = writable<LeaveRequest[]>([]);
export const pendingLeaveRequests = writable<LeaveRequest[]>([]);
export const allLeaveRequests = writable<LeaveRequest[]>([]);
export const leaveBalances = writable<LeaveBalance[]>([]);
export const leaveTypes = writable<LeaveType[]>([]);
export const isLoadingLeave = writable(false);
export const leaveError = writable<string | null>(null);

// Derived stores
export const myPendingRequests = derived(
  myLeaveRequests,
  ($myLeaveRequests) => $myLeaveRequests.filter(req => req.status === 'PENDING')
);

export const myApprovedRequests = derived(
  myLeaveRequests,
  ($myLeaveRequests) => $myLeaveRequests.filter(req => req.status === 'APPROVED')
);

export const totalPendingRequests = derived(
  pendingLeaveRequests,
  ($pendingLeaveRequests) => $pendingLeaveRequests.length
);

class LeaveService {
  // Load current user's leave requests
  async loadMyLeaveRequests() {
    try {
      isLoadingLeave.set(true);
      leaveError.set(null);
      
      const response = await hasuraClient.query(GET_MY_LEAVE_REQUESTS, {});
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      myLeaveRequests.set(response.data?.leave_requests || []);
    } catch (error: any) {
      console.error('Failed to load my leave requests:', error);
      leaveError.set(error.message || 'Failed to load leave requests');
      myLeaveRequests.set([]);
    } finally {
      isLoadingLeave.set(false);
    }
  }

  // Load pending leave requests (for managers/HR)
  async loadPendingLeaveRequests() {
    try {
      isLoadingLeave.set(true);
      leaveError.set(null);
      
      const response = await hasuraClient.query(GET_PENDING_LEAVE_REQUESTS, {});
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      pendingLeaveRequests.set(response.data?.leave_requests || []);
    } catch (error: any) {
      console.error('Failed to load pending leave requests:', error);
      leaveError.set(error.message || 'Failed to load pending requests');
      pendingLeaveRequests.set([]);
    } finally {
      isLoadingLeave.set(false);
    }
  }

  // Load all leave requests (for HR/admin)
  async loadAllLeaveRequests() {
    try {
      isLoadingLeave.set(true);
      leaveError.set(null);
      
      // Note: Would need a GET_ALL_LEAVE_REQUESTS query
      const response = await hasuraClient.query(GET_MY_LEAVE_REQUESTS, {});
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      allLeaveRequests.set(response.data?.leave_requests || []);
    } catch (error: any) {
      console.error('Failed to load all leave requests:', error);
      leaveError.set(error.message || 'Failed to load all requests');
      allLeaveRequests.set([]);
    } finally {
      isLoadingLeave.set(false);
    }
  }

  // Get specific leave request by ID
  async getLeaveRequest(requestId: string): Promise<LeaveRequest> {
    try {
      const response = await hasuraClient.query(GET_LEAVE_REQUEST_BY_ID, {
        id: requestId
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data?.leave_request) {
        throw new Error('Leave request not found');
      }

      return response.data.leave_request;
    } catch (error: any) {
      console.error('Failed to get leave request:', error);
      throw error;
    }
  }

  // Create new leave request
  async createLeaveRequest(input: CreateLeaveRequestInput): Promise<LeaveRequest> {
    try {
      const response = await hasuraClient.mutation(CREATE_LEAVE_REQUEST, {
        object: input
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      const newRequest = response.data?.insert_leave_requests_one;
      if (!newRequest) {
        throw new Error('Failed to create leave request');
      }

      // Refresh the current user's requests
      this.loadMyLeaveRequests();

      return newRequest;
    } catch (error: any) {
      console.error('Failed to create leave request:', error);
      throw error;
    }
  }

  // Update existing leave request
  async updateLeaveRequest(requestId: string, input: UpdateLeaveRequestInput): Promise<LeaveRequest> {
    try {
      const response = await hasuraClient.mutation(UPDATE_LEAVE_REQUEST, {
        id: requestId,
        changes: input
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      const updatedRequest = response.data?.update_leave_requests_by_pk;
      if (!updatedRequest) {
        throw new Error('Failed to update leave request');
      }

      // Refresh requests
      this.loadMyLeaveRequests();
      this.loadPendingLeaveRequests();

      return updatedRequest;
    } catch (error: any) {
      console.error('Failed to update leave request:', error);
      throw error;
    }
  }

  // Approve leave request
  async approveLeaveRequest(requestId: string, approvalNotes?: string): Promise<void> {
    try {
      const response = await hasuraClient.mutation(APPROVE_LEAVE_REQUEST, {
        id: requestId,
        approvalNotes: approvalNotes || null
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      // Refresh requests
      this.loadPendingLeaveRequests();
      this.loadAllLeaveRequests();
    } catch (error: any) {
      console.error('Failed to approve leave request:', error);
      throw error;
    }
  }

  // Reject leave request
  async rejectLeaveRequest(requestId: string, rejectionReason: string): Promise<void> {
    try {
      const response = await hasuraClient.mutation(REJECT_LEAVE_REQUEST, {
        id: requestId,
        rejectionReason
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      // Refresh requests
      this.loadPendingLeaveRequests();
      this.loadAllLeaveRequests();
    } catch (error: any) {
      console.error('Failed to reject leave request:', error);
      throw error;
    }
  }

  // Cancel leave request
  async cancelLeaveRequest(requestId: string, cancellationReason?: string): Promise<void> {
    try {
      const response = await hasuraClient.mutation(CANCEL_LEAVE_REQUEST, {
        id: requestId,
        cancellationReason: cancellationReason || null
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      // Refresh requests
      this.loadMyLeaveRequests();
    } catch (error: any) {
      console.error('Failed to cancel leave request:', error);
      throw error;
    }
  }

  // Load user's leave balances
  async loadLeaveBalances(userId?: string) {
    try {
      const response = await hasuraClient.query(GET_LEAVE_BALANCE, {
        userId: userId || null // Will use current user if null
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      leaveBalances.set(response.data?.leave_balances || []);
    } catch (error: any) {
      console.error('Failed to load leave balances:', error);
      leaveError.set(error.message || 'Failed to load leave balances');
      leaveBalances.set([]);
    }
  }

  // Load available leave types
  async loadLeaveTypes() {
    try {
      const response = await hasuraClient.query(GET_LEAVE_TYPES, {});
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      leaveTypes.set(response.data?.leave_types || []);
    } catch (error: any) {
      console.error('Failed to load leave types:', error);
      leaveError.set(error.message || 'Failed to load leave types');
      leaveTypes.set([]);
    }
  }

  // Bulk approve requests
  async bulkApproveRequests(requestIds: string[], approvalNotes?: string): Promise<void> {
    try {
      for (const id of requestIds) {
        await this.approveLeaveRequest(id, approvalNotes);
      }
    } catch (error: any) {
      console.error('Failed to bulk approve requests:', error);
      throw error;
    }
  }

  // Bulk reject requests
  async bulkRejectRequests(requestIds: string[], rejectionReason: string): Promise<void> {
    try {
      for (const id of requestIds) {
        await this.rejectLeaveRequest(id, rejectionReason);
      }
    } catch (error: any) {
      console.error('Failed to bulk reject requests:', error);
      throw error;
    }
  }

  // Calculate leave days between dates
  calculateLeaveDays(startDate: Date, endDate: Date, includeWeekends = false): number {
    let totalDays = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      
      if (includeWeekends || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
        totalDays++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return totalDays;
  }

  // Check if user has sufficient leave balance
  async checkLeaveBalance(leaveType: string, requestedDays: number): Promise<boolean> {
    try {
      await this.loadLeaveBalances();
      
      const balances = await new Promise<LeaveBalance[]>((resolve) => {
        const unsubscribe = leaveBalances.subscribe((value) => {
          resolve(value);
          unsubscribe();
        });
      });

      const balance = balances.find(b => b.leaveType === leaveType);
      return balance ? balance.available >= requestedDays : false;
    } catch (error) {
      console.error('Failed to check leave balance:', error);
      return false;
    }
  }

  // Get upcoming leave for user
  getUpcomingLeave(requests: LeaveRequest[]): LeaveRequest[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return requests
      .filter(req => req.status === 'APPROVED' && new Date(req.startDate) >= today)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  // Get leave history for user
  getLeaveHistory(requests: LeaveRequest[]): LeaveRequest[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return requests
      .filter(req => new Date(req.endDate) < today)
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
  }

  // Reset all stores (useful for logout)
  resetStores() {
    myLeaveRequests.set([]);
    pendingLeaveRequests.set([]);
    allLeaveRequests.set([]);
    leaveBalances.set([]);
    leaveTypes.set([]);
    isLoadingLeave.set(false);
    leaveError.set(null);
  }
}

export const leaveService = new LeaveService();

// Auto-refresh on user change
currentUser.subscribe((user) => {
  if (user) {
    leaveService.loadMyLeaveRequests();
    leaveService.loadLeaveBalances();
    leaveService.loadLeaveTypes();
  } else {
    leaveService.resetStores();
  }
});