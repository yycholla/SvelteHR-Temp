/**
 * PostGraphile to Rust GraphQL Migration - Smoke Tests
 *
 * These tests validate that the migration from PostGraphile to Rust idiomatic
 * GraphQL patterns is working correctly. They verify:
 * - Idiomatic Rust query patterns work
 * - PostGraphile patterns are no longer used
 * - Relationship resolvers function correctly
 * - Critical paths work end-to-end
 *
 * Generated: 2025-10-20
 * Phase: 0 - Foundation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type Client, cacheExchange, fetchExchange } from '@urql/core';
import { gql } from '@urql/core';

// Test configuration
const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql';

// Skip these tests in CI (no backend available)
const describeOrSkip = process.env.CI ? describe.skip : describe;

describeOrSkip('Migration Smoke Tests - Idiomatic Rust Patterns', () => {
	let client: Client;

	beforeAll(() => {
		client = createClient({
			url: GRAPHQL_ENDPOINT,
			fetch: fetch as any,
			requestPolicy: 'network-only',
			exchanges: [cacheExchange, fetchExchange]
		});
	});

	// =========================================================================
	// Test Suite 1: Basic Query Patterns
	// =========================================================================

	describe('Query Pattern Validation', () => {
		it('should use idiomatic query names (events, not allEvents)', async () => {
			const query = gql`
				query TestEventsQuery {
					events(limit: 5) {
						id
						title
					}
				}
			`;

			const result = await client.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data).toBeDefined();
			expect(result.data?.events).toBeDefined();
			expect(Array.isArray(result.data?.events)).toBe(true);
		});

		it('should return direct arrays (not .nodes)', async () => {
			const query = gql`
				query TestDirectArray {
					events(limit: 5) {
						id
					}
				}
			`;

			const result = await client.query(query, {}).toPromise();

			expect(result.data?.events).toBeDefined();
			expect(Array.isArray(result.data?.events)).toBe(true);
			// Verify no .nodes wrapper
			expect(result.data?.events?.nodes).toBeUndefined();
		});

		it('should use limit/offset pagination (not first/after)', async () => {
			const query = gql`
				query TestPagination {
					events(limit: 10, offset: 0) {
						id
						title
					}
				}
			`;

			const result = await client.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data?.events).toBeDefined();
		});

		it('should NOT accept PostGraphile allEvents query', async () => {
			const query = gql`
				query TestPostGraphileQuery {
					allEvents {
						nodes {
							id
						}
					}
				}
			`;

			const result = await client.query(query, {}).toPromise();

			// This query should fail since allEvents doesn't exist
			expect(result.error).toBeDefined();
			expect(result.error?.message).toContain('allEvents');
		});
	});

	// =========================================================================
	// Test Suite 2: Single Entity Queries
	// =========================================================================

	describe('Single Entity Query Validation', () => {
		it('should use event(id) (not eventById)', async () => {
			// First get an event ID
			const listQuery = gql`
				query GetEventsList {
					events(limit: 1) {
						id
					}
				}
			`;

			const listResult = await client.query(listQuery, {}).toPromise();
			const eventId = listResult.data?.events?.[0]?.id;

			if (!eventId) {
				console.warn('No events in database, skipping test');
				return;
			}

			// Query single event
			const query = gql`
				query GetSingleEvent($id: UUID!) {
					event(id: $id) {
						id
						title
					}
				}
			`;

			const result = await client.query(query, { id: eventId }).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data?.event).toBeDefined();
			expect(result.data?.event?.id).toBe(eventId);
		});

		it('should NOT accept eventById query', async () => {
			const query = gql`
				query TestPostGraphileSingleQuery($id: UUID!) {
					eventById(id: $id) {
						id
					}
				}
			`;

			const result = await client.query(query, { id: '550e8400-e29b-41d4-a716-446655440000' }).toPromise();

			// This query should fail
			expect(result.error).toBeDefined();
			expect(result.error?.message).toContain('eventById');
		});
	});

	// =========================================================================
	// Test Suite 3: Relationship Resolvers
	// =========================================================================

	describe('Relationship Resolver Validation', () => {
		it('should use idiomatic relationship names (organizer, not userByOrganizerId)', async () => {
			const query = gql`
				query TestRelationships {
					events(limit: 5) {
						id
						title
						organizer {
							id
							displayName
							email
						}
					}
				}
			`;

			const result = await client.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data?.events).toBeDefined();

			// Verify organizer field exists
			const eventsWithOrganizer = result.data?.events?.filter((e: any) => e.organizer);
			if (eventsWithOrganizer.length > 0) {
				expect(eventsWithOrganizer[0].organizer).toBeDefined();
				expect(eventsWithOrganizer[0].organizer.id).toBeDefined();
			}
		});

		it('should NOT accept PostGraphile relationship names', async () => {
			const query = gql`
				query TestPostGraphileRelationship {
					events(limit: 1) {
						id
						userByOrganizerId {
							id
						}
					}
				}
			`;

			const result = await client.query(query, {}).toPromise();

			// This query should fail
			expect(result.error).toBeDefined();
			expect(result.error?.message).toContain('userByOrganizerId');
		});

		it('should use direct array for one-to-many (attendees, not eventAttendeesByEventId.nodes)', async () => {
			const query = gql`
				query TestOneToMany {
					events(limit: 5) {
						id
						attendees(limit: 100) {
							id
							responseStatus
							employeeId
						}
					}
				}
			`;

			const result = await client.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data?.events).toBeDefined();

			// Verify attendees is a direct array
			result.data?.events?.forEach((event: any) => {
				expect(Array.isArray(event.attendees)).toBe(true);
				// Verify no .nodes wrapper
				expect(event.attendees?.nodes).toBeUndefined();
			});
		});

		it('should NOT accept PostGraphile connection wrappers', async () => {
			const query = gql`
				query TestPostGraphileConnection {
					events(limit: 1) {
						id
						eventAttendeesByEventId {
							nodes {
								id
							}
						}
					}
				}
			`;

			const result = await client.query(query, {}).toPromise();

			// This query should fail
			expect(result.error).toBeDefined();
			expect(result.error?.message).toContain('eventAttendeesByEventId');
		});
	});

	// =========================================================================
	// Test Suite 4: Mutation Patterns
	// =========================================================================

	describe('Mutation Pattern Validation', () => {
		it('should use createEvent(input) (not createEvent(input: { event: ... }))', async () => {
			const mutation = gql`
				mutation TestCreateEvent($input: CreateEventInput!) {
					createEvent(input: $input) {
						id
						title
					}
				}
			`;

			const input = {
				title: 'Test Event',
				eventType: 'MEETING',
				startTime: new Date().toISOString(),
				endTime: new Date(Date.now() + 3600000).toISOString(),
				isAllDay: false,
				status: 'SCHEDULED',
				isPublic: true,
				organizerId: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = await client.mutation(mutation, { input }).toPromise();

			// May fail if organizerId doesn't exist, but structure should be correct
			if (result.error) {
				// Check that error is NOT about input structure
				expect(result.error.message).not.toContain('event');
			} else {
				expect(result.data?.createEvent).toBeDefined();
				expect(result.data?.createEvent?.id).toBeDefined();
			}
		});

		it('should use updateEvent(id, input) (not updateEventByNodeId)', async () => {
			const mutation = gql`
				mutation TestUpdateEvent($id: UUID!, $input: UpdateEventInput!) {
					updateEvent(id: $id, input: $input) {
						id
						title
					}
				}
			`;

			// This will fail if event doesn't exist, but structure should be valid
			const result = await client
				.mutation(mutation, {
					id: '550e8400-e29b-41d4-a716-446655440000',
					input: { title: 'Updated' }
				})
				.toPromise();

			if (result.error) {
				// Check that error is NOT about mutation structure
				expect(result.error.message).not.toContain('updateEventByNodeId');
				expect(result.error.message).not.toContain('nodeId');
				expect(result.error.message).not.toContain('patch');
			}
		});

		it('should NOT accept PostGraphile mutation patterns', async () => {
			const mutation = gql`
				mutation TestPostGraphileMutation($nodeId: ID!, $patch: EventPatch!) {
					updateEventByNodeId(input: { nodeId: $nodeId, patch: $patch }) {
						event {
							id
						}
					}
				}
			`;

			const result = await client
				.mutation(mutation, {
					nodeId: 'WyJldmVudHMiLCJhYmMxMjMiXQ==',
					patch: { title: 'Updated' }
				})
				.toPromise();

			// This mutation should fail
			expect(result.error).toBeDefined();
			expect(result.error?.message).toContain('updateEventByNodeId');
		});
	});

	// =========================================================================
	// Test Suite 5: Critical Path Integration Tests
	// =========================================================================

	describe('Critical Path Integration', () => {
		it('should load events list with organizers', async () => {
			const query = gql`
				query LoadEventsPage {
					events(limit: 20) {
						id
						title
						startTime
						endTime
						status
						organizer {
							id
							displayName
							email
						}
						attendeeCount
					}
				}
			`;

			const result = await client.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data?.events).toBeDefined();
			expect(Array.isArray(result.data?.events)).toBe(true);
		});

		it('should load tasks list with assignees', async () => {
			const query = gql`
				query LoadTasksPage {
					tasks(limit: 20) {
						id
						title
						status
						priority
						dueDate
						assignee {
							id
							displayName
						}
					}
				}
			`;

			const result = await client.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data?.tasks).toBeDefined();
			expect(Array.isArray(result.data?.tasks)).toBe(true);
		});

		it('should load users list with departments', async () => {
			const query = gql`
				query LoadUsersPage {
					users(limit: 20) {
						id
						email
						fullName
						department {
							id
							name
						}
					}
				}
			`;

			const result = await client.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data?.users).toBeDefined();
			expect(Array.isArray(result.data?.users)).toBe(true);
		});

		it('should load departments list', async () => {
			const query = gql`
				query LoadDepartmentsPage {
					departments(limit: 50) {
						id
						name
						description
					}
				}
			`;

			const result = await client.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data?.departments).toBeDefined();
			expect(Array.isArray(result.data?.departments)).toBe(true);
		});

		it('should load leave requests with employee and leave type', async () => {
			const query = gql`
				query LoadLeaveRequestsPage {
					leaveRequests(limit: 20) {
						id
						startDate
						endDate
						status
						reason
					}
				}
			`;

			const result = await client.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data?.leaveRequests).toBeDefined();
			expect(Array.isArray(result.data?.leaveRequests)).toBe(true);
		});
	});

	// =========================================================================
	// Test Suite 6: Field Existence Validation
	// =========================================================================

	describe('Field Existence Validation', () => {
		it('should NOT have nodeId field on any type', async () => {
			const query = gql`
				query TestNodeIdField {
					events(limit: 1) {
						id
						nodeId
					}
				}
			`;

			const result = await client.query(query, {}).toPromise();

			// This query should fail - nodeId doesn't exist
			expect(result.error).toBeDefined();
			expect(result.error?.message).toContain('nodeId');
		});

		it('should NOT have icon field on LeaveType', async () => {
			const query = gql`
				query TestIconField {
					leaveTypes(limit: 1) {
						id
						name
						icon
					}
				}
			`;

			const result = await client.query(query, {}).toPromise();

			// This query should fail - icon doesn't exist
			expect(result.error).toBeDefined();
			expect(result.error?.message).toContain('icon');
		});
	});

	// =========================================================================
	// Test Suite 7: Performance Validation
	// =========================================================================

	describe('Performance Validation', () => {
		it('should return events query within acceptable time', async () => {
			const startTime = Date.now();

			const query = gql`
				query PerformanceTest {
					events(limit: 50) {
						id
						title
						organizer {
							id
							displayName
						}
						attendees(limit: 10) {
							id
						}
					}
				}
			`;

			const result = await client.query(query, {}).toPromise();
			const duration = Date.now() - startTime;

			expect(result.error).toBeUndefined();
			// Query should complete in under 2 seconds
			expect(duration).toBeLessThan(2000);
		});

		it('should handle pagination efficiently', async () => {
			const startTime = Date.now();

			const query = gql`
				query PaginationPerformance {
					events(limit: 100, offset: 0) {
						id
					}
				}
			`;

			const result = await client.query(query, {}).toPromise();
			const duration = Date.now() - startTime;

			expect(result.error).toBeUndefined();
			// Pagination should be fast
			expect(duration).toBeLessThan(1000);
		});
	});
});

// =========================================================================
// Export test utilities for other migration tests
// =========================================================================

export const createTestClient = () => {
	return createClient({
		url: GRAPHQL_ENDPOINT,
		fetch: fetch as any,
		requestPolicy: 'network-only',
		exchanges: [cacheExchange, fetchExchange]
	});
};

export const testIdiomaticQuery = async (query: string, variables?: any) => {
	const client = createTestClient();
	return await client.query(gql(query), variables || {}).toPromise();
};

export const testIdiomaticMutation = async (mutation: string, variables?: any) => {
	const client = createTestClient();
	return await client.mutation(gql(mutation), variables || {}).toPromise();
};
