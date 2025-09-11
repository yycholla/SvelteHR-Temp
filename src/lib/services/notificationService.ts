import { writable, derived, get } from 'svelte/store';
import { client } from '$lib/graphql/client';
import type { 
  Notification, 
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  NotificationPreferences,
  PaginationInput, 
  SortInput, 
  FilterInput, 
  Connection 
} from '$lib/types';
import {
  GET_NOTIFICATIONS_QUERY,
  GET_NOTIFICATION_PREFERENCES_QUERY,
  UPDATE_NOTIFICATION_PREFERENCES_MUTATION,
  MARK_NOTIFICATION_READ_MUTATION,
  MARK_ALL_NOTIFICATIONS_READ_MUTATION,
  DELETE_NOTIFICATION_MUTATION,
  SUBSCRIBE_NOTIFICATIONS,
  GET_NOTIFICATION_ANALYTICS_QUERY,
  buildPaginationVariables,
  buildSortVariables,
  buildFilterVariables,
  extractEdges,
  extractPageInfo
} from '$lib/graphql/operations';

/**
 * Notification Management Service for MountainHR
 * 
 * Provides comprehensive notification management including:
 * - Real-time notification delivery
 * - Multi-channel notification support (in-app, email, SMS, push)
 * - User preference management
 * - Notification categorization and filtering
 * - Read/unread status tracking
 * - Analytics and engagement metrics
 * - Template-based notifications
 */

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface NotificationFilter {
  isRead?: boolean;
  type?: NotificationType[];
  priority?: NotificationPriority[];
  channel?: NotificationChannel[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  searchQuery?: string;
  senderId?: string;
  category?: string;
}

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  recipientIds: string[];
  channels: NotificationChannel[];
  actionUrl?: string;
  actionText?: string;
  data?: Record<string, any>;
  scheduleFor?: string; // ISO datetime for scheduled notifications
  expiresAt?: string;   // ISO datetime for expiration
}

export interface NotificationPreferencesInput {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  categories: {
    [category: string]: {
      enabled: boolean;
      channels: NotificationChannel[];
      priority: NotificationPriority;
    };
  };
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string;   // HH:mm format
    timezone: string;
  };
}

export interface NotificationServiceState {
  notifications: Notification[];
  unreadNotifications: Notification[];
  preferences: NotificationPreferences | null;
  totalCount: number;
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  filters: NotificationFilter;
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
  subscriptions: {
    notifications: boolean;
  };
}

// =============================================================================
// Store Implementation
// =============================================================================

const createNotificationService = () => {
  const initialState: NotificationServiceState = {
    notifications: [],
    unreadNotifications: [],
    preferences: null,
    totalCount: 0,
    unreadCount: 0,
    isLoading: false,
    error: null,
    filters: {},
    pagination: {
      currentPage: 1,
      pageSize: 50,
      hasNextPage: false,
      hasPreviousPage: false
    },
    sorting: {
      field: 'createdAt',
      direction: 'DESC'
    },
    subscriptions: {
      notifications: false
    }
  };

  const { subscribe, set, update } = writable(initialState);

  return {
    subscribe,

    // =============================================================================
    // Notification Listing and Management
    // =============================================================================

    async loadNotifications(options?: {
      filters?: NotificationFilter;
      pagination?: { page?: number; pageSize?: number };
      sorting?: { field?: string; direction?: 'ASC' | 'DESC' };
      reset?: boolean;
    }) {
      const { filters = {}, pagination = {}, sorting = {}, reset = false } = options || {};

      update(state => ({
        ...state,
        isLoading: true,
        error: null,
        ...(reset && { notifications: [], currentPage: 1 })
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

        const result = await client.query(GET_NOTIFICATIONS_QUERY, variables).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to load notifications');
        }

        const notifications = extractEdges<Notification>(result.data.notifications);
        const pageInfo = extractPageInfo(result.data.notifications);

        update(state => ({
          ...state,
          notifications: reset ? notifications : [...state.notifications, ...notifications],
          unreadNotifications: notifications.filter(n => !n.isRead),
          totalCount: result.data.notifications.totalCount,
          unreadCount: result.data.notifications.unreadCount || notifications.filter(n => !n.isRead).length,
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

        return { notifications, totalCount: result.data.notifications.totalCount };
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to load notifications';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async loadUnreadNotifications() {
      return this.loadNotifications({
        filters: { isRead: false },
        sorting: { field: 'createdAt', direction: 'DESC' },
        reset: true
      });
    },

    async markNotificationAsRead(notificationId: string): Promise<void> {
      try {
        const result = await client.mutation(MARK_NOTIFICATION_READ_MUTATION, {
          id: notificationId
        }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to mark notification as read');
        }

        update(state => ({
          ...state,
          notifications: state.notifications.map(notification => 
            notification.id === notificationId 
              ? { ...notification, isRead: true, readAt: new Date().toISOString() }
              : notification
          ),
          unreadNotifications: state.unreadNotifications.filter(n => n.id !== notificationId),
          unreadCount: Math.max(0, state.unreadCount - 1)
        }));
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to mark notification as read';
        update(state => ({ ...state, error: errorMessage }));
        throw new Error(errorMessage);
      }
    },

    async markAllNotificationsAsRead(): Promise<void> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.mutation(MARK_ALL_NOTIFICATIONS_READ_MUTATION).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to mark all notifications as read');
        }

        const readAt = new Date().toISOString();

        update(state => ({
          ...state,
          notifications: state.notifications.map(notification => ({
            ...notification,
            isRead: true,
            readAt: notification.readAt || readAt
          })),
          unreadNotifications: [],
          unreadCount: 0,
          isLoading: false
        }));
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to mark all notifications as read';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async deleteNotification(notificationId: string): Promise<void> {
      try {
        const result = await client.mutation(DELETE_NOTIFICATION_MUTATION, {
          id: notificationId
        }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to delete notification');
        }

        update(state => {
          const notification = state.notifications.find(n => n.id === notificationId);
          const wasUnread = notification && !notification.isRead;

          return {
            ...state,
            notifications: state.notifications.filter(n => n.id !== notificationId),
            unreadNotifications: state.unreadNotifications.filter(n => n.id !== notificationId),
            totalCount: Math.max(0, state.totalCount - 1),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
          };
        });
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to delete notification';
        update(state => ({ ...state, error: errorMessage }));
        throw new Error(errorMessage);
      }
    },

    async searchNotifications(query: string) {
      return this.loadNotifications({
        filters: { searchQuery: query },
        reset: true
      });
    },

    async filterNotifications(filters: NotificationFilter) {
      return this.loadNotifications({
        filters,
        pagination: { page: 1 },
        reset: true
      });
    },

    // =============================================================================
    // Preferences Management
    // =============================================================================

    async loadNotificationPreferences(): Promise<NotificationPreferences> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.query(GET_NOTIFICATION_PREFERENCES_QUERY).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to load notification preferences');
        }

        const preferences = result.data.notificationPreferences;

        update(state => ({
          ...state,
          preferences,
          isLoading: false
        }));

        return preferences;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to load notification preferences';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async updateNotificationPreferences(input: NotificationPreferencesInput): Promise<NotificationPreferences> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.mutation(UPDATE_NOTIFICATION_PREFERENCES_MUTATION, {
          input
        }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to update notification preferences');
        }

        const preferences = result.data.updateNotificationPreferences;

        update(state => ({
          ...state,
          preferences,
          isLoading: false
        }));

        return preferences;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to update notification preferences';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    // =============================================================================
    // Real-time Notifications
    // =============================================================================

    subscribeToNotifications() {
      const currentState = get({ subscribe });
      if (currentState.subscriptions.notifications) return;

      try {
        client.subscription(SUBSCRIBE_NOTIFICATIONS).subscribe(result => {
          if (result.data?.notificationReceived) {
            const newNotification = result.data.notificationReceived;
            
            update(state => ({
              ...state,
              notifications: [newNotification, ...state.notifications],
              unreadNotifications: !newNotification.isRead 
                ? [newNotification, ...state.unreadNotifications]
                : state.unreadNotifications,
              totalCount: state.totalCount + 1,
              unreadCount: !newNotification.isRead 
                ? state.unreadCount + 1 
                : state.unreadCount
            }));

            // Show browser notification if permitted and enabled
            this.showBrowserNotification(newNotification);
          }
        });

        update(state => ({
          ...state,
          subscriptions: { ...state.subscriptions, notifications: true }
        }));
      } catch (error: any) {
        console.error('Failed to subscribe to notifications:', error);
      }
    },

    unsubscribeFromNotifications() {
      update(state => ({
        ...state,
        subscriptions: { ...state.subscriptions, notifications: false }
      }));
    },

    // =============================================================================
    // Browser Notifications
    // =============================================================================

    async requestNotificationPermission(): Promise<NotificationPermission> {
      if (!('Notification' in window)) {
        throw new Error('This browser does not support desktop notification');
      }

      const permission = await Notification.requestPermission();
      return permission;
    },

    showBrowserNotification(notification: Notification) {
      const currentState = get({ subscribe });
      
      // Check if browser notifications are enabled in preferences
      if (!currentState.preferences?.pushNotifications) return;
      
      // Check notification permission
      if (Notification.permission !== 'granted') return;

      try {
        const browserNotification = new window.Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id,
          requireInteraction: notification.priority === 'HIGH' || notification.priority === 'URGENT'
        });

        browserNotification.onclick = () => {
          window.focus();
          if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
          }
          browserNotification.close();
        };

        // Auto-close after 5 seconds for normal priority notifications
        if (notification.priority === 'LOW' || notification.priority === 'NORMAL') {
          setTimeout(() => browserNotification.close(), 5000);
        }
      } catch (error) {
        console.error('Failed to show browser notification:', error);
      }
    },

    // =============================================================================
    // Analytics
    // =============================================================================

    async getNotificationAnalytics(timeRange?: {
      startDate: string;
      endDate: string;
    }) {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const result = await client.query(GET_NOTIFICATION_ANALYTICS_QUERY, {
          timeRange
        }).toPromise();

        if (result.error) {
          throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to load notification analytics');
        }

        update(state => ({ ...state, isLoading: false }));

        return result.data.notificationAnalytics;
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to load notification analytics';
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

    async bulkMarkAsRead(notificationIds: string[]): Promise<void> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const markReadPromises = notificationIds.map(id => 
          this.markNotificationAsRead(id)
        );

        await Promise.all(markReadPromises);

        update(state => ({ ...state, isLoading: false }));
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to mark notifications as read';
        update(state => ({
          ...state,
          isLoading: false,
          error: errorMessage
        }));
        throw new Error(errorMessage);
      }
    },

    async bulkDelete(notificationIds: string[]): Promise<void> {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        const deletePromises = notificationIds.map(id => 
          this.deleteNotification(id)
        );

        await Promise.all(deletePromises);

        update(state => ({ ...state, isLoading: false }));
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to delete notifications';
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

    getNotificationById(notificationId: string): Notification | undefined {
      const currentState = get({ subscribe });
      return currentState.notifications.find(notification => notification.id === notificationId);
    },

    getNotificationsByType(type: NotificationType): Notification[] {
      const currentState = get({ subscribe });
      return currentState.notifications.filter(notification => notification.type === type);
    },

    getNotificationsByPriority(priority: NotificationPriority): Notification[] {
      const currentState = get({ subscribe });
      return currentState.notifications.filter(notification => notification.priority === priority);
    },

    getRecentNotifications(hours: number = 24): Notification[] {
      const currentState = get({ subscribe });
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hours);
      
      return currentState.notifications.filter(notification => 
        new Date(notification.createdAt) >= cutoffTime
      );
    },

    // Statistics
    getTotalNotifications(): number {
      const currentState = get({ subscribe });
      return currentState.totalCount;
    },

    getUnreadCount(): number {
      const currentState = get({ subscribe });
      return currentState.unreadCount;
    },

    getReadRate(): number {
      const currentState = get({ subscribe });
      if (currentState.totalCount === 0) return 0;
      return ((currentState.totalCount - currentState.unreadCount) / currentState.totalCount) * 100;
    }
  };
};

// =============================================================================
// Create Service Instance
// =============================================================================

export const notificationService = createNotificationService();

// =============================================================================
// Derived Stores
// =============================================================================

export const notifications = derived(notificationService, $notificationService => $notificationService.notifications);

export const unreadNotifications = derived(notificationService, $notificationService => $notificationService.unreadNotifications);

export const unreadCount = derived(notificationService, $notificationService => $notificationService.unreadCount);

export const notificationPreferences = derived(notificationService, $notificationService => $notificationService.preferences);

export const isLoadingNotifications = derived(notificationService, $notificationService => $notificationService.isLoading);

export const notificationError = derived(notificationService, $notificationService => $notificationService.error);

export const recentNotifications = derived(notifications, $notifications => {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  return $notifications.filter(notification => new Date(notification.createdAt) >= oneHourAgo);
});

export const highPriorityNotifications = derived(notifications, $notifications => 
  $notifications.filter(notification => 
    notification.priority === 'HIGH' || notification.priority === 'URGENT'
  )
);

export const notificationsPagination = derived(notificationService, $notificationService => $notificationService.pagination);

export const notificationsFilters = derived(notificationService, $notificationService => $notificationService.filters);

export const notificationsSorting = derived(notificationService, $notificationService => $notificationService.sorting);

// =============================================================================
// Reactive Search and Filters
// =============================================================================

export const createNotificationSearch = () => {
  const searchQuery = writable('');
  const debounceTimeout = writable<NodeJS.Timeout | null>(null);

  return {
    searchQuery: { subscribe: searchQuery.subscribe },
    
    search: (query: string) => {
      searchQuery.set(query);
      
      const timeout = get(debounceTimeout);
      if (timeout) clearTimeout(timeout);

      const newTimeout = setTimeout(() => {
        if (query.trim()) {
          notificationService.searchNotifications(query.trim());
        } else {
          notificationService.loadNotifications({ reset: true });
        }
      }, 300);

      debounceTimeout.set(newTimeout);
    },

    clear: () => {
      searchQuery.set('');
      notificationService.resetFilters();
      notificationService.loadNotifications({ reset: true });
    }
  };
};

// =============================================================================
// Auto-initialization
// =============================================================================

// Auto-subscribe to notifications when the service is initialized
if (typeof window !== 'undefined') {
  notificationService.subscribeToNotifications();
  
  // Load initial notifications and preferences
  notificationService.loadNotifications();
  notificationService.loadNotificationPreferences();
}

// =============================================================================
// Export Service as Default
// =============================================================================

export default notificationService;