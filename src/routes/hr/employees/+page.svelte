<script lang="ts">
    import StatCard from '$lib/components/common/StatCard.svelte';
    import EmployeeList from '$lib/components/common/EmployeeList.svelte';
    import DepartmentChart from '$lib/components/common/DepartmentChart.svelte';
    import EmployeeModal from '$lib/components/hr/modals/EmployeeModal.svelte';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Users, Building, CheckCircle, Clock, Briefcase, Plus, Search, Filter } from 'lucide-svelte';
    import { transformEmployeeStats, transformDepartmentData } from '$lib/utils/dataTransformers.js';
    import { modalStore } from '$lib/stores/hr/modals';
    import type { PageData } from './$types';
    import type { Employee } from '$lib/schemas/employee';

    let { data }: { data: PageData } = $props();

    // Transform server data
    const employeesData = {
        data: data.employees || [],
        total: data.pagination?.totalCount || 0
    };
    
    
    const empStats = transformEmployeeStats(employeesData);
    const departmentsData = transformDepartmentData(employeesData);


    // Modal state
    let showEmployeeModal = $state(false);
    let modalMode = $state<'create' | 'edit' | 'view'>('create');
    let selectedEmployee = $state<Employee | null>(null);

    // Search and filter state
    let searchTerm = $state('');
    let departmentFilter = $state('');
    let statusFilter = $state('');


    // Filtering function
    function filterEmployees(employees: any[], search: string, deptFilter: string, statusFilter: string) {
        return employees.filter(emp => {
            // Search filter
            if (search) {
                const searchLower = search.toLowerCase();
                const matchesSearch = 
                    emp.firstName?.toLowerCase().includes(searchLower) ||
                    emp.lastName?.toLowerCase().includes(searchLower) ||
                    emp.email?.toLowerCase().includes(searchLower) ||
                    emp.jobTitle?.toLowerCase().includes(searchLower) ||
                    emp.username?.toLowerCase().includes(searchLower);
                
                if (!matchesSearch) return false;
            }
            
            // Department filter
            if (deptFilter && deptFilter !== '') {
                const empDeptName = emp.department?.name || '';
                if (empDeptName !== deptFilter) return false;
            }
            
            // Status filter
            if (statusFilter && statusFilter !== '') {
                if (emp.status !== statusFilter) return false;
            }
            
            return true;
        });
    }

    // Apply filtering with $derived for reactivity
    const filteredEmployees = $derived(
        filterEmployees(employeesData.data || [], searchTerm, departmentFilter, statusFilter)
    );

    // Subscribe to modal store
    $effect(() => {
        const unsubscribe = modalStore.subscribe((state) => {
            if (state.type === 'employee') {
                showEmployeeModal = state.isOpen;
                modalMode = state.mode;
                selectedEmployee = state.data;
            }
        });
        return unsubscribe;
    });

    function handleAddEmployee() {
        modalStore.open('employee', null, 'create');
    }

    function handleEmployeeSuccess(employee: Employee) {
        // Refresh the page or update local data
        window.location.reload();
    }

    function handleViewEmployee(employee: Employee) {
        modalStore.open('employee', employee, 'view');
    }

    function handleEditEmployee(employee: Employee) {
        modalStore.open('employee', employee, 'edit');
    }

    async function handleDeleteEmployee(employee: Employee) {
        if (confirm(`Are you sure you want to delete ${employee.firstName} ${employee.lastName}? This action cannot be undone.`)) {
            try {
                const response = await fetch(`/api/v1/employees/${employee.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    // Refresh the page to show updated data
                    window.location.reload();
                } else {
                    const error = await response.text();
                    alert(`Failed to delete employee: ${error}`);
                }
            } catch (error) {
                console.error('Delete error:', error);
                alert('Failed to delete employee. Please try again.');
            }
        }
    }
</script>

<svelte:head>
	<title>HR - Employee Management - SvelteHR</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
    <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Employee Management</h1>
        <p class="text-gray-600 dark:text-gray-400">Manage your workforce and track employee information</p>
    </div>

    <div class="hr-employees-content">
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
                title="Total Employees" 
                value={empStats.totalEmployees} 
                icon={Users} 
                tag="#hr" 
                loading={false} 
            />
            <StatCard 
                title="Departments" 
                value={data.departments?.length || 0} 
                icon={Building} 
                tag="#hr" 
                loading={false} 
            />
            <StatCard 
                title="Active" 
                value={empStats.activeEmployees} 
                icon={CheckCircle} 
                tag="#hr" 
                loading={false} 
            />
            <StatCard 
                title="Onboarding" 
                value={empStats.onboardingEmployees} 
                icon={Clock} 
                tag="#hr" 
                loading={false} 
            />
        </div>

        <!-- Department Distribution -->
        {#if departmentsData.length > 0}
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow mb-8 p-6">
                <div class="flex items-center gap-2 mb-4">
                    <Briefcase class="w-5 h-5 text-blue-600" />
                    <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Department Distribution</h2>
                </div>
                <DepartmentChart 
                    departments={departmentsData}
                    showPercentage={true}
                    showProgress={true}
                />
            </div>
        {/if}

        <!-- Employees List -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-2">
                    <Users class="w-5 h-5 text-blue-600" />
                    <h2 class="text-xl font-semibold text-gray-900 dark:text-white">All Employees</h2>
                </div>
                <Button
                    onclick={handleAddEmployee}
                    class="flex items-center gap-2"
                >
                    <Plus class="w-4 h-4" />
                    Add Employee
                </Button>
            </div>

            <!-- Search and Filters -->
            <div class="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <!-- Search Input -->
                <div class="flex-1 min-w-0">
                    <div class="relative">
                        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search employees by name, email, or job title..."
                            bind:value={searchTerm}
                            class="pl-10"
                        />
                    </div>
                </div>

                <!-- Department Filter -->
                <div class="sm:w-48">
                    <select
                        bind:value={departmentFilter}
                        class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">All Departments</option>
                        {#each data.departments || [] as department}
                            <option value={department.name}>{department.name}</option>
                        {/each}
                    </select>
                </div>

                <!-- Status Filter -->
                <div class="sm:w-40">
                    <select
                        bind:value={statusFilter}
                        class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">All Status</option>
                        <option value="Active">Active</option>
                        <option value="PreHire">Pre-Hire</option>
                        <option value="Onboarding">Onboarding</option>
                        <option value="Terminated">Terminated</option>
                    </select>
                </div>

                <!-- Clear Filters Button -->
                {#if searchTerm || departmentFilter || statusFilter}
                    <Button
                        variant="outline"
                        onclick={() => {
                            searchTerm = '';
                            departmentFilter = '';
                            statusFilter = '';
                        }}
                        class="shrink-0"
                    >
                        Clear
                    </Button>
                {/if}
            </div>

            <!-- Results Count -->
            <div class="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredEmployees.length} of {employeesData.total} employees
            </div>
            {#if filteredEmployees.length === 0}
                <div class="text-center py-8">
                    <Users class="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p class="text-gray-500">
                        {#if searchTerm || departmentFilter || statusFilter}
                            No employees match your search criteria
                        {:else}
                            No employees found
                        {/if}
                    </p>
                </div>
            {:else}
                <EmployeeList 
                    employees={filteredEmployees}
                    showCount={50}
                    showDepartment={true}
                    showActions={true}
                    onView={handleViewEmployee}
                    onEdit={handleEditEmployee}
                    onDelete={handleDeleteEmployee}
                />
            {/if}
        </div>
    </div>
</div>

<!-- Employee Modal -->
<EmployeeModal
    bind:open={showEmployeeModal}
    employee={selectedEmployee}
    mode={modalMode}
    availableRoles={data.roles || []}
    availableDepartments={data.departments || []}
    onSuccess={handleEmployeeSuccess}
/>

<style>
	.hr-employees-content {
		max-width: 1400px;
		margin: 0 auto;
	}
</style>