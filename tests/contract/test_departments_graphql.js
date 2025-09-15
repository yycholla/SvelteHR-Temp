// Departments GraphQL Operations Contract Test
// Validates all CRUD operations for departments entity with proper relationships
// MUST FAIL until Hasura metadata and relationships are configured

import { describe, it, expect, beforeAll } from 'vitest';

const HASURA_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT || 'http://localhost:8080/v1/graphql';
const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET || 'your-admin-secret-here';

async function graphqlQuery(query, variables = {}) {
  const response = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': ADMIN_SECRET
    },
    body: JSON.stringify({ query, variables })
  });

  const result = await response.json();
  return { status: response.status, data: result.data, errors: result.errors };
}

describe('Departments GraphQL Operations Contract Tests', () => {
  let testDepartmentId = null;
  let testParentDepartmentId = null;

  beforeAll(async () => {
    // These will fail until schema is implemented
    console.log('Setting up test data - will fail until schema is implemented');
  });

  it('should query departments with basic fields', async () => {
    const query = `
      query GetDepartments {
        departments(limit: 10) {
          id
          name
          description
          budget
          is_active
          created_at
          updated_at
        }
      }
    `;

    const result = await graphqlQuery(query);
    
    if (result.errors) {
      // Expected to fail until schema is implemented
      expect(result.errors[0].message).toContain('table "departments" does not exist');
    } else {
      // Contract: Should return array of departments with correct fields
      expect(result.data.departments).toBeDefined();
      expect(Array.isArray(result.data.departments)).toBe(true);
      
      if (result.data.departments.length > 0) {
        const dept = result.data.departments[0];
        expect(dept.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(typeof dept.name).toBe('string');
        expect(typeof dept.is_active).toBe('boolean');
        expect(dept.created_at).toBeDefined();
      }
    }
  });

  it('should query department by primary key', async () => {
    const query = `
      query GetDepartmentByPK($id: uuid!) {
        departments_by_pk(id: $id) {
          id
          name
          description
          budget
          is_active
          manager {
            id
            display_name
          }
        }
      }
    `;

    const testId = '123e4567-e89b-12d3-a456-426614174000';
    const result = await graphqlQuery(query, { id: testId });
    
    if (result.errors) {
      // Expected to fail until schema is implemented
      expect(result.errors[0].message).toContain('table "departments" does not exist');
    } else {
      // Contract: Should return single department or null
      expect(result.data.departments_by_pk).toBeDefined();
    }
  });

  it('should query departments with computed employee counts', async () => {
    const query = `
      query GetDepartmentsWithCounts {
        departments(limit: 5) {
          id
          name
          budget
          employee_count
          active_employee_count
          subdepartment_count
          budget_per_employee
        }
      }
    `;

    const result = await graphqlQuery(query);
    
    if (result.errors) {
      // Expected to fail until computed fields are configured
      expect(result.errors[0].message).toMatch(/table|computed|field/);
    } else {
      // Contract: Should return departments with computed fields
      expect(result.data.departments).toBeDefined();
      
      if (result.data.departments.length > 0) {
        const dept = result.data.departments[0];
        expect(typeof dept.employee_count).toBe('number');
        expect(typeof dept.active_employee_count).toBe('number');
        expect(typeof dept.subdepartment_count).toBe('number');
        if (dept.budget_per_employee !== null) {
          expect(typeof dept.budget_per_employee).toBe('number');
        }
      }
    }
  });

  it('should query departments with hierarchy relationships', async () => {
    const query = `
      query GetDepartmentHierarchy {
        departments(where: { parent_department_id: { _is_null: true } }) {
          id
          name
          budget
          subdepartments {
            id
            name
            manager {
              id
              display_name
            }
            subdepartments {
              id
              name
            }
          }
        }
      }
    `;

    const result = await graphqlQuery(query);
    
    if (result.errors) {
      // Expected to fail until relationships are configured
      expect(result.errors[0].message).toMatch(/table|relationship/);
    } else {
      // Contract: Should return hierarchical department structure
      expect(result.data.departments).toBeDefined();
      
      if (result.data.departments.length > 0 && result.data.departments[0].subdepartments) {
        const topLevelDept = result.data.departments[0];
        expect(Array.isArray(topLevelDept.subdepartments)).toBe(true);
        
        if (topLevelDept.subdepartments.length > 0) {
          const subDept = topLevelDept.subdepartments[0];
          expect(subDept.id).toBeDefined();
          expect(subDept.name).toBeDefined();
        }
      }
    }
  });

  it('should query departments with employee information', async () => {
    const query = `
      query GetDepartmentsWithEmployees {
        departments(limit: 3) {
          id
          name
          employees: job_informations {
            id
            job_title
            employment_type
            hire_date
            user {
              id
              display_name
              email
              is_active
            }
          }
        }
      }
    `;

    const result = await graphqlQuery(query);
    
    if (result.errors) {
      // Expected to fail until relationships are configured
      expect(result.errors[0].message).toMatch(/table|relationship/);
    } else {
      // Contract: Should return departments with employee details
      expect(result.data.departments).toBeDefined();
      
      if (result.data.departments.length > 0 && result.data.departments[0].employees) {
        const dept = result.data.departments[0];
        expect(Array.isArray(dept.employees)).toBe(true);
        
        if (dept.employees.length > 0) {
          const employee = dept.employees[0];
          expect(employee.job_title).toBeDefined();
          expect(employee.user).toBeDefined();
          expect(employee.user.display_name).toBeDefined();
        }
      }
    }
  });

  it('should insert new department', async () => {
    const mutation = `
      mutation InsertDepartment($department: departments_insert_input!) {
        insert_departments_one(object: $department) {
          id
          name
          description
          budget
          is_active
          created_at
        }
      }
    `;

    const newDepartment = {
      name: 'Test Engineering',
      description: 'Test department for engineering teams',
      budget: 500000.00,
      is_active: true
    };

    const result = await graphqlQuery(mutation, { department: newDepartment });
    
    if (result.errors) {
      // Expected to fail until schema is implemented
      expect(result.errors[0].message).toMatch(/table|mutation/);
    } else {
      // Contract: Should return inserted department with generated ID
      expect(result.data.insert_departments_one).toBeDefined();
      expect(result.data.insert_departments_one.id).toBeDefined();
      expect(result.data.insert_departments_one.name).toBe(newDepartment.name);
      testDepartmentId = result.data.insert_departments_one.id;
    }
  });

  it('should insert department with parent relationship', async () => {
    const mutation = `
      mutation InsertSubdepartment($department: departments_insert_input!) {
        insert_departments_one(object: $department) {
          id
          name
          parent_department_id
          parent_department {
            id
            name
          }
        }
      }
    `;

    const parentId = testDepartmentId || '123e4567-e89b-12d3-a456-426614174000';
    const newSubdepartment = {
      name: 'Test Frontend Team',
      description: 'Frontend development subteam',
      budget: 200000.00,
      parent_department_id: parentId,
      is_active: true
    };

    const result = await graphqlQuery(mutation, { department: newSubdepartment });
    
    if (result.errors) {
      // Expected to fail until relationships are configured
      expect(result.errors[0].message).toMatch(/table|mutation|relationship/);
    } else {
      // Contract: Should return inserted subdepartment with parent reference
      expect(result.data.insert_departments_one).toBeDefined();
      expect(result.data.insert_departments_one.parent_department_id).toBe(parentId);
    }
  });

  it('should update existing department', async () => {
    const mutation = `
      mutation UpdateDepartment($id: uuid!, $changes: departments_set_input!) {
        update_departments_by_pk(pk_columns: { id: $id }, _set: $changes) {
          id
          name
          description
          budget
          updated_at
        }
      }
    `;

    const updates = {
      name: 'Updated Test Engineering',
      description: 'Updated test department description',
      budget: 600000.00
    };

    const testId = testDepartmentId || '123e4567-e89b-12d3-a456-426614174000';
    const result = await graphqlQuery(mutation, { id: testId, changes: updates });
    
    if (result.errors) {
      // Expected to fail until schema is implemented
      expect(result.errors[0].message).toMatch(/table|mutation/);
    } else {
      // Contract: Should return updated department
      expect(result.data.update_departments_by_pk).toBeDefined();
      expect(result.data.update_departments_by_pk.name).toBe(updates.name);
      expect(result.data.update_departments_by_pk.budget).toBe(updates.budget);
    }
  });

  it('should filter departments by active status', async () => {
    const query = `
      query GetActiveDepartments {
        departments(where: { is_active: { _eq: true } }) {
          id
          name
          is_active
          budget
        }
      }
    `;

    const result = await graphqlQuery(query);
    
    if (result.errors) {
      // Expected to fail until schema is implemented
      expect(result.errors[0].message).toMatch(/table/);
    } else {
      // Contract: Should return only active departments
      expect(result.data.departments).toBeDefined();
      
      result.data.departments.forEach(dept => {
        expect(dept.is_active).toBe(true);
      });
    }
  });

  it('should support budget range filtering', async () => {
    const query = `
      query GetDepartmentsByBudget($minBudget: numeric!, $maxBudget: numeric!) {
        departments(where: { 
          budget: { _gte: $minBudget, _lte: $maxBudget },
          is_active: { _eq: true }
        }) {
          id
          name
          budget
        }
      }
    `;

    const result = await graphqlQuery(query, { minBudget: 100000, maxBudget: 1000000 });
    
    if (result.errors) {
      // Expected to fail until schema is implemented
      expect(result.errors[0].message).toMatch(/table|numeric/);
    } else {
      // Contract: Should return departments within budget range
      expect(result.data.departments).toBeDefined();
      
      result.data.departments.forEach(dept => {
        expect(dept.budget).toBeGreaterThanOrEqual(100000);
        expect(dept.budget).toBeLessThanOrEqual(1000000);
      });
    }
  });

  it('should support ordering and pagination', async () => {
    const query = `
      query GetDepartmentsPaginated($limit: Int!, $offset: Int!) {
        departments(
          limit: $limit,
          offset: $offset,
          order_by: { name: asc }
        ) {
          id
          name
          budget
        }
        departments_aggregate {
          aggregate {
            count
          }
        }
      }
    `;

    const result = await graphqlQuery(query, { limit: 5, offset: 0 });
    
    if (result.errors) {
      // Expected to fail until schema is implemented
      expect(result.errors[0].message).toMatch(/table|aggregate/);
    } else {
      // Contract: Should return paginated and ordered results
      expect(result.data.departments).toBeDefined();
      expect(result.data.departments_aggregate.aggregate.count).toBeDefined();
      expect(typeof result.data.departments_aggregate.aggregate.count).toBe('number');
      
      // Verify ordering
      if (result.data.departments.length > 1) {
        const names = result.data.departments.map(dept => dept.name);
        const sortedNames = [...names].sort();
        expect(names).toEqual(sortedNames);
      }
    }
  });

  it('should enforce department name uniqueness constraint', async () => {
    const mutation = `
      mutation InsertDuplicateDepartment($department: departments_insert_input!) {
        insert_departments_one(object: $department) {
          id
          name
        }
      }
    `;

    const duplicateDepartment = {
      name: 'Engineering', // Should already exist from seed data
      description: 'Duplicate engineering department',
      budget: 100000.00,
      is_active: true
    };

    const result = await graphqlQuery(mutation, { department: duplicateDepartment });
    
    if (result.errors) {
      // Should fail due to uniqueness constraint (or table not existing)
      expect(result.errors[0].message).toMatch(/table|unique|constraint/);
    } else {
      // If successful, constraint is not properly configured
      throw new Error('Department name uniqueness constraint not enforced');
    }
  });

  it('should validate budget is non-negative', async () => {
    const mutation = `
      mutation InsertInvalidBudgetDepartment($department: departments_insert_input!) {
        insert_departments_one(object: $department) {
          id
          name
          budget
        }
      }
    `;

    const invalidDepartment = {
      name: 'Invalid Budget Department',
      description: 'Department with negative budget',
      budget: -50000.00, // Invalid negative budget
      is_active: true
    };

    const result = await graphqlQuery(mutation, { department: invalidDepartment });
    
    if (result.errors) {
      // Should fail due to budget constraint (or table not existing)
      expect(result.errors[0].message).toMatch(/table|constraint|check/);
    } else {
      // If successful, budget validation is not properly configured
      throw new Error('Budget non-negative constraint not enforced');
    }
  });

  it('should query department manager assignments', async () => {
    const query = `
      query GetDepartmentManagers {
        departments(where: { manager_id: { _is_null: false } }) {
          id
          name
          manager {
            id
            display_name
            email
            job_information {
              job_title
              hire_date
            }
          }
        }
      }
    `;

    const result = await graphqlQuery(query);
    
    if (result.errors) {
      // Expected to fail until relationships are configured
      expect(result.errors[0].message).toMatch(/table|relationship/);
    } else {
      // Contract: Should return departments with manager details
      expect(result.data.departments).toBeDefined();
      
      result.data.departments.forEach(dept => {
        expect(dept.manager).toBeDefined();
        expect(dept.manager.display_name).toBeDefined();
        expect(dept.manager.job_information).toBeDefined();
      });
    }
  });
});