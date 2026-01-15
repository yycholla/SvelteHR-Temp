/**
 * StatisticsCalculator and Aggregators Unit Tests
 * Phase 1 Foundation - Workstream 1D
 *
 * Tests the generic statistics calculator and aggregation helpers
 * that eliminate duplicate statistics calculation code.
 */

import { describe, it, expect } from 'vitest';
import { StatisticsCalculator } from '$lib/server/analytics/statistics-calculator';
import { Aggregators } from '$lib/server/analytics/aggregation-helpers';

describe('StatisticsCalculator', () => {
	describe('total()', () => {
		it('should return total count', () => {
			const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
			const calculator = new StatisticsCalculator(items);

			expect(calculator.total()).toBe(3);
		});

		it('should return 0 for empty collection', () => {
			const calculator = new StatisticsCalculator([]);

			expect(calculator.total()).toBe(0);
		});
	});

	describe('groupBy()', () => {
		it('should group items by field and count each group', () => {
			const items = [
				{ status: 'ACTIVE' },
				{ status: 'ACTIVE' },
				{ status: 'INACTIVE' },
				{ status: 'ACTIVE' }
			];
			const calculator = new StatisticsCalculator(items);

			const result = calculator.groupBy('status');

			expect(result).toEqual({
				ACTIVE: 3,
				INACTIVE: 1
			});
		});

		it('should handle null/undefined values as "unknown"', () => {
			const items = [{ status: 'ACTIVE' }, { status: null }, { status: undefined }];
			const calculator = new StatisticsCalculator(items);

			const result = calculator.groupBy('status');

			expect(result).toEqual({
				ACTIVE: 1,
				unknown: 2
			});
		});

		it('should return empty object for empty collection', () => {
			const calculator = new StatisticsCalculator([]);

			const result = calculator.groupBy('status');

			expect(result).toEqual({});
		});
	});

	describe('count()', () => {
		it('should count items matching predicate', () => {
			const items = [
				{ status: 'ACTIVE', priority: 'HIGH' },
				{ status: 'ACTIVE', priority: 'LOW' },
				{ status: 'INACTIVE', priority: 'HIGH' }
			];
			const calculator = new StatisticsCalculator(items);

			const highPriority = calculator.count((item) => item.priority === 'HIGH');

			expect(highPriority).toBe(2);
		});

		it('should return 0 when no items match', () => {
			const items = [{ status: 'ACTIVE' }, { status: 'ACTIVE' }];
			const calculator = new StatisticsCalculator(items);

			const inactive = calculator.count((item) => item.status === 'INACTIVE');

			expect(inactive).toBe(0);
		});

		it('should return 0 for empty collection', () => {
			const calculator = new StatisticsCalculator([]);

			const result = calculator.count((item) => true);

			expect(result).toBe(0);
		});
	});

	describe('calculate()', () => {
		it('should calculate multiple statistics in one pass', () => {
			const items = [
				{ status: 'TODO', priority: 'HIGH' },
				{ status: 'TODO', priority: 'LOW' },
				{ status: 'IN_PROGRESS', priority: 'HIGH' },
				{ status: 'DONE', priority: 'LOW' }
			];
			const calculator = new StatisticsCalculator(items);

			const stats = calculator.calculate({
				todo: (t) => t.status === 'TODO',
				inProgress: (t) => t.status === 'IN_PROGRESS',
				done: (t) => t.status === 'DONE',
				highPriority: (t) => t.priority === 'HIGH'
			});

			expect(stats).toEqual({
				total: 4,
				todo: 2,
				inProgress: 1,
				done: 1,
				highPriority: 2
			});
		});

		it('should include total count', () => {
			const calculator = new StatisticsCalculator([{ id: 1 }, { id: 2 }]);

			const stats = calculator.calculate({});

			expect(stats).toHaveProperty('total', 2);
		});
	});

	describe('forTasks()', () => {
		it('should calculate task statistics', () => {
			const tasks = [
				{ status: 'TODO', dueDate: null },
				{ status: 'IN_PROGRESS', dueDate: '2025-01-01' },
				{ status: 'BLOCKED', dueDate: null },
				{ status: 'REVIEW', dueDate: '2025-12-31' },
				{ status: 'DONE', dueDate: '2023-01-01' }
			];

			const stats = StatisticsCalculator.forTasks(tasks);

			expect(stats.total).toBe(5);
			expect(stats.notStarted).toBe(1);
			expect(stats.inProgress).toBe(1);
			expect(stats.blocked).toBe(1);
			expect(stats.review).toBe(1);
			expect(stats.completed).toBe(1);
		});

		it('should calculate overdue tasks correctly', () => {
			const now = new Date();
			const pastDate = new Date(now.getTime() - 86400000).toISOString(); // 1 day ago
			const futureDate = new Date(now.getTime() + 86400000).toISOString(); // 1 day from now

			const tasks = [
				{ status: 'TODO', dueDate: pastDate }, // Overdue
				{ status: 'IN_PROGRESS', dueDate: pastDate }, // Overdue
				{ status: 'DONE', dueDate: pastDate }, // Not overdue (completed)
				{ status: 'TODO', dueDate: futureDate }, // Not overdue
				{ status: 'TODO', dueDate: null } // Not overdue (no due date)
			];

			const stats = StatisticsCalculator.forTasks(tasks);

			expect(stats.overdue).toBe(2);
		});

		it('should handle empty task list', () => {
			const stats = StatisticsCalculator.forTasks([]);

			expect(stats).toEqual({
				total: 0,
				notStarted: 0,
				inProgress: 0,
				blocked: 0,
				review: 0,
				completed: 0,
				overdue: 0
			});
		});
	});

	describe('forLeaveRequests()', () => {
		it('should calculate leave request statistics', () => {
			const requests = [
				{ status: 'PENDING' },
				{ status: 'PENDING' },
				{ status: 'APPROVED' },
				{ status: 'REJECTED' },
				{ status: 'CANCELLED' }
			];

			const stats = StatisticsCalculator.forLeaveRequests(requests);

			expect(stats).toEqual({
				total: 5,
				pending: 2,
				approved: 1,
				rejected: 1,
				cancelled: 1
			});
		});

		it('should handle empty leave requests list', () => {
			const stats = StatisticsCalculator.forLeaveRequests([]);

			expect(stats.total).toBe(0);
		});
	});

	describe('forEvents()', () => {
		it('should calculate event statistics', () => {
			const now = new Date();
			const past = new Date(now.getTime() - 86400000).toISOString(); // 1 day ago
			const future = new Date(now.getTime() + 86400000).toISOString(); // 1 day from now
			const ongoingStart = new Date(now.getTime() - 3600000).toISOString(); // 1 hour ago
			const ongoingEnd = new Date(now.getTime() + 3600000).toISOString(); // 1 hour from now

			const events = [
				{ startTime: future, endTime: future, status: 'ACTIVE' }, // Upcoming
				{ startTime: ongoingStart, endTime: ongoingEnd, status: 'ACTIVE' }, // Ongoing
				{ startTime: past, endTime: past, status: 'ACTIVE' }, // Past
				{ startTime: future, endTime: future, status: 'CANCELLED' } // Cancelled
			];

			const stats = StatisticsCalculator.forEvents(events);

			expect(stats.total).toBe(4);
			expect(stats.upcoming).toBe(1);
			expect(stats.ongoing).toBe(1);
			expect(stats.past).toBe(1);
			expect(stats.cancelled).toBe(1);
		});

		it('should not count cancelled events as upcoming/ongoing/past', () => {
			const now = new Date();
			const future = new Date(now.getTime() + 86400000).toISOString();

			const events = [{ startTime: future, endTime: future, status: 'CANCELLED' }];

			const stats = StatisticsCalculator.forEvents(events);

			expect(stats.upcoming).toBe(0);
			expect(stats.cancelled).toBe(1);
		});

		it('should handle empty events list', () => {
			const stats = StatisticsCalculator.forEvents([]);

			expect(stats.total).toBe(0);
		});
	});

	describe('forEmployees()', () => {
		it('should calculate employee statistics using status field', () => {
			const employees = [
				{ status: 'ACTIVE' },
				{ status: 'ACTIVE' },
				{ status: 'INACTIVE' },
				{ status: 'ON_LEAVE' }
			];

			const stats = StatisticsCalculator.forEmployees(employees);

			expect(stats).toEqual({
				total: 4,
				active: 2,
				inactive: 1,
				onLeave: 1
			});
		});

		it('should calculate employee statistics using employmentStatus field', () => {
			const employees = [
				{ employmentStatus: 'ACTIVE' },
				{ employmentStatus: 'INACTIVE' },
				{ employmentStatus: 'ON_LEAVE' }
			];

			const stats = StatisticsCalculator.forEmployees(employees);

			expect(stats.active).toBe(1);
			expect(stats.inactive).toBe(1);
			expect(stats.onLeave).toBe(1);
		});

		it('should handle empty employees list', () => {
			const stats = StatisticsCalculator.forEmployees([]);

			expect(stats.total).toBe(0);
		});
	});
});

describe('Aggregators', () => {
	describe('sum()', () => {
		it('should sum numeric field', () => {
			const items = [{ value: 10 }, { value: 20 }, { value: 30 }];

			const result = Aggregators.sum(items, 'value');

			expect(result).toBe(60);
		});

		it('should handle non-numeric values as 0', () => {
			const items = [{ value: 10 }, { value: null }, { value: undefined }, { value: 'abc' }];

			const result = Aggregators.sum(items, 'value');

			expect(result).toBe(10);
		});

		it('should return 0 for empty collection', () => {
			const result = Aggregators.sum([], 'value');

			expect(result).toBe(0);
		});
	});

	describe('average()', () => {
		it('should calculate average', () => {
			const items = [{ value: 10 }, { value: 20 }, { value: 30 }];

			const result = Aggregators.average(items, 'value');

			expect(result).toBe(20);
		});

		it('should return 0 for empty collection', () => {
			const result = Aggregators.average([], 'value');

			expect(result).toBe(0);
		});

		it('should handle non-numeric values', () => {
			const items = [{ value: 10 }, { value: null }, { value: 20 }];

			const result = Aggregators.average(items, 'value');

			expect(result).toBe(10); // (10 + 0 + 20) / 3
		});
	});

	describe('min()', () => {
		it('should find minimum value', () => {
			const items = [{ value: 30 }, { value: 10 }, { value: 20 }];

			const result = Aggregators.min(items, 'value');

			expect(result).toBe(10);
		});

		it('should return 0 for empty collection', () => {
			const result = Aggregators.min([], 'value');

			expect(result).toBe(0);
		});

		it('should filter out NaN values', () => {
			const items = [{ value: 30 }, { value: null }, { value: 10 }];

			const result = Aggregators.min(items, 'value');

			expect(result).toBe(10);
		});
	});

	describe('max()', () => {
		it('should find maximum value', () => {
			const items = [{ value: 30 }, { value: 10 }, { value: 20 }];

			const result = Aggregators.max(items, 'value');

			expect(result).toBe(30);
		});

		it('should return 0 for empty collection', () => {
			const result = Aggregators.max([], 'value');

			expect(result).toBe(0);
		});

		it('should filter out NaN values', () => {
			const items = [{ value: 30 }, { value: null }, { value: 10 }];

			const result = Aggregators.max(items, 'value');

			expect(result).toBe(30);
		});
	});

	describe('median()', () => {
		it('should calculate median for odd-length collection', () => {
			const items = [{ value: 10 }, { value: 30 }, { value: 20 }];

			const result = Aggregators.median(items, 'value');

			expect(result).toBe(20);
		});

		it('should calculate median for even-length collection', () => {
			const items = [{ value: 10 }, { value: 20 }, { value: 30 }, { value: 40 }];

			const result = Aggregators.median(items, 'value');

			expect(result).toBe(25); // (20 + 30) / 2
		});

		it('should return 0 for empty collection', () => {
			const result = Aggregators.median([], 'value');

			expect(result).toBe(0);
		});

		it('should filter out NaN values', () => {
			const items = [{ value: 10 }, { value: null }, { value: 20 }, { value: 30 }];

			const result = Aggregators.median(items, 'value');

			expect(result).toBe(20);
		});
	});

	describe('standardDeviation()', () => {
		it('should calculate standard deviation', () => {
			const items = [
				{ value: 2 },
				{ value: 4 },
				{ value: 4 },
				{ value: 4 },
				{ value: 5 },
				{ value: 5 },
				{ value: 7 },
				{ value: 9 }
			];

			const result = Aggregators.standardDeviation(items, 'value');

			expect(result).toBeCloseTo(2, 0); // Close to 2
		});

		it('should return 0 for empty collection', () => {
			const result = Aggregators.standardDeviation([], 'value');

			expect(result).toBe(0);
		});

		it('should return 0 for single item', () => {
			const items = [{ value: 10 }];

			const result = Aggregators.standardDeviation(items, 'value');

			expect(result).toBe(0);
		});
	});

	describe('percentile()', () => {
		it('should calculate percentile', () => {
			const items = [
				{ value: 1 },
				{ value: 2 },
				{ value: 3 },
				{ value: 4 },
				{ value: 5 },
				{ value: 6 },
				{ value: 7 },
				{ value: 8 },
				{ value: 9 },
				{ value: 10 }
			];

			const p50 = Aggregators.percentile(items, 'value', 50);
			const p90 = Aggregators.percentile(items, 'value', 90);

			expect(p50).toBe(5.5); // Median
			expect(p90).toBe(9.1); // 90th percentile
		});

		it('should return 0 for empty collection', () => {
			const result = Aggregators.percentile([], 'value', 50);

			expect(result).toBe(0);
		});

		it('should throw error for invalid percentile', () => {
			const items = [{ value: 10 }];

			expect(() => Aggregators.percentile(items, 'value', -1)).toThrow(
				'Percentile must be between 0 and 100'
			);
			expect(() => Aggregators.percentile(items, 'value', 101)).toThrow(
				'Percentile must be between 0 and 100'
			);
		});

		it('should handle 0th and 100th percentiles', () => {
			const items = [{ value: 1 }, { value: 5 }, { value: 10 }];

			const p0 = Aggregators.percentile(items, 'value', 0);
			const p100 = Aggregators.percentile(items, 'value', 100);

			expect(p0).toBe(1);
			expect(p100).toBe(10);
		});
	});

	describe('countDistinct()', () => {
		it('should count distinct values', () => {
			const items = [
				{ department: 'Engineering' },
				{ department: 'Engineering' },
				{ department: 'Sales' },
				{ department: 'HR' }
			];

			const result = Aggregators.countDistinct(items, 'department');

			expect(result).toBe(3);
		});

		it('should handle null and undefined', () => {
			const items = [
				{ department: 'Engineering' },
				{ department: null },
				{ department: undefined }
			];

			const result = Aggregators.countDistinct(items, 'department');

			expect(result).toBe(3); // 'Engineering', null, undefined are distinct
		});

		it('should return 0 for empty collection', () => {
			const result = Aggregators.countDistinct([], 'department');

			expect(result).toBe(0);
		});
	});

	describe('groupAndAggregate()', () => {
		it('should group and aggregate', () => {
			const items = [
				{ department: 'Engineering', salary: 100000 },
				{ department: 'Engineering', salary: 120000 },
				{ department: 'Sales', salary: 80000 },
				{ department: 'Sales', salary: 90000 }
			];

			const result = Aggregators.groupAndAggregate(
				items,
				'department',
				'salary',
				Aggregators.average
			);

			expect(result).toEqual({
				Engineering: 110000,
				Sales: 85000
			});
		});

		it('should handle single group', () => {
			const items = [{ department: 'Engineering', salary: 100000 }];

			const result = Aggregators.groupAndAggregate(items, 'department', 'salary', Aggregators.sum);

			expect(result).toEqual({
				Engineering: 100000
			});
		});

		it('should handle null/undefined group keys', () => {
			const items = [
				{ department: 'Engineering', salary: 100000 },
				{ department: null, salary: 50000 },
				{ department: undefined, salary: 60000 }
			];

			const result = Aggregators.groupAndAggregate(items, 'department', 'salary', Aggregators.sum);

			expect(result).toHaveProperty('Engineering', 100000);
			expect(result).toHaveProperty('unknown', 110000);
		});
	});
});
