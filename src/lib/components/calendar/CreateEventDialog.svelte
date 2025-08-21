<script lang="ts">

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '$lib/components/ui/select';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle,
		DialogTrigger
	} from '$lib/components/ui/dialog';

	export let open = false;
	export let onClose: () => void = () => {};

	// No need for dispatch since we're using form actions

	// Form data
	let formData = {
		title: '',
		description: '',
		startDate: '',
		startTime: '09:00',
		endDate: '',
		endTime: '10:00',
		location: '',
		type: 'meeting',
		priority: 'medium',
		isPublic: false,
		isAllDay: false
	};

	let errors: Record<string, string> = {};

	// Event type options
	const eventTypes = [
		{ value: 'meeting', label: 'Meeting' },
		{ value: 'training', label: 'Training' },
		{ value: 'social', label: 'Social Event' },
		{ value: 'holiday', label: 'Holiday' },
		{ value: 'personal', label: 'Personal' }
	];

	// Priority options
	const priorities = [
		{ value: 'low', label: 'Low' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'high', label: 'High' }
	];

	// Handle select changes
	function handleTypeChange(value: string) {
		console.log('Type changed to:', value);
		formData.type = value;
	}

	function handlePriorityChange(value: string) {
		console.log('Priority changed to:', value);
		formData.priority = value;
	}

	

	function resetForm() {
		formData = {
			title: '',
			description: '',
			startDate: '',
			startTime: '09:00',
			endDate: '',
			endTime: '10:00',
			location: '',
			type: 'meeting',
			priority: 'medium',
			isPublic: false,
			isAllDay: false
		};
		errors = {};
	}



	// Set default start date to today
	$: if (!formData.startDate) {
		formData.startDate = new Date().toISOString().split('T')[0];
	}

	// Handle all-day checkbox changes
	$: if (formData.isAllDay) {
		formData.startTime = '00:00';
		formData.endTime = '23:59';
	}
</script>

<Dialog bind:open>
	<DialogContent class="sm:max-w-[500px]">
		<DialogHeader>
			<DialogTitle>Create New Event</DialogTitle>
			<DialogDescription>
				Add a new event to the calendar. Fill in the details below.
			</DialogDescription>
		</DialogHeader>

		<form action="?/createEvent" method="POST" class="space-y-4">
			<!-- Hidden form fields for the server action -->
			<input type="hidden" name="title" value={formData.title} />
			<input type="hidden" name="description" value={formData.description} />
			<input type="hidden" name="startDate" value={formData.startDate} />
			<input type="hidden" name="startTime" value={formData.isAllDay ? '00:00' : formData.startTime} />
			<input type="hidden" name="endDate" value={formData.endDate || formData.startDate} />
			<input type="hidden" name="endTime" value={formData.isAllDay ? '23:59' : formData.endTime} />
			<input type="hidden" name="isAllDay" value={formData.isAllDay} />
			<input type="hidden" name="type" value={formData.type} />
			<input type="hidden" name="priority" value={formData.priority} />
			<input type="hidden" name="location" value={formData.location} />
			<input type="hidden" name="isPublic" value={formData.isPublic} />
			<!-- Title -->
			<div class="space-y-2">
				<Label for="title">Event Title *</Label>
				<Input
					id="title"
					bind:value={formData.title}
					placeholder="Enter event title"
					class={errors.title ? 'border-red-500' : ''}
				/>
				{#if errors.title}
					<p class="text-sm text-red-500">{errors.title}</p>
				{/if}
			</div>

			<!-- Description -->
			<div class="space-y-2">
				<Label for="description">Description</Label>
				<Textarea
					id="description"
					bind:value={formData.description}
					placeholder="Enter event description"
					rows={3}
				/>
			</div>

			<!-- Date and Time -->
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="startDate">Start Date *</Label>
					<Input
						id="startDate"
						type="date"
						bind:value={formData.startDate}
						class={errors.startDate ? 'border-red-500' : ''}
					/>
					{#if errors.startDate}
						<p class="text-sm text-red-500">{errors.startDate}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="endDate">End Date</Label>
					<Input
						id="endDate"
						type="date"
						bind:value={formData.endDate}
						min={formData.startDate}
					/>
				</div>
			</div>

			<!-- All Day Toggle -->
			<div class="flex items-center space-x-2">
				<Checkbox
					id="isAllDay"
					bind:checked={formData.isAllDay}
				/>
				<Label for="isAllDay">All Day Event</Label>
			</div>

			<!-- Time (hidden if all day) -->
			{#if !formData.isAllDay}
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="startTime">Start Time *</Label>
						<Input
							id="startTime"
							type="time"
							bind:value={formData.startTime}
							class={errors.startTime ? 'border-red-500' : ''}
						/>
						{#if errors.startTime}
							<p class="text-sm text-red-500">{errors.startTime}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="endTime">End Time</Label>
						<Input
							id="endTime"
							type="time"
							bind:value={formData.endTime}
							min={formData.startTime}
						/>
					</div>
				</div>
			{/if}

			<!-- Location -->
			<div class="space-y-2">
				<Label for="location">Location</Label>
				<Input
					id="location"
					bind:value={formData.location}
					placeholder="Enter event location"
				/>
			</div>

			<!-- Event Type and Priority -->
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="type">Event Type</Label>
					<Select type="single" onValueChange={handleTypeChange}>
						<SelectTrigger>
							<SelectValue placeholder="Select event type">
								{#if formData.type}
									{eventTypes.find(t => t.value === formData.type)?.label || formData.type}
								{/if}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{#each eventTypes as type}
								<SelectItem value={type.value}>{type.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
					{#if formData.type}
						<div class="text-xs text-muted-foreground">Selected: {eventTypes.find(t => t.value === formData.type)?.label}</div>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="priority">Priority</Label>
					<Select type="single" onValueChange={handlePriorityChange}>
						<SelectTrigger>
							<SelectValue placeholder="Select priority">
								{#if formData.priority}
									{priorities.find(p => p.value === formData.priority)?.label || formData.priority}
								{/if}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{#each priorities as priority}
								<SelectItem value={priority.value}>{priority.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
					{#if formData.priority}
						<div class="text-xs text-muted-foreground">Selected: {priorities.find(p => p.value === formData.priority)?.label}</div>
					{/if}
				</div>
			</div>

			<!-- Public Event Toggle -->
			<div class="flex items-center space-x-2">
				<Checkbox id="isPublic" bind:checked={formData.isPublic} />
				<Label for="isPublic">Public Event (visible to all employees)</Label>
			</div>

			<DialogFooter>
				<Button type="button" variant="outline" onclick={onClose}>
					Cancel
				</Button>
				<Button type="submit">
					Create Event
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
