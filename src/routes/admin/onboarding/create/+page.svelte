<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import MultiSearchInput from '$lib/components/ui/tag-input/MultiSearchInput.svelte';
	import { AlertCircle, ChevronLeft, Loader2 } from '@lucide/svelte';

	const { form, data } = $props();

	let submitting = $state(false);
	let isActive = $state(true);
	let tags = $state<string[]>([]);

	// Common onboarding categories
	const categoryOptions = [
		{ value: 'New Hire', label: 'New Hire' },
		{ value: 'Compliance', label: 'Compliance' },
		{ value: 'Department Specific', label: 'Department Specific' },
		{ value: 'Role Specific', label: 'Role Specific' },
		{ value: 'General', label: 'General' }
	];
</script>

<svelte:head>
	<title>Create Onboarding Module - MountainHR</title>
</svelte:head>

<div class="container mx-auto py-10 max-w-5xl px-4">
	<!-- Header -->
	<div class="mb-8 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="icon" href="/admin/onboarding">
				<ChevronLeft class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Create Onboarding Module</h1>
				<p class="text-muted-foreground text-sm">Define a new onboarding workflow for employees</p>
			</div>
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

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Left Column: Main Info -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Basic Details Card -->
				<Card.Root>
					<Card.Header class="border-b p-6">
						<Card.Title>Module Information</Card.Title>
					</Card.Header>
					<Card.Content class="p-6 space-y-6">
						<div class="space-y-2">
							<Label for="title">Title <span class="text-destructive">*</span></Label>
							<Input
								id="title"
								name="title"
								placeholder="e.g., New Employee Onboarding 2025"
								required
								value={form?.values?.title ?? ''}
							/>
							<p class="text-xs text-muted-foreground">
								A clear, descriptive title for this onboarding module
							</p>
						</div>

						<div class="space-y-2">
							<Label for="description">Description</Label>
							<Textarea
								id="description"
								name="description"
								placeholder="What will employees complete in this module? Include objectives and expectations..."
								rows={6}
								value={form?.values?.description ?? ''}
							/>
							<p class="text-xs text-muted-foreground">
								Provide context about what this module covers and who it's for
							</p>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Next Steps Info Card -->
				<Card.Root>
					<Card.Header class="border-b p-6">
						<Card.Title>What's Next?</Card.Title>
					</Card.Header>
					<Card.Content class="p-6">
						<div class="space-y-4 text-sm text-muted-foreground">
							<p>After creating this module, you'll be able to:</p>
							<ul class="space-y-2 list-disc list-inside ml-2">
								<li>Add content blocks (text, videos, documents, forms)</li>
								<li>Configure required forms (W-4, I-9, etc.)</li>
								<li>Set up document upload requirements</li>
								<li>Add signature capture blocks</li>
								<li>Assign the module to employees or departments</li>
							</ul>
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Right Column: Settings & Organization -->
			<div class="space-y-6">
				<!-- Organization Card -->
				<Card.Root>
					<Card.Header class="border-b p-6">
						<Card.Title>Settings</Card.Title>
					</Card.Header>
					<Card.Content class="p-6 space-y-6">
						<!-- Status -->
						<div class="flex items-center justify-between">
							<div class="space-y-0.5">
								<Label class="text-base">Active Status</Label>
								<p class="text-xs text-muted-foreground">Module is visible and assignable</p>
							</div>
							<Switch bind:checked={isActive} />
						</div>

						<div class="h-px bg-border"></div>

						<!-- Category -->
						<div class="space-y-2">
							<Label for="category">Category</Label>
							<Input
								id="category"
								name="category"
								placeholder="e.g., New Hire, Compliance"
								list="category-suggestions"
								value={form?.values?.category ?? ''}
							/>
							<datalist id="category-suggestions">
								{#each categoryOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</datalist>
							<p class="text-xs text-muted-foreground">Helps organize and filter modules</p>
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
							<p class="text-xs text-muted-foreground">Add keywords for easier searching</p>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Action Buttons -->
				<Card.Root>
					<Card.Content class="p-6 space-y-4">
						<Button type="submit" class="w-full" disabled={submitting}>
							{#if submitting}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Creating...
							{:else}
								Create Module
							{/if}
						</Button>
						<Button type="button" variant="outline" class="w-full" href="/admin/onboarding">
							Cancel
						</Button>
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	</form>
</div>
