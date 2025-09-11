import { writable, derived, get } from 'svelte/store';
import { client } from '$lib/graphql/client';
import type { AttendanceRecord, WorkLocation, User } from '$lib/types';
import { AttendanceStatus } from '$lib/types';
import {
  CLOCK_IN_MUTATION,
  CLOCK_OUT_MUTATION,
  GET_ATTENDANCE_RECORDS_QUERY,
  CREATE_WORK_SCHEDULE_MUTATION,
  START_BREAK_MUTATION,
  GET_OVERTIME_REPORT_QUERY,
  START_REMOTE_WORK_MUTATION,
  buildPaginationVariables,
  buildSortVariables,
  buildFilterVariables,
  extractEdges,
  extractPageInfo
} from '$lib/graphql/operations';

/**
 * Attendance Management Service for MountainHR
 * 
 * Provides comprehensive attendance tracking including:
 * - Clock in/out operations with location tracking
 * - Work schedule management
 * - Break and lunch tracking
 * - Remote work monitoring
 * - Overtime calculations and compliance
 * - Attendance reporting and analytics
 */

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface AttendanceFilter {
  employeeId?: string;
  departmentId?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
  status?: AttendanceStatus[];
  workLocation?: WorkLocation[];
  isOvertime?: boolean;
}

export interface ClockInInput {
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  deviceInfo?: {
    type: string;
    identifier: string;
    ipAddress?: string;
  };
  workLocation: WorkLocation;
  notes?: string;
}

export interface ClockOutInput {
  workSummary?: string;
  tasksCompleted?: string[];
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  productivity?: {
    goalsAchieved: number;
    issuesEncountered: string[];
  };
}

export interface StartBreakInput {
  breakType: 'LUNCH' | 'SHORT_BREAK' | 'PERSONAL' | 'MEETING';
  scheduledDuration: number;
  notes?: string;
}

export interface WorkScheduleInput {
  employeeId: string;
  shiftId: string;
  effectiveFrom: string;
  effectiveTo?: string;
  scheduleType: 'REGULAR' | 'FLEXIBLE' | 'SHIFT' | 'REMOTE';
  workPattern: {
    hoursPerDay: number;
    workDaysPerWeek: number;
    flexibleHours: boolean;
  };
  breaks: Array<{
    name: string;
    startTime: string;
    duration: number;
    isPaid: boolean;
  }>;
}

export interface RemoteWorkInput {
  remoteLocation: {
    description: string;
    homeOfficeSetup: boolean;
  };
  dailyGoals: string;
  taskTargets: string[];
  connectivityInfo?: {
    internetSpeed: string;
    vpnConnected: boolean;
  };
}

export interface AttendanceServiceState {
  attendanceRecords: AttendanceRecord[];
  currentRecord: AttendanceRecord | null;
  isCurrentlyClockedIn: boolean;
  currentBreak: {
    isOnBreak: boolean;
    breakType?: string;
    startTime?: string;
    scheduledDuration?: number;
  };
  todaysSummary: {
    clockInTime?: string;
    clockOutTime?: string;
    totalHours: number;
    regularHours: number;
    overtimeHours: number;
    breakDuration: number;
    status: AttendanceStatus;
  };
  overtimeAlert: {
    isNearLimit: boolean;
    hoursUntilLimit: number;
    weeklyTotal: number;
  };
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  filters: AttendanceFilter;
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

const createAttendanceService = () => {
  const initialState: AttendanceServiceState = {
    attendanceRecords: [],
    currentRecord: null,
    isCurrentlyClockedIn: false,
    currentBreak: {
      isOnBreak: false
    },
    todaysSummary: {
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      breakDuration: 0,
      status: AttendanceStatus.ABSENT
    },
    overtimeAlert: {
      isNearLimit: false,
      hoursUntilLimit: 40,
      weeklyTotal: 0
    },
    totalCount: 0,
    isLoading: false,
    error: null,
    filters: {},
    pagination: {
      currentPage: 1,
      pageSize: 31, // Month view
      hasNextPage: false,
      hasPreviousPage: false
    },
    sorting: {
      field: 'date',
      direction: 'DESC'
    }
  };

  const { subscribe, set, update } = writable(initialState);

  return {
    subscribe,

    // =============================================================================
    // Clock In/Out Operations
    // =============================================================================

    async clockIn(input: ClockInInput): Promise<AttendanceRecord> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.mutation(CLOCK_IN_MUTATION, { input }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to clock in');
        }

        const clockInRecord = result.data.clockIn;

        update(state => ({
          ...state,
          currentRecord: clockInRecord,
          isCurrentlyClockedIn: true,
          todaysSummary: {
            ...state.todaysSummary,
            clockInTime: clockInRecord.clockInTime,
            status: clockInRecord.isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT
          },
          isLoading: false
        }));

        return clockInRecord;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to clock in';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async clockOut(input: ClockOutInput): Promise<AttendanceRecord> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.mutation(CLOCK_OUT_MUTATION, { input }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to clock out');
        }

        const clockOutRecord = result.data.clockOut;

        update(state => ({
          ...state,
          currentRecord: clockOutRecord,
          isCurrentlyClockedIn: false,
          todaysSummary: {
            ...state.todaysSummary,
            clockOutTime: clockOutRecord.clockOutTime,
            totalHours: clockOutRecord.totalHours,
            regularHours: clockOutRecord.regularHours,
            overtimeHours: clockOutRecord.overtimeHours,
            breakDuration: clockOutRecord.breakDuration,
            status: clockOutRecord.isEarlyDeparture ? AttendanceStatus.EARLY_DEPARTURE : AttendanceStatus.PRESENT
          },
          // Add to attendance records
          attendanceRecords: [clockOutRecord, ...state.attendanceRecords],
          isLoading: false
        }));

        // Check overtime alerts
        this.checkOvertimeAlert();

        return clockOutRecord;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to clock out';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    // =============================================================================
    // Break Management
    // =============================================================================

    async startBreak(input: StartBreakInput): Promise<void> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.mutation(START_BREAK_MUTATION, { input }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to start break');
        }

        const breakRecord = result.data.startBreak;

        update(state => ({
          ...state,
          currentBreak: {
            isOnBreak: true,
            breakType: breakRecord.breakType,
            startTime: breakRecord.startTime,
            scheduledDuration: breakRecord.scheduledDuration
          },
          isLoading: false
        }));
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to start break';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async endBreak(): Promise<void> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        // This would call an end break mutation
        // For now, we'll just update the local state
        update(state => ({
          ...state,
          currentBreak: {
            isOnBreak: false
          },
          isLoading: false
        }));
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to end break';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    // =============================================================================
    // Remote Work Management
    // =============================================================================

    async startRemoteWork(input: RemoteWorkInput): Promise<void> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.mutation(START_REMOTE_WORK_MUTATION, { input }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to start remote work');
        }

        const remoteWorkRecord = result.data.startRemoteWork;

        update(state => ({
          ...state,
          currentRecord: remoteWorkRecord,
          isCurrentlyClockedIn: true,
          todaysSummary: {
            ...state.todaysSummary,
            clockInTime: remoteWorkRecord.startTime,
            status: AttendanceStatus.PRESENT
          },
          isLoading: false
        }));

        return remoteWorkRecord;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to start remote work';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    // =============================================================================
    // Attendance Records Management
    // =============================================================================

    async loadAttendanceRecords(options?: {
      filters?: AttendanceFilter;
      pagination?: { page?: number; pageSize?: number };
      sorting?: { field?: string; direction?: 'ASC' | 'DESC' };
      reset?: boolean;
    }) {
      const { filters = {}, pagination = {}, sorting = {}, reset = false } = options || {};

      update(state => ({
        ...state,
        isLoading: true,
        error: null,
        ...(reset && { attendanceRecords: [], currentPage: 1 })
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

        const result = await client.query(GET_ATTENDANCE_RECORDS_QUERY, variables).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to load attendance records');
        }

        const records = extractEdges<AttendanceRecord>(result.data.attendanceRecords);
        const pageInfo = extractPageInfo(result.data.attendanceRecords);

        update(state => ({
          ...state,
          attendanceRecords: reset ? records : [...state.attendanceRecords, ...records],
          totalCount: result.data.attendanceRecords.totalCount,
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

        return { records, totalCount: result.data.attendanceRecords.totalCount };
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to load attendance records';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async getMyAttendance(dateRange?: { start: string; end: string }) {
      return this.loadAttendanceRecords({
        filters: { 
          employeeId: 'current-user-id',
          dateRange 
        },
        reset: true
      });
    },

    async getTodaysAttendance() {
      const today = new Date().toISOString().split('T')[0];
      return this.loadAttendanceRecords({
        filters: { 
          employeeId: 'current-user-id',
          dateRange: { start: today, end: today }
        },
        reset: true
      });
    },

    // =============================================================================
    // Work Schedule Management
    // =============================================================================

    async createWorkSchedule(input: WorkScheduleInput): Promise<void> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.mutation(CREATE_WORK_SCHEDULE_MUTATION, { input }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to create work schedule');
        }

        update(state => ({ ...state, isLoading: false }));

        return result.data.createWorkSchedule;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to create work schedule';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    // =============================================================================
    // Overtime and Compliance
    // =============================================================================

    async loadOvertimeReport(filter: {
      departmentId?: string;
      period: 'WEEK' | 'MONTH' | 'QUARTER';
      year: number;
      month?: number;
    }) {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.query(GET_OVERTIME_REPORT_QUERY, { filter }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to load overtime report');
        }

        update(state => ({ ...state, isLoading: false }));

        return result.data.overtimeReport;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to load overtime report';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    checkOvertimeAlert() {
      const currentState = get({ subscribe });
      const weeklyHours = this.getWeeklyHours();
      const regularHoursLimit = 40;
      const hoursUntilLimit = Math.max(0, regularHoursLimit - weeklyHours);
      
      update(state => ({
        ...state,
        overtimeAlert: {
          isNearLimit: weeklyHours >= 35, // Alert at 35 hours
          hoursUntilLimit,
          weeklyTotal: weeklyHours
        }
      }));
    },

    // =============================================================================
    // Analytics and Calculations
    // =============================================================================

    getWeeklyHours(): number {
      const currentState = get({ subscribe });
      const now = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      
      return currentState.attendanceRecords
        .filter(record => {
          const recordDate = new Date(record.date);
          return recordDate >= weekStart;
        })
        .reduce((total, record) => total + record.totalHours, 0);
    },

    getMonthlyHours(): number {
      const currentState = get({ subscribe });
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      return currentState.attendanceRecords
        .filter(record => {
          const recordDate = new Date(record.date);
          return recordDate >= monthStart;
        })
        .reduce((total, record) => total + record.totalHours, 0);
    },

    getAttendanceRate(days: number = 30): number {
      const currentState = get({ subscribe });
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const recentRecords = currentState.attendanceRecords.filter(record => 
        new Date(record.date) >= cutoffDate
      );
      
      const presentDays = recentRecords.filter(record => 
        record.status === AttendanceStatus.PRESENT || record.status === AttendanceStatus.LATE
      ).length;
      
      const workingDays = this.getWorkingDaysInPeriod(cutoffDate, new Date());
      
      return workingDays > 0 ? (presentDays / workingDays) * 100 : 0;
    },

    getWorkingDaysInPeriod(start: Date, end: Date): number {
      let workingDays = 0;
      const current = new Date(start);
      
      while (current <= end) {
        // Count weekdays only (Monday-Friday)
        if (current.getDay() >= 1 && current.getDay() <= 5) {
          workingDays++;
        }
        current.setDate(current.getDate() + 1);
      }
      
      return workingDays;
    },

    getAverageHoursPerDay(): number {
      const currentState = get({ subscribe });
      if (currentState.attendanceRecords.length === 0) return 0;
      
      const totalHours = currentState.attendanceRecords
        .reduce((total, record) => total + record.totalHours, 0);
      
      return totalHours / currentState.attendanceRecords.length;
    },

    // =============================================================================
    // Statistics Functions for Dashboard
    // =============================================================================

    getTodaysAttendanceStats() {
      const currentState = get({ subscribe });
      const today = new Date().toISOString().split('T')[0];
      
      // Filter today's attendance records
      const todaysRecords = currentState.attendanceRecords.filter(record => 
        record.date === today
      );

      const todayRecord = todaysRecords[0] || null;
      const isCurrentlyWorking = currentState.isCurrentlyClockedIn;
      const currentDuration = this.getCurrentWorkDuration();

      return {
        isWorking: isCurrentlyWorking,
        clockInTime: currentState.todaysSummary.clockInTime,
        clockOutTime: currentState.todaysSummary.clockOutTime,
        totalHours: todayRecord?.totalHours || currentDuration,
        regularHours: todayRecord?.regularHours || Math.min(currentDuration, 8),
        overtimeHours: todayRecord?.overtimeHours || Math.max(0, currentDuration - 8),
        breakDuration: currentState.todaysSummary.breakDuration,
        status: currentState.todaysSummary.status,
        currentWorkDuration: currentDuration,
        isOnBreak: currentState.currentBreak.isOnBreak,
        breakType: currentState.currentBreak.breakType,
        productivity: {
          hoursWorked: todayRecord?.totalHours || currentDuration,
          tasksCompleted: todayRecord?.tasksCompleted?.length || 0,
          goalsAchieved: todayRecord?.productivity?.goalsAchieved || 0
        }
      };
    },

    getWeeklyAttendanceStats() {
      const currentState = get({ subscribe });
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // End of current week (Saturday)
      weekEnd.setHours(23, 59, 59, 999);

      // Filter records for current week
      const weeklyRecords = currentState.attendanceRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= weekStart && recordDate <= weekEnd;
      });

      // Calculate daily stats
      const dailyStats = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        const dayString = day.toISOString().split('T')[0];
        
        const dayRecord = weeklyRecords.find(record => record.date === dayString);
        
        dailyStats.push({
          date: dayString,
          dayName: day.toLocaleDateString('en-US', { weekday: 'short' }),
          hours: dayRecord?.totalHours || 0,
          status: dayRecord?.status || AttendanceStatus.ABSENT,
          isToday: dayString === now.toISOString().split('T')[0]
        });
      }

      // Calculate weekly totals
      const totalHours = weeklyRecords.reduce((sum, record) => sum + record.totalHours, 0);
      const regularHours = weeklyRecords.reduce((sum, record) => sum + record.regularHours, 0);
      const overtimeHours = weeklyRecords.reduce((sum, record) => sum + record.overtimeHours, 0);
      const presentDays = weeklyRecords.filter(record => 
        record.status === AttendanceStatus.PRESENT || record.status === AttendanceStatus.LATE
      ).length;

      // Calculate expected working days (weekdays only)
      const expectedWorkingDays = this.getWorkingDaysInPeriod(weekStart, now > weekEnd ? weekEnd : now);
      const attendanceRate = expectedWorkingDays > 0 ? (presentDays / expectedWorkingDays) * 100 : 0;

      return {
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        totalHours,
        regularHours,
        overtimeHours,
        presentDays,
        expectedWorkingDays,
        attendanceRate: Math.round(attendanceRate),
        dailyStats,
        averageHoursPerDay: presentDays > 0 ? totalHours / presentDays : 0,
        overtimeAlert: currentState.overtimeAlert,
        summary: {
          onTimeCount: weeklyRecords.filter(r => r.status === AttendanceStatus.PRESENT).length,
          lateCount: weeklyRecords.filter(r => r.status === AttendanceStatus.LATE).length,
          absentCount: expectedWorkingDays - presentDays,
          earlyDepartureCount: weeklyRecords.filter(r => r.status === AttendanceStatus.EARLY_DEPARTURE).length
        }
      };
    },

    // =============================================================================
    // Time Calculations
    // =============================================================================

    getCurrentWorkDuration(): number {
      const currentState = get({ subscribe });
      if (!currentState.isCurrentlyClockedIn || !currentState.todaysSummary.clockInTime) {
        return 0;
      }
      
      const clockInTime = new Date(currentState.todaysSummary.clockInTime);
      const now = new Date();
      const durationMs = now.getTime() - clockInTime.getTime();
      
      return Math.max(0, durationMs / (1000 * 60 * 60)); // Hours
    },

    getBreakDuration(): number {
      const currentState = get({ subscribe });
      if (!currentState.currentBreak.isOnBreak || !currentState.currentBreak.startTime) {
        return 0;
      }
      
      const breakStart = new Date(currentState.currentBreak.startTime);
      const now = new Date();
      const durationMs = now.getTime() - breakStart.getTime();
      
      return Math.max(0, durationMs / (1000 * 60)); // Minutes
    },

    // =============================================================================
    // State Management
    // =============================================================================

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

    isWorkingHours(): boolean {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();
      
      // Monday-Friday, 8 AM - 6 PM
      return day >= 1 && day <= 5 && hour >= 8 && hour < 18;
    },

    canClockIn(): boolean {
      const currentState = get({ subscribe });
      return !currentState.isCurrentlyClockedIn && !currentState.currentBreak.isOnBreak;
    },

    canClockOut(): boolean {
      const currentState = get({ subscribe });
      return currentState.isCurrentlyClockedIn && !currentState.currentBreak.isOnBreak;
    },

    canStartBreak(): boolean {
      const currentState = get({ subscribe });
      return currentState.isCurrentlyClockedIn && !currentState.currentBreak.isOnBreak;
    },

    canEndBreak(): boolean {
      const currentState = get({ subscribe });
      return currentState.currentBreak.isOnBreak;
    }
  };
};

// =============================================================================
// Create Service Instance
// =============================================================================

export const attendanceService = createAttendanceService();

// =============================================================================
// Derived Stores
// =============================================================================

export const attendanceRecords = derived(attendanceService, $attendanceService => 
  $attendanceService.attendanceRecords
);

export const currentAttendanceRecord = derived(attendanceService, $attendanceService => 
  $attendanceService.currentRecord
);

export const isCurrentlyClockedIn = derived(attendanceService, $attendanceService => 
  $attendanceService.isCurrentlyClockedIn
);

export const currentBreak = derived(attendanceService, $attendanceService => 
  $attendanceService.currentBreak
);

export const todaysSummary = derived(attendanceService, $attendanceService => 
  $attendanceService.todaysSummary
);

export const overtimeAlert = derived(attendanceService, $attendanceService => 
  $attendanceService.overtimeAlert
);

export const isLoadingAttendance = derived(attendanceService, $attendanceService => 
  $attendanceService.isLoading
);

export const attendanceError = derived(attendanceService, $attendanceService => 
  $attendanceService.error
);

export const currentWorkDuration = derived(
  [attendanceService], 
  ([$attendanceService]) => attendanceService.getCurrentWorkDuration()
);

export const currentBreakDuration = derived(
  [attendanceService], 
  ([$attendanceService]) => attendanceService.getBreakDuration()
);

// =============================================================================
// Statistics Functions Export
// =============================================================================

export const getTodaysAttendanceStats = () => attendanceService.getTodaysAttendanceStats();
export const getWeeklyAttendanceStats = () => attendanceService.getWeeklyAttendanceStats();

// =============================================================================
// Export Service as Default
// =============================================================================

export default attendanceService;