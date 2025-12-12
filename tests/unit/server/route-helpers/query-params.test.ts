/**
 * QueryParamExtractor and ClientSideFilter Unit Tests
 * Phase 1 Foundation - Workstream 1E
 *
 * Tests the query parameter extraction and client-side filtering utilities
 * that eliminate duplicate URL parsing and filtering code.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QueryParamExtractor } from '$lib/server/route-helpers/query-params';
import { ClientSideFilter } from '$lib/server/route-helpers/client-filter';

describe('QueryParamExtractor', () => {
	describe('getString()', () => {
		it('should get string parameter', () => {
			const url = new URL('http://localhost?search=test');
			const params = new QueryParamExtractor(url);

			expect(params.getString('search')).toBe('test');
		});

		it('should return default value when parameter is missing', () => {
			const url = new URL('http://localhost');
			const params = new QueryParamExtractor(url);

			expect(params.getString('search', 'default')).toBe('default');
		});

		it('should return empty string as default', () => {
			const url = new URL('http://localhost');
			const params = new QueryParamExtractor(url);

			expect(params.getString('search')).toBe('');
		});
	});

	describe('getInt()', () => {
		it('should parse integer parameter', () => {
			const url = new URL('http://localhost?page=5');
			const params = new QueryParamExtractor(url);

			expect(params.getInt('page')).toBe(5);
		});

		it('should return default value when parameter is missing', () => {
			const url = new URL('http://localhost');
			const params = new QueryParamExtractor(url);

			expect(params.getInt('page', 1)).toBe(1);
		});

		it('should return default value when parameter is NaN', () => {
			const url = new URL('http://localhost?page=invalid');
			const params = new QueryParamExtractor(url);

			expect(params.getInt('page', 1)).toBe(1);
		});

		it('should default to 0', () => {
			const url = new URL('http://localhost');
			const params = new QueryParamExtractor(url);

			expect(params.getInt('page')).toBe(0);
		});

		it('should parse negative integers', () => {
			const url = new URL('http://localhost?offset=-10');
			const params = new QueryParamExtractor(url);

			expect(params.getInt('offset')).toBe(-10);
		});
	});

	describe('getFloat()', () => {
		it('should parse float parameter', () => {
			const url = new URL('http://localhost?price=19.99');
			const params = new QueryParamExtractor(url);

			expect(params.getFloat('price')).toBe(19.99);
		});

		it('should return default value when parameter is missing', () => {
			const url = new URL('http://localhost');
			const params = new QueryParamExtractor(url);

			expect(params.getFloat('price', 0.0)).toBe(0.0);
		});

		it('should return default value when parameter is NaN', () => {
			const url = new URL('http://localhost?price=invalid');
			const params = new QueryParamExtractor(url);

			expect(params.getFloat('price', 0.0)).toBe(0.0);
		});
	});

	describe('getBoolean()', () => {
		it('should return true for "true"', () => {
			const url = new URL('http://localhost?active=true');
			const params = new QueryParamExtractor(url);

			expect(params.getBoolean('active')).toBe(true);
		});

		it('should return true for "1"', () => {
			const url = new URL('http://localhost?active=1');
			const params = new QueryParamExtractor(url);

			expect(params.getBoolean('active')).toBe(true);
		});

		it('should return true for "yes"', () => {
			const url = new URL('http://localhost?active=yes');
			const params = new QueryParamExtractor(url);

			expect(params.getBoolean('active')).toBe(true);
		});

		it('should return false for "false"', () => {
			const url = new URL('http://localhost?active=false');
			const params = new QueryParamExtractor(url);

			expect(params.getBoolean('active')).toBe(false);
		});

		it('should return default value when parameter is missing', () => {
			const url = new URL('http://localhost');
			const params = new QueryParamExtractor(url);

			expect(params.getBoolean('active', true)).toBe(true);
		});

		it('should be case insensitive', () => {
			const url = new URL('http://localhost?active=TRUE');
			const params = new QueryParamExtractor(url);

			expect(params.getBoolean('active')).toBe(true);
		});
	});

	describe('getPagination()', () => {
		it('should extract pagination parameters', () => {
			const url = new URL('http://localhost?page=3&limit=50');
			const params = new QueryParamExtractor(url);

			const pagination = params.getPagination();

			expect(pagination).toEqual({
				page: 3,
				limit: 50,
				offset: 100
			});
		});

		it('should use default limit', () => {
			const url = new URL('http://localhost?page=1');
			const params = new QueryParamExtractor(url);

			const pagination = params.getPagination(20);

			expect(pagination.limit).toBe(20);
		});

		it('should default to page 1', () => {
			const url = new URL('http://localhost');
			const params = new QueryParamExtractor(url);

			const pagination = params.getPagination();

			expect(pagination.page).toBe(1);
			expect(pagination.offset).toBe(0);
		});

		it('should enforce minimum page of 1', () => {
			const url = new URL('http://localhost?page=0');
			const params = new QueryParamExtractor(url);

			const pagination = params.getPagination();

			expect(pagination.page).toBe(1);
		});

		it('should enforce minimum limit of 1', () => {
			const url = new URL('http://localhost?limit=0');
			const params = new QueryParamExtractor(url);

			const pagination = params.getPagination();

			expect(pagination.limit).toBe(1);
		});

		it('should calculate offset correctly', () => {
			const url = new URL('http://localhost?page=5&limit=20');
			const params = new QueryParamExtractor(url);

			const pagination = params.getPagination();

			expect(pagination.offset).toBe(80); // (5-1) * 20
		});
	});

	describe('getFilters()', () => {
		it('should extract specified filter parameters', () => {
			const url = new URL('http://localhost?status=active&priority=high&assignee=john');
			const params = new QueryParamExtractor(url);

			const filters = params.getFilters(['status', 'priority', 'assignee']);

			expect(filters).toEqual({
				status: 'active',
				priority: 'high',
				assignee: 'john'
			});
		});

		it('should omit empty parameters', () => {
			const url = new URL('http://localhost?status=active&priority=');
			const params = new QueryParamExtractor(url);

			const filters = params.getFilters(['status', 'priority', 'assignee']);

			expect(filters).toEqual({
				status: 'active'
			});
		});

		it('should return empty object when no filters match', () => {
			const url = new URL('http://localhost');
			const params = new QueryParamExtractor(url);

			const filters = params.getFilters(['status', 'priority']);

			expect(filters).toEqual({});
		});
	});

	describe('getDate()', () => {
		it('should parse ISO date string', () => {
			const url = new URL('http://localhost?startDate=2024-01-15');
			const params = new QueryParamExtractor(url);

			const date = params.getDate('startDate');

			expect(date).toBeInstanceOf(Date);
			expect(date?.getFullYear()).toBe(2024);
			expect(date?.getMonth()).toBe(0); // January is 0
			expect(date?.getDate()).toBe(15);
		});

		it('should return null for missing parameter', () => {
			const url = new URL('http://localhost');
			const params = new QueryParamExtractor(url);

			expect(params.getDate('startDate')).toBeNull();
		});

		it('should return null for invalid date', () => {
			const url = new URL('http://localhost?startDate=invalid');
			const params = new QueryParamExtractor(url);

			expect(params.getDate('startDate')).toBeNull();
		});
	});

	describe('getArray()', () => {
		it('should split comma-separated values', () => {
			const url = new URL('http://localhost?tags=urgent,important,review');
			const params = new QueryParamExtractor(url);

			const tags = params.getArray('tags');

			expect(tags).toEqual(['urgent', 'important', 'review']);
		});

		it('should trim whitespace', () => {
			const url = new URL('http://localhost?tags=urgent, important , review');
			const params = new QueryParamExtractor(url);

			const tags = params.getArray('tags');

			expect(tags).toEqual(['urgent', 'important', 'review']);
		});

		it('should return empty array for missing parameter', () => {
			const url = new URL('http://localhost');
			const params = new QueryParamExtractor(url);

			expect(params.getArray('tags')).toEqual([]);
		});

		it('should filter out empty strings', () => {
			const url = new URL('http://localhost?tags=urgent,,important');
			const params = new QueryParamExtractor(url);

			const tags = params.getArray('tags');

			expect(tags).toEqual(['urgent', 'important']);
		});
	});

	describe('getAll()', () => {
		it('should return all query parameters', () => {
			const url = new URL('http://localhost?page=1&limit=20&search=test');
			const params = new QueryParamExtractor(url);

			const all = params.getAll();

			expect(all).toEqual({
				page: '1',
				limit: '20',
				search: 'test'
			});
		});

		it('should return empty object when no parameters', () => {
			const url = new URL('http://localhost');
			const params = new QueryParamExtractor(url);

			expect(params.getAll()).toEqual({});
		});
	});

	describe('has()', () => {
		it('should return true when parameter exists', () => {
			const url = new URL('http://localhost?debug=true');
			const params = new QueryParamExtractor(url);

			expect(params.has('debug')).toBe(true);
		});

		it('should return false when parameter does not exist', () => {
			const url = new URL('http://localhost');
			const params = new QueryParamExtractor(url);

			expect(params.has('debug')).toBe(false);
		});

		it('should return true even for empty parameter values', () => {
			const url = new URL('http://localhost?debug=');
			const params = new QueryParamExtractor(url);

			expect(params.has('debug')).toBe(true);
		});
	});
});

describe('ClientSideFilter', () => {
	describe('where()', () => {
		it('should filter by field value', () => {
			const items = [
				{ status: 'ACTIVE', name: 'A' },
				{ status: 'INACTIVE', name: 'B' },
				{ status: 'ACTIVE', name: 'C' }
			];
			const filter = new ClientSideFilter(items);

			const result = filter.where('status', 'ACTIVE').get();

			expect(result).toHaveLength(2);
			expect(result[0].name).toBe('A');
			expect(result[1].name).toBe('C');
		});

		it('should skip filtering when value is null', () => {
			const items = [{ status: 'ACTIVE' }, { status: 'INACTIVE' }];
			const filter = new ClientSideFilter(items);

			const result = filter.where('status', null).get();

			expect(result).toHaveLength(2);
		});

		it('should skip filtering when value is empty string', () => {
			const items = [{ status: 'ACTIVE' }, { status: 'INACTIVE' }];
			const filter = new ClientSideFilter(items);

			const result = filter.where('status', '').get();

			expect(result).toHaveLength(2);
		});

		it('should support chaining', () => {
			const items = [
				{ status: 'ACTIVE', priority: 'HIGH' },
				{ status: 'ACTIVE', priority: 'LOW' },
				{ status: 'INACTIVE', priority: 'HIGH' }
			];
			const filter = new ClientSideFilter(items);

			const result = filter.where('status', 'ACTIVE').where('priority', 'HIGH').get();

			expect(result).toHaveLength(1);
			expect(result[0].priority).toBe('HIGH');
		});
	});

	describe('whereIn()', () => {
		it('should filter by multiple values', () => {
			const items = [
				{ status: 'TODO' },
				{ status: 'IN_PROGRESS' },
				{ status: 'DONE' },
				{ status: 'REVIEW' }
			];
			const filter = new ClientSideFilter(items);

			const result = filter.whereIn('status', ['TODO', 'IN_PROGRESS', 'REVIEW']).get();

			expect(result).toHaveLength(3);
		});

		it('should skip filtering when values array is empty', () => {
			const items = [{ status: 'ACTIVE' }, { status: 'INACTIVE' }];
			const filter = new ClientSideFilter(items);

			const result = filter.whereIn('status', []).get();

			expect(result).toHaveLength(2);
		});
	});

	describe('filter()', () => {
		it('should filter by custom predicate', () => {
			const items = [
				{ value: 10 },
				{ value: 20 },
				{ value: 30 }
			];
			const filter = new ClientSideFilter(items);

			const result = filter.filter((item) => item.value > 15).get();

			expect(result).toHaveLength(2);
		});
	});

	describe('search()', () => {
		it('should search in multiple fields', () => {
			const items = [
				{ title: 'Urgent task', description: 'Fix bug' },
				{ title: 'Normal task', description: 'Urgent fix needed' },
				{ title: 'Low priority', description: 'Update docs' }
			];
			const filter = new ClientSideFilter(items);

			const result = filter.search('urgent', ['title', 'description']).get();

			expect(result).toHaveLength(2);
		});

		it('should be case insensitive', () => {
			const items = [
				{ title: 'URGENT' },
				{ title: 'urgent' },
				{ title: 'Urgent' }
			];
			const filter = new ClientSideFilter(items);

			const result = filter.search('URGENT', ['title']).get();

			expect(result).toHaveLength(3);
		});

		it('should skip search when term is empty', () => {
			const items = [{ title: 'A' }, { title: 'B' }];
			const filter = new ClientSideFilter(items);

			const result = filter.search('', ['title']).get();

			expect(result).toHaveLength(2);
		});
	});

	describe('dateRange()', () => {
		it('should filter by date range', () => {
			const items = [
				{ createdAt: '2024-01-01' },
				{ createdAt: '2024-06-15' },
				{ createdAt: '2024-12-31' }
			];
			const filter = new ClientSideFilter(items);

			const start = new Date('2024-03-01');
			const end = new Date('2024-09-30');
			const result = filter.dateRange('createdAt', start, end).get();

			expect(result).toHaveLength(1);
			expect(result[0].createdAt).toBe('2024-06-15');
		});

		it('should support partial ranges', () => {
			const items = [
				{ createdAt: '2024-01-01' },
				{ createdAt: '2024-06-15' }
			];
			const filter = new ClientSideFilter(items);

			const start = new Date('2024-03-01');
			const result = filter.dateRange('createdAt', start, null).get();

			expect(result).toHaveLength(1);
		});

		it('should exclude null dates', () => {
			const items = [
				{ createdAt: '2024-01-01' },
				{ createdAt: null },
				{ createdAt: undefined }
			];
			const filter = new ClientSideFilter(items);

			const start = new Date('2024-01-01');
			const result = filter.dateRange('createdAt', start, null).get();

			expect(result).toHaveLength(1);
		});
	});

	describe('paginate()', () => {
		it('should slice array by page', () => {
			const items = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
			const filter = new ClientSideFilter(items);

			const result = filter.paginate(3, 20).get();

			expect(result).toHaveLength(20);
			expect(result[0].id).toBe(41); // (3-1) * 20 + 1
			expect(result[19].id).toBe(60);
		});

		it('should handle last page with fewer items', () => {
			const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
			const filter = new ClientSideFilter(items);

			const result = filter.paginate(2, 20).get();

			expect(result).toHaveLength(5);
		});
	});

	describe('sortBy()', () => {
		it('should sort ascending by default', () => {
			const items = [
				{ value: 30 },
				{ value: 10 },
				{ value: 20 }
			];
			const filter = new ClientSideFilter(items);

			const result = filter.sortBy('value').get();

			expect(result[0].value).toBe(10);
			expect(result[2].value).toBe(30);
		});

		it('should sort descending', () => {
			const items = [
				{ value: 30 },
				{ value: 10 },
				{ value: 20 }
			];
			const filter = new ClientSideFilter(items);

			const result = filter.sortBy('value', 'desc').get();

			expect(result[0].value).toBe(30);
			expect(result[2].value).toBe(10);
		});

		it('should handle null values', () => {
			const items = [
				{ value: 20 },
				{ value: null },
				{ value: 10 }
			];
			const filter = new ClientSideFilter(items);

			const result = filter.sortBy('value').get();

			expect(result[0].value).toBe(10);
			expect(result[1].value).toBe(20);
			expect(result[2].value).toBeNull();
		});
	});

	describe('sortByMultiple()', () => {
		it('should sort by multiple fields', () => {
			const items = [
				{ priority: 3, createdAt: '2024-01-02' },
				{ priority: 3, createdAt: '2024-01-01' },
				{ priority: 1, createdAt: '2024-01-03' }
			];
			const filter = new ClientSideFilter(items);

			const result = filter
				.sortByMultiple([
					{ field: 'priority', direction: 'desc' },
					{ field: 'createdAt', direction: 'asc' }
				])
				.get();

			// First: priority 3, earliest date
			expect(result[0].priority).toBe(3);
			expect(result[0].createdAt).toBe('2024-01-01');
			// Second: priority 3, later date
			expect(result[1].priority).toBe(3);
			expect(result[1].createdAt).toBe('2024-01-02');
			// Third: priority 1
			expect(result[2].priority).toBe(1);
		});
	});

	describe('get()', () => {
		it('should return filtered array', () => {
			const items = [{ id: 1 }, { id: 2 }];
			const filter = new ClientSideFilter(items);

			const result = filter.get();

			expect(result).toEqual(items);
		});

		it('should not mutate original array', () => {
			const items = [{ id: 1 }, { id: 2 }];
			const filter = new ClientSideFilter(items);

			filter.where('id', 1).get();

			expect(items).toHaveLength(2);
		});
	});

	describe('count()', () => {
		it('should return count of filtered items', () => {
			const items = [
				{ status: 'ACTIVE' },
				{ status: 'ACTIVE' },
				{ status: 'INACTIVE' }
			];
			const filter = new ClientSideFilter(items);

			const count = filter.where('status', 'ACTIVE').count();

			expect(count).toBe(2);
		});
	});

	describe('any()', () => {
		it('should return true when items match', () => {
			const items = [{ status: 'ACTIVE' }];
			const filter = new ClientSideFilter(items);

			expect(filter.where('status', 'ACTIVE').any()).toBe(true);
		});

		it('should return false when no items match', () => {
			const items = [{ status: 'ACTIVE' }];
			const filter = new ClientSideFilter(items);

			expect(filter.where('status', 'INACTIVE').any()).toBe(false);
		});
	});

	describe('first()', () => {
		it('should return first item', () => {
			const items = [{ id: 1 }, { id: 2 }];
			const filter = new ClientSideFilter(items);

			const first = filter.first();

			expect(first).toEqual({ id: 1 });
		});

		it('should return null when no items match', () => {
			const items = [{ status: 'ACTIVE' }];
			const filter = new ClientSideFilter(items);

			const first = filter.where('status', 'INACTIVE').first();

			expect(first).toBeNull();
		});
	});

	describe('Integration - Full workflow', () => {
		it('should chain multiple operations', () => {
			const items = [
				{ status: 'TODO', priority: 'HIGH', title: 'Urgent fix', createdAt: '2024-01-03' },
				{ status: 'TODO', priority: 'LOW', title: 'Normal task', createdAt: '2024-01-02' },
				{ status: 'DONE', priority: 'HIGH', title: 'Urgent fix', createdAt: '2024-01-01' },
				{ status: 'TODO', priority: 'HIGH', title: 'Important work', createdAt: '2024-01-04' }
			];

			const result = new ClientSideFilter(items)
				.where('status', 'TODO')
				.where('priority', 'HIGH')
				.search('urgent', ['title'])
				.sortBy('createdAt', 'desc')
				.get();

			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Urgent fix');
		});
	});
});
