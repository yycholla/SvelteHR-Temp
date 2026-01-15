<script lang="ts">
	/**
	 * Form Element Properties
	 * Editor panel for individual form element properties
	 */
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Plus, X, Upload, Image as ImageIcon } from '@lucide/svelte';
	import type { FormElement, FormFieldType } from '$lib/graphql/form-operations';
	import MediaLibraryModal from '$lib/components/media/MediaLibraryModal.svelte';

	interface Props {
		element: FormElement;
		onChange: (element: FormElement) => void;
	}

	let { element, onChange }: Props = $props();

	// Local state synced with element
	let label = $state('');
	let placeholder = $state('');
	let required = $state(false);
	let fieldType = $state<FormFieldType>('TEXT');

	// Content blocks
	let content = $state('');
	let style = $state<'plain' | 'info' | 'warning' | 'contract'>('plain');
	let level = $state<1 | 2 | 3>(2);

	// Media
	let mediaUrl = $state('');
	let mediaAlt = $state('');
	let mediaCaption = $state('');

	// Validation
	let minLength = $state<number | undefined>(undefined);
	let maxLength = $state<number | undefined>(undefined);
	let min = $state<number | undefined>(undefined);
	let max = $state<number | undefined>(undefined);
	let pattern = $state('');
	let options = $state<string[]>([]);
	let newOption = $state('');

	// Modal state
	let showMediaLibrary = $state(false);

	// Sync local state when prop changes
	$effect(() => {
		if (element.elementType === 'FIELD') {
			label = element.label;
			placeholder = element.placeholder || '';
			required = element.required || false;
			fieldType = element.type;

			minLength = element.validation?.minLength;
			maxLength = element.validation?.maxLength;
			min = element.validation?.min;
			max = element.validation?.max;
			pattern = element.validation?.pattern || '';
			options = element.validation?.options ? [...element.validation.options] : [];
		} else if (element.elementType === 'TEXT_BLOCK') {
			content = element.content;
			style = element.style || 'plain';
		} else if (element.elementType === 'HEADER') {
			content = element.content;
			level = element.level;
		} else if (element.elementType === 'QUOTE') {
			content = element.content;
		} else if (element.elementType === 'MEDIA') {
			mediaUrl = element.url;
			mediaAlt = element.altText || '';
			mediaCaption = element.caption || '';
		}
	});

	function updateField() {
		if (element.elementType === 'FIELD') {
			onChange({
				...element,
				label,
				type: fieldType,
				required,
				placeholder: placeholder || undefined,
				validation: {
					...(minLength && { minLength }),
					...(maxLength && { maxLength }),
					...(min && { min }),
					...(max && { max }),
					...(pattern && { pattern }),
					...(options.length > 0 && { options })
				}
			});
		} else if (element.elementType === 'TEXT_BLOCK') {
			onChange({ ...element, content, style });
		} else if (element.elementType === 'HEADER') {
			onChange({ ...element, content, level });
		} else if (element.elementType === 'QUOTE') {
			onChange({ ...element, content });
		} else if (element.elementType === 'MEDIA') {
			onChange({
				...element,
				url: mediaUrl,
				altText: mediaAlt || undefined,
				caption: mediaCaption || undefined
			});
		}
		// DIVIDER has no properties
	}

	function handleChange() {
		updateField();
	}

	function addOption() {
		const trimmed = newOption.trim();
		if (trimmed && !options.includes(trimmed)) {
			options = [...options, trimmed];
			newOption = '';
			handleChange();
		}
	}

	function removeOption(index: number) {
		options = options.filter((_, i) => i !== index);
		handleChange();
	}

	function handleMediaSelect(url: string, type: 'image' | 'video' | 'document') {
		mediaUrl = url;
		// Optionally update type if mismatched?
		handleChange();
		showMediaLibrary = false;
	}

	const isTextType = $derived(['TEXT', 'EMAIL', 'PHONE', 'TEXTAREA'].includes(fieldType));
	const isNumberType = $derived(fieldType === 'NUMBER');
	const isDateType = $derived(fieldType === 'DATE');
	const isSelectType = $derived(fieldType === 'SELECT');
</script>

<div class="space-y-6">
	{#if element.elementType === 'FIELD'}
		<div class="space-y-4">
			<div class="space-y-2">
				<Label>Label</Label>
				<Input bind:value={label} oninput={handleChange} placeholder="Field Label" />
			</div>

			<div class="space-y-2">
				<Label>Placeholder</Label>
				<Input bind:value={placeholder} oninput={handleChange} placeholder="Placeholder text" />
			</div>

			<div class="flex items-center space-x-2 pt-2">
				<Checkbox
					id="req-check"
					bind:checked={required}
					onCheckedChange={(v) => {
						required = !!v;
						handleChange();
					}}
				/>
				<Label for="req-check" class="font-normal cursor-pointer">Required Field</Label>
			</div>

			<Separator />

			<div class="space-y-4">
				<h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
					Validation
				</h4>

				{#if isTextType}
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label class="text-xs">Min Length</Label>
							<Input
								type="number"
								bind:value={minLength}
								oninput={handleChange}
								class="h-8"
								placeholder="0"
							/>
						</div>
						<div class="space-y-2">
							<Label class="text-xs">Max Length</Label>
							<Input
								type="number"
								bind:value={maxLength}
								oninput={handleChange}
								class="h-8"
								placeholder="∞"
							/>
						</div>
					</div>
					{#if fieldType === 'TEXT'}
						<div class="space-y-2">
							<Label class="text-xs">Regex Pattern</Label>
							<Input
								bind:value={pattern}
								oninput={handleChange}
								class="h-8 font-mono text-xs"
								placeholder="^[A-Z].*"
							/>
						</div>
					{/if}
				{/if}

				{#if isNumberType || isDateType}
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label class="text-xs">Min</Label>
							<Input
								type={isNumberType ? 'number' : 'date'}
								bind:value={min}
								oninput={handleChange}
								class="h-8"
							/>
						</div>
						<div class="space-y-2">
							<Label class="text-xs">Max</Label>
							<Input
								type={isNumberType ? 'number' : 'date'}
								bind:value={max}
								oninput={handleChange}
								class="h-8"
							/>
						</div>
					</div>
				{/if}

				{#if isSelectType}
					<div class="space-y-3">
						<Label class="text-xs">Options</Label>
						<div class="space-y-2">
							{#each options as option, i}
								<div class="flex items-center gap-2">
									<div class="flex-1 text-sm bg-muted/50 px-2 py-1 rounded border">{option}</div>
									<Button
										variant="ghost"
										size="icon"
										class="h-6 w-6"
										onclick={() => removeOption(i)}
									>
										<X class="h-3 w-3" />
									</Button>
								</div>
							{/each}
						</div>
						<div class="flex gap-2">
							<Input
								bind:value={newOption}
								class="h-8 text-sm"
								placeholder="New option"
								onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
							/>
							<Button size="sm" class="h-8" onclick={addOption}>
								<Plus class="h-3 w-3" />
							</Button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{:else if element.elementType === 'HEADER'}
		<div class="space-y-4">
			<div class="space-y-2">
				<Label>Heading Level</Label>
				<div class="flex gap-2">
					<Button
						variant={level === 1 ? 'default' : 'outline'}
						size="sm"
						class="flex-1"
						onclick={() => {
							level = 1;
							handleChange();
						}}>H1</Button
					>
					<Button
						variant={level === 2 ? 'default' : 'outline'}
						size="sm"
						class="flex-1"
						onclick={() => {
							level = 2;
							handleChange();
						}}>H2</Button
					>
					<Button
						variant={level === 3 ? 'default' : 'outline'}
						size="sm"
						class="flex-1"
						onclick={() => {
							level = 3;
							handleChange();
						}}>H3</Button
					>
				</div>
			</div>

			<div class="space-y-2">
				<Label>Text</Label>
				<Input bind:value={content} oninput={handleChange} placeholder="Heading text" />
			</div>
		</div>
	{:else if element.elementType === 'QUOTE'}
		<div class="space-y-4">
			<div class="space-y-2">
				<Label>Quote Text</Label>
				<Textarea
					bind:value={content}
					oninput={handleChange}
					rows={4}
					placeholder="Enter quote..."
				/>
			</div>
		</div>
	{:else if element.elementType === 'MEDIA'}
		<div class="space-y-4">
			<div class="space-y-2">
				<Label>
					{#if element.mediaType === 'video'}
						Video Embed URL (YouTube/Vimeo)
					{:else}
						File URL
					{/if}
				</Label>
				<div class="flex gap-2">
					<Input bind:value={mediaUrl} oninput={handleChange} placeholder="https://..." />
					<Button
						variant="outline"
						size="icon"
						onclick={() => (showMediaLibrary = true)}
						title="Browse Library"
					>
						<ImageIcon class="h-4 w-4" />
					</Button>
				</div>
				<p class="text-xs text-muted-foreground">
					{#if element.mediaType === 'video'}
						Paste the embed URL or standard share link.
					{:else}
						Direct link to the file.
					{/if}
				</p>
			</div>

			{#if element.mediaType === 'image'}
				<div class="space-y-2">
					<Label>Alt Text</Label>
					<Input bind:value={mediaAlt} oninput={handleChange} placeholder="Image description" />
				</div>
			{/if}

			<div class="space-y-2">
				<Label>Caption (Optional)</Label>
				<Input
					bind:value={mediaCaption}
					oninput={handleChange}
					placeholder="Caption displayed below media"
				/>
			</div>
		</div>
	{:else if element.elementType === 'DIVIDER'}
		<div class="text-sm text-muted-foreground italic text-center py-8">
			Dividers have no properties.
		</div>
	{:else}
		<!-- Text Block Properties -->
		<div class="space-y-4">
			<div class="space-y-2">
				<Label>Display Style</Label>
				<select
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					bind:value={style}
					onchange={handleChange}
				>
					<option value="plain">Plain Text</option>
					<option value="info">Information Box</option>
					<option value="warning">Warning / Alert</option>
					<option value="contract">Legal / Contract</option>
				</select>
			</div>

			<div class="space-y-2">
				<Label>Content</Label>
				<Textarea
					bind:value={content}
					oninput={handleChange}
					rows={10}
					placeholder="Enter the text content here..."
				/>
				<p class="text-xs text-muted-foreground">Markdown formatting supported.</p>
			</div>
		</div>
	{/if}
</div>

<MediaLibraryModal
	bind:open={showMediaLibrary}
	onSelect={handleMediaSelect}
	onOpenChange={(v) => (showMediaLibrary = v)}
	acceptedTypes={element.elementType === 'MEDIA' ? element.mediaType : 'all'}
/>
