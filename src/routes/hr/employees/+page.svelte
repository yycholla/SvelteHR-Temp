<script lang="ts">
    import GenericStreamingPage from '$lib/components/streaming/GenericStreamingPage.svelte';
    import StreamingEmployeesList from '$lib/components/employees/StreamingEmployeesList.svelte';
    import StatCard from '$lib/components/common/StatCard.svelte';
    import StreamingCard from '$lib/components/common/StreamingCard.svelte';
    import EmployeeList from '$lib/components/common/EmployeeList.svelte';
    import DepartmentChart from '$lib/components/common/DepartmentChart.svelte';
    import { Users, Building, CheckCircle, Clock, Briefcase } from 'lucide-svelte';
    import { transformEmployeeStats, transformDepartmentData, hasData } from '$lib/utils/dataTransformers.js';
    import type { PageData } from './$types';

    // Page data from server as fallback
    let { data }: { data: PageData } = $props();

    // Transform server data to fallback format
    const fallbackData = {
        'employees-list': {
            employees: data.employees || [],
            total: data.pagination?.totalCount || 0
        },
        departments: data.departments || [],
        roles: [],
        'employee-stats': { total: data.pagination?.totalCount || 0 }
    };
</script>

<svelte:head>
	<title>HR - Employee Management - SvelteHR</title>
</svelte:head>

<GenericStreamingPage 
    configKey="employees" 
    title="Employee Management"
    fallbackData={fallbackData}
>
    <div slot="streaming" let:data={streamingData}>
        {#key streamingData}
            {@const employeesObj = ({
                data: streamingData['employees-list']?.employees ?? [],
                total: streamingData['employees-list']?.total ?? 0
            })}
            {@const empStats = transformEmployeeStats(employeesObj)}
            {@const departmentsData = transformDepartmentData(employeesObj)}
            <div class="hr-employees-content">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Total Employees"
                        value={empStats.totalEmployees}
                        icon={Users}
                        tag="#hr"
                        href="/hr/employees"
                        loading={!hasData(streamingData['employees-list'])}
                    />
                    <StatCard
                        title="Departments"
                        value={Array.isArray(streamingData['departments']) ? streamingData['departments'].length : 0}
                        icon={Building}
                        tag="#hr"
                        href="/hr/employees"
                        loading={!hasData(streamingData['departments'])}
                    />
                    <StatCard
                        title="Roles"
                        value={Array.isArray(streamingData['roles']) ? streamingData['roles'].length : 0}
                        icon={CheckCircle}
                        tag="#hr"
                        href="/hr/employees"
                        loading={!hasData(streamingData['roles'])}
                    />
                    <StatCard
                        title="Active"
                        value={empStats.activeEmployees}
                        icon={Clock}
                        tag="#hr"
                        href="/hr/employees"
                        loading={!hasData(streamingData['employees-list'])}
                    />
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <StreamingCard
                        title="Onboarding Employees"
                        description="New hires currently onboarding"
                        icon={Users}
                        tag="#hr"
                        href="/hr/onboarding"
                        loading={!hasData(streamingData['employees-list'])}
                        empty={empStats.onboardingEmployees === 0}
                        emptyMessage="No employees currently onboarding"
                    >
                        {#snippet children()}
                            <EmployeeList 
                                employees={employeesObj.data.filter((e: any) => e.status === 'Onboarding')}
                                showCount={5}
                                showDepartment={true}
                            />
                        {/snippet}
                    </StreamingCard>

                    <StreamingCard
                        title="Department Distribution"
                        description="Employee allocation across departments"
                        icon={Briefcase}
                        tag="#hr"
                        href="/hr/reports"
                        loading={!hasData(streamingData['employees-list'])}
                        empty={departmentsData.length === 0}
                        emptyMessage="No department data"
                        class="lg:col-span-2"
                    >
                        {#snippet children()}
                            <DepartmentChart 
                                departments={departmentsData}
                                showPercentage={true}
                                showProgress={true}
                            />
                        {/snippet}
                    </StreamingCard>
                </div>

                <StreamingCard
                    title="All Employees"
                    description="Complete list with filters and search"
                    icon={Users}
                    tag="#hr"
                    loading={!hasData(streamingData['employees-list'])}
                    empty={employeesObj.total === 0}
                    emptyMessage="No employees found"
                >
                    {#snippet children()}
                        <StreamingEmployeesList data={streamingData} />
                    {/snippet}
                </StreamingCard>
            </div>
        {/key}
    </div>

    <div slot="static" let:data={fallbackData}>
        {#key fallbackData}
            {@const employeesObj = ({
                data: fallbackData['employees-list']?.employees ?? [],
                total: fallbackData['employees-list']?.total ?? 0
            })}
            {@const empStats = transformEmployeeStats(employeesObj)}
            {@const departmentsData = transformDepartmentData(employeesObj)}
            <div class="static-content">
                <div class="text-center py-8">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <StatCard title="Total Employees" value={empStats.totalEmployees} icon={Users} tag="#hr" loading={false} />
                        <StatCard title="Departments" value={fallbackData.departments?.length || 0} icon={Building} tag="#hr" loading={false} />
                        <StatCard title="Roles" value={Array.isArray(fallbackData.roles) ? fallbackData.roles.length : 0} icon={CheckCircle} tag="#hr" loading={false} />
                        <StatCard title="Active" value={empStats.activeEmployees} icon={Clock} tag="#hr" loading={false} />
                    </div>
                    <div class="mt-6">
                        <StreamingCard title="All Employees" description="Cached employee list" icon={Users} tag="#hr" loading={false} empty={employeesObj.total === 0} emptyMessage="No employees">
                            {#snippet children()}
                                <StreamingEmployeesList data={fallbackData} />
                            {/snippet}
                        </StreamingCard>
                    </div>
                </div>
            </div>
        {/key}
    </div>

    <div slot="fallback">
        <div class="fallback-content text-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Loading Employee Data</h3>
            <p class="text-gray-500">Please wait while we fetch your employee information...</p>
        </div>
    </div>
</GenericStreamingPage>

<style>
	.hr-employees-content {
		max-width: 1400px;
		margin: 0 auto;
	}

    /* Removed bespoke stat card styles in favor of modular components */

	.static-content {
		text-align: center;
		padding: 2rem;
	}

    /* Removed unused legacy stat-grid styles */

	.fallback-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 300px;
	}
</style>