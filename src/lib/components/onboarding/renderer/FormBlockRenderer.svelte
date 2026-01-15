<script lang="ts">
	import { FileText, Upload, PenTool, CheckSquare } from '@lucide/svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { SignatureField } from '$lib/components/ui/signature-canvas';
	import { mapFieldToComponent } from '$lib/forms';
	import FormElementPreview from '$lib/components/onboarding/FormElementPreview.svelte';

	interface Props {
		block: any;
		checkboxStates: Record<string, boolean>;
		signatureData: Record<string, string | null>;
		formTemplates: Map<string, any>;
	}

	let {
		block,
		checkboxStates = $bindable(),
		signatureData = $bindable(),
		formTemplates
	}: Props = $props();

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

	const BlockIcon = getBlockIcon(block.type);
</script>

<div class="border-l-4 border-primary/30 pl-6 py-4" data-testid="block-container-{block.id}">
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
		<div class="prose dark:prose-invert max-w-none" data-testid="block-TEXT-{block.id}">
			<div>{block.textContent}</div>
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
	{#if block.type === 'FORM_FIELDS'}
		<div class="space-y-6" data-testid="block-FORM_FIELDS-{block.id}">
			<!-- 1. Inline Custom Elements -->
			{#if block.inlineFormElements && block.inlineFormElements.length > 0}
				{#each block.inlineFormElements as element, index}
					{#if element.elementType === 'FIELD'}
						<!-- Interactive Field -->
						{@const fieldConfig = mapFieldToComponent(element, block.id)}
						{@const FieldComponent = fieldConfig.component}
						<FieldComponent {...fieldConfig.props as any} />
					{:else}
						<!-- Static Element (Header, Media, etc.) -->
						<FormElementPreview {element} {index} readonly={true} />
					{/if}
				{/each}
			{/if}

			<!-- 2. Legacy Template Fields -->
			{#if block.formTemplateId}
				{@const template = formTemplates.get(block.formTemplateId)}
				{#if template?.fields}
					<div class="space-y-4">
						{#each template.fields as field, fieldIndex}
							{@const fieldConfig = mapFieldToComponent(field, block.id)}
							{@const FieldComponent = fieldConfig.component}
							<FieldComponent {...fieldConfig.props as any} />
						{/each}
					</div>
				{/if}
			{/if}
		</div>
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
					<Label for={`${block.id}-checkbox-${idx}`} class="text-sm leading-relaxed cursor-pointer">
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
				<p class="text-xs text-muted-foreground mt-1" data-testid="accepted-file-types">
					Accepted types: {block.fileUploadRequirements.acceptedTypes.join(', ')}
				</p>
			{/if}
		</div>
	{/if}
</div>
