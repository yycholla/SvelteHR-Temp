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
	import { ChevronDown, ChevronUp, Undo2, ExternalLink, Copy, Check } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

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

	// State for expanded logs (Feature 020)
	let expandedLogs = $state<Set<string>>(new Set());
	let copiedIds = $state<Set<string>>(new Set());

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

	// Feature 020 functions
	function toggleExpand(logId: string, e?: Event) {
		if (e) {
			e.stopPropagation();
		}
		if (expandedLogs.has(logId)) {
			expandedLogs.delete(logId);
		} else {
			expandedLogs.add(logId);
		}
		expandedLogs = expandedLogs; // Trigger reactivity
	}

	function isExpanded(logId: string): boolean {
		return expandedLogs.has(logId);
	}

	async function copyToClipboard(text: string, id: string, e?: Event) {
		if (e) {
			e.stopPropagation();
		}
		try {
			await navigator.clipboard.writeText(text);
			copiedIds.add(id);
			copiedIds = copiedIds; // Trigger reactivity
			toast.success('Copied to clipboard');

			setTimeout(() => {
				copiedIds.delete(id);
				copiedIds = copiedIds;
			}, 2000);
		} catch (error) {
			toast.error('Failed to copy');
		}
	}

	function formatJson(obj: any): string {
		if (obj === null || obj === undefined) return '';
		return JSON.stringify(obj, null, 2);
	}

	function computeDiff(before: Record<string, any> | null, after: Record<string, any> | null): {
		added: string[];
		removed: string[];
		changed: Array<{ field: string; before: any; after: any }>;
	} {
		const added: string[] = [];
		const removed: string[] = [];
		const changed: Array<{ field: string; before: any; after: any }> = [];

		if (!before && !after) {
			return { added, removed, changed };
		}

		if (!before) {
			// All fields added
			Object.keys(after || {}).forEach((key) => {
				if (key !== '_metadata' && key !== 'updated_at' && key !== 'created_at') {
					added.push(key);
				}
			});
			return { added, removed, changed };
		}

		if (!after) {
			// All fields removed
			Object.keys(before).forEach((key) => {
				if (key !== '_metadata' && key !== 'updated_at' && key !== 'created_at') {
					removed.push(key);
				}
			});
			return { added, removed, changed };
		}

		// Compute diff
		const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

		allKeys.forEach((key) => {
			// Skip metadata and timestamps
			if (key === '_metadata' || key === 'updated_at' || key === 'created_at') {
				return;
			}

			const beforeValue = before[key];
			const afterValue = after[key];

			if (!(key in before)) {
				added.push(key);
			} else if (!(key in after)) {
				removed.push(key);
			} else if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
				changed.push({ field: key, before: beforeValue, after: afterValue });
			}
		});

		return { added, removed, changed };
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
									tabindex={onActivityClick ? 0 : undefined}
									onclick={() => handleActivityClick(activity)}
									onkeypress={(e) => handleKeyPress(e, activity)}
								>
									<!-- Timeline Dot -->
									<div class="flex-shrink-0">
										<div class="flex h-8 w-8 items-center justify-center rounded-full {getActivityActionColor(activity.action)}">
											<span class="text-sm">{getActivityIcon(activity.resourceType, activity.action)}</span>
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

											<!-- Expand Button (Feature 020) -->
											{#if showSnapshotPreview && (activity.beforeSnapshot || activity.afterSnapshot)}
												<button
													type="button"
													class="expand-btn-small"
													onclick={(e) => toggleExpand(activity.id, e)}
													aria-label={isExpanded(activity.id) ? 'Collapse' : 'Expand'}
												>
													{#if isExpanded(activity.id)}
														<ChevronUp size={16} />
													{:else}
														<ChevronDown size={16} />
													{/if}
												</button>
											{/if}
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

										<!-- Expanded Snapshot Preview (Feature 020) -->
										{#if isExpanded(activity.id) && showSnapshotPreview}
											<div class="snapshot-preview-container">
												{#if activity.action === 'UPDATE'}
													{@const diff = computeDiff(activity.beforeSnapshot, activity.afterSnapshot)}
													<div class="snapshot-diff">
														<h5>Changes</h5>

														{#if diff.changed.length > 0}
															<div class="diff-list">
																{#each diff.changed as change}
																	<div class="diff-item">
																		<div class="diff-field">{change.field}</div>
																		<div class="diff-values">
																			<div class="diff-value before">
																				<span class="diff-label">Before:</span>
																				<pre class="diff-content">{formatJson(change.before)}</pre>
																			</div>
																			<div class="arrow">→</div>
																			<div class="diff-value after">
																				<span class="diff-label">After:</span>
																				<pre class="diff-content">{formatJson(change.after)}</pre>
																			</div>
																		</div>
																	</div>
																{/each}
															</div>
														{/if}

														{#if diff.added.length > 0}
															<div class="added-fields">
																<strong>Added fields:</strong>
																{diff.added.join(', ')}
															</div>
														{/if}

														{#if diff.removed.length > 0}
															<div class="removed-fields">
																<strong>Removed fields:</strong>
																{diff.removed.join(', ')}
															</div>
														{/if}
													</div>
												{:else if activity.action === 'CREATE'}
													<div class="snapshot-preview">
														<h5>Created Data</h5>
														<pre class="snapshot-content">{formatJson(activity.afterSnapshot)}</pre>
													</div>
												{:else if activity.action === 'DELETE'}
													<div class="snapshot-preview">
														<h5>Deleted Data</h5>
														<pre class="snapshot-content">{formatJson(activity.beforeSnapshot)}</pre>
													</div>
												{/if}

												<!-- Copy Resource ID -->
												<div class="resource-id-copy">
													<button
														type="button"
														class="copy-btn-small"
														onclick={(e) => copyToClipboard(activity.resourceId, `resource-${activity.id}`, e)}
													>
														{#if copiedIds.has(`resource-${activity.id}`)}
															<Check size={12} />
														{:else}
															<Copy size={12} />
														{/if}
														<span>Copy Resource ID</span>
													</button>
												</div>
											</div>
										{/if}
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
							class="activity-item group relative flex gap-3 rounded-lg border border-border bg-card p-3 transition-all hover:shadow-md"
							class:cursor-pointer={onActivityClick}
							class:hover:border-primary={onActivityClick}
							class:compact
							role={onActivityClick ? 'button' : 'article'}
							tabindex={onActivityClick ? 0 : undefined}
							onclick={() => handleActivityClick(activity)}
							onkeypress={(e) => handleKeyPress(e, activity)}
						>
							<!-- Activity Icon -->
							<div class="flex-shrink-0">
								<div class="flex h-10 w-10 items-center justify-center rounded-full {getActivityActionColor(activity.action)}">
									<span class="text-lg">{getActivityIcon(activity.resourceType, activity.action)}</span>
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

									<!-- Expand Button (Feature 020) -->
									{#if showSnapshotPreview && (activity.beforeSnapshot || activity.afterSnapshot)}
										<button
											type="button"
											class="expand-btn-small"
											onclick={(e) => toggleExpand(activity.id, e)}
											aria-label={isExpanded(activity.id) ? 'Collapse' : 'Expand'}
										>
											{#if isExpanded(activity.id)}
												<ChevronUp size={16} />
											{:else}
												<ChevronDown size={16} />
											{/if}
										</button>
									{/if}
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

								<!-- Expanded Snapshot Preview (Feature 020) -->
								{#if isExpanded(activity.id) && showSnapshotPreview}
									<div class="snapshot-preview-container">
										{#if activity.action === 'UPDATE'}
											{@const diff = computeDiff(activity.beforeSnapshot, activity.afterSnapshot)}
											<div class="snapshot-diff">
												<h5>Changes</h5>

												{#if diff.changed.length > 0}
													<div class="diff-list">
														{#each diff.changed as change}
															<div class="diff-item">
																<div class="diff-field">{change.field}</div>
																<div class="diff-values">
																	<div class="diff-value before">
																		<span class="diff-label">Before:</span>
																		<pre class="diff-content">{formatJson(change.before)}</pre>
																	</div>
																	<div class="arrow">→</div>
																	<div class="diff-value after">
																		<span class="diff-label">After:</span>
																		<pre class="diff-content">{formatJson(change.after)}</pre>
																	</div>
																</div>
															</div>
														{/each}
													</div>
												{/if}

												{#if diff.added.length > 0}
													<div class="added-fields">
														<strong>Added fields:</strong>
														{diff.added.join(', ')}
													</div>
												{/if}

												{#if diff.removed.length > 0}
													<div class="removed-fields">
														<strong>Removed fields:</strong>
														{diff.removed.join(', ')}
													</div>
												{/if}
											</div>
										{:else if activity.action === 'CREATE'}
											<div class="snapshot-preview">
												<h5>Created Data</h5>
												<pre class="snapshot-content">{formatJson(activity.afterSnapshot)}</pre>
											</div>
										{:else if activity.action === 'DELETE'}
											<div class="snapshot-preview">
												<h5>Deleted Data</h5>
												<pre class="snapshot-content">{formatJson(activity.beforeSnapshot)}</pre>
											</div>
										{/if}

										<!-- Copy Resource ID -->
										<div class="resource-id-copy">
											<button
												type="button"
												class="copy-btn-small"
												onclick={(e) => copyToClipboard(activity.resourceId, `resource-${activity.id}`, e)}
											>
												{#if copiedIds.has(`resource-${activity.id}`)}
													<Check size={12} />
												{:else}
													<Copy size={12} />
												{/if}
												<span>Copy Resource ID</span>
											</button>
										</div>
									</div>
								{/if}
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

<style>
	.activity-feed {
		@apply w-full;
	}

	.activity-item.compact {
		@apply py-2;
	}

	.activity-item.compact .activity-content {
		@apply text-xs;
	}

	/* Timeline connector line */
	.date-group .activity-item:not(:last-child)::after {
		content: '';
		@apply absolute left-4 top-10 h-[calc(100%+0.75rem)] w-px bg-border;
	}

	/* Feature 020 enhancements */
	.activity-container.is-rollback {
		@apply rounded-lg p-2;
		background-color: #fef3c7;
		border: 1px solid #fbbf24;
	}

	.rollback-badge {
		@apply inline-flex items-center gap-1 px-2 py-0.5 ml-2 rounded text-xs font-semibold;
		background-color: #fbbf24;
		color: #78350f;
	}

	.expand-btn-small {
		@apply p-1 rounded border border-border bg-background hover:bg-muted transition-colors;
		color: #6b7280;
	}

	.rolled-back-link {
		@apply inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer;
		background: transparent;
		border: none;
		padding: 0;
	}

	.snapshot-preview-container {
		@apply mt-3 pt-3 border-t border-border;
	}

	.snapshot-diff h5,
	.snapshot-preview h5 {
		@apply text-sm font-semibold text-foreground mb-2;
	}

	.diff-list {
		@apply flex flex-col gap-2;
	}

	.diff-item {
		@apply p-2 bg-muted rounded;
	}

	.diff-field {
		@apply font-mono text-xs font-semibold text-foreground mb-1;
	}

	.diff-values {
		@apply grid grid-cols-[1fr_auto_1fr] gap-2 items-start text-xs;
	}

	.diff-label {
		@apply text-xs font-medium text-muted-foreground;
	}

	.diff-content {
		@apply m-0 p-2 bg-background border border-border rounded font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all;
	}

	.diff-value.before .diff-content {
		@apply bg-red-50 border-red-200;
	}

	.diff-value.after .diff-content {
		@apply bg-green-50 border-green-200;
	}

	.arrow {
		@apply flex items-center justify-center text-muted-foreground font-bold pt-5;
	}

	.added-fields,
	.removed-fields {
		@apply mt-2 p-2 rounded text-xs;
	}

	.added-fields {
		@apply bg-green-50 border border-green-200 text-green-800;
	}

	.removed-fields {
		@apply bg-red-50 border border-red-200 text-red-800;
	}

	.snapshot-content {
		@apply m-0 p-3 bg-muted border border-border rounded font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all max-h-64 overflow-y-auto;
	}

	.resource-id-copy {
		@apply mt-2;
	}

	.copy-btn-small {
		@apply inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground bg-background border border-border rounded hover:bg-muted transition-colors;
	}
</style>
