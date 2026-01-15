<script lang="ts">
	import { Building, Calendar, Edit, Eye, FileBarChart, Mail, Phone, Users } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Card from '$lib/components/ui/card';

	interface Props {
		employees: any[];
		departments: any[];
		canViewEmployees: boolean;
		canEditEmployees: boolean;
		canCreateReviews: boolean;
		getStatusBadgeVariant: (isActive: boolean) => 'default' | 'secondary' | 'destructive';
		formatRole: (role: string) => string;
		formatHireDate: (dateString: string) => string;
		// Pagination props
		totalPages: number;
		currentPage: number;
		pageSize: number;
		totalEmployees: number;
		hasPreviousPage: boolean;
		hasNextPage: boolean;
		onPageChange: (page: number) => void;
	}

	const {
		employees,
		departments,
		canViewEmployees,
		canEditEmployees,
		canCreateReviews,
		getStatusBadgeVariant,
		formatRole,
		formatHireDate,
		totalPages,
		currentPage,
		pageSize,
		totalEmployees,
		hasPreviousPage,
		hasNextPage,
		onPageChange
	}: Props = $props();
</script>

<div class="space-y-6" data-testid="employee-list-container">
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each employees as employee}
			<Card.Root class="transition-shadow hover:shadow-md" data-testid="employee-card">
				<Card.Header class="pb-3">
					<div class="flex items-start justify-between">
						<div class="flex items-center space-x-3">
							<div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
								<Users class="h-6 w-6 text-primary" />
							</div>
							<div>
								<Card.Title class="text-lg">{employee.displayName}</Card.Title>
								<Card.Description
									>{employee.role ? formatRole(employee.role) : 'No role'}</Card.Description
								>
							</div>
						</div>
						<Badge variant={getStatusBadgeVariant(employee.isActive)}>
							{employee.isActive ? 'Active' : 'Inactive'}
						</Badge>
					</div>
				</Card.Header>
				<Card.Content class="space-y-3">
					<!-- Contact Information -->
					<div class="space-y-2">
						{#if employee.email}
							<div class="flex items-center text-sm text-muted-foreground">
								<Mail class="mr-2 h-4 w-4" />
								<a href="mailto:{employee.email}" class="hover:text-primary">{employee.email}</a>
							</div>
						{/if}

						{#if employee.phone}
							<div class="flex items-center text-sm text-muted-foreground">
								<Phone class="mr-2 h-4 w-4" />
								<a href="tel:{employee.phone}" class="hover:text-primary">{employee.phone}</a>
							</div>
						{/if}

						{#if employee.departmentId}
							{@const deptName = departments.find((d) => d.id === employee.departmentId)?.name}
							<div class="flex items-center text-sm text-muted-foreground">
								<Building class="mr-2 h-4 w-4" />
								<span>{deptName || 'Unknown Department'}</span>
							</div>
						{/if}

						{#if employee.role}
							<div class="flex items-center text-sm">
								<Badge variant="outline">{formatRole(employee.role)}</Badge>
							</div>
						{/if}

						{#if employee.hireDate}
							<div class="flex items-center text-sm text-muted-foreground">
								<Calendar class="mr-2 h-4 w-4" />
								<span>Hired {formatHireDate(employee.hireDate)}</span>
							</div>
						{/if}
					</div>

					<Separator />

					<!-- Actions -->
					<div class="flex gap-2">
						{#if canViewEmployees}
							<Button variant="outline" size="sm" href="/dashboard/employees/{employee.id}">
								<Eye class="mr-2 h-4 w-4" />
								View Profile
							</Button>
						{/if}
						{#if canEditEmployees}
							<Button variant="outline" size="sm" href="/dashboard/employees/{employee.id}/edit">
								<Edit class="mr-2 h-4 w-4" />
								Edit
							</Button>
						{/if}
						{#if canCreateReviews}
							<Button variant="outline" size="sm" href="/dashboard/reviews?employee={employee.id}">
								<FileBarChart class="mr-2 h-4 w-4" />
								Start Review
							</Button>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<!-- Pagination for grid view -->
	{#if totalPages > 1}
		<Card.Root data-testid="employee-pagination">
			<Card.Content class="py-4">
				<div class="flex items-center justify-between">
					<div class="text-sm text-muted-foreground">
						Showing {(currentPage - 1) * pageSize + 1} to {Math.min(
							currentPage * pageSize,
							totalEmployees
						)} of {totalEmployees} employees
					</div>
					<div class="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={!hasPreviousPage}
							onclick={() => onPageChange(currentPage - 1)}
						>
							Previous
						</Button>

						{#if totalPages <= 7}
							{#each Array(totalPages) as _, i (i)}
								<Button
									variant={currentPage === i + 1 ? 'default' : 'outline'}
									size="sm"
									onclick={() => onPageChange(i + 1)}
								>
									{i + 1}
								</Button>
							{/each}
						{:else}
							<!-- Complex pagination with ellipsis -->
							<Button
								variant={currentPage === 1 ? 'default' : 'outline'}
								size="sm"
								onclick={() => onPageChange(1)}
							>
								1
							</Button>

							{#if currentPage > 3}
								<span class="px-2 text-muted-foreground">...</span>
							{/if}

							{#each Array(Math.min(5, totalPages - 2)) as _, i}
								{@const pageNum = Math.max(2, Math.min(currentPage - 2 + i, totalPages - 1))}
								{#if pageNum >= 2 && pageNum <= totalPages - 1}
									<Button
										variant={currentPage === pageNum ? 'default' : 'outline'}
										size="sm"
										onclick={() => onPageChange(pageNum)}
									>
										{pageNum}
									</Button>
								{/if}
							{/each}

							{#if currentPage < totalPages - 2}
								<span class="px-2 text-muted-foreground">...</span>
							{/if}

							<Button
								variant={currentPage === totalPages ? 'default' : 'outline'}
								size="sm"
								onclick={() => onPageChange(totalPages)}
							>
								{totalPages}
							</Button>
						{/if}

						<Button
							variant="outline"
							size="sm"
							disabled={!hasNextPage}
							onclick={() => onPageChange(currentPage + 1)}
						>
							Next
						</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
