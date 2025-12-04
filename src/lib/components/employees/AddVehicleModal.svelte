<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Car } from '@lucide/svelte';

	interface Props {
		isOpen: boolean;
		employeeId: string;
		employeeName: string;
		onSave: (vehicle: VehicleInput) => Promise<void>;
		onClose: () => void;
		isSubmitting?: boolean;
	}

	export interface VehicleInput {
		employeeId: string;
		make: string;
		model: string;
		year: number;
		licensePlate: string;
		color?: string;
	}

	interface Props {
		isOpen: boolean;
		employeeId: string;
		employeeName: string;
		initialData?: {
			make: string;
			model: string;
			year: number;
			licensePlate: string;
			color?: string | null;
		} | null;
		onSave: (vehicle: VehicleInput) => Promise<void>;
		onClose: () => void;
		isSubmitting?: boolean;
	}

	const {
		isOpen,
		employeeId,
		employeeName,
		initialData = null,
		onSave,
		onClose,
		isSubmitting = false
	}: Props = $props();

	// Form state
	let make = $state('');
	let model = $state('');
	let year = $state('');
	let licensePlate = $state('');
	let color = $state('');
	let errors = $state<Record<string, string>>({});

	// Initialize form with initialData when it changes or modal opens
	$effect(() => {
		if (isOpen && initialData) {
			make = initialData.make;
			model = initialData.model;
			year = String(initialData.year);
			licensePlate = initialData.licensePlate;
			color = initialData.color || '';
		} else if (isOpen && !initialData) {
			// Reset if opening in add mode (though usually handled by close)
			// We don't auto-reset here to avoid clearing if user is just toggling visibility quickly,
			// but for "Add" mode ensure we start clean if intended.
			// For now, relying on manual resetForm() called on close/success.
		}
	});

	function resetForm() {
		make = '';
		model = '';
		year = '';
		licensePlate = '';
		color = '';
		errors = {};
	}

	function validate(): boolean {
		const newErrors: Record<string, string> = {};

		const makeStr = String(make || '').trim();
		if (!makeStr) {
			newErrors.make = 'Make is required';
		}

		const modelStr = String(model || '').trim();
		if (!modelStr) {
			newErrors.model = 'Model is required';
		}

		const yearStr = String(year || '').trim();
		if (!yearStr) {
			newErrors.year = 'Year is required';
		} else {
			const yearNum = parseInt(yearStr);
			const currentYear = new Date().getFullYear();
			if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear + 1) {
				newErrors.year = `Year must be between 1900 and ${currentYear + 1}`;
			}
		}

		const licensePlateStr = String(licensePlate || '').trim();
		if (!licensePlateStr) {
			newErrors.licensePlate = 'License plate is required';
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	async function handleSubmit() {
		if (!validate()) return;

		const vehicleInput: VehicleInput = {
			employeeId,
			make: make.trim(),
			model: model.trim(),
			year: parseInt(year),
			licensePlate: licensePlate.trim(),
			color: color.trim() || undefined
		};

		try {
			await onSave(vehicleInput);
			if (!initialData) resetForm(); // Only full reset on success if it was add mode, or let parent handle closing
			onClose();
		} catch (error) {
			console.error('Failed to save vehicle:', error);
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
				<Car class="h-5 w-5" />
				{initialData ? 'Edit Vehicle' : 'Add Vehicle'}
			</Dialog.Title>
			<Dialog.Description>
				{initialData ? 'Edit vehicle details' : `Add a new vehicle for ${employeeName}`}
			</Dialog.Description>
		</Dialog.Header>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
			class="space-y-4"
		>
			<!-- Make -->
			<div class="space-y-2">
				<Label for="vehicle-make">
					Make <span class="text-destructive">*</span>
				</Label>
				<Input
					id="vehicle-make"
					bind:value={make}
					placeholder="Toyota, Ford, Honda, etc."
					disabled={isSubmitting}
					class={errors.make ? 'border-destructive' : ''}
				/>
				{#if errors.make}
					<p class="text-sm text-destructive">{errors.make}</p>
				{/if}
			</div>

			<!-- Model -->
			<div class="space-y-2">
				<Label for="vehicle-model">
					Model <span class="text-destructive">*</span>
				</Label>
				<Input
					id="vehicle-model"
					bind:value={model}
					placeholder="Camry, F-150, Civic, etc."
					disabled={isSubmitting}
					class={errors.model ? 'border-destructive' : ''}
				/>
				{#if errors.model}
					<p class="text-sm text-destructive">{errors.model}</p>
				{/if}
			</div>

			<!-- Year -->
			<div class="space-y-2">
				<Label for="vehicle-year">
					Year <span class="text-destructive">*</span>
				</Label>
				<Input
					id="vehicle-year"
					type="number"
					bind:value={year}
					placeholder="2024"
					disabled={isSubmitting}
					class={errors.year ? 'border-destructive' : ''}
					min="1900"
					max={new Date().getFullYear() + 1}
				/>
				{#if errors.year}
					<p class="text-sm text-destructive">{errors.year}</p>
				{/if}
			</div>

			<!-- License Plate -->
			<div class="space-y-2">
				<Label for="vehicle-license">
					License Plate <span class="text-destructive">*</span>
				</Label>
				<Input
					id="vehicle-license"
					bind:value={licensePlate}
					placeholder="ABC-1234"
					disabled={isSubmitting}
					class={errors.licensePlate ? 'border-destructive' : ''}
				/>
				{#if errors.licensePlate}
					<p class="text-sm text-destructive">{errors.licensePlate}</p>
				{/if}
			</div>

			<!-- Color -->
			<div class="space-y-2">
				<Label for="vehicle-color">Color</Label>
				<Input
					id="vehicle-color"
					bind:value={color}
					placeholder="Blue, Red, Silver, etc."
					disabled={isSubmitting}
				/>
			</div>

			<!-- Actions -->
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={handleClose} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? 'Saving...' : 'Save Vehicle'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
