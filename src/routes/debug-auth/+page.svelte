<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="p-8">
	<h1 class="text-2xl font-bold mb-6">Authentication Debug Info</h1>

	<div class="space-y-4">
		<div class="border p-4 rounded">
			<h2 class="font-bold mb-2">Cookies</h2>
			<p>hr_token: {data.hasHrToken ? '✅ Present' : '❌ Missing'}</p>
			<p>postgraphile-jwt-token: {data.hasPostgraphileToken ? '✅ Present' : '❌ Missing'}</p>
			{#if data.hrTokenPreview}
				<p class="text-xs mt-2 text-gray-600">Token preview: {data.hrTokenPreview}</p>
			{/if}
		</div>

		<div class="border p-4 rounded">
			<h2 class="font-bold mb-2">Locals (from hooks.server.ts)</h2>
			<p>User: {data.localsUser ? '✅ Set' : '❌ Not set'}</p>
			{#if data.localsUser}
				<pre class="text-xs mt-2 bg-gray-100 p-2 rounded">{JSON.stringify(
						data.localsUser,
						null,
						2
					)}</pre>
			{/if}
			<p class="mt-2">
				Roles: {data.localsRoles.length > 0 ? data.localsRoles.join(', ') : 'None'}
			</p>
			<p>
				Permissions: {data.localsPermissions.length > 0
					? `${data.localsPermissions.length} permissions`
					: 'None'}
			</p>
		</div>

		<div class="border p-4 rounded bg-blue-50">
			<h2 class="font-bold mb-2">Diagnosis</h2>
			{#if !data.hasHrToken && !data.hasPostgraphileToken}
				<p class="text-red-600">❌ No authentication tokens found. You need to log in.</p>
				<a href="/login" class="text-blue-600 underline mt-2 inline-block">Go to Login</a>
			{:else if !data.localsUser}
				<p class="text-orange-600">
					⚠️ Token exists but user is not set in locals. Token may be invalid or expired.
				</p>
				<p class="text-sm mt-2">Try logging out and logging back in.</p>
			{:else}
				<p class="text-green-600">✅ Authentication appears to be working correctly!</p>
				<p class="text-sm mt-2">You should be able to access protected routes.</p>
				<a href="/dashboard/documents" class="text-blue-600 underline mt-2 inline-block"
					>Try Documents Page</a
				>
			{/if}
		</div>
	</div>
</div>
