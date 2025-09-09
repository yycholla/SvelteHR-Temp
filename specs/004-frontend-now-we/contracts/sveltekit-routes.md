# SvelteKit Route Contracts

**Feature**: 004-frontend-now-we  
**Phase**: 1 (Design & Contracts)  
**Created**: 2025-09-09

## Route Architecture

This document defines the SvelteKit route structure and contracts for the role-based HR management frontend. All routes follow server-side RBAC enforcement patterns.

## Route Structure

```
src/routes/
├── +layout.server.ts              # Global RBAC middleware
├── +layout.svelte                 # Global layout with role-aware navigation
├── +page.server.ts                # Landing page with role-based redirects
├── +page.svelte                   # Public landing page
├── login/
│   ├── +page.server.ts            # Login form handling
│   └── +page.svelte               # Login form component
├── (authenticated)/               # Protected route group
│   ├── +layout.server.ts          # Auth verification for protected routes
│   ├── +layout.svelte             # Authenticated user layout
│   ├── dashboard/
│   │   ├── +page.server.ts        # Role-based dashboard data
│   │   └── +page.svelte           # Dashboard with role-specific widgets
│   ├── (employee)/                # Employee-accessible routes
│   │   ├── +layout.server.ts      # Employee role verification
│   │   ├── profile/
│   │   │   ├── +page.server.ts    # Own profile data
│   │   │   └── +page.svelte       # Profile view/edit
│   │   ├── timesheet/
│   │   │   ├── +page.server.ts    # Timesheet data
│   │   │   └── +page.svelte       # Timesheet management
│   │   └── requests/
│   │       ├── +page.server.ts    # Leave/request data
│   │       └── +page.svelte       # Request management
│   ├── (hr)/                      # HR Manager routes
│   │   ├── +layout.server.ts      # HR role verification
│   │   ├── employees/
│   │   │   ├── +page.server.ts    # Employee list with RBAC filtering
│   │   │   ├── +page.svelte       # Employee management interface
│   │   │   └── [id]/
│   │   │       ├── +page.server.ts # Individual employee data
│   │   │       └── +page.svelte    # Employee details/edit
│   │   ├── departments/
│   │   │   ├── +page.server.ts    # Department management data
│   │   │   └── +page.svelte       # Department interface
│   │   ├── reports/
│   │   │   ├── +page.server.ts    # HR analytics data
│   │   │   └── +page.svelte       # HR reporting interface
│   │   └── analytics/
│   │       ├── +page.server.ts    # Custom query data
│   │       └── +page.svelte       # Custom analytics dashboard
│   └── (admin)/                   # Administrator routes
│       ├── +layout.server.ts      # Admin role verification
│       ├── users/
│       │   ├── +page.server.ts    # User management data
│       │   └── +page.svelte       # User administration
│       ├── roles/
│       │   ├── +page.server.ts    # Role management data
│       │   └── +page.svelte       # RBAC configuration
│       └── system/
│           ├── +page.server.ts    # System settings data
│           └── +page.svelte       # System administration
└── api/                           # SvelteKit API routes
    ├── auth/
    │   └── logout/
    │       └── +server.ts          # Logout endpoint
    ├── queries/
    │   ├── +server.ts              # Custom query CRUD
    │   └── [id]/
    │       ├── execute/
    │       │   └── +server.ts      # Query execution endpoint
    │       └── +server.ts          # Individual query operations
    └── validate/
        └── +server.ts              # Form validation endpoint
```

## Route Contracts

### Global Layout (`+layout.server.ts`)

**Purpose**: RBAC middleware for all routes
**Contract**:

```typescript
export const load: LayoutServerLoad = async ({ cookies, url }) => {
  const token = cookies.get('hr_token') || cookies.get('auth-token');
  
  if (!token) {
    if (isProtectedRoute(url.pathname)) {
      throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname)}`);
    }
    return { user: null };
  }

  try {
    const response = await fetch(`${API_URL}/api/v2/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      cookies.delete('hr_token', { path: '/' });
      cookies.delete('auth-token', { path: '/' });
      throw redirect(303, '/login');
    }

    const userData = await response.json();
    return {
      user: userData.user,
      permissions: userData.permissions,
      roles: userData.roles
    };
  } catch (error) {
    throw redirect(303, '/login');
  }
};
```

**Returns**:
- `user: UserContext | null` - Authenticated user or null
- `permissions: string[]` - User's computed permissions
- `roles: Role[]` - User's assigned roles

### Dashboard Route (`/dashboard/+page.server.ts`)

**Purpose**: Role-based dashboard data loading
**RBAC**: Requires authentication
**Contract**:

```typescript
export const load: PageServerLoad = async ({ parent }) => {
  const { user, permissions } = await parent();
  
  if (!user) {
    throw redirect(303, '/login');
  }

  const apiClient = new MountainHRApiClient();
  apiClient.setToken(cookies.get('hr_token'));

  // Role-based dashboard data
  const dashboardData = await apiClient.get(`/api/frontend/dashboard/${getRolePriority(user.roles)}`);

  return {
    widgets: dashboardData.widgets,
    recent_activities: dashboardData.recent_activities,
    notifications: dashboardData.notifications
  };
};
```

**Returns**:
- `widgets: DashboardWidget[]` - Role-appropriate dashboard widgets
- `recent_activities: Activity[]` - User's recent activities
- `notifications: Notification[]` - User notifications

### Employee Routes (`/(employee)/+layout.server.ts`)

**Purpose**: Employee role verification
**RBAC**: Requires Employee role or higher
**Contract**:

```typescript
export const load: LayoutServerLoad = async ({ parent }) => {
  const { user, permissions } = await parent();
  
  if (!user) {
    throw redirect(303, '/login');
  }

  const hasEmployeeAccess = permissions.includes('profile:read') || 
                           permissions.includes('*');
  
  if (!hasEmployeeAccess) {
    throw error(403, { message: 'Employee access required' });
  }

  return { user, permissions };
};
```

### HR Manager Routes (`/(hr)/+layout.server.ts`)

**Purpose**: HR Manager role verification
**RBAC**: Requires HR_Manager role or Admin
**Contract**:

```typescript
export const load: LayoutServerLoad = async ({ parent }) => {
  const { user, permissions } = await parent();
  
  if (!user) {
    throw redirect(303, '/login');
  }

  const hasHRAccess = permissions.some(p => 
    p.startsWith('employees:') || 
    p.startsWith('departments:') || 
    p === '*'
  );
  
  if (!hasHRAccess) {
    throw error(403, { message: 'HR Manager access required' });
  }

  return { user, permissions };
};
```

### Employee Management (`/(hr)/employees/+page.server.ts`)

**Purpose**: Employee list with RBAC filtering
**RBAC**: HR Manager or Admin only
**Contract**:

```typescript
export const load: PageServerLoad = async ({ url, parent, cookies }) => {
  const { user, permissions } = await parent();
  
  const page = Number(url.searchParams.get('page')) || 1;
  const limit = Number(url.searchParams.get('limit')) || 20;
  const departmentId = url.searchParams.get('department_id');
  const status = url.searchParams.get('status');

  const apiClient = new MountainHRApiClient();
  apiClient.setToken(cookies.get('hr_token'));

  const [employees, departments] = await Promise.all([
    apiClient.get('/api/v2/employees', { 
      page, 
      limit, 
      department_id: departmentId,
      status 
    }),
    apiClient.get('/api/v2/departments')
  ]);

  return {
    employees: employees.data,
    pagination: employees.pagination,
    departments: departments.data,
    filters: { departmentId, status, page, limit }
  };
};
```

**Returns**:
- `employees: EmployeeProfile[]` - RBAC-filtered employee list
- `pagination: PaginationInfo` - Pagination metadata
- `departments: Department[]` - Available departments for filtering
- `filters: FilterState` - Current filter state

### Individual Employee (`/(hr)/employees/[id]/+page.server.ts`)

**Purpose**: Individual employee details
**RBAC**: HR Manager/Admin or own profile
**Contract**:

```typescript
export const load: PageServerLoad = async ({ params, parent, cookies }) => {
  const { user, permissions } = await parent();
  const employeeId = params.id;

  // Check if user can access this employee
  const canAccessEmployee = 
    permissions.includes('employees:read') ||
    permissions.includes('*') ||
    user.id === employeeId;

  if (!canAccessEmployee) {
    throw error(403, { message: 'Access denied to employee data' });
  }

  const apiClient = new MountainHRApiClient();
  apiClient.setToken(cookies.get('hr_token'));

  try {
    const employee = await apiClient.get(`/api/v2/employees/${employeeId}`);
    return { employee: employee.data };
  } catch (error) {
    if (error.status === 404) {
      throw error(404, { message: 'Employee not found' });
    }
    throw error;
  }
};
```

**Returns**:
- `employee: EmployeeProfile` - Employee details (RBAC filtered)

### Admin Routes (`/(admin)/+layout.server.ts`)

**Purpose**: Administrator role verification
**RBAC**: Admin role only
**Contract**:

```typescript
export const load: LayoutServerLoad = async ({ parent }) => {
  const { user, permissions } = await parent();
  
  if (!user) {
    throw redirect(303, '/login');
  }

  const isAdmin = permissions.includes('*') || 
                 user.roles.some(role => role.name === 'Admin');
  
  if (!isAdmin) {
    throw error(403, { message: 'Administrator access required' });
  }

  return { user, permissions };
};
```

### Custom Analytics (`/(hr)/analytics/+page.server.ts`)

**Purpose**: Custom query interface
**RBAC**: HR Manager or Admin
**Contract**:

```typescript
export const load: PageServerLoad = async ({ parent, cookies }) => {
  const { user, permissions } = await parent();

  const apiClient = new MountainHRApiClient();
  apiClient.setToken(cookies.get('hr_token'));

  const [queries, sharedQueries] = await Promise.all([
    apiClient.get('/api/frontend/queries'),
    apiClient.get('/api/frontend/queries?shared=true')
  ]);

  return {
    myQueries: queries.data,
    sharedQueries: sharedQueries.data,
    availableDataSources: ['employees', 'departments', 'analytics', 'reports'],
    visualizationTypes: ['table', 'bar_chart', 'line_chart', 'pie_chart', 'figure']
  };
};
```

**Returns**:
- `myQueries: CustomQuery[]` - User's custom queries
- `sharedQueries: CustomQuery[]` - Shared queries user can access
- `availableDataSources: string[]` - Data sources user can query
- `visualizationTypes: string[]` - Available visualization options

## API Route Contracts

### Custom Query API (`/api/queries/+server.ts`)

**Purpose**: CRUD operations for custom queries
**Methods**: GET, POST, PUT, DELETE

```typescript
// GET - List user's queries
export const GET: RequestHandler = async ({ cookies, url }) => {
  const token = cookies.get('hr_token');
  const includeShared = url.searchParams.get('shared') === 'true';

  const apiClient = new MountainHRApiClient();
  apiClient.setToken(token);

  const queries = await apiClient.get('/api/frontend/queries', { 
    shared: includeShared 
  });

  return json(queries.data);
};

// POST - Create new query
export const POST: RequestHandler = async ({ request, cookies }) => {
  const token = cookies.get('hr_token');
  const queryData = await request.json();

  const apiClient = new MountainHRApiClient();
  apiClient.setToken(token);

  try {
    const newQuery = await apiClient.post('/api/frontend/queries', queryData);
    return json(newQuery.data, { status: 201 });
  } catch (error) {
    return json({ error: error.message }, { status: error.status || 400 });
  }
};
```

### Query Execution API (`/api/queries/[id]/execute/+server.ts`)

**Purpose**: Execute custom queries with RBAC filtering

```typescript
export const POST: RequestHandler = async ({ params, cookies }) => {
  const token = cookies.get('hr_token');
  const queryId = params.id;

  const apiClient = new MountainHRApiClient();
  apiClient.setToken(token);

  try {
    const result = await apiClient.post(`/api/frontend/queries/${queryId}/execute`);
    return json(result.data);
  } catch (error) {
    if (error.status === 403) {
      return json({ error: 'Access denied to query data' }, { status: 403 });
    }
    return json({ error: 'Query execution failed' }, { status: 422 });
  }
};
```

## Form Actions

### Employee Update Action

```typescript
export const actions: Actions = {
  updateEmployee: async ({ request, params, cookies }) => {
    const token = cookies.get('hr_token');
    const formData = await request.formData();
    const employeeId = params.id;

    const apiClient = new MountainHRApiClient();
    apiClient.setToken(token);

    try {
      const updatedEmployee = await apiClient.put(`/api/v2/employees/${employeeId}`, 
        Object.fromEntries(formData)
      );
      
      return { success: true, employee: updatedEmployee.data };
    } catch (error) {
      return fail(400, { 
        error: error.message,
        values: Object.fromEntries(formData)
      });
    }
  }
};
```

## Navigation Guards

### Route Group Protection Patterns

```typescript
// (authenticated) group layout
const isPublicRoute = (pathname: string): boolean => {
  const publicRoutes = ['/', '/login', '/privacy', '/terms'];
  return publicRoutes.includes(pathname) || pathname.startsWith('/api');
};

// Role-specific guards
const roleRequirements = {
  '/(employee)': ['Employee', 'Manager', 'HR_Manager', 'Admin'],
  '/(hr)': ['HR_Manager', 'Admin'],
  '/(admin)': ['Admin']
};
```

## Error Handling

### Standard Error Responses

```typescript
// 401 - Unauthorized
throw redirect(303, '/login');

// 403 - Forbidden
throw error(403, { 
  message: 'Insufficient permissions',
  required_role: 'HR_Manager'
});

// 404 - Not Found
throw error(404, { 
  message: 'Resource not found',
  resource_type: 'employee'
});
```

## Performance Considerations

### Data Loading Optimization

- **Parallel Data Fetching**: Use `Promise.all()` for independent API calls
- **Pagination**: Implement server-side pagination for large datasets
- **Caching**: Leverage SvelteKit's built-in caching for static data
- **Incremental Loading**: Load dashboard widgets progressively

### RBAC Performance

- **Permission Caching**: Cache user permissions in server load functions
- **Role Hierarchy Optimization**: Pre-compute permission inheritance
- **Data Filtering**: Apply RBAC filtering at the database level
- **Lazy Loading**: Load role-specific components on demand