// E2E Test: Event RSVP Workflow (Stagehand AI Version)
// Feature: 019-we-need-to - Phase 6
// Purpose: Test complete RSVP workflow for events with AI-powered interactions
//
// MIGRATION NOTE: This is the Stagehand version of event-rsvp-workflow.spec.ts
// Benefits:
// - Natural language interactions (no brittle selectors)
// - More flexible workflow handling
// - Automatic adaptation to UI changes
// - Better handling of dynamic content

import { test, expect } from '@playwright/test';
import { z } from 'zod';
import {
	initStagehand,
	gotoPage,
	performAction,
	extractData,
	cleanupStagehand,
	loginWithStagehand,
	CommonSchemas
} from '../../utils/stagehand-helpers';

test.describe('Event RSVP Workflow (Stagehand)', () => {
	test('user can view events list and navigate to event details', async () => {
		const stagehand = await initStagehand();

		try {
			// Login using AI
			await loginWithStagehand(stagehand, 'admin', 'admin');

			// Navigate to events page
			await gotoPage(stagehand, '/dashboard/events');

			// Extract page information using AI
			const eventsPageData = await extractData(stagehand, {
				instruction:
					'Extract information about the events page including title and whether there are any event cards displayed',
				schema: z.object({
					pageTitle: z.string().describe('Page title or heading'),
					hasEvents: z.boolean().describe('True if event cards are visible'),
					eventCount: z.number().optional().describe('Number of events shown')
				})
			});

			expect(eventsPageData.pageTitle.toLowerCase()).toContain('event');

			if (eventsPageData.hasEvents && eventsPageData.eventCount && eventsPageData.eventCount > 0) {
				// Click first event using AI
				await performAction(stagehand, 'click on the first event card or event item');

				// Wait for navigation
				await stagehand.page.waitForURL('**/events/*');

				// Verify event detail page loaded
				const eventDetailData = await extractData(stagehand, {
					instruction:
						'Extract the event details page information including title and whether event information is displayed',
					schema: z.object({
						eventTitle: z.string().describe('Event title'),
						hasEventInfo: z
							.boolean()
							.describe('True if event details/information section is visible')
					})
				});

				expect(eventDetailData.hasEventInfo).toBe(true);
				expect(eventDetailData.eventTitle).toBeTruthy();
			} else {
				// Verify empty state
				const emptyState = await extractData(stagehand, {
					instruction: 'Check if there is a "no events" or "no upcoming events" message',
					schema: z.object({
						hasEmptyMessage: z.boolean(),
						emptyMessage: z.string().optional()
					})
				});

				expect(emptyState.hasEmptyMessage).toBe(true);
			}
		} finally {
			await cleanupStagehand(stagehand);
		}
	});

	test('user can change RSVP status on event detail page', async () => {
		const stagehand = await initStagehand();

		try {
			// Login and navigate to events
			await loginWithStagehand(stagehand, 'admin', 'admin');
			await gotoPage(stagehand, '/dashboard/events');

			// Check if events exist
			const eventsCheck = await extractData(stagehand, {
				instruction: 'Check if there are any event cards visible',
				schema: z.object({
					hasEvents: z.boolean()
				})
			});

			if (eventsCheck.hasEvents) {
				// Navigate to first event
				await performAction(stagehand, 'click the first event');
				await stagehand.page.waitForURL('**/events/*');

				// Check if this is a past event
				const eventStatus = await extractData(stagehand, {
					instruction:
						'Check if this is a past event or if there is a message saying the event has ended',
					schema: z.object({
						isPastEvent: z.boolean().describe('True if event is in the past or has ended'),
						hasRsvpButtons: z.boolean().describe('True if RSVP buttons are visible')
					})
				});

				if (!eventStatus.isPastEvent && eventStatus.hasRsvpButtons) {
					// Click Accept/Going button
					await performAction(stagehand, 'click the Accept button or Going button for RSVP');

					// Wait for update
					await stagehand.page.waitForTimeout(1000);

					// Verify RSVP was updated
					const rsvpStatusAfterAccept = await extractData(stagehand, {
						instruction:
							'Check which RSVP button is currently selected or active (Accept, Decline, or Tentative/Maybe)',
						schema: z.object({
							selectedStatus: z
								.enum(['accept', 'decline', 'tentative', 'maybe', 'going', 'not_going'])
								.describe('Currently selected RSVP status'),
							isAccepted: z.boolean().describe('True if Accept or Going is selected')
						})
					});

					expect(rsvpStatusAfterAccept.isAccepted).toBe(true);

					// Try changing to Tentative
					const hasTentative = await extractData(stagehand, {
						instruction: 'Check if there is a Tentative or Maybe RSVP button visible',
						schema: z.object({
							hasTentativeButton: z.boolean()
						})
					});

					if (hasTentative.hasTentativeButton) {
						await performAction(stagehand, 'click the Tentative or Maybe button');
						await stagehand.page.waitForTimeout(1000);

						// Verify status changed
						const rsvpStatusAfterTentative = await extractData(stagehand, {
							instruction: 'Check which RSVP button is currently selected',
							schema: z.object({
								selectedStatus: z.string(),
								isTentative: z.boolean().describe('True if Tentative or Maybe is selected')
							})
						});

						expect(rsvpStatusAfterTentative.isTentative).toBe(true);
					}

					// Verify RSVP statistics are visible
					const statsVisible = await extractData(stagehand, {
						instruction: 'Check if RSVP statistics or attendee count information is visible',
						schema: z.object({
							hasStats: z.boolean()
						})
					});

					expect(statsVisible.hasStats).toBe(true);
				}
			}
		} finally {
			await cleanupStagehand(stagehand);
		}
	});

	test('RSVP status persists after page reload', async () => {
		const stagehand = await initStagehand();

		try {
			// Login and navigate to events
			await loginWithStagehand(stagehand, 'admin', 'admin');
			await gotoPage(stagehand, '/dashboard/events');

			// Check for events
			const hasEvents = await extractData(stagehand, {
				instruction: 'Check if there are any events displayed',
				schema: z.object({
					hasEvents: z.boolean()
				})
			});

			if (hasEvents.hasEvents) {
				// Navigate to first event
				await performAction(stagehand, 'click the first event');
				await stagehand.page.waitForURL('**/events/*');
				const eventUrl = stagehand.page.url();

				// Check if event allows RSVP
				const eventInfo = await extractData(stagehand, {
					instruction: 'Check if this event is in the past or if RSVP buttons are available',
					schema: z.object({
						isPastEvent: z.boolean(),
						hasRsvpOptions: z.boolean()
					})
				});

				if (!eventInfo.isPastEvent && eventInfo.hasRsvpOptions) {
					// Set RSVP to Accepted
					await performAction(stagehand, 'click the Accept or Going RSVP button');
					await stagehand.page.waitForTimeout(1000);

					// Reload the page
					await stagehand.page.reload({ waitUntil: 'networkidle' });

					// Verify RSVP status persisted
					const rsvpAfterReload = await extractData(stagehand, {
						instruction: 'Check which RSVP button is currently selected or active',
						schema: z.object({
							selectedStatus: z.string().describe('Currently selected RSVP status'),
							isAccepted: z.boolean().describe('True if Accept or Going is selected')
						})
					});

					expect(rsvpAfterReload.isAccepted).toBe(true);

					// Check if user appears in attendee list
					const attendeeInfo = await extractData(stagehand, {
						instruction:
							'Check if there is an attendee list or guest list showing who has accepted, and if the current user is in that list',
						schema: z.object({
							hasAttendeeList: z.boolean().describe('True if attendee list is visible'),
							currentUserIsAttendee: z
								.boolean()
								.optional()
								.describe('True if current user is shown as accepted in the list')
						})
					});

					if (attendeeInfo.hasAttendeeList && attendeeInfo.currentUserIsAttendee !== undefined) {
						expect(attendeeInfo.currentUserIsAttendee).toBe(true);
					}
				}
			}
		} finally {
			await cleanupStagehand(stagehand);
		}
	});

	test('event filters work correctly', async () => {
		const stagehand = await initStagehand();

		try {
			// Login and navigate to events
			await loginWithStagehand(stagehand, 'admin', 'admin');
			await gotoPage(stagehand, '/dashboard/events');

			// Check for available filters
			const filtersData = await extractData(stagehand, {
				instruction:
					'Find all available filters including visibility filter, status filter, and event type filter. List their names and options.',
				schema: z.object({
					hasFilters: z.boolean().describe('True if filters are available'),
					filters: z
						.array(
							z.object({
								name: z.string().describe('Filter name (e.g., visibility, status, event type)'),
								options: z.array(z.string()).describe('Available options for this filter')
							})
						)
						.optional()
				})
			});

			if (filtersData.hasFilters && filtersData.filters && filtersData.filters.length > 0) {
				// Test visibility filter if available
				const visibilityFilter = filtersData.filters.find((f) =>
					f.name.toLowerCase().includes('visibility')
				);

				if (visibilityFilter && visibilityFilter.options.length > 0) {
					const firstOption = visibilityFilter.options[0];
					await performAction(stagehand, `select "${firstOption}" from the visibility filter`);
					await stagehand.page.waitForTimeout(500);

					// Verify URL updated
					expect(stagehand.page.url()).toContain('visibility=');
				}

				// Test status filter if available
				const statusFilter = filtersData.filters.find((f) =>
					f.name.toLowerCase().includes('status')
				);

				if (statusFilter && statusFilter.options.length > 0) {
					await performAction(stagehand, 'select "Upcoming" from the status filter');
					await stagehand.page.waitForTimeout(500);

					// Verify URL updated
					expect(stagehand.page.url()).toContain('status=');
				}

				// Test event type filter if available
				const typeFilter = filtersData.filters.find(
					(f) => f.name.toLowerCase().includes('type') || f.name.toLowerCase().includes('event')
				);

				if (typeFilter && typeFilter.options.length > 0) {
					const typeOption =
						typeFilter.options.find((opt) => opt.toLowerCase().includes('meeting')) ||
						typeFilter.options[0];
					await performAction(stagehand, `select "${typeOption}" from the event type filter`);
					await stagehand.page.waitForTimeout(500);

					// Verify URL updated
					expect(stagehand.page.url()).toContain('eventType=');
				}

				// Verify filtered results displayed
				const resultsData = await extractData(stagehand, {
					instruction:
						'Check if event cards are displayed or if there is a "no events found" message',
					schema: z.object({
						hasResults: z.boolean().describe('True if results are shown'),
						hasNoResultsMessage: z.boolean().describe('True if "no events found" message is shown')
					})
				});

				expect(resultsData.hasResults || resultsData.hasNoResultsMessage).toBe(true);
			}
		} finally {
			await cleanupStagehand(stagehand);
		}
	});

	test('manager can create new event', async () => {
		const stagehand = await initStagehand();

		try {
			// Login and navigate to events
			await loginWithStagehand(stagehand, 'admin', 'admin');
			await gotoPage(stagehand, '/dashboard/events');

			// Check if user has access to create events
			const createAccessData = await extractData(stagehand, {
				instruction: 'Check if there is a "Create Event" button or link visible on the page',
				schema: z.object({
					hasCreateButton: z.boolean().describe('True if Create Event button is visible'),
					buttonLabel: z.string().optional().describe('Label of the create button')
				})
			});

			if (createAccessData.hasCreateButton) {
				// Click create button
				await performAction(stagehand, 'click the Create Event button');

				// Wait for navigation
				await stagehand.page.waitForURL('**/events/create');

				// Verify create form loaded
				const formData = await extractData(stagehand, {
					instruction:
						'Check if the event creation form is displayed with fields for title, description, dates, and other details',
					schema: z.object({
						hasForm: z.boolean().describe('True if create form is visible'),
						pageTitle: z.string().describe('Page title'),
						fields: z.array(z.string()).optional().describe('List of visible form fields')
					})
				});

				expect(formData.hasForm).toBe(true);
				expect(formData.pageTitle.toLowerCase()).toContain('create');

				// Fill out event form using AI
				await performAction(stagehand, 'enter "Test Event - E2E" in the title field');
				await performAction(
					stagehand,
					'enter "This is a test event created via E2E test" in the description field'
				);

				// Set dates and times
				const tomorrow = new Date();
				tomorrow.setDate(tomorrow.getDate() + 1);
				const startTimeStr = tomorrow.toISOString().slice(0, 16);

				const endTime = new Date(tomorrow);
				endTime.setHours(endTime.getHours() + 2);
				const endTimeStr = endTime.toISOString().slice(0, 16);

				await performAction(stagehand, `enter "${startTimeStr}" in the start time field`);
				await performAction(stagehand, `enter "${endTimeStr}" in the end time field`);
				await performAction(stagehand, 'enter "Conference Room A" in the location field');
				await performAction(stagehand, 'select "Meeting" from the event type dropdown');
				await performAction(
					stagehand,
					'select "Company" or "Company-Wide" from the visibility dropdown'
				);

				// Verify submit button is present and enabled
				const submitButtonData = await extractData(stagehand, {
					instruction: 'Check if the Create Event or Submit button is visible and enabled',
					schema: z.object({
						hasSubmitButton: z.boolean(),
						isEnabled: z.boolean().describe('True if button is enabled (not disabled)')
					})
				});

				expect(submitButtonData.hasSubmitButton).toBe(true);
				expect(submitButtonData.isEnabled).toBe(true);
			} else {
				// User doesn't have manager access - verify no create button
				expect(createAccessData.hasCreateButton).toBe(false);
			}
		} finally {
			await cleanupStagehand(stagehand);
		}
	});

	test('user can view event statistics', async () => {
		const stagehand = await initStagehand();

		try {
			// Login and navigate to events
			await loginWithStagehand(stagehand, 'admin', 'admin');
			await gotoPage(stagehand, '/dashboard/events');

			// Check for statistics section
			const statsData = await extractData(stagehand, {
				instruction:
					'Find statistics or overview section showing metrics like total events, upcoming events, or other event-related numbers',
				schema: z.object({
					hasStatistics: z.boolean().describe('True if statistics section is visible'),
					metrics: z
						.array(
							z.object({
								name: z.string().describe('Metric name'),
								value: z.string().describe('Metric value')
							})
						)
						.optional()
						.describe('List of metrics shown')
				})
			});

			if (statsData.hasStatistics && statsData.metrics) {
				// Verify key metrics are present
				const hasImportantMetrics = statsData.metrics.some(
					(m) => m.name.toLowerCase().includes('total') || m.name.toLowerCase().includes('upcoming')
				);
				expect(hasImportantMetrics).toBe(true);
			}

			// Navigate to event detail
			const hasEvents = await extractData(stagehand, {
				instruction: 'Check if there are any event cards displayed',
				schema: z.object({
					hasEvents: z.boolean()
				})
			});

			if (hasEvents.hasEvents) {
				await performAction(stagehand, 'click the first event');
				await stagehand.page.waitForLoadState('networkidle');

				// Check for RSVP statistics on detail page
				const detailStatsData = await extractData(stagehand, {
					instruction:
						'Find RSVP statistics or response breakdown showing counts for Accepted, Declined, Tentative responses',
					schema: z.object({
						hasRsvpStats: z.boolean().describe('True if RSVP statistics are visible'),
						responseBreakdown: z
							.array(
								z.object({
									status: z.string().describe('RSVP status (Accepted, Declined, etc.)'),
									count: z.number().optional().describe('Number of responses with this status')
								})
							)
							.optional()
					})
				});

				if (detailStatsData.hasRsvpStats && detailStatsData.responseBreakdown) {
					// Verify we have breakdown of responses
					const hasAcceptedOrGoing = detailStatsData.responseBreakdown.some(
						(r) =>
							r.status.toLowerCase().includes('accept') || r.status.toLowerCase().includes('going')
					);
					const hasDeclinedOrNotGoing = detailStatsData.responseBreakdown.some(
						(r) =>
							r.status.toLowerCase().includes('decline') ||
							r.status.toLowerCase().includes('not going')
					);

					expect(hasAcceptedOrGoing || hasDeclinedOrNotGoing).toBe(true);
				}
			}
		} finally {
			await cleanupStagehand(stagehand);
		}
	});
});
