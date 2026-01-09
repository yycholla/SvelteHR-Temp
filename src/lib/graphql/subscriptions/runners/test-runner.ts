import type { Client, OperationResult } from '@urql/core';
import { logger } from '$lib/utils/logger';
import type { SubscriptionScenario, SubscriptionTestConfig, SubscriptionTestResult } from '../types';

/**
 * Individual subscription test runner
 */
export class SubscriptionTestRunner {
	private client: Client;
	private config: SubscriptionTestConfig;
	private scenario: SubscriptionScenario;
	private result: SubscriptionTestResult;
	private subscription: any;
	private startTime: Date;
	private status: 'running' | 'waiting' | 'completing' = 'waiting';

	constructor(client: Client, config: SubscriptionTestConfig, scenario: SubscriptionScenario) {
		this.client = client;
		this.config = config;
		this.scenario = scenario;
		this.startTime = new Date();

		this.result = {
			subscriptionId: `sub-${scenario.name}-${Date.now()}`,
			success: false,
			totalMessages: 0,
			messagesReceived: [],
			errors: [],
			performanceMetrics: {
				averageLatency: 0,
				maxLatency: 0,
				minLatency: Infinity,
				messageRate: 0,
				connectionUptime: 0,
				reconnectionCount: 0,
				totalDataTransferred: 0
			},
			connectionEvents: [],
			startTime: this.startTime,
			endTime: this.startTime,
			duration: 0
		};
	}

	async run(): Promise<SubscriptionTestResult> {
		this.status = 'running';

		try {
			await this.setupSubscription();
			await this.executeTriggers();
			await this.waitForMessages();
			await this.validateResults();

			this.result.success = this.result.errors.length === 0;
		} catch (error) {
			this.result.errors.push({
				type: 'subscription',
				message: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date()
			});
		} finally {
			this.status = 'completing';
			await this.cleanup();
			this.result.endTime = new Date();
			this.result.duration = this.result.endTime.getTime() - this.result.startTime.getTime();
		}

		return this.result;
	}

	private async setupSubscription(): Promise<void> {
		return new Promise((resolve, reject) => {
			const subscription = this.client
				.subscription(this.scenario.subscription, this.scenario.variables)
				.subscribe((result: OperationResult) => {
					this.handleSubscriptionMessage(result);
				});

			this.subscription = subscription;

			// Consider subscription setup after first heartbeat
			setTimeout(() => resolve(), 100);
		});
	}

	private async executeTriggers(): Promise<void> {
		if (!this.scenario.triggers) return;

		const triggerPromises = this.scenario.triggers.map(async (trigger) => {
			await new Promise((resolve) => setTimeout(resolve, trigger.delay));

			try {
				switch (trigger.action) {
					case 'mutation':
						if (trigger.operation) {
							await this.client.mutation(trigger.operation, trigger.variables).toPromise();
						}
						break;

					case 'external_event':
						// Simulate external event
						this.logDebug(`Simulating external event`);
						break;

					case 'connection_disruption':
						// Simulate connection issues
						this.logDebug(`Simulating connection disruption`);
						break;

					case 'custom_action' as any:
						if (trigger.customAction) {
							await trigger.customAction();
						}
						break;
				}
			} catch (error) {
				this.result.errors.push({
					type: 'subscription',
					message: `Trigger failed: ${error instanceof Error ? error.message : 'Unknown'}`,
					timestamp: new Date()
				});
			}
		});

		await Promise.all(triggerPromises);
	}

	private async waitForMessages(): Promise<void> {
		return new Promise((resolve) => {
			const timeout = setTimeout(
				() => {
					if (this.result.totalMessages < this.scenario.expectedMessages) {
						this.result.errors.push({
							type: 'timeout',
							message: `Timeout waiting for messages. Expected: ${this.scenario.expectedMessages}, Received: ${this.result.totalMessages}`,
							timestamp: new Date()
						});
					}
					resolve();
				},
				Math.min(this.scenario.maxDuration, this.config.maxWaitTime)
			);

			// Check if we've received enough messages
			const checkMessages = () => {
				if (this.result.totalMessages >= this.scenario.expectedMessages) {
					clearTimeout(timeout);
					resolve();
				} else {
					setTimeout(checkMessages, 100);
				}
			};

			checkMessages();
		});
	}

	private handleSubscriptionMessage(result: OperationResult): void {
		const messageTime = new Date();
		const latency = messageTime.getTime() - this.startTime.getTime();

		this.result.totalMessages++;
		this.result.messagesReceived.push(JSON.stringify(result.data));

		// Update performance metrics
		this.result.performanceMetrics.maxLatency = Math.max(
			this.result.performanceMetrics.maxLatency,
			latency
		);
		this.result.performanceMetrics.minLatency = Math.min(
			this.result.performanceMetrics.minLatency,
			latency
		);

		const totalLatency =
			this.result.performanceMetrics.averageLatency * (this.result.totalMessages - 1) + latency;
		this.result.performanceMetrics.averageLatency = totalLatency / this.result.totalMessages;

		// Estimate data transfer (simplified)
		const messageSize = JSON.stringify(result.data).length;
		this.result.performanceMetrics.totalDataTransferred += messageSize;

		this.result.connectionEvents.push({
			type: 'message',
			timestamp: messageTime,
			details: { messageSize, latency }
		});

		this.logDebug(`Received message #${this.result.totalMessages}:`, result.data);
	}

	private async validateResults(): Promise<void> {
		try {
			const messages = this.result.messagesReceived.map((msg) => JSON.parse(msg));
			const validation = this.scenario.validation(messages);

			if (!validation.valid) {
				validation.errors.forEach((error) => {
					this.result.errors.push({
						type: 'data',
						message: `Validation error: ${error}`,
						timestamp: new Date()
					});
				});
			}

			// Log warnings but don't fail the test
			validation.warnings.forEach((warning) => {
				this.logDebug(`Warning: ${warning}`);
			});
		} catch (error) {
			this.result.errors.push({
				type: 'data',
				message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown'}`,
				timestamp: new Date()
			});
		}
	}

	private async cleanup(): Promise<void> {
		if (this.subscription) {
			try {
				this.subscription.unsubscribe();
			} catch (error) {
				this.logDebug('Error during cleanup:', error);
			}
		}
	}

	private logDebug(message: string, ...args: any[]): void {
		if (this.config.debugMode) {
			logger.info(`[SubscriptionTester:${this.scenario.name}] ${message}`, ...args);
		}
	}

	getScenarioName(): string {
		return this.scenario.name;
	}

	getStartTime(): Date {
		return this.startTime;
	}

	getStatus(): 'running' | 'waiting' | 'completing' {
		return this.status;
	}

	async stop(): Promise<void> {
		await this.cleanup();
	}
}
