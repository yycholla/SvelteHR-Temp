<script lang="ts">
	/**
	 * Form Field Card
	 * Displays a form field in the builder list with drag handle and actions
	 */
	import { Button } from '$lib/components/ui/button';
	import {
		GripVertical,
		Type,
		Mail,
		Phone,
		AlignLeft,
		Hash,
		Calendar,
		ChevronDown,
		CheckSquare,
		Pencil,
		Trash2
	} from '@lucide/svelte';
	import type { FormFieldDefinition, FormFieldType } from '$lib/graphql/form-operations';

	interface Props {
		field: FormFieldDefinition;
		index: number;
		onEdit: (field: FormFieldDefinition, index: number) => void;
		onDelete: (index: number) => void;
	}

	let { field, index, onEdit, onDelete }: Props = $props();

	// Icon mapping for field types
	const typeIcons: Record<FormFieldType, typeof Type> = {
		TEXT: Type,
		EMAIL: Mail,
		PHONE: Phone,
		TEXTAREA: AlignLeft,
		NUMBER: Hash,
		DATE: Calendar,
		SELECT: ChevronDown,
		CHECKBOX: CheckSquare
	};

	// Type display names
	const typeNames: Record<FormFieldType, string> = {
		TEXT: 'Text',
		EMAIL: 'Email',
		PHONE: 'Phone',
		TEXTAREA: 'Text Area',
		NUMBER: 'Number',
		DATE: 'Date',
		SELECT: 'Dropdown',
		CHECKBOX: 'Checkbox'
	};

	const Icon = $derived(typeIcons[field.type]);
	const typeName = $derived(typeNames[field.type]);
</script>

<div
	class="group relative flex items-center gap-3 rounded-lg border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition-all"
	data-field-id={field.name}
>
	<!-- Drag Handle -->
	<button
		type="button"
		class="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
	>
		<GripVertical class="h-5 w-5" />
	</button>

	<!-- Field Icon -->
	<div class="rounded-md bg-primary/10 p-2">
		<Icon class="h-4 w-4 text-primary" />
	</div>

	<!-- Field Info -->
	<div class="flex-1 min-w-0">
		<div class="flex items-center gap-2">
			<h4 class="font-medium text-sm truncate">{field.label}</h4>
			{#if field.required}
				<span class="text-destructive text-xs">*</span>
			{/if}
		</div>
		<div class="flex items-center gap-2 text-xs text-muted-foreground mt-1">
			<span>{typeName}</span>
			<span>•</span>
			<code class="bg-muted px-1.5 py-0.5 rounded text-xs">{field.name}</code>
		</div>
	</div>

	<!-- Actions (visible on hover) -->
	<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
		<Button
			type="button"
			variant="ghost"
			size="sm"
			onclick={() => onEdit(field, index)}
			class="h-8 w-8 p-0"
		>
			<Pencil class="h-4 w-4" />
			<span class="sr-only">Edit field</span>
		</Button>
		<Button
			type="button"
			variant="ghost"
			size="sm"
			onclick={() => onDelete(index)}
			class="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
		>
			<Trash2 class="h-4 w-4" />
			<span class="sr-only">Delete field</span>
		</Button>
	</div>
</div>
