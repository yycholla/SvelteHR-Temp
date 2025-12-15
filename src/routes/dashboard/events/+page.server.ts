// Events List Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T028
// Purpose: Load events with filtering and visibility controls
// Refactored: Phase 3 - Standardized using RBACDataLoader and UnifiedGraphQLClient

import type { Actions, PageServerLoad } from './$types';
import { loadEventsData } from '$lib/server/events/event-loader';
import { eventActions } from '$lib/server/events/event-actions';

export const load: PageServerLoad = async (event) => {
	return loadEventsData(event);
};

export const actions: Actions = eventActions;