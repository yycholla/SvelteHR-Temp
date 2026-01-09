import type { Client } from '@urql/core';
import type { DocumentNode } from 'graphql';
import type {
	SubscriptionScenario,
	SubscriptionTestConfig,
	SubscriptionTestResult,
	SubscriptionTrigger
} from './types';
import { DEFAULT_CONFIG } from './config';
import { HR_SUBSCRIPTION_SCENARIOS } from './scenarios';
import { SubscriptionTestRunner } from './runners/test-runner';
import { SubscriptionResilienceTestRunner } from './runners/resilience-runner';
import { SubscriptionPerformanceTestRunner } from './runners/performance-runner';
import { SubscriptionOrderingTestRunner } from './runners/ordering-runner';

export class GraphQLSubscriptionTester {
	private config: SubscriptionTestConfig;
	private client: Client;
	private activeTests: Map<string, SubscriptionTestRunner> = new Map();

	constructor(client: Client, config: Partial<SubscriptionTestConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.client = client;
	}

	/**
	 * Run a single subscription test scenario
	 */
	async runScenario(scenario: SubscriptionScenario): Promise<SubscriptionTestResult> {
		const testRunner = new SubscriptionTestRunner(this.client, this.config, scenario);

		const testId = `${scenario.name}-${Date.now()}`;
		this.activeTests.set(testId, testRunner);

		try {
			const result = await testRunner.run();
			return result;
		} finally {
			this.activeTests.delete(testId);
		}
	}

	/**
	 * Run multiple subscription scenarios in parallel
	 */
	async runScenarios(scenarios: SubscriptionScenario[]): Promise<SubscriptionTestResult[]> {
		const promises = scenarios.map((scenario) => this.runScenario(scenario));
		return Promise.all(promises);
	}

	/**
	 * Run all predefined HR subscription scenarios
	 */
	async runHRSubscriptionTests(): Promise<SubscriptionTestResult[]> {
		return this.runScenarios(HR_SUBSCRIPTION_SCENARIOS);
	}

	/**
	 * Test subscription connection resilience
	 */
	async testConnectionResilience(
		subscription: DocumentNode,
		variables?: Record<string, any>
	): Promise<{
		reconnectionSuccess: boolean;
		reconnectionTime: number;
		messagesLost: number;
		finalConnectionState: 'connected' | 'failed';
	}> {
		const resililienceRunner = new SubscriptionResilienceTestRunner(this.client, this.config);

		return resililienceRunner.testReconnection(subscription, variables);
	}

	/**
	 * Test subscription performance under load
	 */
	async testSubscriptionPerformance(
		subscription: DocumentNode,
		options: {
			concurrentSubscriptions: number;
			messagesPerSecond: number;
			duration: number;
		}
	): Promise<{
		averageLatency: number;
		maxLatency: number;
		messagesThroughput: number;
		connectionStability: number;
		memoryUsage: number;
	}> {
		const performanceRunner = new SubscriptionPerformanceTestRunner(this.client, this.config);

		return performanceRunner.runLoadTest(subscription, options);
	}

	/**
	 * Validate subscription message ordering
	 */
	async testMessageOrdering(
		subscription: DocumentNode,
		triggerSequence: SubscriptionTrigger[]
	): Promise<{
		ordered: boolean;
		expectedSequence: string[];
		actualSequence: string[];
		outOfOrderCount: number;
	}> {
		const orderingRunner = new SubscriptionOrderingTestRunner(this.client, this.config);

		return orderingRunner.testOrdering(subscription, triggerSequence);
	}

	/**
	 * Get active test information
	 */
	getActiveTests(): Array<{
		id: string;
		scenario: string;
		startTime: Date;
		status: 'running' | 'waiting' | 'completing';
	}> {
		return Array.from(this.activeTests.entries()).map(([id, runner]) => ({
			id,
			scenario: runner.getScenarioName(),
			startTime: runner.getStartTime(),
			status: runner.getStatus()
		}));
	}

	/**
	 * Stop all active tests
	 */
	async stopAllTests(): Promise<void> {
		const stopPromises = Array.from(this.activeTests.values()).map((runner) => runner.stop());

		await Promise.all(stopPromises);
		this.activeTests.clear();
	}

	/**
	 * Update configuration
	 */
	updateConfig(newConfig: Partial<SubscriptionTestConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}
}
