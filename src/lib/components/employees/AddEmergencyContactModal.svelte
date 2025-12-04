<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Checkbox from '$lib/components/ui/checkbox';
	import { Shield } from '@lucide/svelte';

	interface Props {
		isOpen: boolean;
		employeeId: string;
		employeeName: string;
		initialData?: EmergencyContactInput | null;
		onSave: (contact: EmergencyContactInput) => Promise<void>;
		onClose: () => void;
		isSubmitting?: boolean;
	}

	export interface EmergencyContactInput {
		id?: string;
		employeeId: string;
		name: string;
		relationship?: string;
		phoneNumber: string;
		email?: string;
		isPrimary: boolean;
	}

	let {
		isOpen,
		employeeId,
		employeeName,
		initialData = null,
		onSave,
		onClose,
		isSubmitting = false
	}: Props = $props();

	// Form state
	let name = $state('');
	let relationship = $state('');
	let phoneNumber = $state('');
	let email = $state('');
	let isPrimary = $state(false);
	let errors = $state<Record<string, string>>({});

	$effect(() => {
		if (isOpen && initialData) {
			name = initialData.name;
			relationship = initialData.relationship || '';
			phoneNumber = initialData.phoneNumber;
			email = initialData.email || '';
			isPrimary = initialData.isPrimary;
		} else if (isOpen && !initialData) {
			resetForm();
		}
	});

	function resetForm() {
		name = '';
		relationship = '';
		phoneNumber = '';
		email = '';
		isPrimary = false;
		errors = {};
	}

	function validate(): boolean {
		const newErrors: Record<string, string> = {};

		if (!name.trim()) {
			newErrors.name = 'Name is required';
		}

		if (!phoneNumber.trim()) {
			newErrors.phoneNumber = 'Phone number is required';
		} else if (!/^[\d\s\-\(\)\+]+$/.test(phoneNumber)) {
			newErrors.phoneNumber = 'Invalid phone number format';
		}

		if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			newErrors.email = 'Invalid email format';
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	async function handleSubmit() {
		if (!validate()) return;

		const contactInput: EmergencyContactInput = {
			id: initialData?.id,
			employeeId,
			name: name.trim(),
			relationship: relationship.trim() || undefined,
			phoneNumber: phoneNumber.trim(),
			email: email.trim() || undefined,
			isPrimary
		};

		try {
			await onSave(contactInput);
			resetForm();
			onClose();
		} catch (error) {
			console.error('Failed to save emergency contact:', error);
		}
	}

	function handleClose() {
		resetForm();
		onClose();
	}
</script>

<Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<Shield class="h-5 w-5" />
				{initialData ? 'Edit' : 'Add'} Emergency Contact
			</Dialog.Title>
			<Dialog.Description>
				{initialData ? 'Edit' : 'Add a new'} emergency contact for {employeeName}
			</Dialog.Description>
		</Dialog.Header>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
			class="space-y-4"
		>
			<!-- Name -->
			<div class="space-y-2">
				<Label for="contact-name">
					Name <span class="text-destructive">*</span>
				</Label>
				<Input
					id="contact-name"
					bind:value={name}
					placeholder="John Doe"
					disabled={isSubmitting}
					class={errors.name ? 'border-destructive' : ''}
				/>
				{#if errors.name}
					<p class="text-sm text-destructive">{errors.name}</p>
				{/if}
			</div>

			<!-- Relationship -->
			<div class="space-y-2">
				<Label for="contact-relationship">Relationship</Label>
				<Input
					id="contact-relationship"
					bind:value={relationship}
					placeholder="Spouse, Parent, Friend, etc."
					disabled={isSubmitting}
				/>
			</div>

			<!-- Phone Number -->
			<div class="space-y-2">
				<Label for="contact-phone">
					Phone Number <span class="text-destructive">*</span>
				</Label>
				<Input
					id="contact-phone"
					bind:value={phoneNumber}
					placeholder="+1 (555) 123-4567"
					disabled={isSubmitting}
					class={errors.phoneNumber ? 'border-destructive' : ''}
				/>
				{#if errors.phoneNumber}
					<p class="text-sm text-destructive">{errors.phoneNumber}</p>
				{/if}
			</div>

			<!-- Email -->
			<div class="space-y-2">
				<Label for="contact-email">Email</Label>
				<Input
					id="contact-email"
					type="email"
					bind:value={email}
					placeholder="contact@example.com"
					disabled={isSubmitting}
					class={errors.email ? 'border-destructive' : ''}
				/>
				{#if errors.email}
					<p class="text-sm text-destructive">{errors.email}</p>
				{/if}
			</div>

			<!-- Is Primary -->
			<div class="flex items-center space-x-2">
				<Checkbox.Root id="contact-primary" bind:checked={isPrimary} disabled={isSubmitting} />
				<Label for="contact-primary" class="font-normal">Set as primary emergency contact</Label>
			</div>

			<!-- Actions -->
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={handleClose} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? 'Saving...' : 'Save Contact'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
