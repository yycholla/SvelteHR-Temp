<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import * as Select from '$lib/components/ui/select';
	import MultiSearchInput from '$lib/components/ui/tag-input/MultiSearchInput.svelte';
	import RecurrencePatternInput from '$lib/components/ui/recurrence-pattern-input.svelte';
	import {
		AlertCircle,
		ChevronLeft,
		FileText,
		Image,
		Loader2,
		Video as VideoIcon
	} from '@lucide/svelte';

	interface RecurrencePattern {
		frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
		interval: number;
		endDate: Date | null;
		daysOfWeek?: number[];
		rruleString?: string;
	}

	const { form, data } = $props();

	let submitting = $state(false);
	let isActive = $state(true);
	let tags = $state<string[]>([]);
	const selectedAuthor = $state<string>(''); // Default to current user in logic if empty
	let recurrencePattern = $state<RecurrencePattern | null>(null);
	let startDate = $state<string>('');

	// Authors options (mock for now, ideally passed from load function)
	const authorOptions = [
		{ value: 'me', label: 'Current User (Me)' },
		{ value: 'hr', label: 'HR Department' },
		{ value: 'it', label: 'IT Department' }
	];
</script>

<div class="container mx-auto py-10 max-w-5xl px-4">
	<!-- Header -->
	<div class="mb-8 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="icon" href="/admin/trainings">
				<ChevronLeft class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Create Training Module</h1>
				<p class="text-muted-foreground text-sm">Define metadata, SEO, and settings.</p>
			</div>
		</div>
		<div class="flex gap-2">
			<!-- Draft saving could be implemented later -->
			<!-- <Button variant="outline">Save Draft</Button> -->
		</div>
	</div>

	{#if form?.error}
		<Alert.Root variant="destructive" class="mb-6">
			<AlertCircle class="h-4 w-4" />
			<Alert.Title>Error</Alert.Title>
			<Alert.Description>{form.error}</Alert.Description>
		</Alert.Root>
	{/if}

	<form
		method="POST"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}
	>
		<!-- Hidden inputs for complex bindings -->
		<input type="hidden" name="isActive" value={isActive ? 'on' : 'off'} />
		<input type="hidden" name="tags" value={JSON.stringify(tags)} />
		<input type="hidden" name="authorId" value={selectedAuthor} />
		<input type="hidden" name="recurrencePattern" value={JSON.stringify(recurrencePattern)} />

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Left Column: Main Info -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Basic Details Card -->
				<Card.Root>
					<Card.Content class="p-6 space-y-6">
						<div class="space-y-2">
							<Label for="title">Title <span class="text-destructive">*</span></Label>
							<Input
								id="title"
								name="title"
								placeholder="e.g., Cybersecurity Awareness 2025"
								required
								value={form?.values?.title ?? ''}
							/>
						</div>

						<div class="space-y-2">
							<Label for="description">Description</Label>
							<Textarea
								id="description"
								name="description"
								placeholder="Short summary of this training module..."
								rows={4}
								value={form?.values?.description ?? ''}
							/>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- SEO & Metadata Card -->
				<Card.Root>
					<Card.Header class="border-b p-6">
						<Card.Title>SEO & Metadata</Card.Title>
					</Card.Header>
					<Card.Content class="p-6 space-y-6">
						<div class="space-y-2">
							<Label for="metaTitle">Meta Title</Label>
							<Input
								id="metaTitle"
								name="metaTitle"
								placeholder="Browser tab title"
								value={form?.values?.metaTitle ?? ''}
							/>
							<p class="text-[0.8rem] text-muted-foreground">
								Recommended length: 50-60 characters.
							</p>
						</div>

						<div class="space-y-2">
							<Label for="metaDescription">Meta Description</Label>
							<Textarea
								id="metaDescription"
								name="metaDescription"
								placeholder="Search engine description..."
								rows={3}
								value={form?.values?.metaDescription ?? ''}
							/>
							<p class="text-[0.8rem] text-muted-foreground">
								Recommended length: 150-160 characters.
							</p>
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
					<Card.Content class="p-6 space-y-6">
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

						<!-- Author (Simplified for now, passing ID/Value directly) -->
						<!-- <div class="space-y-2">
							<Label>Author</Label>
							<Select.Root selected={{ value: selectedAuthor, label: authorOptions.find(a => a.value === selectedAuthor)?.label }} onSelectedChange={(v) => selectedAuthor = v?.value}>
								<Select.Trigger>
									<Select.Value placeholder="Select author" />
								</Select.Trigger>
								<Select.Content>
									{#each authorOptions as author}
										<Select.Item value={author.value}>{author.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div> -->
					</Card.Content>
				</Card.Root>

				<!-- Scheduling Card -->
				<Card.Root>
					<Card.Header class="border-b p-6">
						<Card.Title>Availability</Card.Title>
					</Card.Header>
					<Card.Content class="p-6 space-y-4">
						<div class="space-y-2">
							<Label for="startDate">Start Date</Label>
							<Input id="startDate" name="startDate" type="datetime-local" bind:value={startDate} />
						</div>
						<div class="space-y-2">
							<Label for="endDate">End Date</Label>
							<Input
								id="endDate"
								name="endDate"
								type="datetime-local"
								value={form?.values?.endDate ?? ''}
							/>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Recurrence Card -->
				{#if startDate}
					<RecurrencePatternInput
						bind:pattern={recurrencePattern}
						startDate={new Date(startDate)}
					/>
				{:else}
					<Card.Root class="opacity-60">
						<Card.Header class="border-b p-6">
							<Card.Title>Recurring Training</Card.Title>
						</Card.Header>
						<Card.Content class="p-6">
							<p class="text-sm text-muted-foreground">
								Please select a start date to configure recurrence options.
							</p>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		</div>

		<div class="mt-8 flex justify-end gap-2">
			<Button variant="ghost" href="/admin/trainings" disabled={submitting}>Cancel</Button>
			<Button type="submit" disabled={submitting}>
				{#if submitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Creating...
				{:else}
					Continue to Content
				{/if}
			</Button>
		</div>
	</form>

	<!-- Content Builder Preview (Conceptual) -->
	<div class="mt-8 opacity-60 grayscale pointer-events-none select-none">
		<div class="flex items-center gap-2 mb-4">
			<span
				class="flex h-8 w-8 items-center justify-center rounded-full border bg-muted text-xs font-medium"
				>2</span
			>
			<h3 class="font-semibold">Content Builder (Next Step)</h3>
		</div>
		<div
			class="rounded-xl border border-dashed border-2 p-8 flex flex-col items-center justify-center text-center space-y-4 bg-gray-50 dark:bg-gray-900/50"
		>
			<div class="flex gap-4 text-muted-foreground">
				<div
					class="h-12 w-12 bg-background rounded border shadow-sm flex items-center justify-center"
				>
					<FileText class="h-6 w-6" />
				</div>
				<div
					class="h-12 w-12 bg-background rounded border shadow-sm flex items-center justify-center"
				>
					<VideoIcon class="h-6 w-6" />
				</div>
				<div
					class="h-12 w-12 bg-background rounded border shadow-sm flex items-center justify-center"
				>
					<Image class="h-6 w-6" />
				</div>
			</div>
			<p class="text-sm text-muted-foreground">
				Add Video, Images, Documents, and Text after creating the module.
			</p>
		</div>
	</div>
</div>
