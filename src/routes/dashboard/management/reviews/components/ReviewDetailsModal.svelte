<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		formatReviewPeriod
	} from '$lib/graphql/queries/performance-reviews';

	interface Props {
		open: boolean;
		currentReview: any;
		canEditReviews: boolean;
		onClose: () => void;
		onEdit: (review: any) => void;
	}

	let {
		open = $bindable(),
		currentReview,
		canEditReviews,
		onClose,
		onEdit
	}: Props = $props();

	// Get rating stars
	function renderRatingStars(rating: number): string {
		const filled = Math.floor(rating);
		const empty = 5 - filled;
		return '★'.repeat(filled) + '☆'.repeat(empty);
	}
</script>

<Dialog.Root bind:open={open}>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="max-w-4xl">
			<Dialog.Header>
				<Dialog.Title>Performance Review Details</Dialog.Title>
				<Dialog.Description>
					{#if currentReview}
						Review for {currentReview.employee?.displayName} • {formatReviewPeriod(
							currentReview.reviewPeriodStart,
							currentReview.reviewPeriodEnd
						)}
					{/if}
				</Dialog.Description>
			</Dialog.Header>

			{#if currentReview}
				<div class="max-h-96 space-y-6 overflow-y-auto">
					<!-- Employee Info -->
					<div class="rounded-lg bg-muted p-4 dark:bg-muted">
						<h4 class="mb-2 font-semibold">Employee Information</h4>
						<div class="grid grid-cols-2 gap-4 text-sm">
							<p><strong>Name:</strong> {currentReview.employee?.displayName}</p>
							<p><strong>Department:</strong> {currentReview.employee?.department?.name}</p>
							<p><strong>Job Title:</strong> {currentReview.employee?.jobTitle || 'N/A'}</p>
							<p><strong>Reviewer:</strong> {currentReview.reviewer?.displayName}</p>
						</div>
					</div>

					<!-- Ratings -->
					{#if currentReview.overallRating}
						<div>
							<h4 class="mb-3 font-semibold">Performance Ratings</h4>
							<div class="grid grid-cols-2 gap-4">
								<div class="text-sm">
									<p class="font-medium">Overall Performance</p>
									<p class="text-yellow-600">
										{renderRatingStars(currentReview.overallRating)} ({currentReview.overallRating}/5)
									</p>
								</div>
								{#if currentReview.goalsAchievement}
									<div class="text-sm">
										<p class="font-medium">Goals Achievement</p>
										<p class="text-yellow-600">
											{renderRatingStars(currentReview.goalsAchievement)} ({currentReview.goalsAchievement}/5)
										</p>
									</div>
								{/if}
								{#if currentReview.collaboration}
									<div class="text-sm">
										<p class="font-medium">Collaboration</p>
										<p class="text-yellow-600">
											{renderRatingStars(currentReview.collaboration)} ({currentReview.collaboration}/5)
										</p>
									</div>
								{/if}
								{#if currentReview.communication}
									<div class="text-sm">
										<p class="font-medium">Communication</p>
										<p class="text-yellow-600">
											{renderRatingStars(currentReview.communication)} ({currentReview.communication}/5)
										</p>
									</div>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Review Content -->
					{#if currentReview.strengths}
						<div>
							<h4 class="mb-2 font-semibold">Strengths</h4>
							<p class="rounded bg-green-50 p-3 text-sm text-foreground">
								{currentReview.strengths}
							</p>
						</div>
					{/if}

					{#if currentReview.areasForImprovement}
						<div>
							<h4 class="mb-2 font-semibold">Areas for Improvement</h4>
							<p class="rounded bg-orange-50 p-3 text-sm text-foreground">
								{currentReview.areasForImprovement}
							</p>
						</div>
					{/if}

					{#if currentReview.goalsForNextPeriod}
						<div>
							<h4 class="mb-2 font-semibold">Goals for Next Period</h4>
							<p class="rounded bg-blue-50 p-3 text-sm text-foreground">
								{currentReview.goalsForNextPeriod}
							</p>
						</div>
					{/if}

					{#if currentReview.developmentPlan}
						<div>
							<h4 class="mb-2 font-semibold">Development Plan</h4>
							<p class="rounded bg-purple-50 p-3 text-sm text-foreground">
								{currentReview.developmentPlan}
							</p>
						</div>
					{/if}

					{#if currentReview.employeeSelfAssessment}
						<div>
							<h4 class="mb-2 font-semibold">Employee Self-Assessment</h4>
							<p class="rounded bg-muted p-3 text-sm text-foreground dark:bg-muted">
								{currentReview.employeeSelfAssessment}
							</p>
						</div>
					{/if}
				</div>
			{/if}

			<Dialog.Footer>
				<Button
					variant="outline"
					onclick={onClose}>Close</Button
				>
				{#if canEditReviews && currentReview && currentReview.status !== 'completed'}
					<Button
						onclick={() => {
							onClose();
							onEdit(currentReview);
						}}>Edit Review</Button
					>
				{/if}
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
