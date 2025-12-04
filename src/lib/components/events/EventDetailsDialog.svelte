<script lang="ts">
	/**
	 * EventDetailsDialog Component
	 * Unified dialog for viewing and editing event details.
	 *
	 * Refactored to use idiomatic Svelte 5 runes by extracting sub-components:
	 * - EventDetailsView: For the tabbed view mode
	 * - EventEditForm: For the edit mode form
	 */

	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Edit, Trash2, X } from '@lucide/svelte';
	import RecurrenceScopeDialog from './RecurrenceScopeDialog.svelte';
	import ConflictWarningDialog from './ConflictWarningDialog.svelte';
	import EventEditForm from './EventEditForm.svelte';
	import EventDetailsView from './EventDetailsView.svelte';
	import { type ConflictingEvent, findConflictingEvents } from '$lib/utils/calendar';
	import type { RsvpStatus } from '$lib/graphql/types';
	import type {
		EventComment,
		EventHistoryEntry,
		UserWaitlistStatus
	} from '$lib/graphql/events-operations';
	import type { EventData } from './types';

	interface Props {
		isOpen: boolean;
		event: EventData | null;
		userId: string;
		userRole?: string;
		canManageEvent?: boolean;
		mode?: 'view' | 'edit';
		rsvpStats?: {
			total: number;
			accepted: number;
			declined: number;
			tentative: number;
			pending: number;
		};
		eventComments?: EventComment[];
		commentCount?: number;
		eventHistory?: EventHistoryEntry[];
		userWaitlistStatus?: UserWaitlistStatus;
		hasMoreComments?: boolean;
		hasMoreHistory?: boolean;
		allEvents?: Array<EventData>;
		onClose: () => void;
		onSuccess?: () => void;
		onEdit?: () => void;
		onDelete?: () => void;
		onRsvpUpdate?: (eventId: string, newStatus: RsvpStatus) => void;
		onAddComment?: (content: string, mentions: string[]) => Promise<void>;
		onUpdateComment?: (commentId: string, content: string) => Promise<void>;
		onDeleteComment?: (commentId: string) => Promise<void>;
		onLoadMoreComments?: () => Promise<void>;
		onLoadMoreHistory?: () => Promise<void>;
		onJoinWaitlist?: (eventId: string) => Promise<void>;
		onLeaveWaitlist?: (eventId: string) => Promise<void>;
	}

	const {
		isOpen = false,
		event = null,
		userId,
		userRole,
		canManageEvent = false,
		mode = 'view',
		rsvpStats,
		eventComments = [],
		commentCount = 0,
		eventHistory = [],
		userWaitlistStatus,
		hasMoreComments = false,
		hasMoreHistory = false,
		allEvents = [],
		onClose,
		onSuccess,
		onEdit,
		onDelete,
		onRsvpUpdate,
		onAddComment,
		onUpdateComment,
		onDeleteComment,
		onLoadMoreComments,
		onLoadMoreHistory,
		onJoinWaitlist,
		onLeaveWaitlist
	}: Props = $props();

	// Dialog-level state
	let isDeleting = $state(false);
	let showDeleteConfirm = $state(false);

	// Recurring event scope dialog state
	let showScopeDialog = $state(false);
	let pendingRsvpStatus = $state<RsvpStatus | null>(null);

	// Conflict detection dialog state
	let showConflictDialog = $state(false);
	let detectedConflicts = $state<ConflictingEvent[]>([]);
	let pendingConflictRsvp = $state<{
		status: RsvpStatus;
		scope: 'this_event' | 'this_and_future' | 'all_events';
	} | null>(null);

	const isRecurringEvent = $derived(
		event?.rrule !== null && event?.rrule !== undefined && event.rrule !== ''
	);

	// Handle escape key
	function handleKeydown(event: KeyboardEvent) {
		if (
			event.key === 'Escape' &&
			isOpen &&
			!isDeleting &&
			!showScopeDialog &&
			!showConflictDialog &&
			!showDeleteConfirm
		) {
			onClose();
		}
	}

	// Handle backdrop click
	function handleBackdropClick(event: MouseEvent) {
		if (
			event.target === event.currentTarget &&
			!isDeleting &&
			!showScopeDialog &&
			!showConflictDialog &&
			!showDeleteConfirm
		) {
			onClose();
		}
	}

	// Handle delete
	function handleDelete() {
		if (!event) return;
		showDeleteConfirm = true;
	}

	async function confirmDelete() {
		if (!event) return;
		showDeleteConfirm = false;

		isDeleting = true;
		try {
			const formData = new FormData();
			formData.append('eventId', event.id);

			const response = await fetch('/dashboard/events?/deleteEvent', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'success' || (response.ok && !result.error)) {
				toast.success('Event deleted successfully');
				await invalidateAll();
				onClose();
				onDelete?.();
			} else {
				const errorMsg = result.error || (result.data as any)?.error || 'Failed to delete event';
				toast.error(errorMsg);
			}
		} catch (error) {
			console.error('Error deleting event:', error);
			toast.error('Failed to delete event. Please try again.');
		} finally {
			isDeleting = false;
		}
	}

	// Handle RSVP with recurring event scope and conflicts
	// This is passed as the onRsvpUpdate prop to EventDetailsView (via an adapter if needed)
	async function handleRsvpChange(newStatus: RsvpStatus) {
		// Note: RSVPButton only passes newStatus, not eventId
		// We use local `event` from props/closure for event context

		if (!event) return;

		// If recurring event, show scope dialog
		if (isRecurringEvent) {
			pendingRsvpStatus = newStatus;
			showScopeDialog = true;
			return;
		}

		// Otherwise, update RSVP directly
		await updateRsvpStatus(newStatus, 'this_event');
	}

	async function handleScopeConfirm(scope: 'this_event' | 'this_and_future' | 'all_events') {
		if (!pendingRsvpStatus) return;

		// Check for conflicts before updating RSVP (only for accepted/tentative)
		if (
			(pendingRsvpStatus === 'accepted' || pendingRsvpStatus === 'tentative') &&
			event &&
			allEvents.length > 0
		) {
			const targetEvent = {
				id: event.id,
				startDate: new Date(event.startTime),
				endDate: new Date(event.endTime),
				userRsvpStatus: pendingRsvpStatus
			};

			const conflicts = findConflictingEvents(targetEvent, allEvents, userId);

			if (conflicts.length > 0) {
				detectedConflicts = conflicts;
				pendingConflictRsvp = { status: pendingRsvpStatus, scope };
				showScopeDialog = false;
				showConflictDialog = true;
				return;
			}
		}

		// No conflicts, proceed
		await updateRsvpStatus(pendingRsvpStatus, scope);
		showScopeDialog = false;
		pendingRsvpStatus = null;
	}

	async function updateRsvpStatus(
		newStatus: RsvpStatus,
		scope: 'this_event' | 'this_and_future' | 'all_events'
	) {
		console.log('[EventDetailsDialog] updateRsvpStatus called with:', {
			newStatus,
			statusType: typeof newStatus,
			scope,
			eventId: event?.id
		});

		if (!event) return;

		const userAttendee = event.attendees?.find((a) => a.employeeId === userId);

		const formData = new FormData();
		formData.append('eventId', event.id);
		formData.append('status', newStatus);
		formData.append('scope', scope);

		console.log('[EventDetailsDialog] FormData created:', {
			eventId: formData.get('eventId'),
			status: formData.get('status'),
			scope: formData.get('scope'),
			attendeeId: formData.get('attendeeId')
		});

		if (userAttendee) {
			formData.append('attendeeId', userAttendee.id);
		}

		try {
			const response = await fetch('/dashboard/events?/updateRsvpStatus', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'failure' || result.status >= 400) {
				const errorData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
				const errorMsg =
					errorData?.[1] || errorData?.error || result.error || 'Failed to update RSVP';
				toast.error(errorMsg);
			} else if (result.type === 'success' || response.ok) {
				// Optimistic update logic - we mutate the prop object for immediate feedback
				// In Svelte 5 with proxied state, this might trigger updates if `event` is a state proxy.
				// But `event` here is a prop. We can't mutate props directly if they are primitives, but objects we can?
				// Svelte 5 props are read-only. We shouldn't mutate `event`.
				// However, the original code did mutate it.
				// "event.attendees[existingAttendeeIndex].responseStatus = newStatus;"

				// We should rely on onRsvpUpdate callback to inform parent, or invalidateAll to reload.
				// The original code did both.

				if (onRsvpUpdate) {
					onRsvpUpdate(event.id, newStatus);
				}

				toast.success('RSVP updated successfully');
				if (onSuccess) onSuccess();
				await invalidateAll();
			} else {
				toast.error('Failed to update RSVP');
			}
		} catch (error) {
			console.error('[RSVP] Fetch error:', error);
			toast.error('Network error updating RSVP');
		}
	}

	async function handleConflictConfirm() {
		if (!pendingConflictRsvp) return;
		await updateRsvpStatus(pendingConflictRsvp.status, pendingConflictRsvp.scope);
		showConflictDialog = false;
		pendingConflictRsvp = null;
		detectedConflicts = [];
	}

	function handleConflictCancel() {
		showConflictDialog = false;
		pendingConflictRsvp = null;
		detectedConflicts = [];
		pendingRsvpStatus = null;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && event}
	<!-- Modal Backdrop -->
	<div
		class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
		onclick={handleBackdropClick}
		role="presentation"
	>
		<!-- Modal Content -->
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div
				class="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-lg border bg-card shadow-lg overflow-visible"
				role="dialog"
				aria-modal="true"
				aria-labelledby="dialog-title"
				data-testid="event-details-dialog"
			>
				<!-- Header -->
				<div class="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-6 py-4">
					<h2 id="dialog-title" class="text-xl font-semibold text-foreground">
						{mode === 'edit' ? 'Edit Event' : 'Event Details'}
					</h2>
					<div class="flex items-center gap-2">
						{#if mode === 'view' && canManageEvent}
							<button
								type="button"
								onclick={() => onEdit?.()}
								class="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
								aria-label="Edit event"
							>
								<Edit class="h-5 w-5" />
							</button>
							<button
								type="button"
								onclick={handleDelete}
								disabled={isDeleting}
								class="rounded-md p-2 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								aria-label="Delete event"
							>
								<Trash2 class="h-5 w-5" />
							</button>
						{/if}
						<button
							type="button"
							onclick={onClose}
							disabled={isDeleting}
							class="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							aria-label="Close dialog"
						>
							<X class="h-5 w-5" />
						</button>
					</div>
				</div>

				<!-- Content -->
				<!-- We key the content on event.id to ensure fresh state when event changes -->
				{#key event.id}
					{#if mode === 'view'}
						<EventDetailsView
							{event}
							{userId}
							{userRole}
							{rsvpStats}
							{eventComments}
							{commentCount}
							{eventHistory}
							{userWaitlistStatus}
							{hasMoreComments}
							{hasMoreHistory}
							onRsvpUpdate={handleRsvpChange}
							{onAddComment}
							{onUpdateComment}
							{onDeleteComment}
							{onLoadMoreComments}
							{onLoadMoreHistory}
							{onJoinWaitlist}
							{onLeaveWaitlist}
						/>
					{:else}
						<EventEditForm {event} {onClose} {onSuccess} />
					{/if}
				{/key}
			</div>
		</div>
	</div>

	<!-- Recurring Event Scope Dialog -->
	{#if isRecurringEvent}
		<RecurrenceScopeDialog
			bind:open={showScopeDialog}
			eventTitle={event.title}
			action="RSVP update"
			onConfirm={handleScopeConfirm}
			onCancel={() => {
				showScopeDialog = false;
				pendingRsvpStatus = null;
			}}
		/>
	{/if}

	<!-- Delete Confirmation Dialog -->
	{#if showDeleteConfirm}
		<div
			class="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
			role="dialog"
			aria-modal="true"
		>
			<div class="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
				<h3 class="text-lg font-semibold text-foreground mb-2">Delete Event?</h3>
				<p class="text-sm text-muted-foreground mb-6">
					Are you sure you want to delete "{event.title}"? This action cannot be undone.
				</p>
				<div class="flex justify-end gap-4">
					<button
						type="button"
						onclick={() => (showDeleteConfirm = false)}
						disabled={isDeleting}
						class="rounded-md border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						type="button"
						onclick={confirmDelete}
						disabled={isDeleting}
						class="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
					>
						{isDeleting ? 'Deleting...' : 'Delete Event'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Conflict Warning Dialog -->
	{#if event && detectedConflicts.length > 0}
		<ConflictWarningDialog
			bind:open={showConflictDialog}
			conflicts={detectedConflicts}
			targetEvent={{
				title: event.title,
				startDate: new Date(event.startTime),
				endDate: new Date(event.endTime)
			}}
			onConfirm={handleConflictConfirm}
			onCancel={handleConflictCancel}
		/>
	{/if}
{/if}
