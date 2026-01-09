<script lang="ts">
	import { Building, DollarSign } from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';

	interface Props {
		jobTitle: string;
		departmentId: string;
		employmentType: string;
		hireDate: string;
		managerId: string;
		isRemote: boolean;
		salary: string;
		payType: string;
		validationErrors: Record<string, string>;
		isEditing: boolean;
		departmentOptions: any[];
		managerOptions: any[];
		employmentTypeOptions: any[];
		payTypeOptions: any[];
	}

	let {
		jobTitle = $bindable(),
		departmentId = $bindable(),
		employmentType = $bindable(),
		hireDate = $bindable(),
		managerId = $bindable(),
		isRemote = $bindable(),
		salary = $bindable(),
		payType = $bindable(),
		validationErrors,
		isEditing,
		departmentOptions,
		managerOptions,
		employmentTypeOptions,
		payTypeOptions
	}: Props = $props();

	const required = !isEditing;
</script>
