<script lang="ts">
	import { LogOut, Moon, Settings, Sun, User } from '@lucide/svelte';

	interface Props {
		user: any;
		isCollapsed: boolean;
		currentMode: 'light' | 'dark' | undefined;
		onLogout: () => void;
		onToggleMode: () => void;
	}

	const { user, isCollapsed, currentMode, onLogout, onToggleMode }: Props = $props();
</script>

<div class="{isCollapsed ? 'px-2' : 'px-3'} py-3">
	<div class="flex items-center {isCollapsed ? 'justify-center' : 'justify-between'}">
		<!-- Profile Link (left side) -->
		<a
			href="/dashboard/profile"
			class="flex items-center gap-2 rounded-md {isCollapsed
				? 'p-2'
				: 'pr-2'} transition-colors hover:bg-sidebar-accent/50 flex-1 min-w-0 {isCollapsed
				? 'justify-center'
				: ''}"
			title={isCollapsed ? 'My Profile' : ''}
			data-testid="nav-profile"
		>
			<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
				<User class="h-4 w-4" />
			</div>
			{#if !isCollapsed}
				<div class="min-w-0 flex-1">
					<p class="truncate text-xs font-medium">
						{user.firstName || user.displayName || 'User'}
					</p>
					<p class="truncate text-xs text-sidebar-foreground/60">
						{user.email?.split('@')[0] || 'user'}
					</p>
				</div>
			{/if}
		</a>

		<!-- Theme Toggle and Settings (right side) -->
		{#if !isCollapsed}
			<div class="flex items-center space-x-0.5 flex-none">
				<!-- Logout Button -->
				<button
					onclick={onLogout}
					class="flex items-center justify-center rounded-md p-1 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
					title="Logout"
				>
					<LogOut class="h-4 w-4" />
				</button>

				<!-- Dark Mode Toggle -->
				<button
					onclick={onToggleMode}
					class="flex items-center justify-center rounded-md p-1 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
					title="Toggle theme"
				>
					{#if currentMode === 'dark'}
						<Sun class="h-4 w-4" />
					{:else}
						<Moon class="h-4 w-4" />
					{/if}
				</button>

				<!-- Settings Icon -->
				<a
					href="/dashboard/profile/settings"
					class="flex items-center justify-center rounded-md p-1 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
					title="Settings"
					data-testid="nav-settings"
				>
					<Settings class="h-4 w-4" />
				</a>
			</div>
		{/if}
	</div>
</div>
