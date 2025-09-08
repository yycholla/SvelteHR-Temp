<script context="module">
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'UI/Avatar',
		component: Avatar,
		parameters: {
			layout: 'centered'
		},
		tags: ['autodocs'],
		argTypes: {
			size: {
				control: { type: 'select' },
				options: ['sm', 'default', 'lg', 'xl']
			}
		},
		args: {
			size: 'default'
		}
	});
</script>

<script>
	import Avatar from './avatar.svelte';
	import AvatarImage from './avatar-image.svelte';
	import AvatarFallback from './avatar-fallback.svelte';
</script>

<Story name="Default">
	<Avatar>
		<AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
		<AvatarFallback>CN</AvatarFallback>
	</Avatar>
</Story>

<Story name="Fallback">
	<Avatar>
		<AvatarImage src="invalid-url" alt="@user" />
		<AvatarFallback>JD</AvatarFallback>
	</Avatar>
</Story>

<Story name="Small">
	<Avatar size="sm">
		<AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
		<AvatarFallback>CN</AvatarFallback>
	</Avatar>
</Story>

<Story name="Large">
	<Avatar size="lg">
		<AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
		<AvatarFallback>CN</AvatarFallback>
	</Avatar>
</Story>

<Story name="Extra Large">
	<Avatar size="xl">
		<AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
		<AvatarFallback>CN</AvatarFallback>
	</Avatar>
</Story>

<Story name="All Sizes">
	<div class="flex items-end gap-4">
		<Avatar size="sm">
			<AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
			<AvatarFallback>SM</AvatarFallback>
		</Avatar>

		<Avatar size="default">
			<AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
			<AvatarFallback>DF</AvatarFallback>
		</Avatar>

		<Avatar size="lg">
			<AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
			<AvatarFallback>LG</AvatarFallback>
		</Avatar>

		<Avatar size="xl">
			<AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
			<AvatarFallback>XL</AvatarFallback>
		</Avatar>
	</div>
</Story>

<Story name="Group">
	<div class="flex -space-x-2">
		<Avatar class="border-2 border-background">
			<AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
			<AvatarFallback>CN</AvatarFallback>
		</Avatar>

		<Avatar class="border-2 border-background">
			<AvatarImage src="invalid-url" alt="@user1" />
			<AvatarFallback>U1</AvatarFallback>
		</Avatar>

		<Avatar class="border-2 border-background">
			<AvatarImage src="invalid-url" alt="@user2" />
			<AvatarFallback>U2</AvatarFallback>
		</Avatar>

		<Avatar class="border-2 border-background">
			<AvatarFallback>+3</AvatarFallback>
		</Avatar>
	</div>
</Story>
