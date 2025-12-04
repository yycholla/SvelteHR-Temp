<script lang="ts">
	import { toast } from 'svelte-sonner';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Calendar as CalendarIcon, FileText, Upload } from '@lucide/svelte';
	import MultiSearchInput from '$lib/components/ui/tag-input/MultiSearchInput.svelte';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		onSuccess?: () => void;
		assignToEmployees?: string[]; // Pre-assigned employees (e.g. from profile)
		employees?: { id: string; displayName: string }[]; // List of all employees for selection
	}

	const { isOpen, onClose, onSuccess, assignToEmployees = [], employees = [] }: Props = $props();

	let isUploading = $state(false);
	let file = $state<File | null>(null);
	let category = $state('Other');
	let sensitivityLevel = $state('Internal');
	let expirationDate = $state('');
	let selectedEmployeeIds = $state<string[]>([]);
	let dragActive = $state(false);
	let fileContentBase64 = $state<string | null>(null); // To store base64 content
	let iv = $state<number[] | null>(null); // To store IV

	// Reset form when modal opens/closes
	$effect(() => {
		if (!isOpen) {
			file = null;
			category = 'Other';
			sensitivityLevel = 'Internal';
			expirationDate = '';
			selectedEmployeeIds = [];
			isUploading = false;
			fileContentBase64 = null;
			iv = null;
		} else {
			// If pre-assigned, sync them (optional, but good for consistency if we wanted to show them)
			// But here we only show the selector if assignToEmployees is empty.
		}
	});

	// Prepare options for MultiSearchInput
	const employeeOptions = $derived(employees.map((e) => ({ value: e.id, label: e.displayName })));

	// Handle file selection and base64 encoding
	async function handleFileSelected(selectedFile: File) {
		file = selectedFile;
		isUploading = true;
		try {
			// Read file as ArrayBuffer for encryption/base64
			const arrayBuffer = await file.arrayBuffer();
			const base64String = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => {
					const result = reader.result as string;
					resolve(result.split(',')[1]); // Extract only the base64 part
				};
				reader.onerror = reject;
				reader.readAsDataURL(file as Blob);
			});
			fileContentBase64 = base64String;
			iv = Array.from({ length: 12 }, () => Math.floor(Math.random() * 256)); // Mock IV
		} catch (error) {
			console.error('Error processing file:', error);
			toast.error('File processing failed');
			file = null;
			fileContentBase64 = null;
		} finally {
			isUploading = false;
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragActive = false;
		if (e.dataTransfer?.files?.[0]) {
			handleFileSelected(e.dataTransfer.files[0]);
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
			handleFileSelected(target.files[0]);
		}
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (!file || !fileContentBase64 || !iv) {
			toast.error('Please select a file and ensure it is processed.');
			return;
		}

		isUploading = true;
		try {
			const encryptionKeyId = '00000000-0000-0000-0000-000000000001'; // Placeholder

			// Combine pre-assigned and selected employees
			const finalAssignees = [...assignToEmployees, ...selectedEmployeeIds];

			const response = await fetch('/api/documents/upload', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					filename: file.name,
					fileType: file.type || 'application/octet-stream',
					fileSizeBytes: file.size,
					encryptedData: fileContentBase64,
					encryptionKeyId,
					iv,
					category,
					sensitivityLevel,
					expirationDate: expirationDate ? new Date(expirationDate).toISOString() : null,
					assignToEmployees: finalAssignees
				})
			});

			const result = await response.json();

			if (!response.ok || result.error) {
				throw new Error(result.error || 'Failed to upload document');
			}

			toast.success('Document uploaded successfully');
			onSuccess?.();
			onClose();
		} catch (error) {
			console.error('Upload error:', error);
			toast.error('Upload failed', {
				description: error instanceof Error ? error.message : 'An unexpected error occurred.'
			});
		} finally {
			isUploading = false;
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
	<Dialog.Content class="sm:max-w-[600px]">
		<Dialog.Header>
			<Dialog.Title>Upload Document</Dialog.Title>
			<Dialog.Description>Securely upload and assign a new document.</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleSubmit} class="space-y-5">
			<!-- File Drop Zone -->
			<div
				class="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors {dragActive
					? 'border-primary bg-primary/5'
					: 'border-muted-foreground/25'}"
				ondrop={handleDrop}
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
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
								fileContentBase64 = null;
								iv = null;
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
							<p class="text-sm font-medium text-foreground">Drag & drop or click to browse</p>
							<p class="text-xs text-muted-foreground">PDF, DOCX, XLSX, PNG up to 50MB</p>
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

			<div class="grid gap-4">
				<!-- Employee Assignment (Only if not pre-assigned) -->
				{#if assignToEmployees.length === 0}
					<div class="space-y-2">
						<Label>Assign to Employees</Label>
						<MultiSearchInput
							bind:searchTerms={selectedEmployeeIds}
							options={employeeOptions}
							placeholder="Search and select employees..."
							allowCustomTerms={false}
						/>
						<p class="text-xs text-muted-foreground">Leave empty to upload without assignment.</p>
					</div>
				{/if}

				<!-- Metadata Fields -->
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="category">Category</Label>
						<div class="relative">
							<select
								name="category"
								id="category"
								bind:value={category}
								class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
							>
								{#each categories as cat (cat)}
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
								class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
							>
								{#each sensitivities as level (level)}
									<option value={level}>{level}</option>
								{/each}
							</select>
						</div>
					</div>
				</div>

				<!-- Expiration Date -->
				<div class="space-y-2">
					<Label for="expirationDate">Expiration Date (Optional)</Label>
					<div class="relative">
						<input
							type="date"
							id="expirationDate"
							bind:value={expirationDate}
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
						/>
						<CalendarIcon
							class="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none"
						/>
					</div>
				</div>
			</div>

			<Dialog.Footer class="pt-2">
				<Button type="button" variant="outline" onclick={onClose} disabled={isUploading}>
					Cancel
				</Button>
				<Button type="submit" disabled={!file || isUploading || !fileContentBase64}>
					{isUploading ? 'Uploading...' : 'Upload Document'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
