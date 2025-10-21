<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Car } from 'lucide-svelte';

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

	let { isOpen, employeeId, employeeName, onSave, onClose, isSubmitting = false }: Props =
		$props();

	// Form state
	let make = $state('');
	let model = $state('');
	let year = $state('');
	let licensePlate = $state('');
	let color = $state('');
	let errors = $state<Record<string, string>>({});

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

		if (!make.trim()) {
			newErrors.make = 'Make is required';
		}

		if (!model.trim()) {
			newErrors.model = 'Model is required';
		}

		if (!year.trim()) {
			newErrors.year = 'Year is required';
		} else {
			const yearNum = parseInt(year);
			const currentYear = new Date().getFullYear();
			if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear + 1) {
				newErrors.year = `Year must be between 1900 and ${currentYear + 1}`;
			}
		}

		if (!licensePlate.trim()) {
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
			resetForm();
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
				Add Vehicle
			</Dialog.Title>
			<Dialog.Description>
				Add a new vehicle for {employeeName}
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
