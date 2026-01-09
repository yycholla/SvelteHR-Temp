<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	interface Props {
		firstName: string;
		lastName: string;
		email: string;
		phoneNumber: string;
		fieldErrors: Record<string, string>;
		submitting: boolean;
		onClearError: (field: string) => void;
		onValidate: (field: string, value: string) => void;
		onPhoneInput: (event: Event) => void;
	}

	let {
		firstName = $bindable(),
		lastName = $bindable(),
		email = $bindable(),
		phoneNumber = $bindable(),
		fieldErrors,
		submitting,
		onClearError,
		onValidate,
		onPhoneInput
	}: Props = $props();
</script>

<div class="space-y-4">
	<h3 class="text-sm font-semibold text-muted-foreground">Personal Information</h3>

	<div class="grid grid-cols-2 gap-4">
		<div class="space-y-2">
			<Label for="firstName">
				First Name <span class="text-red-500">*</span>
			</Label>
			<Input
				id="firstName"
				name="firstName"
				bind:value={firstName}
				oninput={() => onClearError('firstName')}
				onblur={() => onValidate('firstName', firstName)}
				required
				placeholder="John"
				disabled={submitting}
				class={fieldErrors.firstName ? 'border-red-500 focus-visible:ring-red-500' : ''}
			/>
			{#if fieldErrors.firstName}
				<p class="text-sm text-red-500">{fieldErrors.firstName}</p>
			{/if}
		</div>

		<div class="space-y-2">
			<Label for="lastName">
				Last Name <span class="text-red-500">*</span>
			</Label>
			<Input
				id="lastName"
				name="lastName"
				bind:value={lastName}
				oninput={() => onClearError('lastName')}
				onblur={() => onValidate('lastName', lastName)}
				required
				placeholder="Doe"
				disabled={submitting}
				class={fieldErrors.lastName ? 'border-red-500 focus-visible:ring-red-500' : ''}
			/>
			{#if fieldErrors.lastName}
				<p class="text-sm text-red-500">{fieldErrors.lastName}</p>
			{/if}
		</div>
	</div>

	<div class="space-y-2">
		<Label for="email">
			Email Address <span class="text-red-500">*</span>
		</Label>
		<Input
			id="email"
			name="email"
			type="email"
			bind:value={email}
			oninput={() => onClearError('email')}
			onblur={() => onValidate('email', email)}
			required
			placeholder="john.doe@mountainhr.dev"
			disabled={submitting}
			class={fieldErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
		/>
		{#if fieldErrors.email}
			<p class="text-sm text-red-500">{fieldErrors.email}</p>
		{/if}
	</div>

	<div class="space-y-2">
		<Label for="phone">Phone Number</Label>
		<Input
			id="phone"
			name="phone"
			type="tel"
			bind:value={phoneNumber}
			oninput={onPhoneInput}
			onblur={() => onValidate('phone', phoneNumber)}
			placeholder="(555) 123-4567"
			disabled={submitting}
			class={fieldErrors.phone ? 'border-red-500 focus-visible:ring-red-500' : ''}
		/>
		{#if fieldErrors.phone}
			<p class="text-sm text-red-500">{fieldErrors.phone}</p>
		{/if}
	</div>
</div>
