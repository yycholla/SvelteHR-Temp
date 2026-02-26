<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import * as Card from '$lib/components/ui/card';
	import MultiSearchInput from '$lib/components/ui/tag-input/MultiSearchInput.svelte';
	import RecurrencePatternInput from '$lib/components/ui/recurrence-pattern-input.svelte';
	import type { RecurrencePattern } from '$lib/types/events';

	interface TrainingFormRecord {
		title: string;
		description?: string | null;
		metaTitle?: string | null;
		metaDescription?: string | null;
		startDate?: string | null;
		endDate?: string | null;
	}

	interface Props {
		training: TrainingFormRecord;
		isActive: boolean;
		tags: string[];
		recurrencePattern: RecurrencePattern | null;
	}

	let {
		training,
		isActive = $bindable(),
		tags = $bindable(),
		recurrencePattern = $bindable()
	}: Props = $props();

	function toDatetimeLocal(isoString: string | null | undefined) {
		if (!isoString) return '';
		const date = new Date(isoString);
		const offset = date.getTimezoneOffset() * 60000;
		const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 16);
		return localISOTime;
	}
</script>

<div class="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
	<!-- Left Column: Main Info -->
	<div class="space-y-6 lg:col-span-2">
		<!-- Basic Details Card -->
		<Card.Root>
			<Card.Content class="space-y-6 p-6">
				<div class="space-y-2">
					<Label for="title">Title <span class="text-destructive">*</span></Label>
					<Input id="title" name="title" value={training.title} required />
				</div>

				<div class="space-y-2">
					<Label for="description">Description</Label>
					<Textarea
						id="description"
						name="description"
						rows={4}
						value={training.description || ''}
					/>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- SEO & Metadata Card -->
		<Card.Root>
			<Card.Header class="border-b p-6">
				<Card.Title>SEO & Metadata</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-6 p-6">
				<div class="space-y-2">
					<Label for="metaTitle">Meta Title</Label>
					<Input id="metaTitle" name="metaTitle" value={training.metaTitle || ''} />
					<p class="text-[0.8rem] text-muted-foreground">Recommended length: 50-60 characters.</p>
				</div>

				<div class="space-y-2">
					<Label for="metaDescription">Meta Description</Label>
					<Textarea
						id="metaDescription"
						name="metaDescription"
						rows={3}
						value={training.metaDescription || ''}
					/>
					<p class="text-[0.8rem] text-muted-foreground">Recommended length: 150-160 characters.</p>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Right Column: Settings & Organization -->
	<div class="space-y-6">
		<!-- Organization Card -->
		<Card.Root>
			<Card.Header class="border-b p-6">
				<Card.Title>Organization</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-6 p-6">
				<!-- Status -->
				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<Label class="text-base">Active Status</Label>
						<p class="text-xs text-muted-foreground">Visible to employees</p>
					</div>
					<Switch bind:checked={isActive} />
				</div>

				<div class="h-px bg-border"></div>

				<!-- Tags -->
				<div class="space-y-2">
					<Label>Tags</Label>
					<MultiSearchInput
						bind:searchTerms={tags}
						placeholder="Add tag..."
						allowCustomTerms={true}
					/>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Scheduling Card -->
		<Card.Root>
			<Card.Header class="border-b p-6">
				<Card.Title>Availability</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4 p-6">
				<div class="space-y-2">
					<Label for="startDate">Start Date</Label>
					<Input
						id="startDate"
						name="startDate"
						type="datetime-local"
						value={toDatetimeLocal(training.startDate)}
					/>
				</div>
				<div class="space-y-2">
					<Label for="endDate">End Date</Label>
					<Input
						id="endDate"
						name="endDate"
						type="datetime-local"
						value={toDatetimeLocal(training.endDate)}
					/>
				</div>

				<div class="my-2 h-px bg-border"></div>

				<RecurrencePatternInput
					bind:pattern={recurrencePattern}
					startDate={training.startDate ? new Date(training.startDate) : new Date()}
				/>
			</Card.Content>
		</Card.Root>
	</div>
</div>
