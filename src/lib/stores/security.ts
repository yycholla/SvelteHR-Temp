/**
 * Security & Compliance Store
 * Manages audit logs, security events, and compliance reporting for the HR system
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { createUrqlClient } from '$lib/graphql/client';
import { 
  GET_AUDIT_LOGS,
  GET_AUDIT_LOG_BY_ID,
  GET_SECURITY_EVENTS,
  GET_SUSPICIOUS_ACTIVITIES,
  GET_USER_ACTIVITY_LOG,
  GET_SECURITY_METRICS
} from '$lib/graphql/postgraphile-operations';

// Security interfaces
export interface AuditLog {
  id: string;
  userId: string | null;
  tableName: string;
  recordId: string;
  operation: string;
  oldValues: any;
  newValues: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  userByUserId?: {
    id: string;
    displayName: string;
    email: string;
  };
}

export interface SecurityAuditLog {
  id: string;
  userId: string | null;
  eventType: string;
  description: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  metadata: any;
  createdAt: string;
  userByUserId?: {
    id: string;
    displayName: string;
    email: string;
  };
}

export interface SecurityMetrics {
  totalUsers: number;
  activeUsers: number;
  loginAttempts: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  };
  auditActivity: {
    total: number;
    byOperation: Record<string, number>;
    byTable: Record<string, number>;
  };
  dataAccess: {
    sensitiveDataAccess: number;
    recentAccess: AuditLog[];
  };
}

export interface ComplianceReport {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalAuditEvents: number;
    totalSecurityEvents: number;
    failedLogins: number;
    dataChanges: number;
    sensitiveDataAccess: number;
  };
  auditLogs: AuditLog[];
  securityEvents: SecurityAuditLog[];
}

export interface SecurityState {
  auditLogs: AuditLog[];
  securityAuditLogs: SecurityAuditLog[];
  currentAuditLog: AuditLog | null;
  metrics: SecurityMetrics | null;
  complianceReport: ComplianceReport | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    auditOperation?: string;
    auditTable?: string;
    securityEventType?: string;
    success?: boolean;
    userId?: string;
    startDate?: string;
    endDate?: string;
  };
}

// Initial state
const initialState: SecurityState = {
  auditLogs: [],
  securityAuditLogs: [],
  currentAuditLog: null,
  metrics: null,
  complianceReport: null,
  isLoading: false,
  error: null,
  filters: {}
};

// Create the main security store
export const securityStore = writable<SecurityState>(initialState);

// Derived stores for convenience
export const auditLogs = derived(securityStore, ($security) => $security.auditLogs);
export const securityAuditLogs = derived(securityStore, ($security) => $security.securityAuditLogs);
export const currentAuditLog = derived(securityStore, ($security) => $security.currentAuditLog);
export const securityMetrics = derived(securityStore, ($security) => $security.metrics);
export const complianceReport = derived(securityStore, ($security) => $security.complianceReport);
export const isSecurityLoading = derived(securityStore, ($security) => $security.isLoading);
export const securityError = derived(securityStore, ($security) => $security.error);

// Filtered data derived stores
export const filteredAuditLogs = derived(securityStore, ($security) => {
  let filtered = $security.auditLogs;
  
  if ($security.filters.auditOperation) {
    filtered = filtered.filter(log => log.operation === $security.filters.auditOperation);
  }
  
  if ($security.filters.auditTable) {
    filtered = filtered.filter(log => log.tableName === $security.filters.auditTable);
  }
  
  if ($security.filters.userId) {
    filtered = filtered.filter(log => log.userId === $security.filters.userId);
  }
  
  return filtered;
});

export const filteredSecurityAuditLogs = derived(securityStore, ($security) => {
  let filtered = $security.securityAuditLogs;
  
  if ($security.filters.securityEventType) {
    filtered = filtered.filter(log => log.eventType === $security.filters.securityEventType);
  }
  
  if ($security.filters.success !== undefined) {
    filtered = filtered.filter(log => log.success === $security.filters.success);
  }
  
  if ($security.filters.userId) {
    filtered = filtered.filter(log => log.userId === $security.filters.userId);
  }
  
  return filtered;
});

// Critical security alerts derived store
export const securityAlerts = derived(securityStore, ($security) => {
  const alerts = [];
  
  if ($security.metrics) {
    // High number of failed logins
    if ($security.metrics.loginAttempts.failed > 10) {
      alerts.push({
        type: 'warning',
        title: 'High Failed Login Count',
        message: `${$security.metrics.loginAttempts.failed} failed login attempts detected`,
        priority: 'high'
      });
    }
    
    // Low login success rate
    if ($security.metrics.loginAttempts.successRate < 80) {
      alerts.push({
        type: 'error',
        title: 'Low Login Success Rate',
        message: `Login success rate is ${$security.metrics.loginAttempts.successRate.toFixed(1)}%`,
        priority: 'critical'
      });
    }
    
    // High sensitive data access
    if ($security.metrics.dataAccess.sensitiveDataAccess > 50) {
      alerts.push({
        type: 'warning',
        title: 'High Sensitive Data Access',
        message: `${$security.metrics.dataAccess.sensitiveDataAccess} sensitive data access events`,
        priority: 'medium'
      });
    }
  }
  
  return alerts;
});

// Security actions
export const securityActions = {
  /**
   * Set loading state
   */
  setLoading: (loading: boolean) => {
    securityStore.update(state => ({ ...state, isLoading: loading }));
  },

  /**
   * Set error state
   */
  setError: (error: string | null) => {
    securityStore.update(state => ({ ...state, error }));
  },

  /**
   * Set filters
   */
  setFilters: (filters: Partial<SecurityState['filters']>) => {
    securityStore.update(state => ({
      ...state,
      filters: { ...state.filters, ...filters }
    }));
  },

  /**
   * Clear filters
   */
  clearFilters: () => {
    securityStore.update(state => ({ ...state, filters: {} }));
  },

  /**
   * Load audit logs
   */
  loadAuditLogs: async (first: number = 50): Promise<void> => {
    securityActions.setLoading(true);
    securityActions.setError(null);

    try {
      const client = createUrqlClient();
      const result = await client.query(GET_AUDIT_LOGS, { first }).toPromise();

      if (result.data?.allAuditLogs?.nodes) {
        securityStore.update(state => ({
          ...state,
          auditLogs: result.data.allAuditLogs.nodes,
          isLoading: false
        }));
      } else {
        securityActions.setError('Failed to load audit logs');
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
      securityActions.setError('Failed to load audit logs');
    } finally {
      securityActions.setLoading(false);
    }
  },

  /**
   * Load specific audit log
   */
  loadAuditLog: async (id: number): Promise<void> => {
    securityActions.setLoading(true);
    securityActions.setError(null);

    try {
      const client = createUrqlClient();
      const result = await client.query(GET_AUDIT_LOG_BY_ID, { id }).toPromise();

      if (result.data?.auditLogById) {
        securityStore.update(state => ({
          ...state,
          currentAuditLog: result.data.auditLogById,
          isLoading: false
        }));
      } else {
        securityActions.setError('Audit log not found');
      }
    } catch (error) {
      console.error('Error loading audit log:', error);
      securityActions.setError('Failed to load audit log');
    } finally {
      securityActions.setLoading(false);
    }
  },

  /**
   * Load security events
   */
  loadSecurityEvents: async (first: number = 50): Promise<void> => {
    securityActions.setLoading(true);
    securityActions.setError(null);

    try {
      const client = createUrqlClient();
      const result = await client.query(GET_SECURITY_EVENTS, { first }).toPromise();

      if (result.data?.allSecurityEvents?.nodes) {
        securityStore.update(state => ({
          ...state,
          securityAuditLogs: result.data.allSecurityEvents.nodes.map(event => ({
            id: event.id,
            userId: event.userId,
            eventType: event.eventType,
            description: event.eventMessage,
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            success: !event.isSuspicious,
            metadata: event.eventData,
            createdAt: event.createdAt,
            userByUserId: event.userByUserId
          })),
          isLoading: false
        }));
      } else {
        securityActions.setError('Failed to load security events');
      }
    } catch (error) {
      console.error('Error loading security events:', error);
      securityActions.setError('Failed to load security events');
    } finally {
      securityActions.setLoading(false);
    }
  },

  /**
   * Load suspicious activities
   */
  loadSuspiciousActivities: async (first: number = 50): Promise<void> => {
    securityActions.setLoading(true);
    securityActions.setError(null);

    try {
      const client = createUrqlClient();
      const result = await client.query(GET_SUSPICIOUS_ACTIVITIES, { first }).toPromise();

      if (result.data?.allSecurityEvents?.nodes) {
        securityStore.update(state => ({
          ...state,
          securityAuditLogs: result.data.allSecurityEvents.nodes.map(event => ({
            id: event.id,
            userId: event.userId,
            eventType: event.eventType,
            description: event.eventMessage,
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            success: !event.isSuspicious,
            metadata: event.eventData,
            createdAt: event.createdAt,
            userByUserId: event.userByUserId
          })),
          isLoading: false
        }));
      } else {
        securityActions.setError('Failed to load suspicious activities');
      }
    } catch (error) {
      console.error('Error loading suspicious activities:', error);
      securityActions.setError('Failed to load suspicious activities');
    } finally {
      securityActions.setLoading(false);
    }
  },

  /**
   * Load user activity log
   */
  loadUserActivityLog: async (userId: string, first: number = 50): Promise<void> => {
    securityActions.setLoading(true);
    securityActions.setError(null);

    try {
      const client = createUrqlClient();
      const result = await client.query(GET_USER_ACTIVITY_LOG, { userId, first }).toPromise();

      if (result.data?.allAuditLogs?.nodes) {
        securityStore.update(state => ({
          ...state,
          auditLogs: result.data.allAuditLogs.nodes,
          isLoading: false
        }));
      } else {
        securityActions.setError('Failed to load user activity log');
      }
    } catch (error) {
      console.error('Error loading user activity log:', error);
      securityActions.setError('Failed to load user activity log');
    } finally {
      securityActions.setLoading(false);
    }
  },

  /**
   * Generate compliance report
   */
  generateComplianceReport: async (startDate: string, endDate: string): Promise<void> => {
    securityActions.setLoading(true);
    securityActions.setError(null);

    try {
      const client = createUrqlClient();
      const [auditResult, securityResult] = await Promise.all([
        client.query(GET_AUDIT_LOGS, { first: 1000 }).toPromise(),
        client.query(GET_SECURITY_EVENTS, { first: 1000 }).toPromise()
      ]);

      if (auditResult.data && securityResult.data) {
        const auditLogs = auditResult.data.allAuditLogs?.nodes || [];
        const securityEvents = securityResult.data.allSecurityEvents?.nodes || [];
        
        const failedLogins = securityEvents.filter(event => 
          event.eventType === 'login_attempt' && event.isSuspicious
        ).length;
        
        const dataChanges = auditLogs.filter(log => 
          ['INSERT', 'UPDATE', 'DELETE'].includes(log.actionType)
        ).length;
        
        const sensitiveDataAccess = auditLogs.filter(log => 
          ['compensation', 'personal_information', 'contact_information'].includes(log.tableName)
        ).length;

        const complianceReport: ComplianceReport = {
          dateRange: { startDate, endDate },
          summary: {
            totalAuditEvents: auditLogs.length,
            totalSecurityEvents: securityEvents.length,
            failedLogins,
            dataChanges,
            sensitiveDataAccess
          },
          auditLogs: auditLogs.map(log => ({
            id: log.id,
            userId: log.userId,
            tableName: log.tableName,
            recordId: log.recordId,
            operation: log.actionType,
            oldValues: log.oldValues,
            newValues: log.newValues,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            createdAt: log.createdAt,
            userByUserId: log.userByUserId
          })),
          securityEvents: securityEvents.map(event => ({
            id: event.id,
            userId: event.userId,
            eventType: event.eventType,
            description: event.eventMessage,
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            success: !event.isSuspicious,
            metadata: event.eventData,
            createdAt: event.createdAt,
            userByUserId: event.userByUserId
          }))
        };

        securityStore.update(state => ({
          ...state,
          complianceReport,
          isLoading: false
        }));
      } else {
        securityActions.setError('Failed to generate compliance report');
      }
    } catch (error) {
      console.error('Error generating compliance report:', error);
      securityActions.setError('Failed to generate compliance report');
    } finally {
      securityActions.setLoading(false);
    }
  },

  /**
   * Load security metrics
   */
  loadSecurityMetrics: async (): Promise<void> => {
    securityActions.setLoading(true);
    securityActions.setError(null);

    try {
      const client = createUrqlClient();
      const metricsResult = await client.query(GET_SECURITY_METRICS).toPromise();

      if (metricsResult.data) {
        const totalUsers = metricsResult.data.totalUsers?.totalCount || 0;
        
        const recentSecurityEvents = metricsResult.data.recentSecurityEvents?.nodes || [];
        const loginAttempts = recentSecurityEvents.filter((event: any) => 
          event.eventType === 'LOGIN' || event.eventType === 'AUTHENTICATION'
        );
        const successful = loginAttempts.filter((attempt: any) => !attempt.isSuspicious).length;
        const failed = loginAttempts.filter((attempt: any) => attempt.isSuspicious).length;
        const total = loginAttempts.length;
        const successRate = total > 0 ? (successful / total) * 100 : 0;
        
        const auditLogs = metricsResult.data.recentAuditLogs?.nodes || [];
        const byOperation: Record<string, number> = {};
        const byTable: Record<string, number> = {};
        
        auditLogs.forEach((log: any) => {
          byOperation[log.actionType] = (byOperation[log.actionType] || 0) + 1;
          byTable[log.tableName] = (byTable[log.tableName] || 0) + 1;
        });
        
        const sensitiveDataAccess = auditLogs.filter((log: any) => 
          ['compensation', 'personal_information', 'contact_information'].includes(log.tableName)
        ).length;

        const metrics: SecurityMetrics = {
          totalUsers,
          activeUsers: totalUsers,
          loginAttempts: {
            total,
            successful,
            failed,
            successRate
          },
          auditActivity: {
            total: auditLogs.length,
            byOperation,
            byTable
          },
          dataAccess: {
            sensitiveDataAccess,
            recentAccess: auditLogs.filter((log: any) => 
              ['compensation', 'personal_information', 'contact_information'].includes(log.tableName)
            ).map((log: any) => ({
              id: log.id,
              userId: log.userId,
              tableName: log.tableName,
              recordId: log.recordId,
              operation: log.actionType,
              oldValues: log.oldValues,
              newValues: log.newValues,
              ipAddress: log.ipAddress,
              userAgent: log.userAgent,
              createdAt: log.createdAt,
              userByUserId: log.userByUserId
            }))
          }
        };

        securityStore.update(state => ({
          ...state,
          metrics,
          isLoading: false
        }));
      } else {
        securityActions.setError('Failed to load security metrics');
      }
    } catch (error) {
      console.error('Error loading security metrics:', error);
      securityActions.setError('Failed to load security metrics');
    } finally {
      securityActions.setLoading(false);
    }
  },

  /**
   * Refresh all security data
   */
  refreshAll: async (): Promise<void> => {
    await Promise.all([
      securityActions.loadAuditLogs(),
      securityActions.loadSecurityEvents(),
      securityActions.loadSecurityMetrics()
    ]);
  }
};

// Export store and actions
export { securityStore as default, securityActions };

// Utility functions
export const getSecurityState = (): SecurityState => get(securityStore);
export const getSecurityMetrics = () => get(securityMetrics);
export const getSecurityAlerts = () => get(securityAlerts);