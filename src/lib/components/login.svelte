<script lang="ts">
	import { Card, CardHeader, CardContent, CardTitle } from '$lib/components/ui/card';
	import Input from './ui/input/input.svelte';
	import Label from './ui/label/label.svelte';
	let email = 'email';
	let password = 'password';
</script>

<Card variant="default">
	<CardHeader>
		<CardTitle>Log In</CardTitle>
	</CardHeader>
	<CardContent>
		<div>
			<Label for="email">E-mail</Label>
			<Input type="email" placeholder="Enter email" bind:value={email} />

			<Label for="password">Password</Label>
			<Input type="password" placeholder="Enter password" bind:value={password} />
		</div>
	</CardContent>
</Card>
