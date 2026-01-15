<script lang="ts">
	/**
	 * Form Element Preview
	 * Display-only form element that shows the final product view.
	 * Now purely presentational - interaction handled by parent.
	 */
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Separator } from '$lib/components/ui/separator';
	import { Quote, Image as ImageIcon, Video, FileText } from '@lucide/svelte';
	import type { FormElement } from '$lib/graphql/form-operations';

	interface Props {
		element: FormElement;
		index: number;
		// Handlers are kept for API compatibility but unused in new design
		onEdit?: (index: number) => void;
		onDelete?: (index: number) => void;
		readonly?: boolean;
	}

	let { element, index, readonly = true }: Props = $props();

	// Derived values for display
	const label = $derived(element.elementType === 'FIELD' ? element.label : '');
	const placeholder = $derived(element.elementType === 'FIELD' ? element.placeholder || '' : '');
	const required = $derived(element.elementType === 'FIELD' ? element.required || false : false);
	const fieldType = $derived(element.elementType === 'FIELD' ? element.type : 'TEXT');
	const options = $derived(
		element.elementType === 'FIELD' ? element.validation?.options || [] : []
	);

	// Content blocks
	const content = $derived(
		element.elementType === 'TEXT_BLOCK' ||
			element.elementType === 'QUOTE' ||
			element.elementType === 'HEADER'
			? element.content
			: ''
	);

	// Style for text block
	const style = $derived(element.elementType === 'TEXT_BLOCK' ? element.style || 'plain' : 'plain');

	// Header level
	const level = $derived(element.elementType === 'HEADER' ? element.level : 2);

	// Media properties
	const mediaType = $derived(element.elementType === 'MEDIA' ? element.mediaType : 'image');
	const mediaUrl = $derived(element.elementType === 'MEDIA' ? element.url : '');
	const mediaAlt = $derived(element.elementType === 'MEDIA' ? element.altText : '');
</script>

<div class="w-full">
	{#if element.elementType === 'FIELD'}
		<div class="space-y-2">
			<Label
				class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
			>
				{label}
				{#if required}
					<span class="text-destructive ml-0.5" title="Required">*</span>
				{/if}
			</Label>

			{#if fieldType === 'TEXT' || fieldType === 'EMAIL' || fieldType === 'PHONE'}
				<Input
					type={fieldType === 'EMAIL' ? 'email' : fieldType === 'PHONE' ? 'tel' : 'text'}
					{placeholder}
					{readonly}
					class="bg-background pointer-events-none"
				/>
			{:else if fieldType === 'TEXTAREA'}
				<Textarea
					{placeholder}
					rows={3}
					{readonly}
					class="bg-background resize-none pointer-events-none"
				/>
			{:else if fieldType === 'NUMBER'}
				<Input type="number" {placeholder} {readonly} class="bg-background pointer-events-none" />
			{:else if fieldType === 'DATE'}
				<div class="relative">
					<Input type="date" {readonly} class="bg-background pointer-events-none" />
				</div>
			{:else if fieldType === 'SELECT'}
				<select
					disabled
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pointer-events-none"
				>
					<option>{placeholder || 'Select an option...'}</option>
					{#each options as option (option)}
						<option>{option}</option>
					{/each}
				</select>
			{:else if fieldType === 'CHECKBOX'}
				<div class="flex items-center space-x-2">
					<Checkbox disabled />
					<Label
						class="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
					>
						{placeholder || label}
					</Label>
				</div>
			{/if}
		</div>
	{:else if element.elementType === 'HEADER'}
		<div class="py-2">
			{#if level === 1}
				<h1 class="text-3xl font-bold tracking-tight">{content}</h1>
			{:else if level === 2}
				<h2 class="text-2xl font-semibold tracking-tight border-b pb-2">{content}</h2>
			{:else}
				<h3 class="text-xl font-semibold tracking-tight">{content}</h3>
			{/if}
		</div>
	{:else if element.elementType === 'DIVIDER'}
		<Separator class="my-4" />
	{:else if element.elementType === 'QUOTE'}
		<blockquote class="border-l-4 border-primary pl-4 italic text-muted-foreground my-4 py-1">
			{content}
		</blockquote>
	{:else if element.elementType === 'MEDIA'}
		<div class="rounded-lg border bg-muted/10 overflow-hidden">
			{#if mediaType === 'image'}
				{#if mediaUrl}
					<img
						src={mediaUrl}
						alt={mediaAlt || 'Form image'}
						class="w-full h-auto object-cover max-h-[400px]"
					/>
				{:else}
					<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
						<ImageIcon class="h-12 w-12 mb-2 opacity-20" />
						<span class="text-sm">Image Placeholder</span>
					</div>
				{/if}
			{:else if mediaType === 'video'}
				<div class="aspect-video flex flex-col items-center justify-center bg-muted/20">
					{#if mediaUrl}
						<iframe
							src={mediaUrl}
							title="Video player"
							class="w-full h-full"
							frameborder="0"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							allowfullscreen
						></iframe>
					{:else}
						<div class="flex flex-col items-center justify-center text-muted-foreground">
							<Video class="h-12 w-12 mb-2 opacity-20" />
							<span class="text-sm">Video Embed Placeholder</span>
						</div>
					{/if}
				</div>
			{:else if mediaType === 'document'}
				<div class="p-6 flex items-center justify-center bg-muted/20">
					<div
						class="flex items-center gap-3 p-4 rounded-md border bg-background shadow-sm w-full max-w-sm"
					>
						<div
							class="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary"
						>
							<FileText class="h-5 w-5" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="text-sm font-medium truncate">
								{mediaUrl ? mediaUrl.split('/').pop() : 'Document.pdf'}
							</div>
							<div class="text-xs text-muted-foreground">PDF Document</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Text Block Display -->
		<div
			class="rounded-md p-4 text-sm leading-relaxed
			{style === 'info'
				? 'bg-blue-50 text-blue-900 border border-blue-100 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-900'
				: style === 'warning'
					? 'bg-amber-50 text-amber-900 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900'
					: style === 'contract'
						? 'bg-slate-50 border border-slate-200 font-serif text-slate-800 dark:bg-slate-950/50 dark:border-slate-800 dark:text-slate-300'
						: ''}"
		>
			<div class="whitespace-pre-wrap">
				{content || 'Your text will appear here...'}
			</div>
		</div>
	{/if}
</div>
