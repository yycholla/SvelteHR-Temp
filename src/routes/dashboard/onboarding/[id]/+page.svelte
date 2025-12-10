<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import {
		AlertCircle,
		CheckCircle2,
		CheckSquare,
		ChevronLeft,
		ChevronRight,
		Circle,
		FileText,
		PenTool,
		Save,
		Upload
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import * as Card from '$lib/components/ui/card';
	import { SignatureField } from '$lib/components/ui/signature-canvas';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { toast } from 'svelte-sonner';

	const { data } = $props();

	// State
	let currentFormIndex = $state(0);
	let formData = $state<Record<string, any>>({});
	const checkboxStates = $state<Record<string, boolean>>({});
	const signatureData = $state<Record<string, string | null>>({});
	let isSaving = $state(false);

	// Derived values
	const currentForm = $derived(data.forms[currentFormIndex]);
	const isLastForm = $derived(currentFormIndex === data.forms.length - 1);
	const isFirstForm = $derived(currentFormIndex === 0);
	const completionPercentage = $derived(
		data.totalForms > 0 ? Math.round((data.completedForms / data.totalForms) * 100) : 0
	);

	// Initialize form data from saved progress
	$effect(() => {
		if (currentForm?.progress?.formData) {
			formData = { ...currentForm.progress.formData };
		} else {
			formData = {};
		}
	});

	function getBlockIcon(type: string) {
		const icons: Record<string, any> = {
			TEXT: FileText,
			FORM_FIELDS: FileText,
			DOCUMENT: FileText,
			FILE_UPLOAD: Upload,
			SIGNATURE: PenTool,
			CHECKBOX: CheckSquare
		};
		return icons[type] || FileText;
	}

	function nextForm() {
		if (!isLastForm) {
			currentFormIndex++;
			window.scrollTo(0, 0);
		}
	}

	function prevForm() {
		if (!isFirstForm) {
			currentFormIndex--;
			window.scrollTo(0, 0);
		}
	}

	function jumpToForm(index: number) {
		currentFormIndex = index;
		window.scrollTo(0, 0);
	}

	async function saveProgress() {
		if (!currentForm) return;

		isSaving = true;
		const formDataToSave = new FormData();
		formDataToSave.append('onboardingFormId', currentForm.id);
		formDataToSave.append('status', 'IN_PROGRESS');
		formDataToSave.append('formData', JSON.stringify(formData));

		const response = await fetch('', {
			method: 'POST',
			body: formDataToSave,
			headers: {
				'x-sveltekit-action': 'saveProgress'
			}
		});

		if (response.ok) {
			toast.success('Progress saved');
			await invalidateAll();
		} else {
			toast.error('Failed to save progress');
		}
		isSaving = false;
	}

	async function completeForm() {
		if (!currentForm) return;

		isSaving = true;
		const formDataToSubmit = new FormData();
		formDataToSubmit.append('onboardingFormId', currentForm.id);
		formDataToSubmit.append('formData', JSON.stringify(formData));

		const response = await fetch('', {
			method: 'POST',
			body: formDataToSubmit,
			headers: {
				'x-sveltekit-action': 'completeForm'
			}
		});

		if (response.ok) {
			toast.success('Form completed successfully!');
			await invalidateAll();

			if (!isLastForm) {
				nextForm();
			} else {
				// All forms completed - redirect to dashboard
				toast.success('Onboarding completed! 🎉');
				setTimeout(() => {
					goto('/dashboard');
				}, 2000);
			}
		} else {
			toast.error('Failed to complete form');
		}
		isSaving = false;
	}

	function parseCheckboxItems(jsonData: any): string[] {
		if (!jsonData) return [];
		try {
			if (typeof jsonData === 'string') {
				return JSON.parse(jsonData);
			}
			if (Array.isArray(jsonData)) {
				return jsonData;
			}
			return [];
		} catch {
			return [];
		}
	}

	type FormTemplate = {
		id: string;
		fields: Array<{
			name: string;
			label: string;
			type: string;
			required?: boolean;
		}>;
	};

	function getFormTemplate(templateId: string | null): FormTemplate | null {
		if (!templateId) return null;
		const template = data.formTemplates.get(templateId);
		// Type assertion - we know from server that templates have fields
		return template ? (template as FormTemplate) : null;
	}

	function renderFormField(field: any, blockId: string) {
		const fieldId = `${blockId}-${field.name}`;

		switch (field.type) {
			case 'TEXT':
			case 'EMAIL':
			case 'PHONE':
				return {
					component: Input,
					props: { type: field.type.toLowerCase(), placeholder: field.label }
				};
			case 'TEXTAREA':
				return { component: Textarea, props: { placeholder: field.label, rows: 4 } };
			case 'NUMBER':
				return { component: Input, props: { type: 'number', placeholder: field.label } };
			case 'DATE':
				return { component: Input, props: { type: 'date' } };
			default:
				return { component: Input, props: { type: 'text', placeholder: field.label } };
		}
	}
</script>

<div class="container mx-auto py-8 max-w-7xl px-4">
	<!-- Header -->
	<div class="mb-8">
		<Button variant="ghost" size="sm" href="/dashboard/onboarding" class="mb-4">
			<ChevronLeft class="mr-2 h-4 w-4" /> Back to My Onboarding
		</Button>

		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold">{data.module.title}</h1>
				{#if data.module.description}
					<p class="text-muted-foreground mt-2">{data.module.description}</p>
				{/if}
			</div>
			<Badge
				variant={completionPercentage === 100 ? 'default' : 'secondary'}
				class="text-lg px-4 py-2"
			>
				{completionPercentage}% Complete
			</Badge>
		</div>

		<!-- Progress Bar -->
		<div class="mt-6">
			<Progress
				value={completionPercentage}
				class="h-2"
				aria-valuenow={completionPercentage}
				data-testid="progress-bar"
			/>
			<p class="text-sm text-muted-foreground mt-2">
				<span data-testid="completed-forms-count">{data.completedForms}</span> of
				<span data-testid="total-forms-count">{data.totalForms}</span> forms completed
			</p>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
		<!-- Left Sidebar: Form Navigation -->
		<div class="lg:col-span-1">
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-lg">Forms</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-2" data-testid="forms-navigation">
					{#each data.forms as form, index}
						<button
							data-testid="nav-form-{index}"
							onclick={() => jumpToForm(index)}
							class="w-full text-left p-3 rounded-lg transition-all {index === currentFormIndex
								? 'bg-primary text-primary-foreground'
								: 'hover:bg-accent'}"
						>
							<div class="flex items-center gap-2">
								{#if form.isCompleted}
									<CheckCircle2
										class="h-5 w-5 text-green-500 shrink-0"
										data-testid="status-completed"
									/>
								{:else if form.isInProgress}
									<Circle
										class="h-5 w-5 text-yellow-500 shrink-0"
										data-testid="status-in-progress"
									/>
								{:else}
									<Circle class="h-5 w-5 text-gray-400 shrink-0" data-testid="status-not-started" />
								{/if}
								<div class="flex-1 min-w-0">
									<div class="font-medium text-sm truncate" data-testid="form-step-number">
										Step {index + 1}
									</div>
									<div class="text-xs opacity-80 truncate" data-testid="form-title">
										{form.title}
									</div>
								</div>
								<div data-testid="form-status-icon"></div>
							</div>
						</button>
					{/each}
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Main Content: Current Form -->
		<div class="lg:col-span-3">
			{#if currentForm}
				<Card.Root data-testid="form-content">
					<Card.Header>
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<Badge variant="outline" class="mb-2" data-testid="current-form-step-badge"
									>Step {currentFormIndex + 1} of {data.totalForms}</Badge
								>
								<Card.Title class="text-2xl" data-testid="current-form-title"
									>{currentForm.title}</Card.Title
								>
								{#if currentForm.description}
									<Card.Description class="mt-2" data-testid="current-form-description"
										>{currentForm.description}</Card.Description
									>
								{/if}
							</div>
							{#if currentForm.isRequired}
								<Badge variant="secondary" data-testid="required-field">Required</Badge>
							{/if}
						</div>
					</Card.Header>
					<Card.Content class="space-y-8">
						<!-- Render all blocks in the form -->
						{#each currentForm.blocks as block}
							{@const BlockIcon = getBlockIcon(block.type)}
							<div
								class="border-l-4 border-primary/30 pl-6 py-4"
								data-testid="block-container-{block.id}"
							>
								<div class="flex items-center gap-2 mb-4">
									<BlockIcon class="h-5 w-5 text-primary" />
									{#if block.title}
										<h3 class="text-lg font-semibold" data-testid="block-title-{block.id}">
											{block.title}
										</h3>
									{/if}
								</div>

								<!-- TEXT Block -->
								{#if block.type === 'TEXT' && block.textContent}
									<div
										class="prose dark:prose-invert max-w-none"
										data-testid="block-TEXT-{block.id}"
									>
										<div data-testid="text-content">{block.textContent}</div>
									</div>
								{/if}

								<!-- DOCUMENT Block -->
								{#if block.type === 'DOCUMENT' && block.documentUrl}
									<div data-testid="block-DOCUMENT-{block.id}">
										<a
											href={block.documentUrl}
											target="_blank"
											rel="noopener noreferrer"
											class="text-primary hover:underline flex items-center gap-2"
										>
											<FileText class="h-4 w-4" />
											View Document
										</a>
									</div>
								{/if}

								<!-- FORM_FIELDS Block -->
								{#if block.type === 'FORM_FIELDS' && block.formTemplateId}
									{@const template = getFormTemplate(block.formTemplateId)}
									{#if template?.fields}
										<div class="space-y-4" data-testid="block-FORM_FIELDS-{block.id}">
											{#each template.fields as field}
												{@const fieldInfo = renderFormField(field, block.id)}
												{@const FieldComponent = fieldInfo.component}
												<div>
													<Label for={`${block.id}-${field.name}`}>
														{field.label}
														{#if field.required}
															<span class="text-red-500">*</span>
														{/if}
													</Label>
													<FieldComponent
														id={`${block.id}-${field.name}`}
														required={field.required}
														bind:value={formData[field.name]}
														{...fieldInfo.props}
													/>
												</div>
											{/each}
										</div>
									{/if}
								{/if}

								<!-- CHECKBOX Block -->
								{#if block.type === 'CHECKBOX'}
									{@const items = parseCheckboxItems(block.checkboxItems)}
									<div class="space-y-3" data-testid="block-CHECKBOX-{block.id}">
										{#each items as item, idx}
											<div class="flex items-start gap-2">
												<Checkbox
													id={`${block.id}-checkbox-${idx}`}
													bind:checked={checkboxStates[`${block.id}-${idx}`]}
												/>
												<Label
													for={`${block.id}-checkbox-${idx}`}
													class="text-sm leading-relaxed cursor-pointer"
												>
													{item}
												</Label>
											</div>
										{/each}
									</div>
								{/if}

								<!-- SIGNATURE Block -->
								{#if block.type === 'SIGNATURE'}
									<div data-testid="block-SIGNATURE-{block.id}">
										<div data-testid="signature-field">
											<SignatureField
												name="signature-{block.id}"
												label={block.title || 'Signature'}
												bind:value={signatureData[block.id]}
												width={600}
												height={200}
												required={block.required || false}
											/>
										</div>
									</div>
								{/if}

								<!-- FILE_UPLOAD Block -->
								{#if block.type === 'FILE_UPLOAD'}
									<div data-testid="block-FILE_UPLOAD-{block.id}">
										<Input
											type="file"
											id={`${block.id}-file`}
											accept={block.fileUploadRequirements?.acceptedTypes?.join(',') || '*'}
										/>
										{#if block.fileUploadRequirements?.maxSizeMB}
											<p class="text-xs text-muted-foreground mt-1" data-testid="file-size-limit">
												Max file size: {block.fileUploadRequirements.maxSizeMB}MB
											</p>
										{/if}
										{#if block.fileUploadRequirements?.acceptedTypes}
											<p
												class="text-xs text-muted-foreground mt-1"
												data-testid="accepted-file-types"
											>
												Accepted types: {block.fileUploadRequirements.acceptedTypes.join(', ')}
											</p>
										{/if}
									</div>
								{/if}
							</div>
						{/each}

						<!-- Form Actions -->
						<div class="flex items-center justify-between pt-6 border-t">
							<Button
								variant="outline"
								onclick={prevForm}
								disabled={isFirstForm}
								data-testid="previous-form-button"
							>
								<ChevronLeft class="mr-2 h-4 w-4" />
								Previous
							</Button>

							<div class="flex gap-2">
								<Button
									variant="outline"
									onclick={saveProgress}
									disabled={isSaving}
									data-testid="save-progress-button"
								>
									<Save class="mr-2 h-4 w-4" />
									{isSaving ? 'Saving...' : 'Save Progress'}
								</Button>

								{#if !isLastForm}
									<Button
										onclick={completeForm}
										disabled={isSaving}
										data-testid="complete-form-button"
									>
										Complete & Continue
										<ChevronRight class="ml-2 h-4 w-4" />
									</Button>
								{:else}
									<Button
										onclick={completeForm}
										disabled={isSaving}
										data-testid="complete-onboarding-button"
									>
										<CheckCircle2 class="mr-2 h-4 w-4" />
										Complete Onboarding
									</Button>
								{/if}
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{:else}
				<Card.Root>
					<Card.Content class="p-12 text-center">
						<AlertCircle class="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
						<h3 class="text-xl font-semibold mb-2">No Forms Available</h3>
						<p class="text-muted-foreground">This onboarding module doesn't have any forms yet.</p>
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	</div>
</div>
