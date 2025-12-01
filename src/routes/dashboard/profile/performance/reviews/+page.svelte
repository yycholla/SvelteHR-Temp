<script lang="ts">
	import { page } from '$app/stores';
	import {
		Award,
		BookOpen,
		CalendarClock,
		CheckCircle2,
		CheckSquare,
		Clock,
		FileText,
		History,
		Medal,
		MessageSquare,
		Star,
		Target,
		User
	} from '@lucide/svelte';
	import { format, parseISO } from 'date-fns';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';

	const { data } = $props();

	const user = $derived(data.user);
	const reviews = $derived(data.reviews || []);
	const reviewStats = $derived(data.reviewStats);
	const isOwnReviews = $derived(data.isOwnReviews);

	let selectedReview = $state<any>(null);
	let showReviewDetails = $state(false);

	// Get latest completed review for the score card
	const latestCompletedReview = $derived(
		reviews.find((r: any) => r.status === 'completed' && r.overallRating)
	);

	function getStatusColor(status: string) {
		switch (status) {
			case 'completed':
				return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
			case 'in_progress':
				return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
			case 'scheduled':
				return 'bg-muted text-muted-foreground border-border';
			case 'overdue':
				return 'bg-red-500/10 text-red-500 border-red-500/20';
			default:
				return 'bg-muted text-muted-foreground border-border';
		}
	}

	function getRatingStars(rating: number) {
		const fullStars = Math.floor(rating);
		const hasHalfStar = rating % 1 >= 0.5;
		return { fullStars, hasHalfStar };
	}

	function formatDate(dateString: string | null | undefined) {
		if (!dateString) return 'N/A';
		try {
			return format(parseISO(dateString), 'MMM dd, yyyy');
		} catch {
			return 'Invalid Date';
		}
	}

	function openReviewDetails(review: any) {
		selectedReview = review;
		showReviewDetails = true;
	}
</script>

<svelte:head>
	<title>{isOwnReviews ? 'My Reviews' : `${user?.displayName} - Reviews`} | MountainHR</title>
</svelte:head>

<div class="container mx-auto max-w-7xl p-6 md:p-10">
	<!-- Header -->
	<div class="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-foreground">Performance Reviews</h1>
			<p class="text-muted-foreground">Past reviews and upcoming cycles.</p>
		</div>
	</div>

	<!-- Main Bento Grid -->
	<div class="grid auto-rows-[minmax(160px,auto)] grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
		<!-- 1. Last Review Score (Small) -->
		<div
			class="relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-5"
		>
			<div class="z-10 mb-2 flex items-center gap-2 text-muted-foreground">
				<Award class="h-4 w-4" />
				<span class="text-xs font-semibold uppercase tracking-wider">Last Score</span>
			</div>
			<div class="z-10">
				<span class="text-4xl font-bold text-emerald-500">
					{latestCompletedReview?.overallRating?.toFixed(1) || '-'}
				</span>
				<span class="text-sm text-muted-foreground">/ 5.0</span>
				<p class="mt-1 text-xs text-muted-foreground">
					{latestCompletedReview ? latestCompletedReview.type.name : 'No reviews yet'}
				</p>
			</div>
			<!-- Decorative -->
			<div class="absolute -bottom-4 -right-4 text-emerald-500/5">
				<Medal class="h-32 w-32" />
			</div>
		</div>

		<!-- 2. Next Review (Small) -->
		<div class="flex flex-col justify-between rounded-xl border bg-card p-5">
			<div class="mb-2 flex items-center gap-2 text-muted-foreground">
				<CalendarClock class="h-4 w-4" />
				<span class="text-xs font-semibold uppercase tracking-wider">Next Review</span>
			</div>
			<div>
				<span class="text-xl font-bold text-foreground">
					{reviewStats.nextReviewDate ? format(parseISO(reviewStats.nextReviewDate), 'MMM yyyy') : 'TBD'}
				</span>
				<p class="mt-1 text-sm text-muted-foreground">
					{reviewStats.nextReviewDate
						? `Scheduled for ${formatDate(reviewStats.nextReviewDate)}`
						: 'No upcoming reviews'}
				</p>
			</div>
			<div class="mt-4">
				<!-- Placeholder for next review type if available, or generic status -->
				<Badge variant="outline" class="bg-blue-500/10 text-blue-500 border-blue-500/20">
					{reviewStats.nextReviewDate ? 'Upcoming' : 'Not Scheduled'}
				</Badge>
			</div>
		</div>

		<!-- 3. Pending Actions (Wide List) -->
		<div class="row-span-1 flex flex-col rounded-xl border bg-card p-5 md:col-span-2 lg:col-span-2">
			<div class="mb-4 flex items-center justify-between">
				<div class="flex items-center gap-2 text-muted-foreground">
					<CheckSquare class="h-4 w-4" />
					<span class="text-xs font-semibold uppercase tracking-wider">Pending Actions</span>
				</div>
			</div>

			<div class="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/5 p-4 text-center">
				{#if reviewStats.inProgress > 0}
					<div class="flex items-center gap-3">
						<div class="rounded-full bg-blue-100 p-2 text-blue-600">
							<Clock class="h-5 w-5" />
						</div>
						<div class="text-left">
							<p class="font-medium text-foreground">{reviewStats.inProgress} Review(s) In Progress</p>
							<p class="text-xs text-muted-foreground">Please complete your self-assessment.</p>
						</div>
						<Button variant="secondary" size="sm" class="ml-4">Start</Button>
					</div>
				{:else}
					<CheckCircle2 class="mb-2 h-8 w-8 text-muted-foreground/30" />
					<p class="text-sm text-muted-foreground">No pending actions required.</p>
				{/if}
			</div>
		</div>

		<!-- 4. Review History (Full Width Table) -->
		<div
			class="col-span-full row-span-2 flex flex-col overflow-hidden rounded-xl border bg-card"
		>
			<div class="flex items-center justify-between border-b border-border p-5">
				<div class="flex items-center gap-2 text-muted-foreground">
					<History class="h-4 w-4" />
					<span class="text-xs font-semibold uppercase tracking-wider">Review History</span>
				</div>
			</div>

			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="bg-muted/30 text-xs font-medium uppercase text-muted-foreground">
						<tr>
							<th class="px-5 py-3">Review Cycle</th>
							<th class="px-5 py-3">Type</th>
							<th class="px-5 py-3">Date</th>
							<th class="px-5 py-3">Reviewer</th>
							<th class="px-5 py-3">Rating</th>
							<th class="px-5 py-3">Status</th>
							<th class="px-5 py-3 text-right">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border/50">
						{#if reviews.length > 0}
							{#each reviews as review}
								<tr class="transition-colors hover:bg-muted/20">
									<td class="px-5 py-4 font-medium">
										{review.type.name} {new Date(review.scheduledDate).getFullYear()}
									</td>
									<td class="px-5 py-4 text-muted-foreground">
										{review.type.frequency}
									</td>
									<td class="px-5 py-4 text-foreground">
										{formatDate(review.completedDate || review.scheduledDate)}
									</td>
									<td class="px-5 py-4">
										{review.reviewer?.displayName || 'N/A'}
									</td>
									<td class="px-5 py-4 font-bold text-emerald-500">
										{review.overallRating || '-'}
									</td>
									<td class="px-5 py-4">
										<span
											class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium {getStatusColor(
												review.status
											)}"
										>
											{review.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
										</span>
									</td>
									<td class="px-5 py-4 text-right">
										<button
											onclick={() => openReviewDetails(review)}
											class="text-xs font-medium text-primary hover:underline"
										>
											View
										</button>
									</td>
								</tr>
							{/each}
						{:else}
							<tr>
								<td colspan="7" class="px-5 py-8 text-center text-sm text-muted-foreground">
									No reviews found.
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>

<!-- Review Details Modal -->
{#if selectedReview}
	<Dialog.Root bind:open={showReviewDetails}>
		<Dialog.Portal>
			<Dialog.Overlay />
			<Dialog.Content class="max-h-[90vh] max-w-3xl overflow-y-auto">
				<Dialog.Header>
					<Dialog.Title>Review Details</Dialog.Title>
					<Dialog.Description>
						{selectedReview.type.name} - {formatDate(selectedReview.completedDate || selectedReview.scheduledDate)}
					</Dialog.Description>
				</Dialog.Header>

				<div class="space-y-6 py-4">
					<!-- Header Info -->
					<div class="grid grid-cols-2 gap-4 rounded-lg bg-muted/30 p-4 text-sm">
						<div>
							<span class="text-muted-foreground">Reviewer:</span>
							<span class="ml-2 font-medium text-foreground">{selectedReview.reviewer?.displayName || 'N/A'}</span>
						</div>
						<div>
							<span class="text-muted-foreground">Status:</span>
							<Badge
								variant="outline"
								class="ml-2 {getStatusColor(selectedReview.status)}"
							>
								{selectedReview.status.replace('_', ' ')}
							</Badge>
						</div>
						<div>
							<span class="text-muted-foreground">Overall Rating:</span>
							<span class="ml-2 font-bold text-emerald-600">{selectedReview.overallRating || 'N/A'}</span>
						</div>
					</div>

					<!-- Competency Ratings (Placeholder / Mock if empty) -->
					{#if selectedReview.competencies && selectedReview.competencies.length > 0}
						<div>
							<h4 class="mb-3 flex items-center gap-2 text-base font-medium text-foreground">
								<Award class="h-4 w-4" />
								Competencies
							</h4>
							<div class="grid gap-3 sm:grid-cols-2">
								{#each selectedReview.competencies as comp}
									<div class="rounded border bg-card p-3">
										<div class="mb-1 flex justify-between">
											<span class="font-medium">{comp.name}</span>
											<span class="text-sm font-bold text-emerald-600">{comp.rating}</span>
										</div>
										<p class="text-xs text-muted-foreground">{comp.feedback}</p>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Feedback Section -->
					<div>
						<h4 class="mb-3 flex items-center gap-2 text-base font-medium text-foreground">
							<MessageSquare class="h-4 w-4" />
							Feedback
						</h4>
						<div class="rounded-lg border bg-card p-4">
							<div class="mb-4">
								<h5 class="mb-1 text-sm font-medium text-foreground">Manager Comments</h5>
								<p class="text-sm text-muted-foreground">
									{selectedReview.feedback?.managerComments || 'No comments provided.'}
								</p>
							</div>
							
							{#if selectedReview.feedback?.strengths?.length > 0}
								<div class="mb-4">
									<h5 class="mb-1 text-sm font-medium text-green-700">Strengths</h5>
									<ul class="list-inside list-disc text-sm text-muted-foreground">
										{#each selectedReview.feedback.strengths as strength}
											<li>{strength}</li>
										{/each}
									</ul>
								</div>
							{/if}

							{#if selectedReview.feedback?.improvements?.length > 0}
								<div>
									<h5 class="mb-1 text-sm font-medium text-orange-700">Areas for Improvement</h5>
									<ul class="list-inside list-disc text-sm text-muted-foreground">
										{#each selectedReview.feedback.improvements as item}
											<li>{item}</li>
										{/each}
									</ul>
								</div>
							{/if}
						</div>
					</div>

					<!-- Goals (if linked) -->
					{#if selectedReview.goals && selectedReview.goals.length > 0}
						<div>
							<h4 class="mb-3 flex items-center gap-2 text-base font-medium text-foreground">
								<Target class="h-4 w-4" />
								Goals Assessment
							</h4>
							<div class="space-y-3">
								{#each selectedReview.goals as goal}
									<div class="flex items-center justify-between rounded border bg-card p-3">
										<div>
											<p class="text-sm font-medium">{goal.title}</p>
											<p class="text-xs text-muted-foreground">{goal.description}</p>
										</div>
										<Badge variant="secondary">{goal.status}</Badge>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<Dialog.Footer>
					<Dialog.Close>
						<Button variant="outline">Close</Button>
					</Dialog.Close>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
{/if}

