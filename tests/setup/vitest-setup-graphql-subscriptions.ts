/**
 * Vitest Setup for GraphQL Subscription Testing
 *
 * Setup configuration for GraphQL subscription and real-time feature testing.
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createUrqlClient } from '$lib/graphql/client';
import { GraphQLSubscriptionTester } from '$lib/graphql/subscription-tester';

// Global subscription testing utilities
declare global {
  var __GRAPHQL_SUBSCRIPTION_CLIENT__: any;
  var __GRAPHQL_SUBSCRIPTION_TESTER__: GraphQLSubscriptionTester;
  var __GRAPHQL_SUBSCRIPTION_MOCK_SERVER__: any;
  var __GRAPHQL_ACTIVE_SUBSCRIPTIONS__: Set<string>;
  var __GRAPHQL_SUBSCRIPTION_MESSAGES__: Map<string, any[]>;
}

// Mock WebSocket for testing
class MockWebSocket {
  public readyState = 1; // OPEN
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    // Simulate connection open
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string) {
    // Mock sending data - in real tests this would interact with test server
    console.log('Mock WebSocket send:', data);
  }

  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  // Mock methods for testing
  mockMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  mockError(error: any) {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

beforeAll(async () => {
  // Initialize subscription client with mock WebSocket
  const subscriptionClient = createUrqlClient();
  global.__GRAPHQL_SUBSCRIPTION_CLIENT__ = subscriptionClient;

  // Initialize subscription tester with test configuration
  const subscriptionTester = new GraphQLSubscriptionTester(subscriptionClient, {
    maxWaitTime: parseInt(process.env.GRAPHQL_SUBSCRIPTION_MAX_WAIT_TIME || '30000'),
    heartbeatInterval: parseInt(process.env.GRAPHQL_SUBSCRIPTION_HEARTBEAT_INTERVAL || '5000'),
    reconnectAttempts: parseInt(process.env.GRAPHQL_SUBSCRIPTION_RECONNECT_ATTEMPTS || '3'),
    messageOrderingEnabled: process.env.GRAPHQL_MESSAGE_ORDERING_VALIDATION === 'true',
    performanceMonitoring: true,
    debugMode: process.env.GRAPHQL_SUBSCRIPTION_DEBUG_MODE === 'true',
  });
  global.__GRAPHQL_SUBSCRIPTION_TESTER__ = subscriptionTester;

  // Initialize tracking collections
  global.__GRAPHQL_ACTIVE_SUBSCRIPTIONS__ = new Set();
  global.__GRAPHQL_SUBSCRIPTION_MESSAGES__ = new Map();

  // Mock WebSocket globally for tests
  if (typeof global !== 'undefined') {
    (global as any).WebSocket = MockWebSocket;
  }

  // Setup subscription mock server if needed
  if (process.env.GRAPHQL_SUBSCRIPTION_MOCK_SERVER === 'true') {
    global.__GRAPHQL_SUBSCRIPTION_MOCK_SERVER__ = new MockSubscriptionServer();
    await global.__GRAPHQL_SUBSCRIPTION_MOCK_SERVER__.start();
  }

  console.log('GraphQL subscription testing environment initialized');
  console.log(`WebSocket endpoint: ${process.env.GRAPHQL_WS_ENDPOINT || 'ws://localhost:4000/graphql'}`);
  console.log(`Subscription timeout: ${process.env.GRAPHQL_SUBSCRIPTION_MAX_WAIT_TIME || '30000'}ms`);
});

afterAll(async () => {
  // Stop all active subscriptions
  if (global.__GRAPHQL_SUBSCRIPTION_TESTER__) {
    await global.__GRAPHQL_SUBSCRIPTION_TESTER__.stopAllTests();
  }

  // Stop mock server
  if (global.__GRAPHQL_SUBSCRIPTION_MOCK_SERVER__) {
    await global.__GRAPHQL_SUBSCRIPTION_MOCK_SERVER__.stop();
  }

  // Clear tracking collections
  if (global.__GRAPHQL_ACTIVE_SUBSCRIPTIONS__) {
    global.__GRAPHQL_ACTIVE_SUBSCRIPTIONS__.clear();
  }

  if (global.__GRAPHQL_SUBSCRIPTION_MESSAGES__) {
    global.__GRAPHQL_SUBSCRIPTION_MESSAGES__.clear();
  }

  console.log('GraphQL subscription testing environment cleaned up');
});

beforeEach(() => {
  // Clear subscription messages for fresh test
  if (global.__GRAPHQL_SUBSCRIPTION_MESSAGES__) {
    global.__GRAPHQL_SUBSCRIPTION_MESSAGES__.clear();
  }

  // Clear active subscriptions
  if (global.__GRAPHQL_ACTIVE_SUBSCRIPTIONS__) {
    global.__GRAPHQL_ACTIVE_SUBSCRIPTIONS__.clear();
  }
});

afterEach(async () => {
  // Ensure all test subscriptions are cleaned up
  const activeTests = global.__GRAPHQL_SUBSCRIPTION_TESTER__?.getActiveTests() || [];

  if (activeTests.length > 0) {
    console.warn(`${activeTests.length} subscription tests still active, cleaning up...`);
    await global.__GRAPHQL_SUBSCRIPTION_TESTER__?.stopAllTests();
  }
});

// Mock subscription server for testing
class MockSubscriptionServer {
  private port: number = 4001;
  private server: any = null;
  private clients: Set<any> = new Set();

  async start() {
    // In a real implementation, this would start a WebSocket server
    console.log(`Mock subscription server started on port ${this.port}`);
  }

  async stop() {
    // Cleanup mock server
    this.clients.clear();
    console.log('Mock subscription server stopped');
  }

  broadcast(message: any) {
    this.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify(message));
      }
    });
  }

  addClient(client: any) {
    this.clients.add(client);
  }

  removeClient(client: any) {
    this.clients.delete(client);
  }
}

// Utility functions for subscription testing
export function createMockSubscriptionData(type: string, data: any) {
  return {
    id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    payload: { data },
    timestamp: new Date().toISOString(),
  };
}

export function simulateSubscriptionMessage(subscriptionId: string, data: any) {
  const messages = global.__GRAPHQL_SUBSCRIPTION_MESSAGES__.get(subscriptionId) || [];
  messages.push({
    ...data,
    timestamp: Date.now(),
  });
  global.__GRAPHQL_SUBSCRIPTION_MESSAGES__.set(subscriptionId, messages);
}

export function getSubscriptionMessages(subscriptionId: string) {
  return global.__GRAPHQL_SUBSCRIPTION_MESSAGES__.get(subscriptionId) || [];
}

export function addActiveSubscription(subscriptionId: string) {
  global.__GRAPHQL_ACTIVE_SUBSCRIPTIONS__.add(subscriptionId);
}

export function removeActiveSubscription(subscriptionId: string) {
  global.__GRAPHQL_ACTIVE_SUBSCRIPTIONS__.delete(subscriptionId);
}

export function getActiveSubscriptions() {
  return Array.from(global.__GRAPHQL_ACTIVE_SUBSCRIPTIONS__);
}

// Mock HR-specific subscription events
export function mockEmployeeStatusUpdate(employeeId: string, status: string) {
  return createMockSubscriptionData('employeeStatusChanged', {
    employeeStatusChanged: {
      id: employeeId,
      userId: `user-${employeeId}`,
      status,
      lastUpdated: new Date().toISOString(),
      department: {
        id: 'dept-1',
        name: 'Engineering'
      }
    }
  });
}

export function mockLeaveRequestNotification(requestId: string, status: string) {
  return createMockSubscriptionData('leaveRequestStatusChanged', {
    leaveRequestStatusChanged: {
      id: requestId,
      employee: {
        id: 'emp-1',
        user: { name: 'John Doe' }
      },
      status,
      approver: {
        id: 'manager-1',
        user: { name: 'Jane Manager' }
      },
      updatedAt: new Date().toISOString()
    }
  });
}

export function mockPerformanceReviewUpdate(reviewId: string, score: number) {
  return createMockSubscriptionData('performanceReviewUpdated', {
    performanceReviewUpdated: {
      id: reviewId,
      employee: { id: 'emp-1' },
      reviewer: { id: 'manager-1' },
      status: 'COMPLETED',
      score,
      updatedAt: new Date().toISOString()
    }
  });
}

export function mockTeamNotification(teamId: string, title: string, message: string) {
  return createMockSubscriptionData('teamNotification', {
    teamNotification: {
      id: `notif-${Date.now()}`,
      type: 'ANNOUNCEMENT',
      title,
      message,
      priority: 'NORMAL',
      sender: {
        id: 'sender-1',
        name: 'Test Sender'
      },
      timestamp: new Date().toISOString()
    }
  });
}

// Export utilities for subscription tests
export const getSubscriptionClient = () => global.__GRAPHQL_SUBSCRIPTION_CLIENT__;
export const getSubscriptionTester = () => global.__GRAPHQL_SUBSCRIPTION_TESTER__;
export const getSubscriptionMockServer = () => global.__GRAPHQL_SUBSCRIPTION_MOCK_SERVER__;