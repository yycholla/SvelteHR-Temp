import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient, LocalDate } from 'edgedb';

// EdgeDB client configuration for GelDB with Trust authentication
const client = createClient({
  host: process.env.EDGEDB_HOST || 'localhost',
  port: parseInt(process.env.EDGEDB_PORT || '5659'),
  database: process.env.EDGEDB_DATABASE || 'main',
  user: process.env.EDGEDB_USER || 'edgedb',
  tlsSecurity: 'insecure',
  // Add connection retry and timeout settings for stability
  waitUntilAvailable: 30000,
  serverSettings: {
    session_idle_transaction_timeout: '10000',
    query_execution_timeout: '30000'
  }
});

// GraphQL resolver functions
const resolvers = {
  // Query resolvers
  users: async () => {
    const query = `
      SELECT rbac::User {
        id,
        email,
        username,
        display_name,
        first_name,
        last_name,
        is_active,
        onboarding_status,
        employee_id,
        job_title,
        created_at,
        updated_at,
        roles := .<user[is rbac::UserRole] {
          role: {
            id, name, display_name, level
          }
        }
      } ORDER BY .display_name
    `;
    
    const result = await client.query(query);
    return result.map((user: any) => ({
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      firstName: user.first_name,
      lastName: user.last_name,
      isActive: user.is_active,
      onboardingStatus: user.onboarding_status,
      employeeId: user.employee_id,
      jobTitle: user.job_title,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      roles: (user.roles || []).map((r: any) => ({
        id: r.role.id,
        name: r.role.name,
        displayName: r.role.display_name,
        level: r.role.level
      }))
    }));
  },

  user: async (id: string) => {
    const query = `
      SELECT rbac::User {
        id,
        email,
        username,
        display_name,
        first_name,
        last_name,
        is_active,
        onboarding_status,
        employee_id,
        job_title,
        created_at,
        updated_at
      } FILTER .id = <uuid>$id
    `;
    
    const result = await client.query(query, { id });
    if (result.length === 0) return null;
    
    const user = result[0] as any;
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      firstName: user.first_name,
      lastName: user.last_name,
      isActive: user.is_active,
      onboardingStatus: user.onboarding_status,
      employeeId: user.employee_id,
      jobTitle: user.job_title,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  },

  departments: async () => {
    const query = `
      SELECT default::Department {
        id,
        name,
        description,
        is_active,
        employee_count,
        created_at,
        updated_at
      } ORDER BY .name
    `;
    
    const result = await client.query(query);
    return result.map((dept: any) => ({
      id: dept.id,
      name: dept.name,
      description: dept.description,
      isActive: dept.is_active,
      employeeCount: dept.employee_count || 0,
      createdAt: dept.created_at,
      updatedAt: dept.updated_at
    }));
  },

  // RBAC resolvers
  roles: async () => {
    const query = `
      SELECT rbac::Role {
        id,
        name,
        display_name,
        description,
        level,
        is_system,
        user_count,
        permission_count,
        created_at,
        updated_at
      } ORDER BY .level DESC THEN .name
    `;
    
    const result = await client.query(query);
    return result.map((role: any) => ({
      id: role.id,
      name: role.name,
      displayName: role.display_name,
      description: role.description,
      level: role.level,
      isSystem: role.is_system,
      userCount: role.user_count || 0,
      permissionCount: role.permission_count || 0,
      createdAt: role.created_at,
      updatedAt: role.updated_at
    }));
  },

  permissions: async () => {
    const query = `
      SELECT rbac::Permission {
        id,
        name,
        display_name,
        description,
        resource,
        action,
        scope,
        is_system,
        role_count,
        created_at,
        updated_at
      } ORDER BY .resource THEN .action
    `;
    
    const result = await client.query(query);
    return result.map((perm: any) => ({
      id: perm.id,
      name: perm.name,
      displayName: perm.display_name,
      description: perm.description,
      resource: perm.resource,
      action: perm.action,
      scope: perm.scope,
      isSystem: perm.is_system,
      roleCount: perm.role_count || 0,
      createdAt: perm.created_at,
      updatedAt: perm.updated_at
    }));
  },

  // Create admin role
  createRole: async (input: {
    name: string;
    displayName?: string;
    description?: string;
    level?: number;
    isSystem?: boolean;
  }) => {
    const query = `
      INSERT rbac::Role {
        name := <str>$name,
        display_name := <str>$displayName,
        description := <str>$description,
        level := <int16>$level,
        is_system := <bool>$isSystem
      }
    `;
    
    const result = await client.query(query, {
      name: input.name,
      displayName: input.displayName || input.name,
      description: input.description || '',
      level: input.level || 0,
      isSystem: input.isSystem || false
    });
    
    return result[0];
  },

  // Create permission
  createPermission: async (input: {
    name: string;
    displayName?: string;
    description?: string;
    resource: string;
    action: string;
    scope?: string;
    isSystem?: boolean;
  }) => {
    const query = `
      INSERT rbac::Permission {
        name := <str>$name,
        display_name := <str>$displayName,
        description := <str>$description,
        resource := <str>$resource,
        action := <str>$action,
        scope := <str>$scope,
        is_system := <bool>$isSystem
      }
    `;
    
    const result = await client.query(query, {
      name: input.name,
      displayName: input.displayName || input.name,
      description: input.description || '',
      resource: input.resource,
      action: input.action,
      scope: input.scope || 'global',
      isSystem: input.isSystem || false
    });
    
    return result[0];
  },

  // Assign role to user
  assignUserRole: async (input: {
    userId: string;
    roleId: string;
    grantedBy?: string;
  }) => {
    const query = `
      INSERT rbac::UserRole {
        user := (SELECT rbac::User FILTER .id = <uuid>$userId),
        role := (SELECT rbac::Role FILTER .id = <uuid>$roleId)
      }
    `;
    
    const result = await client.query(query, {
      userId: input.userId,
      roleId: input.roleId
    });
    
    return result[0];
  },

  // Assign permission to role
  assignRolePermission: async (input: {
    roleId: string;
    permissionId: string;
  }) => {
    const query = `
      INSERT rbac::RolePermission {
        role := (SELECT rbac::Role FILTER .id = <uuid>$roleId),
        permission := (SELECT rbac::Permission FILTER .id = <uuid>$permissionId)
      }
    `;
    
    const result = await client.query(query, {
      roleId: input.roleId,
      permissionId: input.permissionId
    });
    
    return result[0];
  },

  // Authentication resolvers
  login: async (email: string, password: string) => {
    // Simple auth - in production this would verify password hash
    const query = `
      SELECT rbac::User {
        id, email, username, display_name, first_name, last_name,
        is_active, onboarding_status, employee_id, job_title,
        created_at, updated_at,
        roles := .<user[is rbac::UserRole] {
          role: {
            id, name, display_name, level
          }
        }
      } FILTER .email = <str>$email OR .username = <str>$email
    `;
    
    const result = await client.query(query, { email });
    if (result.length === 0) {
      throw new Error('Invalid credentials');
    }
    
    const user = result[0] as any;
    
    // For demo purposes, accept any password for existing users
    // In production, verify against password hash
    return {
      accessToken: 'demo-token-' + Date.now(),
      refreshToken: 'demo-refresh-' + Date.now(),
      expiresIn: 3600, // 1 hour
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        firstName: user.first_name,
        lastName: user.last_name,
        isActive: user.is_active,
        onboardingStatus: user.onboarding_status,
        roles: (user.roles || []).map((r: any) => ({
          id: r.role.id,
          name: r.role.name,
          permissions: [] // Would include permissions in real implementation
        }))
      }
    };
  },

  me: async (token: string) => {
    // For demo purposes, extract user info from token
    // In production, verify JWT and get user from database
    if (!token || !token.startsWith('demo-token-')) {
      throw new Error('Invalid token');
    }
    
    // For now, return admin user as demo
    const query = `
      SELECT rbac::User {
        id, email, username, display_name, first_name, last_name,
        is_active, onboarding_status, employee_id, job_title,
        created_at, updated_at,
        roles := .<user[is rbac::UserRole] {
          role: {
            id, name, display_name, level
          }
        }
      } FILTER .username = <str>$username
    `;
    
    const result = await client.query(query, { username: 'admin' });
    if (result.length === 0) {
      throw new Error('User not found');
    }
    
    const user = result[0] as any;
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      firstName: user.first_name,
      lastName: user.last_name,
      isActive: user.is_active,
      onboardingStatus: user.onboarding_status,
      roles: (user.roles || []).map((r: any) => ({
        id: r.role.id,
        name: r.role.name,
        permissions: []
      }))
    };
  },

  logout: async () => {
    // In production, invalidate server-side session/token
    return { success: true };
  },

  // Mutation resolvers
  createUser: async (input: {
    email: string;
    username: string;
    firstName?: string;
    lastName?: string;
    isActive?: boolean;
  }) => {
    const query = `
      INSERT rbac::User {
        email := <str>$email,
        username := <str>$username,
        first_name := <str>$firstName,
        last_name := <str>$lastName,
        is_active := <bool>$isActive
      }
    `;
    
    const result = await client.query(query, {
      email: input.email,
      username: input.username,
      firstName: input.firstName || '',
      lastName: input.lastName || '',
      isActive: input.isActive !== false
    });
    
    // Return the created user by querying it back
    const createdUser = result[0] as any;
    return resolvers.user(createdUser.id);
  },

  updateUser: async (id: string, input: {
    email?: string;
    firstName?: string;
    lastName?: string;
    isActive?: boolean;
  }) => {
    // Build the SET clause dynamically based on provided fields
    const setParts = [];
    const params: any = { id };
    
    if (input.email !== undefined) {
      setParts.push('email := <str>$email');
      params.email = input.email;
    }
    if (input.firstName !== undefined) {
      setParts.push('first_name := <str>$firstName');
      params.firstName = input.firstName;
    }
    if (input.lastName !== undefined) {
      setParts.push('last_name := <str>$lastName');
      params.lastName = input.lastName;
    }
    if (input.isActive !== undefined) {
      setParts.push('is_active := <bool>$isActive');
      params.isActive = input.isActive;
    }
    
    if (setParts.length === 0) {
      // No fields to update, just return the current user
      return resolvers.user(id);
    }
    
    const query = `
      UPDATE rbac::User
      FILTER .id = <uuid>$id
      SET {
        ${setParts.join(',\n        ')}
      }
    `;
    
    await client.query(query, params);
    
    // Return the updated user
    return resolvers.user(id);
  },

  deleteUser: async (id: string) => {
    const query = `
      DELETE rbac::User
      FILTER .id = <uuid>$id
    `;
    
    await client.query(query, { id });
    return { id, deleted: true };
  },

  createDepartment: async (input: {
    name: string;
    description?: string;
    isActive?: boolean;
  }) => {
    const query = `
      INSERT default::Department {
        name := <str>$name,
        description := <str>$description,
        is_active := <bool>$isActive
      }
    `;
    
    const result = await client.query(query, {
      name: input.name,
      description: input.description || '',
      isActive: input.isActive !== false
    });
    
    const createdDept = result[0] as any;
    return {
      id: createdDept.id,
      name: input.name,
      description: input.description,
      isActive: input.isActive !== false,
      employeeCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  // Job Information CRUD
  jobInformation: async (employeeId: string) => {
    const query = `
      SELECT default::JobInformation {
        id,
        employee: { id, email, username, display_name },
        department: { id, name },
        job_title,
        hire_date,
        employment_type,
        work_location,
        work_schedule,
        manager: { id, email, display_name },
        termination_date,
        is_remote,
        is_current_employee,
        created_at,
        updated_at
      } FILTER .employee.id = <uuid>$employeeId
    `;
    
    const result = await client.query(query, { employeeId });
    if (result.length === 0) return null;
    
    const job = result[0] as any;
    return {
      id: job.id,
      employee: {
        id: job.employee.id,
        email: job.employee.email,
        username: job.employee.username,
        displayName: job.employee.display_name
      },
      department: job.department ? {
        id: job.department.id,
        name: job.department.name
      } : null,
      jobTitle: job.job_title,
      hireDate: job.hire_date,
      employmentType: job.employment_type,
      workLocation: job.work_location,
      workSchedule: job.work_schedule,
      manager: job.manager ? {
        id: job.manager.id,
        email: job.manager.email,
        displayName: job.manager.display_name
      } : null,
      terminationDate: job.termination_date,
      isRemote: job.is_remote,
      isCurrentEmployee: job.is_current_employee,
      createdAt: job.created_at,
      updatedAt: job.updated_at
    };
  },

  // Get all job information records
  allJobInformation: async () => {
    const query = `
      SELECT default::JobInformation {
        id,
        employee: { id, email, username, display_name },
        department: { id, name },
        job_title,
        hire_date,
        employment_type,
        work_location,
        work_schedule,
        manager: { id, email, display_name },
        termination_date,
        is_remote,
        is_current_employee,
        created_at,
        updated_at
      } ORDER BY .employee.display_name
    `;
    
    const result = await client.query(query);
    return result.map((job: any) => ({
      id: job.id,
      employee: {
        id: job.employee.id,
        email: job.employee.email,
        username: job.employee.username,
        displayName: job.employee.display_name
      },
      department: job.department ? {
        id: job.department.id,
        name: job.department.name
      } : null,
      jobTitle: job.job_title,
      hireDate: job.hire_date,
      employmentType: job.employment_type,
      workLocation: job.work_location,
      workSchedule: job.work_schedule,
      manager: job.manager ? {
        id: job.manager.id,
        email: job.manager.email,
        displayName: job.manager.display_name
      } : null,
      terminationDate: job.termination_date,
      isRemote: job.is_remote,
      isCurrentEmployee: job.is_current_employee,
      createdAt: job.created_at,
      updatedAt: job.updated_at
    }));
  },

  createJobInformation: async (input: {
    employeeId: string;
    departmentId?: string;
    jobTitle?: string;
    hireDate?: string;
    employmentType?: string;
    workLocation?: string;
    workSchedule?: string;
    managerId?: string;
    isRemote?: boolean;
  }) => {
    // Build dynamic query based on provided fields
    const setParts = [
      'employee := (SELECT rbac::User FILTER .id = <uuid>$employeeId)',
      'job_title := <str>$jobTitle',
      'hire_date := <cal::local_date>$hireDate',
      'employment_type := <str>$employmentType',
      'work_location := <str>$workLocation',
      'work_schedule := <str>$workSchedule',
      'is_remote := <bool>$isRemote'
    ];
    
    const params: any = {
      employeeId: input.employeeId,
      jobTitle: input.jobTitle || '',
      hireDate: (() => {
        if (input.hireDate) {
          const date = new Date(input.hireDate);
          return new LocalDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
        }
        const now = new Date();
        return new LocalDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
      })(),
      employmentType: input.employmentType || 'Full-time',
      workLocation: input.workLocation || '',
      workSchedule: input.workSchedule || '',
      isRemote: input.isRemote || false
    };
    
    if (input.departmentId) {
      setParts.push('department := (SELECT default::Department FILTER .id = <uuid>$departmentId)');
      params.departmentId = input.departmentId;
    }
    
    if (input.managerId) {
      setParts.push('manager := (SELECT rbac::User FILTER .id = <uuid>$managerId)');
      params.managerId = input.managerId;
    }
    
    const query = `
      INSERT default::JobInformation {
        ${setParts.join(',\n        ')}
      }
    `;
    
    await client.query(query, params);
    
    return resolvers.jobInformation(input.employeeId);
  },

  // Compensation CRUD
  compensation: async (employeeId: string) => {
    const query = `
      SELECT default::Compensation {
        id,
        employee: { id, email, display_name },
        pay_type,
        pay_rate,
        currency,
        annual_salary,
        pay_frequency,
        salary_review_date,
        bonus_eligible,
        overtime_eligible,
        created_at,
        updated_at
      } FILTER .employee.id = <uuid>$employeeId
    `;
    
    const result = await client.query(query, { employeeId });
    if (result.length === 0) return null;
    
    const comp = result[0] as any;
    return {
      id: comp.id,
      employee: {
        id: comp.employee.id,
        email: comp.employee.email,
        displayName: comp.employee.display_name
      },
      payType: comp.pay_type,
      payRate: comp.pay_rate,
      currency: comp.currency,
      annualSalary: comp.annual_salary,
      payFrequency: comp.pay_frequency,
      salaryReviewDate: comp.salary_review_date,
      bonusEligible: comp.bonus_eligible,
      overtimeEligible: comp.overtime_eligible,
      createdAt: comp.created_at,
      updatedAt: comp.updated_at
    };
  },

  createCompensation: async (input: {
    employeeId: string;
    payType: string;
    payRate: number;
    currency?: string;
    bonusEligible?: boolean;
    overtimeEligible?: boolean;
  }) => {
    const query = `
      INSERT default::Compensation {
        employee := (SELECT rbac::User FILTER .id = <uuid>$employeeId),
        pay_type := <default::PayType>$payType,
        pay_rate := <decimal>$payRate,
        currency := <str>$currency,
        bonus_eligible := <bool>$bonusEligible,
        overtime_eligible := <bool>$overtimeEligible
      }
    `;
    
    await client.query(query, {
      employeeId: input.employeeId,
      payType: input.payType,
      payRate: input.payRate.toString(),
      currency: input.currency || 'USD',
      bonusEligible: input.bonusEligible || false,
      overtimeEligible: input.overtimeEligible || false
    });
    
    return resolvers.compensation(input.employeeId);
  }
};

// Simple GraphQL query parser and resolver
const resolveGraphQLQuery = async (query: string, variables: any = {}) => {
  const trimmedQuery = query.trim();
  
  // Handle introspection queries
  if (trimmedQuery.includes('__typename')) {
    return { data: { __typename: 'Query' } };
  }
  
  if (trimmedQuery.includes('__schema')) {
    return {
      data: {
        __schema: {
          types: [
            { name: 'Query', kind: 'OBJECT' },
            { name: 'User', kind: 'OBJECT' },
            { name: 'Department', kind: 'OBJECT' }
          ]
        }
      }
    };
  }
  
  // Handle authentication mutations first (before other queries)
  if (trimmedQuery.includes('mutation') && trimmedQuery.includes('login')) {
    const result = await resolvers.login(variables.email, variables.password);
    return { data: { login: result } };
  }

  if (trimmedQuery.includes('mutation') && trimmedQuery.includes('logout')) {
    const result = await resolvers.logout();
    return { data: { logout: result } };
  }

  // Handle queries
  if (trimmedQuery.includes('users')) {
    const users = await resolvers.users();
    return { data: { users } };
  }
  
  if (trimmedQuery.includes('user(') && variables.id) {
    const user = await resolvers.user(variables.id);
    return { data: { user } };
  }
  
  if (trimmedQuery.includes('departments')) {
    const departments = await resolvers.departments();
    return { data: { departments } };
  }

  if (trimmedQuery.includes('roles')) {
    const roles = await resolvers.roles();
    return { data: { roles } };
  }

  if (trimmedQuery.includes('permissions')) {
    const permissions = await resolvers.permissions();
    return { data: { permissions } };
  }

  // Authentication queries
  if (trimmedQuery.includes('me')) {
    // Extract token from headers or variables
    const token = variables.token || 'demo-token-' + Date.now();
    const user = await resolvers.me(token);
    return { data: { me: user } };
  }

  if (trimmedQuery.includes('allJobInformation') || (trimmedQuery.includes('jobInformation') && !variables.employeeId)) {
    const jobInformation = await resolvers.allJobInformation();
    return { data: { jobInformation } };
  }

  if (trimmedQuery.includes('jobInformation') && variables.employeeId) {
    const jobInformation = await resolvers.jobInformation(variables.employeeId);
    return { data: { jobInformation } };
  }

  if (trimmedQuery.includes('compensation') && variables.employeeId) {
    const compensation = await resolvers.compensation(variables.employeeId);
    return { data: { compensation } };
  }
  
  // Handle mutations
  if (trimmedQuery.includes('createUser')) {
    const user = await resolvers.createUser(variables.input);
    return { data: { createUser: user } };
  }
  
  if (trimmedQuery.includes('updateUser')) {
    const user = await resolvers.updateUser(variables.id, variables.input);
    return { data: { updateUser: user } };
  }
  
  if (trimmedQuery.includes('deleteUser')) {
    const result = await resolvers.deleteUser(variables.id);
    return { data: { deleteUser: result } };
  }
  
  if (trimmedQuery.includes('createDepartment')) {
    const department = await resolvers.createDepartment(variables.input);
    return { data: { createDepartment: department } };
  }

  if (trimmedQuery.includes('createJobInformation')) {
    const jobInformation = await resolvers.createJobInformation(variables.input || variables);
    return { data: { createJobInformation: jobInformation } };
  }

  if (trimmedQuery.includes('createCompensation')) {
    const compensation = await resolvers.createCompensation(variables.input);
    return { data: { createCompensation: compensation } };
  }

  // RBAC mutations
  if (trimmedQuery.includes('createRole')) {
    const role = await resolvers.createRole(variables.input);
    return { data: { createRole: role } };
  }

  if (trimmedQuery.includes('createPermission')) {
    const permission = await resolvers.createPermission(variables.input);
    return { data: { createPermission: permission } };
  }

  if (trimmedQuery.includes('assignUserRole')) {
    const userRole = await resolvers.assignUserRole(variables.input);
    return { data: { assignUserRole: userRole } };
  }

  if (trimmedQuery.includes('assignRolePermission')) {
    const rolePermission = await resolvers.assignRolePermission(variables.input);
    return { data: { assignRolePermission: rolePermission } };
  }

  return { data: null };
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { query, variables } = await request.json();
    
    if (!query) {
      return json({ errors: [{ message: 'Query is required' }] }, { status: 400 });
    }

    // Execute the GraphQL query
    const result = await resolveGraphQLQuery(query, variables);
    
    return json(result);

  } catch (error) {
    console.error('GraphQL API Error:', error);
    return json(
      { 
        errors: [{ 
          message: error instanceof Error ? error.message : 'Internal server error',
          extensions: { code: 'INTERNAL_ERROR' }
        }] 
      },
      { status: 500 }
    );
  }
};

export const GET: RequestHandler = async () => {
  return json({
    message: 'SvelteHR GraphQL API',
    endpoint: '/api/graphql',
    operations: {
      queries: ['users', 'user(id)', 'departments', 'jobInformation(employeeId)', 'compensation(employeeId)'],
      mutations: ['createUser', 'updateUser', 'deleteUser', 'createDepartment', 'createJobInformation', 'createCompensation']
    },
    examples: {
      getAllUsers: 'query { users { id email username displayName } }',
      getUser: 'query($id: ID!) { user(id: $id) { id email username displayName } }',
      createUser: 'mutation($input: CreateUserInput!) { createUser(input: $input) { id email username } }'
    }
  });
};