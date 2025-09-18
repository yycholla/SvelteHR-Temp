<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import CarbonDataTable, { type CarbonColumn } from '$lib/components/tables/CarbonDataTable.svelte';
  import {
    Button,
    Modal,
    InlineNotification,
    Breadcrumb,
    BreadcrumbItem,
    ContentSwitcher,
    Switch,
    Grid,
    Row,
    Column
  } from 'carbon-components-svelte';
  import { Add, Edit, TrashCan, UserProfile, Email, Calendar } from 'carbon-icons-svelte';

  // Sample user data - in a real app, this would come from GraphQL
  let users = [
    {
      id: '1',
      email: 'admin@mountainhr.com',
      display_name: 'System Administrator',
      role: 'admin',
      role_level: 100,
      is_active: true,
      last_login: '2024-01-15T10:30:00Z',
      created_at: '2023-06-01T09:00:00Z',
      department: 'IT',
      status: 'active'
    },
    {
      id: '2',
      email: 'hr.manager@mountainhr.com',
      display_name: 'HR Manager',
      role: 'hr_admin',
      role_level: 80,
      is_active: true,
      last_login: '2024-01-14T15:45:00Z',
      created_at: '2023-07-15T10:30:00Z',
      department: 'Human Resources',
      status: 'active'
    },
    {
      id: '3',
      email: 'john.doe@mountainhr.com',
      display_name: 'John Doe',
      role: 'manager',
      role_level: 60,
      is_active: true,
      last_login: '2024-01-13T08:20:00Z',
      created_at: '2023-08-01T11:00:00Z',
      department: 'Engineering',
      status: 'active'
    },
    {
      id: '4',
      email: 'jane.smith@mountainhr.com',
      display_name: 'Jane Smith',
      role: 'employee',
      role_level: 20,
      is_active: false,
      last_login: '2023-12-20T16:30:00Z',
      created_at: '2023-09-10T14:20:00Z',
      department: 'Marketing',
      status: 'inactive'
    },
    {
      id: '5',
      email: 'mike.johnson@mountainhr.com',
      display_name: 'Mike Johnson',
      role: 'employee',
      role_level: 20,
      is_active: true,
      last_login: '2024-01-12T12:15:00Z',
      created_at: '2023-10-05T13:45:00Z',
      department: 'Sales',
      status: 'active'
    }
  ];

  // Data table configuration
  const columns: CarbonColumn[] = [
    {
      key: 'display_name',
      label: 'Name',
      sortable: true,
      filterable: true,
      type: 'text'
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      filterable: true,
      type: 'text'
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      filterable: true,
      type: 'tag',
      tagVariant: (value) => {
        switch (value) {
          case 'admin': return 'red';
          case 'hr_admin': return 'purple';
          case 'manager': return 'blue';
          case 'employee': return 'green';
          default: return 'gray';
        }
      },
      format: (value) => {
        switch (value) {
          case 'admin': return 'Administrator';
          case 'hr_admin': return 'HR Admin';
          case 'manager': return 'Manager';
          case 'employee': return 'Employee';
          default: return value;
        }
      }
    },
    {
      key: 'department',
      label: 'Department',
      sortable: true,
      filterable: true,
      type: 'text'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      filterable: true,
      type: 'tag',
      tagVariant: (value) => value === 'active' ? 'green' : 'red',
      format: (value) => value === 'active' ? 'Active' : 'Inactive'
    },
    {
      key: 'last_login',
      label: 'Last Login',
      sortable: true,
      type: 'date',
      format: (value) => value ? new Date(value).toLocaleDateString() : 'Never'
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      type: 'date',
      format: (value) => new Date(value).toLocaleDateString()
    }
  ];

  // Table configuration
  let selectedUsers: any[] = [];
  let loading = false;
  let showUserModal = false;
  let editingUser: any = null;
  let notification: { kind: 'success' | 'error' | 'warning' | 'info'; title: string; subtitle: string } | null = null;

  // View state
  let currentView = 'all';

  // Filtered users based on current view
  $: filteredUsers = users.filter(user => {
    switch (currentView) {
      case 'active':
        return user.is_active;
      case 'inactive':
        return !user.is_active;
      case 'admins':
        return user.role === 'admin' || user.role === 'hr_admin';
      default:
        return true;
    }
  });

  // Batch actions configuration
  const batchActions = [
    { key: 'activate', label: 'Activate Users' },
    { key: 'deactivate', label: 'Deactivate Users' },
    { key: 'delete', label: 'Delete Users' }
  ];

  // Toolbar actions configuration
  const toolbarActions = [
    { key: 'add', label: 'Add User', icon: Add },
    { key: 'export', label: 'Export Users' }
  ];

  // Event handlers
  function handleRowClick(event: CustomEvent) {
    const { row } = event.detail;
    editingUser = row;
    showUserModal = true;
  }

  function handleSelectionChange(event: CustomEvent) {
    selectedUsers = event.detail.selectedRows || [];
  }

  function handleBatchAction(event: CustomEvent) {
    const { action, selectedRows } = event.detail;

    switch (action) {
      case 'activate':
        selectedRows.forEach((user: any) => {
          const index = users.findIndex(u => u.id === user.id);
          if (index !== -1) {
            users[index].is_active = true;
            users[index].status = 'active';
          }
        });
        showNotification('success', 'Users Activated', `${selectedRows.length} user(s) have been activated.`);
        break;

      case 'deactivate':
        selectedRows.forEach((user: any) => {
          const index = users.findIndex(u => u.id === user.id);
          if (index !== -1) {
            users[index].is_active = false;
            users[index].status = 'inactive';
          }
        });
        showNotification('success', 'Users Deactivated', `${selectedRows.length} user(s) have been deactivated.`);
        break;

      case 'delete':
        users = users.filter(user => !selectedRows.some((selected: any) => selected.id === user.id));
        showNotification('success', 'Users Deleted', `${selectedRows.length} user(s) have been deleted.`);
        break;
    }

    selectedUsers = [];
  }

  function handleToolbarAction(event: CustomEvent) {
    const { action } = event.detail;

    switch (action) {
      case 'add':
        editingUser = null;
        showUserModal = true;
        break;

      case 'export':
        // Export functionality
        const csvContent = generateCSV(filteredUsers);
        downloadCSV(csvContent, 'users.csv');
        showNotification('success', 'Export Complete', 'User data has been exported successfully.');
        break;
    }
  }

  function handleExport(event: CustomEvent) {
    const { data } = event.detail;
    const csvContent = generateCSV(data);
    downloadCSV(csvContent, 'users.csv');
  }

  function generateCSV(data: any[]): string {
    const headers = columns.map(col => col.label).join(',');
    const rows = data.map(user =>
      columns.map(col => {
        let value = user[col.key];
        if (col.format) {
          value = col.format(value, user);
        }
        return `"${value?.toString().replace(/"/g, '""') || ''}"`;
      }).join(',')
    ).join('\n');

    return `${headers}\n${rows}`;
  }

  function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function showNotification(kind: 'success' | 'error' | 'warning' | 'info', title: string, subtitle: string) {
    notification = { kind, title, subtitle };
    setTimeout(() => {
      notification = null;
    }, 5000);
  }

  function closeUserModal() {
    showUserModal = false;
    editingUser = null;
  }

  // Mock save function
  function saveUser() {
    if (editingUser && editingUser.id) {
      // Update existing user
      const index = users.findIndex(u => u.id === editingUser.id);
      if (index !== -1) {
        users[index] = { ...editingUser };
      }
      showNotification('success', 'User Updated', 'User information has been updated successfully.');
    } else {
      // Add new user
      const newUser = {
        ...editingUser,
        id: (users.length + 1).toString(),
        created_at: new Date().toISOString(),
        last_login: null,
        status: editingUser.is_active ? 'active' : 'inactive'
      };
      users = [...users, newUser];
      showNotification('success', 'User Created', 'New user has been created successfully.');
    }

    closeUserModal();
  }
</script>

<svelte:head>
  <title>User Management - Admin Panel</title>
  <meta name="description" content="Manage user accounts, roles, and permissions" />
</svelte:head>

<div class="user-management-page">
  <!-- Breadcrumb Navigation -->
  <Breadcrumb noTrailingSlash>
    <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
    <BreadcrumbItem href="/admin/users" isCurrentPage>User Management</BreadcrumbItem>
  </Breadcrumb>

  <!-- Page Header -->
  <div class="page-header">
    <div class="header-content">
      <div class="header-text">
        <h1 class="page-title">User Management</h1>
        <p class="page-description">Manage user accounts, roles, and permissions for your organization.</p>
      </div>
      <div class="header-actions">
        <Button kind="primary" icon={Add} on:click={() => handleToolbarAction({ detail: { action: 'add' } })}>
          Add User
        </Button>
      </div>
    </div>
  </div>

  <!-- Notifications -->
  {#if notification}
    <InlineNotification
      kind={notification.kind}
      title={notification.title}
      subtitle={notification.subtitle}
      timeout={5000}
      on:close={() => notification = null}
    />
  {/if}

  <!-- View Switcher -->
  <div class="view-controls">
    <ContentSwitcher selectedIndex={currentView === 'all' ? 0 : currentView === 'active' ? 1 : currentView === 'inactive' ? 2 : 3}>
      <Switch value="all" on:click={() => currentView = 'all'}>All Users ({users.length})</Switch>
      <Switch value="active" on:click={() => currentView = 'active'}>Active ({users.filter(u => u.is_active).length})</Switch>
      <Switch value="inactive" on:click={() => currentView = 'inactive'}>Inactive ({users.filter(u => !u.is_active).length})</Switch>
      <Switch value="admins" on:click={() => currentView = 'admins'}>Admins ({users.filter(u => u.role === 'admin' || u.role === 'hr_admin').length})</Switch>
    </ContentSwitcher>
  </div>

  <!-- Data Table -->
  <div class="table-container">
    <CarbonDataTable
      data={filteredUsers}
      {columns}
      {loading}
      selectable={true}
      searchable={true}
      filterable={true}
      paginated={true}
      pageSize={10}
      pageSizes={[10, 25, 50, 100]}
      title="Users"
      description="Manage user accounts and their information"
      {batchActions}
      {toolbarActions}
      exportable={true}
      bind:selectedRowIds={selectedUsers}
      on:rowClick={handleRowClick}
      on:selectionChange={handleSelectionChange}
      on:batchAction={handleBatchAction}
      on:toolbarAction={handleToolbarAction}
      on:export={handleExport}
    />
  </div>
</div>

<!-- User Modal -->
<Modal
  bind:open={showUserModal}
  modalHeading={editingUser?.id ? "Edit User" : "Add New User"}
  primaryButtonText="Save"
  secondaryButtonText="Cancel"
  on:click:button--secondary={closeUserModal}
  on:click:button--primary={saveUser}
  on:close={closeUserModal}
>
  {#if editingUser}
    <Grid>
      <Row>
        <Column>
          <div class="modal-form">
            <!-- User form fields would go here -->
            <p>User form implementation would go here with Carbon form components.</p>
            <p>User ID: {editingUser.id || 'New User'}</p>
            <p>Name: {editingUser.display_name || 'Not set'}</p>
            <p>Email: {editingUser.email || 'Not set'}</p>
          </div>
        </Column>
      </Row>
    </Grid>
  {/if}
</Modal>

<style>
  .user-management-page {
    padding: var(--cds-spacing-06);
    space-y: 1.5rem;
  }

  .page-header {
    margin: var(--cds-spacing-07) 0;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .header-text {
    flex: 1;
  }

  .page-title {
    font-size: var(--cds-productive-heading-04-font-size);
    font-weight: var(--cds-productive-heading-04-font-weight);
    line-height: var(--cds-productive-heading-04-line-height);
    letter-spacing: var(--cds-productive-heading-04-letter-spacing);
    color: var(--cds-text-primary);
    margin-bottom: 0.5rem;
  }

  .page-description {
    font-size: var(--cds-body-compact-01-font-size);
    font-weight: var(--cds-body-compact-01-font-weight);
    line-height: var(--cds-body-compact-01-line-height);
    letter-spacing: var(--cds-body-compact-01-letter-spacing);
    color: var(--cds-text-secondary);
  }

  .header-actions {
    flex-shrink: 0;
  }

  .view-controls {
    margin: var(--cds-spacing-06) 0;
  }

  .table-container {
    margin-top: 1.5rem;
  }

  .modal-form {
    padding: var(--cds-spacing-06) 0;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      align-items: stretch;
    }

    .header-actions {
      align-self: stretch;
    }

    :global(.header-actions .bx--btn) {
      width: 100%;
    }
  }

  /* Notification spacing */
  :global(.user-management-page .bx--inline-notification) {
    margin-bottom: 1rem;
  }

  /* Content switcher styling */
  :global(.view-controls .bx--content-switcher) {
    width: 100%;
  }

  @media (max-width: 640px) {
    :global(.view-controls .bx--content-switcher) {
      flex-direction: column;
    }
  }
</style>