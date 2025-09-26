/**
 * GraphQL Subscription Tester Tests
 *
 * Tests for GraphQL subscription testing utilities and real-time features.
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { parse } from 'graphql';
import {
	GraphQLSubscriptionTester,
	createPostGraphileSubscriptionTester,
	HR_SUBSCRIPTION_SCENARIOS
} from '$lib/graphql/subscription-tester';
import type {
	SubscriptionScenario,
	SubscriptionTestResult,
	SubscriptionTestConfig
} from '$lib/graphql/subscription-tester';

// Mock GraphQL client
const mockClient = {
	subscription: vi.fn(),
	mutation: vi.fn(),
	query: vi.fn()
};

// Mock subscription result
const mockSubscriptionResult = {
	subscribe: vi.fn(),
	unsubscribe: vi.fn()
};

// Test subscription document
const testSubscription = parse(`
  subscription TestSubscription {
    testEvent {
      id
      message
      timestamp
    }
  }
`);

// Simple test scenario
const simpleTestScenario: SubscriptionScenario = {
	name: 'simple_test',
	description: 'Simple subscription test',
	subscription: testSubscription,
	expectedMessages: 1,
	maxDuration: 5000,
	validation: (messages) => ({
		valid: messages.length >= 1,
		errors: messages.length === 0 ? ['No messages received'] : [],
		warnings: []
	})
};

describe('GraphQLSubscriptionTester', () => {
	let subscriptionTester: GraphQLSubscriptionTester;
	let mockSubscribe: vi.Mock;
	let mockMutation: vi.Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		mockSubscribe = vi.fn();
		mockMutation = vi.fn();

		mockClient.subscription.mockReturnValue({
			subscribe: mockSubscribe
		});

		mockClient.mutation.mockReturnValue({
			toPromise: () => Promise.resolve({ data: { success: true } })
		});

		subscriptionTester = new GraphQLSubscriptionTester(mockClient as any, {
			debugMode: true,
			maxWaitTime: 5000
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('Basic Subscription Testing', () => {
		test('should create subscription tester with default config', () => {
			const tester = new GraphQLSubscriptionTester(mockClient as any);
			expect(tester).toBeDefined();
		});

		test('should run simple subscription scenario successfully', async () => {
			// Mock successful subscription
			mockSubscribe.mockImplementation(({ next }) => {
				// Simulate receiving a message after 1 second
				setTimeout(() => {
					next({
						data: {
							testEvent: {
								id: '1',
								message: 'Test message',
								timestamp: new Date().toISOString()
							}
						}
					});
				}, 1000);

				return {
					unsubscribe: vi.fn()
				};
			});

			const resultPromise = subscriptionTester.runScenario(simpleTestScenario);

			// Advance time to trigger message
			vi.advanceTimersByTime(1000);
			// Advance more to complete waiting period
			vi.advanceTimersByTime(1000);

			const result = await resultPromise;

			expect(result.success).toBe(true);
			expect(result.totalMessages).toBe(1);
			expect(result.messagesReceived.length).toBe(1);
			expect(result.errors.length).toBe(0);
		});

		test('should handle subscription timeout', async () => {
			// Mock subscription that never sends messages
			mockSubscribe.mockImplementation(() => ({
				unsubscribe: vi.fn()
			}));

			const resultPromise = subscriptionTester.runScenario(simpleTestScenario);

			// Advance time to trigger timeout
			vi.advanceTimersByTime(6000);

			const result = await resultPromise;

			expect(result.success).toBe(false);
			expect(result.totalMessages).toBe(0);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].type).toBe('timeout');
		});

		test('should handle subscription errors', async () => {
			// Mock subscription with error
			mockSubscribe.mockImplementation(({ error }) => {
				setTimeout(() => {
					error(new Error('Subscription error'));
				}, 100);

				return {
					unsubscribe: vi.fn()
				};
			});

			const resultPromise = subscriptionTester.runScenario(simpleTestScenario);

			vi.advanceTimersByTime(200);

			const result = await resultPromise;

			expect(result.success).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].type).toBe('subscription');
			expect(result.errors[0].message).toBe('Subscription error');
		});

		test('should validate received messages', async () => {
			const validationScenario: SubscriptionScenario = {
				...simpleTestScenario,
				validation: (messages) => {
					const hasValidMessage = messages.some(
						(msg) => JSON.parse(msg).testEvent?.message === 'Expected message'
					);

					return {
						valid: hasValidMessage,
						errors: hasValidMessage ? [] : ['Message validation failed'],
						warnings: []
					};
				}
			};

			// Mock subscription with unexpected message
			mockSubscribe.mockImplementation(({ next }) => {
				setTimeout(() => {
					next({
						data: {
							testEvent: {
								id: '1',
								message: 'Unexpected message',
								timestamp: new Date().toISOString()
							}
						}
					});
				}, 1000);

				return { unsubscribe: vi.fn() };
			});

			const resultPromise = subscriptionTester.runScenario(validationScenario);

			vi.advanceTimersByTime(2000);

			const result = await resultPromise;

			expect(result.success).toBe(false);
			expect(result.errors.some((e) => e.type === 'data')).toBe(true);
		});
	});

	describe('Subscription Triggers', () => {
		test('should execute mutation triggers', async () => {
			const scenarioWithTrigger: SubscriptionScenario = {
				...simpleTestScenario,
				triggers: [
					{
						delay: 500,
						action: 'mutation',
						operation: parse(`
              mutation TriggerMutation {
                createTestEvent(input: { message: "Triggered" }) {
                  event { id }
                }
              }
            `),
						variables: { message: 'Triggered' }
					}
				]
			};

			mockSubscribe.mockImplementation(({ next }) => {
				// Simulate message after trigger
				setTimeout(() => {
					next({
						data: {
							testEvent: {
								id: '1',
								message: 'Triggered message',
								timestamp: new Date().toISOString()
							}
						}
					});
				}, 1000);

				return { unsubscribe: vi.fn() };
			});

			const resultPromise = subscriptionTester.runScenario(scenarioWithTrigger);

			// Advance to trigger execution
			vi.advanceTimersByTime(600);
			expect(mockClient.mutation).toHaveBeenCalled();

			// Advance to receive message
			vi.advanceTimersByTime(500);

			const result = await resultPromise;

			expect(result.success).toBe(true);
			expect(result.totalMessages).toBe(1);
		});

		test('should handle trigger execution errors', async () => {
			const scenarioWithFailingTrigger: SubscriptionScenario = {
				...simpleTestScenario,
				triggers: [
					{
						delay: 100,
						action: 'mutation',
						operation: parse(`mutation FailingMutation { fail }`)
					}
				]
			};

			// Mock failing mutation
			mockClient.mutation.mockReturnValue({
				toPromise: () => Promise.reject(new Error('Mutation failed'))
			});

			mockSubscribe.mockImplementation(() => ({
				unsubscribe: vi.fn()
			}));

			const resultPromise = subscriptionTester.runScenario(scenarioWithFailingTrigger);

			vi.advanceTimersByTime(6000);

			const result = await resultPromise;

			// Should have error from failed trigger
			expect(result.errors.some((e) => e.message.includes('Trigger failed'))).toBe(true);
		});

		test('should execute multiple triggers in sequence', async () => {
			const scenarioWithMultipleTriggers: SubscriptionScenario = {
				...simpleTestScenario,
				expectedMessages: 2,
				triggers: [
					{
						delay: 500,
						action: 'mutation',
						operation: parse(`mutation FirstMutation { first }`)
					},
					{
						delay: 1000,
						action: 'mutation',
						operation: parse(`mutation SecondMutation { second }`)
					}
				]
			};

			mockSubscribe.mockImplementation(({ next }) => {
				// Send message after each trigger
				setTimeout(() => next({ data: { testEvent: { id: '1' } } }), 600);
				setTimeout(() => next({ data: { testEvent: { id: '2' } } }), 1100);

				return { unsubscribe: vi.fn() };
			});

			const resultPromise = subscriptionTester.runScenario(scenarioWithMultipleTriggers);

			vi.advanceTimersByTime(2000);

			const result = await resultPromise;

			expect(mockClient.mutation).toHaveBeenCalledTimes(2);
			expect(result.totalMessages).toBe(2);
		});
	});

	describe('Performance Monitoring', () => {
		test('should track performance metrics', async () => {
			mockSubscribe.mockImplementation(({ next }) => {
				// Send messages with different latencies
				setTimeout(() => next({ data: { testEvent: { id: '1' } } }), 100);
				setTimeout(() => next({ data: { testEvent: { id: '2' } } }), 300);

				return { unsubscribe: vi.fn() };
			});

			const scenarioWithMultipleMessages: SubscriptionScenario = {
				...simpleTestScenario,
				expectedMessages: 2
			};

			const resultPromise = subscriptionTester.runScenario(scenarioWithMultipleMessages);

			vi.advanceTimersByTime(1000);

			const result = await resultPromise;

			expect(result.performanceMetrics.averageLatency).toBeGreaterThan(0);
			expect(result.performanceMetrics.maxLatency).toBeGreaterThan(0);
			expect(result.performanceMetrics.minLatency).toBeGreaterThan(0);
			expect(result.performanceMetrics.totalDataTransferred).toBeGreaterThan(0);
		});

		test('should track connection events', async () => {
			mockSubscribe.mockImplementation(({ next }) => {
				setTimeout(() => next({ data: { testEvent: { id: '1' } } }), 100);
				return { unsubscribe: vi.fn() };
			});

			const resultPromise = subscriptionTester.runScenario(simpleTestScenario);

			vi.advanceTimersByTime(500);

			const result = await resultPromise;

			expect(result.connectionEvents.length).toBeGreaterThan(0);
			expect(result.connectionEvents[0].type).toBe('message');
			expect(result.connectionEvents[0].timestamp).toBeInstanceOf(Date);
		});

		test('should calculate message rate correctly', async () => {
			mockSubscribe.mockImplementation(({ next }) => {
				// Send 3 messages over 1 second
				setTimeout(() => next({ data: { testEvent: { id: '1' } } }), 100);
				setTimeout(() => next({ data: { testEvent: { id: '2' } } }), 500);
				setTimeout(() => next({ data: { testEvent: { id: '3' } } }), 900);

				return { unsubscribe: vi.fn() };
			});

			const highVolumeScenario: SubscriptionScenario = {
				...simpleTestScenario,
				expectedMessages: 3
			};

			const resultPromise = subscriptionTester.runScenario(highVolumeScenario);

			vi.advanceTimersByTime(1000);

			const result = await resultPromise;

			expect(result.totalMessages).toBe(3);
			expect(result.duration).toBeGreaterThan(0);
		});
	});

	describe('Multiple Scenario Testing', () => {
		test('should run multiple scenarios in parallel', async () => {
			const scenarios = [
				{ ...simpleTestScenario, name: 'test1' },
				{ ...simpleTestScenario, name: 'test2' },
				{ ...simpleTestScenario, name: 'test3' }
			];

			mockSubscribe.mockImplementation(({ next }) => {
				setTimeout(() => next({ data: { testEvent: { id: '1' } } }), 100);
				return { unsubscribe: vi.fn() };
			});

			const resultsPromise = subscriptionTester.runScenarios(scenarios);

			vi.advanceTimersByTime(1000);

			const results = await resultsPromise;

			expect(results.length).toBe(3);
			expect(results.every((r) => r.success)).toBe(true);
			expect(mockClient.subscription).toHaveBeenCalledTimes(3);
		});

		test('should track active tests', async () => {
			mockSubscribe.mockImplementation(() => ({
				unsubscribe: vi.fn()
			}));

			// Start a long-running test
			const longScenario: SubscriptionScenario = {
				...simpleTestScenario,
				maxDuration: 10000
			};

			const resultPromise = subscriptionTester.runScenario(longScenario);

			// Check active tests
			vi.advanceTimersByTime(100);
			const activeTests = subscriptionTester.getActiveTests();

			expect(activeTests.length).toBe(1);
			expect(activeTests[0].scenario).toBe(longScenario.name);
			expect(activeTests[0].status).toBe('running');

			// Complete the test
			vi.advanceTimersByTime(10000);
			await resultPromise;

			const activeTestsAfter = subscriptionTester.getActiveTests();
			expect(activeTestsAfter.length).toBe(0);
		});

		test('should stop all active tests', async () => {
			const mockUnsubscribe = vi.fn();
			mockSubscribe.mockImplementation(() => ({
				unsubscribe: mockUnsubscribe
			}));

			// Start multiple long-running tests
			const longScenario: SubscriptionScenario = {
				...simpleTestScenario,
				maxDuration: 10000
			};

			subscriptionTester.runScenario({ ...longScenario, name: 'test1' });
			subscriptionTester.runScenario({ ...longScenario, name: 'test2' });

			vi.advanceTimersByTime(100);

			expect(subscriptionTester.getActiveTests().length).toBe(2);

			await subscriptionTester.stopAllTests();

			expect(subscriptionTester.getActiveTests().length).toBe(0);
			expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
		});
	});

	describe('HR-Specific Scenarios', () => {
		test('should provide predefined HR scenarios', () => {
			expect(HR_SUBSCRIPTION_SCENARIOS.length).toBeGreaterThan(0);

			const employeeStatusScenario = HR_SUBSCRIPTION_SCENARIOS.find(
				(s) => s.name === 'employee_status_updates'
			);

			expect(employeeStatusScenario).toBeDefined();
			expect(employeeStatusScenario?.description).toBeTruthy();
			expect(employeeStatusScenario?.triggers).toBeDefined();
			expect(employeeStatusScenario?.validation).toBeTypeOf('function');
		});

		test('should validate HR scenario message structure', () => {
			const leaveRequestScenario = HR_SUBSCRIPTION_SCENARIOS.find(
				(s) => s.name === 'leave_request_notifications'
			);

			expect(leaveRequestScenario).toBeDefined();

			const validMessages = [
				JSON.stringify({
					leaveRequestStatusChanged: {
						id: 'leave-1',
						employee: { id: 'emp-1', user: { name: 'John Doe' } },
						status: 'APPROVED',
						approver: { id: 'manager-1', user: { name: 'Jane Manager' } },
						updatedAt: new Date().toISOString()
					}
				})
			];

			const result = leaveRequestScenario!.validation(validMessages);

			expect(result.valid).toBe(true);
			expect(result.errors.length).toBe(0);
		});

		test('should run HR subscription test suite', async () => {
			mockSubscribe.mockImplementation(({ next }) => {
				// Mock appropriate responses for each HR scenario
				setTimeout(() => {
					next({
						data: {
							employeeStatusChanged: { id: 'emp-1', status: 'ACTIVE' },
							leaveRequestStatusChanged: { id: 'leave-1', status: 'APPROVED' },
							performanceReviewUpdated: { id: 'review-1', score: 4.5 },
							teamNotification: { id: 'notif-1', title: 'Test Notification' }
						}
					});
				}, 100);

				return { unsubscribe: vi.fn() };
			});

			const resultsPromise = subscriptionTester.runHRSubscriptionTests();

			vi.advanceTimersByTime(2000);

			const results = await resultsPromise;

			expect(results.length).toBe(HR_SUBSCRIPTION_SCENARIOS.length);
			expect(results.some((r) => r.success)).toBe(true);
		});
	});

	describe('Configuration and Customization', () => {
		test('should use custom configuration', () => {
			const customConfig: Partial<SubscriptionTestConfig> = {
				maxWaitTime: 60000,
				debugMode: false,
				heartbeatInterval: 2000
			};

			const tester = new GraphQLSubscriptionTester(mockClient as any, customConfig);

			expect(tester).toBeDefined();
			// Configuration is private, but behavior should reflect the config
		});

		test('should update configuration', () => {
			subscriptionTester.updateConfig({
				debugMode: false,
				maxWaitTime: 10000
			});

			// Configuration update should not throw
			expect(() => {
				subscriptionTester.updateConfig({ alertingEnabled: true } as any);
			}).not.toThrow();
		});

		test('should create PostGraphile-optimized tester', () => {
			const pgTester = createPostGraphileSubscriptionTester(mockClient as any, {
				debugMode: true
			});

			expect(pgTester).toBeDefined();
			expect(pgTester).toBeInstanceOf(GraphQLSubscriptionTester);
		});
	});

	describe('Error Handling and Edge Cases', () => {
		test('should handle subscription setup failure', async () => {
			mockClient.subscription.mockImplementation(() => {
				throw new Error('Subscription setup failed');
			});

			const result = await subscriptionTester.runScenario(simpleTestScenario);

			expect(result.success).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].message).toContain('Subscription setup failed');
		});

		test('should handle malformed subscription messages', async () => {
			mockSubscribe.mockImplementation(({ next }) => {
				setTimeout(() => {
					// Send malformed data
					next({ data: null, errors: [{ message: 'Invalid data' }] });
				}, 100);

				return { unsubscribe: vi.fn() };
			});

			const result = await subscriptionTester.runScenario(simpleTestScenario);

			expect(result.totalMessages).toBe(1);
			expect(result.messagesReceived[0]).toBe('null');
		});

		test('should handle validation function errors', async () => {
			const scenarioWithBadValidation: SubscriptionScenario = {
				...simpleTestScenario,
				validation: () => {
					throw new Error('Validation function error');
				}
			};

			mockSubscribe.mockImplementation(({ next }) => {
				setTimeout(() => next({ data: { testEvent: { id: '1' } } }), 100);
				return { unsubscribe: vi.fn() };
			});

			const result = await subscriptionTester.runScenario(scenarioWithBadValidation);

			expect(result.errors.some((e) => e.message.includes('Validation failed'))).toBe(true);
		});

		test('should handle empty scenarios list', async () => {
			const results = await subscriptionTester.runScenarios([]);
			expect(results).toEqual([]);
		});

		test('should cleanup properly on stop', async () => {
			const mockUnsubscribe = vi.fn();
			mockSubscribe.mockImplementation(() => ({
				unsubscribe: mockUnsubscribe
			}));

			const resultPromise = subscriptionTester.runScenario({
				...simpleTestScenario,
				maxDuration: 10000
			});

			vi.advanceTimersByTime(100);

			await subscriptionTester.stopAllTests();

			// Complete the original promise
			vi.advanceTimersByTime(10000);
			const result = await resultPromise;

			expect(mockUnsubscribe).toHaveBeenCalled();
		});
	});

	describe('Advanced Testing Features', () => {
		test('should support connection resilience testing', async () => {
			const resillienceResult = await subscriptionTester.testConnectionResilience(
				testSubscription,
				{ testVar: 'value' }
			);

			expect(resillienceResult).toHaveProperty('reconnectionSuccess');
			expect(resillienceResult).toHaveProperty('reconnectionTime');
			expect(resillienceResult).toHaveProperty('messagesLost');
			expect(resillienceResult).toHaveProperty('finalConnectionState');
		});

		test('should support performance testing', async () => {
			const performanceResult = await subscriptionTester.testSubscriptionPerformance(
				testSubscription,
				{
					concurrentSubscriptions: 10,
					messagesPerSecond: 5,
					duration: 5000
				}
			);

			expect(performanceResult).toHaveProperty('averageLatency');
			expect(performanceResult).toHaveProperty('maxLatency');
			expect(performanceResult).toHaveProperty('messagesThroughput');
			expect(performanceResult).toHaveProperty('connectionStability');
			expect(performanceResult).toHaveProperty('memoryUsage');
		});

		test('should support message ordering testing', async () => {
			const triggers = [
				{
					delay: 100,
					action: 'mutation' as const,
					operation: parse(`mutation First { first }`)
				},
				{
					delay: 200,
					action: 'mutation' as const,
					operation: parse(`mutation Second { second }`)
				}
			];

			const orderingResult = await subscriptionTester.testMessageOrdering(
				testSubscription,
				triggers
			);

			expect(orderingResult).toHaveProperty('ordered');
			expect(orderingResult).toHaveProperty('expectedSequence');
			expect(orderingResult).toHaveProperty('actualSequence');
			expect(orderingResult).toHaveProperty('outOfOrderCount');
		});
	});
});
