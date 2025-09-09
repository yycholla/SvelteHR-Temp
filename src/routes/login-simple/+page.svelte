<script lang="ts">
	import {
		Card,
		CardHeader,
		CardContent,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { InputGroup } from '$lib/components/ui/input';
	import { User, Lock } from 'lucide-svelte';

	let username = '';
	let password = '';
	let isLoading = false;

	function handleSubmit() {
		isLoading = true;
		console.log('Login attempt:', { username, password });

		// Simulate login
		setTimeout(() => {
			isLoading = false;
			alert('Login simulation complete');
		}, 1000);
	}
</script>

<svelte:head>
	<title>Simple Login - SvelteHR</title>
</svelte:head>

<div
	class="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4"
>
	<div class="w-full max-w-md">
		<div class="mb-8 text-center">
			<h1 class="text-3xl font-bold text-gray-900">Simple Login Test</h1>
			<p class="mt-2 text-gray-600">Testing components without tRPC/Superforms</p>
		</div>

		<Card class="shadow-xl">
			<CardHeader class="space-y-1 pb-6">
				<CardTitle class="text-center text-2xl">Sign In</CardTitle>
				<CardDescription class="text-center">
					Enter your credentials to test the form
				</CardDescription>
			</CardHeader>

			<CardContent class="space-y-6">
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleSubmit(e);
					}}
					class="space-y-4"
				>
					<div class="space-y-2">
						<InputGroup
							label="Username"
							type="text"
							placeholder="Enter your username"
							prefixIcon={User}
							bind:value={username}
							disabled={isLoading}
						/>
					</div>

					<div class="space-y-2">
						<InputGroup
							label="Password"
							type="password"
							placeholder="Enter your password"
							prefixIcon={Lock}
							bind:value={password}
							disabled={isLoading}
						/>
					</div>

					<Button type="submit" variant="default" size="lg" class="w-full" disabled={isLoading}>
						{#if isLoading}
							Signing in...
						{:else}
							Sign In
						{/if}
					</Button>
				</form>
			</CardContent>
		</Card>

		<div class="mt-6 text-center">
			<p class="text-sm text-gray-600">This is a simplified login page for testing components</p>
		</div>
	</div>
</div>
