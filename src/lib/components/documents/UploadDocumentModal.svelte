<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select } from '$lib/components/ui/select';
	import * as SelectPrimitive from '$lib/components/ui/select';
	import { AlertCircle, CheckCircle2, FileText, Upload, X } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { FileUploader } from '$lib/components/ui/file-upload'; // Assuming standard component or build one inline if needed. Based on prompt "Add file upload component", I'll build a simple D&D area.

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		onSuccess?: () => void;
	}

	let { isOpen, onClose, onSuccess }: Props = $props();

	let isUploading = $state(false);
	let file = $state<File | null>(null);
	let category = $state('Other');
	let sensitivityLevel = $state('Internal');
	let dragActive = $state(false);

	// Reset form when modal opens/closes
	$effect(() => {
		if (!isOpen) {
			file = null;
			category = 'Other';
			sensitivityLevel = 'Internal';
			isUploading = false;
		}
	});

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragActive = false;
		if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
			file = e.dataTransfer.files[0];
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragActive = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		dragActive = false;
	}

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			file = target.files[0];
		}
	}

	const categories = [
		'Contract',
		'Policy',
		'Report',
		'Invoice',
		'Certificate',
		'Payslip',
		'License',
		'Other'
	];

	const sensitivities = ['Public', 'Internal', 'Confidential', 'Sensitive-PII'];
</script>

<Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
	<Dialog.Content class="sm:max-w-[500px]">
		<Dialog.Header>
			<Dialog.Title>Upload Document</Dialog.Title>
			<Dialog.Description>
				Securely upload and encrypt a new document.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="/dashboard/documents/upload?/upload"
			enctype="multipart/form-data"
			use:enhance={({ formData, cancel }) => {
				if (!file) {
					toast.error('Please select a file');
					cancel();
					return;
				}
				isUploading = true;
				
				// Append manual form data since the inputs are bound but might not be inside the form element directly if using custom UI components
				// Actually standard inputs inside form work fine with enhance.
				
				return async ({ result }) => {
					isUploading = false;
					if (result.type === 'success' && result.data?.success) {
						toast.success('Document uploaded successfully');
						onSuccess?.();
						onClose();
					} else if (result.type === 'failure') {
						toast.error(result.data?.error || 'Upload failed');
					} else {
						toast.error('An unexpected error occurred');
					}
				};
			}}
			class="space-y-4"
		>
			<!-- File Drop Zone -->
			<div
				class="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors {dragActive
					? 'border-primary bg-primary/5'
					: 'border-muted-foreground/25'}"
				on:drop={handleDrop}
				on:dragover={handleDragOver}
				on:dragleave={handleDragLeave}
				role="button"
				tabindex="0"
			>
				{#if file}
					<div class="flex flex-col items-center gap-2 text-center">
						<FileText class="h-8 w-8 text-primary" />
						<div>
							<p class="text-sm font-medium text-foreground">{file.name}</p>
							<p class="text-xs text-muted-foreground">
								{(file.size / 1024 / 1024).toFixed(2)} MB
							</p>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onclick={(e) => {
								e.stopPropagation();
								file = null;
							}}
							class="mt-2 text-destructive hover:text-destructive"
						>
							Remove
						</Button>
					</div>
				{:else}
					<div class="flex flex-col items-center gap-2 text-center">
						<Upload class="h-8 w-8 text-muted-foreground" />
						<div>
							<p class="text-sm font-medium text-foreground">
								Drag & drop or click to browse
							</p>
							<p class="text-xs text-muted-foreground">
								PDF, DOCX, XLSX, PNG up to 50MB
							</p>
						</div>
					</div>
				{/if}
				<input
					type="file"
					name="file"
					class="absolute inset-0 cursor-pointer opacity-0"
					onchange={handleFileSelect}
					accept=".pdf,.docx,.xlsx,.png,.jpeg,.jpg,.txt,.csv"
					disabled={isUploading}
				/>
			</div>

			<!-- Metadata Fields -->
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="category">Category</Label>
					<div class="relative">
						<select
							name="category"
							id="category"
							bind:value={category}
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						>
							{#each categories as cat}
								<option value={cat}>{cat}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="sensitivityLevel">Sensitivity</Label>
					<div class="relative">
						<select
							name="sensitivityLevel"
							id="sensitivityLevel"
							bind:value={sensitivityLevel}
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						>
							{#each sensitivities as level}
								<option value={level}>{level}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>

			<Dialog.Footer class="pt-2">
				<Button type="button" variant="outline" onclick={onClose} disabled={isUploading}>
					Cancel
				</Button>
				<Button type="submit" disabled={!file || isUploading}>
					{isUploading ? 'Encrypting & Uploading...' : 'Upload'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
