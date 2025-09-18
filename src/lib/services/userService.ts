import { writable, derived, get } from 'svelte/store';
import { createUrqlClient } from '$lib/graphql/client';
import type { User } from '$lib/stores/auth';
import {
  GET_ALL_USERS,
  GET_USER_BY_ID,
  CREATE_USER,
  UPDATE_USER
} from '$lib/graphql/postgraphile-operations';

/**
 * User Management Service for MountainHR
 * 
 * Provides comprehensive user and employee management including:
 * - User CRUD operations
 * - Employee profile management
 * - Role and permission assignment
 * - Department transfers
 * - Search and filtering
 */

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface UserFilter {
  isActive?: boolean;
  onboardingStatus?: string[];
  departmentId?: string;
  roleId?: string;
  searchQuery?: string;
  hireDate?: {
    start?: string;
    end?: string;
  };
}

export interface CreateUserInput {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  jobTitle: string;
  departmentId: string;
  roleIds: string[];
  hireDate: string;
  employmentType: string;
  isRemote?: boolean;
  managerId?: string;
  phoneNumber?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZipCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  salary?: number;
  payType?: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  departmentId?: string;
  isActive?: boolean;
  phoneNumber?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZipCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  managerId?: string;
  notes?: string;
}

export interface UserServiceState {
  users: User[];
  currentUser: User | null;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  filters: UserFilter;
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

const createUserService = () => {
  const initialState: UserServiceState = {
    users: [],
    currentUser: null,
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
      field: 'displayName',
      direction: 'ASC'
    }
  };

  const { subscribe, set, update } = writable(initialState);

  return {
    subscribe,

    // =============================================================================
    // User Listing and Search
    // =============================================================================

    async loadUsers(options?: {
      filters?: UserFilter;
      pagination?: { page?: number; pageSize?: number };
      sorting?: { field?: string; direction?: 'ASC' | 'DESC' };
      reset?: boolean;
    }) {
      const { filters = {}, pagination = {}, sorting = {}, reset = false } = options || {};

      update(state => ({
        ...state,
        isLoading: true,
        error: null,
        ...(reset && { users: [], currentPage: 1 })
      }));

      try {
        // Create client instance
        const client = createUrqlClient();

        // Simple query for PostGraphile
        const result = await client.query(GET_ALL_USERS, {}).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to load users');
        }

        // PostGraphile returns allUsers.nodes structure
        const users = result.data?.allUsers?.nodes || [];
        const pageInfo = {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null
        };

        update(state => ({
          ...state,
          users: reset ? users : [...state.users, ...users],
          totalCount: users.length,
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

        return { users, totalCount: users.length };
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to load users';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async searchUsers(query: string) {
      return this.loadUsers({
        filters: { searchQuery: query },
        reset: true
      });
    },

    async filterUsers(filters: UserFilter) {
      return this.loadUsers({
        filters,
        pagination: { page: 1 },
        reset: true
      });
    },

    async sortUsers(field: string, direction: 'ASC' | 'DESC' = 'ASC') {
      return this.loadUsers({
        sorting: { field, direction },
        pagination: { page: 1 },
        reset: true
      });
    },

    async loadNextPage() {
      const currentState = get({ subscribe });
      if (!currentState.pagination.hasNextPage) return;

      return this.loadUsers({
        pagination: { page: currentState.pagination.currentPage + 1 }
      });
    },

    // =============================================================================
    // Individual User Management
    // =============================================================================

    async getUserDetails(userId: string): Promise<any> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const client = createUrqlClient();
        const result = await client.query(GET_USER_BY_ID, { id: userId }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to load user details');
        }

        const user = result.data?.userById;

        update(state => ({
          ...state,
          currentUser: user,
          isLoading: false
        }));

        return user;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to load user details';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async createUser(input: CreateUserInput): Promise<any> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const client = createUrqlClient();

        // Transform input to PostGraphile format
        const userInput = {
          email: input.email,
          displayName: `${input.firstName} ${input.lastName}`,
          jobTitle: input.jobTitle,
          onboardingStatus: 'PreHire',
          isActive: true,
          passwordHash: 'temp_password_hash' // This should be handled properly in production
        };

        const result = await client.mutation(CREATE_USER, { input: { user: userInput } }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to create user');
        }

        const newUser = result.data?.createUser?.user;

        update(state => ({
          ...state,
          users: [newUser, ...state.users],
          totalCount: state.totalCount + 1,
          isLoading: false
        }));

        return newUser;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to create user';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async updateUser(userId: string, input: UpdateUserInput): Promise<any> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const client = createUrqlClient();

        // Transform input to PostGraphile format
        const userPatch: any = {};
        if (input.firstName && input.lastName) {
          userPatch.displayName = `${input.firstName} ${input.lastName}`;
        }
        if (input.jobTitle) userPatch.jobTitle = input.jobTitle;
        if (input.isActive !== undefined) userPatch.isActive = input.isActive;

        const result = await client.mutation(UPDATE_USER_BY_ID, {
          input: {
            id: userId,
            userPatch: userPatch
          }
        }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to update user');
        }

        const updatedUser = result.data?.updateUserById?.user;

        update(state => ({
          ...state,
          users: state.users.map(user => 
            user.id === userId ? { ...user, ...updatedUser } : user
          ),
          currentUser: state.currentUser?.id === userId 
            ? { ...state.currentUser, ...updatedUser } 
            : state.currentUser,
          isLoading: false
        }));

        return updatedUser;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to update user';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async deactivateUser(userId: string, reason?: string): Promise<void> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.mutation(DEACTIVATE_USER_MUTATION, {
          id: userId,
          reason
        }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to deactivate user');
        }

        const deactivatedUser = result.data.deactivateUser;

        update(state => ({
          ...state,
          users: state.users.map(user => 
            user.id === userId ? { ...user, isActive: false } : user
          ),
          currentUser: state.currentUser?.id === userId 
            ? { ...state.currentUser, isActive: false } 
            : state.currentUser,
          isLoading: false
        }));
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to deactivate user';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async assignRole(userId: string, roleId: string): Promise<void> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.mutation(ASSIGN_ROLE_MUTATION, {
          userId,
          roleId
        }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to assign role');
        }

        // Refresh user details to get updated roles
        if (get({ subscribe }).currentUser?.id === userId) {
          await this.getUserDetails(userId);
        }

        update(state => ({ ...state, isLoading: false }));
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to assign role';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    // =============================================================================
    // Bulk Operations
    // =============================================================================

    async bulkUpdateUsers(userIds: string[], updates: UpdateUserInput): Promise<void> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const updatePromises = userIds.map(userId => 
          this.updateUser(userId, updates)
        );

        await Promise.all(updatePromises);

        update(state => ({ ...state, isLoading: false }));
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to bulk update users';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async bulkDeactivateUsers(userIds: string[], reason?: string): Promise<void> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const deactivatePromises = userIds.map(userId => 
          this.deactivateUser(userId, reason)
        );

        await Promise.all(deactivatePromises);

        update(state => ({ ...state, isLoading: false }));
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to bulk deactivate users';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    // =============================================================================
    // State Management
    // =============================================================================

    clearCurrentUser() {
      update(state => ({ ...state, currentUser: null }));
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

    setPageSize(pageSize: number) {
      update(state => ({
        ...state,
        pagination: { ...state.pagination, pageSize, currentPage: 1 }
      }));
    },

    // =============================================================================
    // Utility Methods
    // =============================================================================

    getUserById(userId: string): User | undefined {
      const currentState = get({ subscribe });
      return currentState.users.find(user => user.id === userId);
    },

    getUsersByDepartment(departmentId: string): User[] {
      const currentState = get({ subscribe });
      return currentState.users.filter(user => user.department?.id === departmentId);
    },

    getActiveUsers(): User[] {
      const currentState = get({ subscribe });
      return currentState.users.filter(user => user.isActive);
    },

    getUsersByRole(roleName: string): User[] {
      const currentState = get({ subscribe });
      return currentState.users.filter(user => 
        user.roles.some(role => role.name === roleName)
      );
    },

    // Statistics
    getTotalUsers(): number {
      const currentState = get({ subscribe });
      return currentState.totalCount;
    },

    getActiveUserCount(): number {
      const currentState = get({ subscribe });
      return currentState.users.filter(user => user.isActive).length;
    },

    getNewHiresCount(days: number = 30): number {
      const currentState = get({ subscribe });
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      return currentState.users.filter(user => {
        if (!user.jobInfo?.hireDate) return false;
        return new Date(user.jobInfo.hireDate) >= cutoffDate;
      }).length;
    }
  };
};

// =============================================================================
// Create Service Instance
// =============================================================================

export const userService = createUserService();

// =============================================================================
// Derived Stores
// =============================================================================

export const users = derived(userService, $userService => $userService.users);

export const currentUser = derived(userService, $userService => $userService.currentUser);

export const isLoadingUsers = derived(userService, $userService => $userService.isLoading);

export const userError = derived(userService, $userService => $userService.error);

export const activeUsers = derived(users, $users => 
  $users.filter(user => user.isActive)
);

export const inactiveUsers = derived(users, $users => 
  $users.filter(user => !user.isActive)
);

export const usersPagination = derived(userService, $userService => $userService.pagination);

export const usersFilters = derived(userService, $userService => $userService.filters);

export const usersSorting = derived(userService, $userService => $userService.sorting);

// Dashboard analytics functions
export const getActiveUserCount = () => {
  return derived(activeUsers, $activeUsers => $activeUsers.length);
};

export const getNewHiresCount = () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return derived(users, $users => 
    $users.filter(user => new Date(user.createdAt) >= thirtyDaysAgo).length
  );
};

// =============================================================================
// Reactive Search and Filters
// =============================================================================

export const createUserSearch = () => {
  const searchQuery = writable('');
  const debounceTimeout = writable<NodeJS.Timeout | null>(null);

  return {
    searchQuery: { subscribe: searchQuery.subscribe },
    
    search: (query: string) => {
      searchQuery.set(query);
      
      // Clear previous timeout
      const timeout = get(debounceTimeout);
      if (timeout) clearTimeout(timeout);

      // Set new timeout for debounced search
      const newTimeout = setTimeout(() => {
        if (query.trim()) {
          userService.searchUsers(query.trim());
        } else {
          userService.loadUsers({ reset: true });
        }
      }, 300);

      debounceTimeout.set(newTimeout);
    },

    clear: () => {
      searchQuery.set('');
      userService.resetFilters();
      userService.loadUsers({ reset: true });
    }
  };
};

// =============================================================================
// Export Service as Default
// =============================================================================

export default userService;