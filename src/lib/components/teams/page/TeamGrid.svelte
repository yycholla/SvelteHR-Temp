<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import {
		BarChart3,
		Building,
		Building2,
		Crown,
		Edit,
		Eye,
		TreePine,
		UserCheck,
		Users
	} from '@lucide/svelte';
	import { categorizeTeamSize } from '$lib/graphql/team-management/utils';

	interface Props {
		teams: any[];
		canViewEmployees: boolean;
		canManageTeams: boolean;
	}

	let { teams, canViewEmployees, canManageTeams }: Props = $props();

	function formatEmployeeCount(count: number): string {
		if (count === 0) return 'No employees';
		if (count === 1) return '1 employee';
		return `${count} employees`;
	}
</script>

<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
	{#each teams as team}
		{@const sizeInfo = categorizeTeamSize(team.employees?.totalCount || 0)}
		<Card.Root class="transition-shadow hover:shadow-md">
			<Card.Header class="pb-3">
				<div class="flex items-start justify-between">
					<div class="flex items-center space-x-3">
						<div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
							<Building2 class="h-6 w-6 text-primary" />
						</div>
						<div>
							<Card.Title class="text-lg">{team.name}</Card.Title>
							<Card.Description>{team.description || 'No description'}</Card.Description>
						</div>
					</div>
					{#if team.departmentHead}
						<Badge variant="default">
							<Crown class="mr-1 h-3 w-3" />
							Has Head
						</Badge>
					{:else}
						<Badge variant="outline">
							<UserCheck class="mr-1 h-3 w-3" />
							No Head
						</Badge>
					{/if}
				</div>
			</Card.Header>
			<Card.Content class="space-y-3">
				<!-- Team Information -->
				<div class="space-y-2">
					{#if team.departmentHead}
						<div class="flex items-center text-sm">
							<UserCheck class="mr-2 h-4 w-4 text-green-600" />
							<span class="font-medium">{team.departmentHead.displayName}</span>
							<span class="ml-1 text-muted-foreground"
								>({team.departmentHead.jobTitle || 'Head'})</span
							>
						</div>
					{/if}

					{#if team.parentDepartment}
						<div class="flex items-center text-sm text-muted-foreground">
							<Building class="mr-2 h-4 w-4" />
							<span>Parent: {team.parentDepartment.name}</span>
						</div>
					{/if}

					<div class="flex items-center text-sm text-muted-foreground">
						<Users class="mr-2 h-4 w-4" />
						<span>{formatEmployeeCount(team.employees?.totalCount || 0)}</span>
					</div>

					{#if team.subDepartments?.totalCount > 0}
						<div class="flex items-center text-sm text-muted-foreground">
							<TreePine class="mr-2 h-4 w-4" />
							<span>{team.subDepartments.totalCount} sub-teams</span>
						</div>
					{/if}

					<!-- Team Size Badge -->
					<div class="flex items-center text-sm">
						<Badge
							variant="outline"
							class="bg-{sizeInfo.color}-50 border-{sizeInfo.color}-200 text-{sizeInfo.color}-800"
						>
							<BarChart3 class="mr-1 h-3 w-3" />
							{sizeInfo.label}
						</Badge>
					</div>
				</div>

				<Separator />

				<!-- Actions -->
				<div class="flex gap-2">
					{#if canViewEmployees}
						<Button variant="outline" size="sm" href="/dashboard/teams/{team.id}">
							<Eye class="mr-2 h-4 w-4" />
							View Details
						</Button>
					{/if}
					{#if canManageTeams}
						<Button variant="outline" size="sm" href="/dashboard/teams/{team.id}/edit">
							<Edit class="mr-2 h-4 w-4" />
							Edit
						</Button>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	{/each}
</div>
