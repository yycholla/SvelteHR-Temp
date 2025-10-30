<script lang="ts">
	/**
	 * ActivityFeed Component
	 * Feature: 019-we-need-to (Base activity logging) + 020-we-need-to (Rollback enhancements)
	 * Tasks: T024 (original), T042 (enhancements)
	 * Purpose: Chronological activity feed display with rollback indicators and snapshot previews
	 */

	import type { ActivityLog } from '$lib/graphql/types';
	import {
		groupActivitiesByDate,
		formatActivityMessage,
		getActivityIcon,
		getActivityActionColor,
		getRelativeTime
	} from '$lib/utils/activities';
	import { Undo2, ExternalLink } from '@lucide/svelte';

	interface Props {
		activities: ActivityLog[];
		onActivityClick?: (activity: ActivityLog) => void;
		groupByDate?: boolean;
		showUserInfo?: boolean;
		showTimestamps?: boolean;
		compact?: boolean;
		maxItems?: number;
		emptyMessage?: string;
		showSnapshotPreview?: boolean; // Feature 020 enhancement
		showRollbackIndicators?: boolean; // Feature 020 enhancement
	}

	let {
		activities,
		onActivityClick,
		groupByDate = true,
		showUserInfo = true,
		showTimestamps = true,
		compact = false,
		maxItems,
		emptyMessage = 'No activity recorded yet',
		showSnapshotPreview = false,
		showRollbackIndicators = true
	}: Props = $props();

	// Limit activities if maxItems is specified
	let displayActivities = $derived(maxItems ? (activities || []).slice(0, maxItems) : (activities || []));

	// Group activities by date if enabled
	let groupedActivities = $derived(
		groupByDate ? groupActivitiesByDate(displayActivities) : null
	);

	function handleActivityClick(activity: ActivityLog) {
		if (onActivityClick) {
			onActivityClick(activity);
		}
	}

	function handleKeyPress(e: KeyboardEvent, activity: ActivityLog) {
		if ((e.key === 'Enter' || e.key === ' ') && onActivityClick) {
			e.preventDefault();
			onActivityClick(activity);
		}
	}

</script>

<div class="activity-feed">
	{#if displayActivities.length > 0}
		{#if groupByDate && groupedActivities}
			<!-- Grouped by date view -->
			{#each Array.from(groupedActivities.entries()) as [date, dateActivities]}
				<div class="date-group mb-6">
					<!-- Date Header -->
					<div class="sticky top-0 z-10 mb-3 bg-background py-2">
						<h3 class="text-sm font-semibold text-foreground">{date}</h3>
					</div>

					<!-- Activities for this date -->
					<div class="space-y-3 pl-4">
						{#each dateActivities as activity (activity.id)}
							<div class="activity-container" class:is-rollback={activity.isRollback && showRollbackIndicators}>
								<div
									class="activity-item group relative flex gap-3"
									class:cursor-pointer={onActivityClick}
									class:compact
									role={onActivityClick ? 'button' : 'article'}
									{...onActivityClick ? { tabindex: 0 } : {}}
									onclick={() => handleActivityClick(activity)}
									onkeypress={(e) => handleKeyPress(e, activity)}
								>
									<!-- Timeline Dot -->
									<div class="flex-shrink-0">
										<div class="flex h-8 w-8 items-center justify-center rounded-full {getActivityActionColor(activity.action)}">
											{#if activity.isRollback && showRollbackIndicators}
											<Undo2 size={16} />
										{:else}
											<span class="text-sm">{getActivityIcon(activity.resourceType, activity.action)}</span>
										{/if}
										</div>
									</div>

									<!-- Activity Content -->
									<div class="flex-1 pb-4">
										<!-- Activity Message -->
										<div class="flex items-start justify-between gap-2">
											<p class="text-sm text-foreground group-hover:text-primary flex-1">
												{#if showUserInfo && activity.employee}
													<span class="font-medium text-foreground">{activity.employee.displayName}</span>
													{' '}
												{/if}
												{formatActivityMessage(activity)}

												<!-- Rollback Badge (Feature 020) -->
												{#if activity.isRollback && showRollbackIndicators}
													<span class="rollback-badge">
														<Undo2 size={12} />
														Rollback
													</span>
												{/if}
											</p>
										</div>

										<!-- Metadata -->
										<div class="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
											{#if showTimestamps}
												<span class="flex items-center gap-1">
													<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
													</svg>
													{getRelativeTime(activity.createdAt)}
												</span>
											{/if}

											{#if activity.employee?.department}
												<span class="flex items-center gap-1">
													<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
														<path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clip-rule="evenodd" />
													</svg>
													{activity.employee.department.name}
												</span>
											{/if}

											{#if activity.ipAddress && !compact}
												<span class="flex items-center gap-1">
													<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
													</svg>
													{activity.ipAddress}
												</span>
											{/if}

											<!-- Rolled-back log link (Feature 020) -->
											{#if activity.rolledBackLogId && showRollbackIndicators}
												<button
													type="button"
													class="rolled-back-link"
													onclick={(e) => {
														e.stopPropagation();
														if (onActivityClick) {
															onActivityClick({ ...activity, id: activity.rolledBackLogId! });
														}
													}}
												>
													<ExternalLink size={12} />
													View original log
												</button>
											{/if}
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		{:else}
			<!-- Flat list view (no grouping) -->
			<div class="space-y-3">
				{#each displayActivities as activity (activity.id)}
					<div class="activity-container" class:is-rollback={activity.isRollback && showRollbackIndicators}>
						<div
							class="activity-item group relative flex gap-3 rounded-lg bg-card p-3 transition-all hover:shadow-md {activity.isRollback && showRollbackIndicators ? '' : 'border border-border'}"
							class:cursor-pointer={onActivityClick}
							class:hover:border-primary={onActivityClick && !(activity.isRollback && showRollbackIndicators)}
							class:compact
							role={onActivityClick ? 'button' : 'article'}
							{...onActivityClick ? { tabindex: 0 } : {}}
							onclick={() => handleActivityClick(activity)}
							onkeypress={(e) => handleKeyPress(e, activity)}
						>
							<!-- Activity Icon -->
							<div class="flex-shrink-0">
								<div class="flex h-10 w-10 items-center justify-center rounded-full {getActivityActionColor(activity.action)}">
									{#if activity.isRollback && showRollbackIndicators}
										<Undo2 size={20} />
									{:else}
										<span class="text-lg">{getActivityIcon(activity.resourceType, activity.action)}</span>
									{/if}
								</div>
							</div>

							<!-- Activity Content -->
							<div class="flex-1">
								<!-- Activity Message -->
								<div class="flex items-start justify-between gap-2">
									<p class="text-sm font-medium text-foreground group-hover:text-primary flex-1">
										{#if showUserInfo && activity.employee}
											<span class="font-semibold">{activity.employee.displayName}</span>
											{' '}
										{/if}
										{formatActivityMessage(activity)}

										<!-- Rollback Badge (Feature 020) -->
										{#if activity.isRollback && showRollbackIndicators}
											<span class="rollback-badge">
												<Undo2 size={12} />
												Rollback
											</span>
										{/if}
									</p>
								</div>

								<!-- Metadata -->
								<div class="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
									{#if showTimestamps}
										<span>{getRelativeTime(activity.createdAt)}</span>
									{/if}

									{#if activity.employee?.department}
										<span>• {activity.employee.department.name}</span>
									{/if}

									{#if activity.ipAddress && !compact}
										<span>• {activity.ipAddress}</span>
									{/if}

									<!-- Rolled-back log link (Feature 020) -->
									{#if activity.rolledBackLogId && showRollbackIndicators}
										<button
											type="button"
											class="rolled-back-link"
											onclick={(e) => {
												e.stopPropagation();
												if (onActivityClick) {
													onActivityClick({ ...activity, id: activity.rolledBackLogId! });
												}
											}}
										>
											<ExternalLink size={12} />
											View original log
										</button>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Show More Indicator -->
		{#if maxItems && activities.length > maxItems}
			<div class="mt-4 text-center">
				<p class="text-sm text-muted-foreground">
					Showing {maxItems} of {activities.length} activities
				</p>
			</div>
		{/if}
	{:else}
		<!-- Empty State -->
		<div class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card p-12">
			<svg class="mb-4 h-16 w-16 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
			</svg>
			<h3 class="mb-2 text-lg font-medium text-foreground">No activity</h3>
			<p class="text-sm text-muted-foreground">{emptyMessage}</p>
		</div>
	{/if}
</div>


