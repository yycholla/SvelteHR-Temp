# User Type Mapper Guide

## Overview

The User Type Mapper solves the property naming mismatch between GraphQL API responses (snake_case) and client-side component expectations (camelCase). This eliminates ~100+ TypeScript errors related to property access mismatches.

## Problem Statement

**GraphQL API returns snake_case:**
```typescript
{
  id: "123",
  display_name: "John Doe",
  first_name: "John",
  last_name: "Doe",
  job_info: {
    hire_date: "2024-01-15",
    employment_type: "FULL_TIME"
  },
  emergency_contacts: [...]
}
```

**Components expect camelCase:**
```typescript
{
  id: "123",
  displayName: "John Doe",
  firstName: "John",
  lastName: "Doe",
  jobInfo: {
    hireDate: "2024-01-15",
    employmentType: "FULL_TIME"
  },
  emergencyContacts: [...]
}
```

## Solution

The `user-mapper.ts` utility provides:

1. **Type-safe interfaces** for both formats
2. **Bidirectional mapping functions** (GraphQL ↔ Client)
3. **Nested object support** (jobInfo, contactInfo, personalInfo, etc.)
4. **Array mapping utilities** for bulk operations

## Quick Start

### Import the mapper

```typescript
import {
  mapUserFromGraphQL,
  mapUserToGraphQL,
  type UserClient,
  type UserGraphQL
} from '$lib/types/user-mapper';
```

### Basic Usage

#### Converting GraphQL response to Client format

```typescript
// In +page.server.ts
import { mapUserFromGraphQL } from '$lib/types/user-mapper';

export const load: PageServerLoad = async ({ locals }) => {
  const client = createUrqlClient();

  // GraphQL query returns snake_case data
  const result = await client.query(GET_USER_QUERY, { id: userId }).toPromise();

  if (result.data?.user) {
    // Convert to camelCase for components
    const userClient = mapUserFromGraphQL(result.data.user);

    return {
      user: userClient  // Now components can use user.displayName, user.jobInfo, etc.
    };
  }
};
```

#### Converting Client data to GraphQL format for mutations

```typescript
// In a form submission handler
import { mapUserToGraphQL } from '$lib/types/user-mapper';

async function updateUser(userClient: UserClient) {
  // Convert camelCase to snake_case for GraphQL mutation
  const userGraphQL = mapUserToGraphQL(userClient);

  const result = await client.mutation(UPDATE_USER_MUTATION, {
    input: userGraphQL
  });

  return result;
}
```

## Type Interfaces

### UserGraphQL (API Response)

Matches the exact structure returned by GraphQL queries with snake_case properties:

```typescript
interface UserGraphQL {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  job_title?: string;
  department_id?: string;
  is_active?: boolean;
  created_at?: string;

  // Nested objects
  job_info?: JobInfoGraphQL;
  emergency_contacts?: EmergencyContactGraphQL[];
  // ... more fields
}
```

### UserClient (Component Usage)

Client-side interface with camelCase properties expected by Svelte components:

```typescript
interface UserClient {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  jobTitle?: string;
  departmentId?: string;
  isActive?: boolean;
  createdAt?: string;

  // Nested objects
  jobInfo?: JobInfoClient;
  emergencyContacts?: EmergencyContactClient[];
  // ... more fields
}
```

## Mapping Functions

### Core Functions

#### `mapUserFromGraphQL(user: UserGraphQL): UserClient`

Converts GraphQL snake_case user to client-side camelCase format.

**Example:**
```typescript
const graphqlUser = {
  id: "123",
  first_name: "John",
  last_name: "Doe",
  display_name: "John Doe",
  job_info: {
    hire_date: "2024-01-15",
    employment_type: "FULL_TIME"
  }
};

const clientUser = mapUserFromGraphQL(graphqlUser);

console.log(clientUser.firstName);      // "John"
console.log(clientUser.displayName);    // "John Doe"
console.log(clientUser.jobInfo?.hireDate); // "2024-01-15"
```

#### `mapUserToGraphQL(user: UserClient): UserGraphQL`

Converts client-side camelCase user back to GraphQL snake_case format.

**Example:**
```typescript
const clientUser: UserClient = {
  id: "123",
  firstName: "Jane",
  lastName: "Smith",
  displayName: "Jane Smith",
  jobInfo: {
    hireDate: "2024-02-01",
    employmentType: "PART_TIME"
  }
};

const graphqlUser = mapUserToGraphQL(clientUser);

console.log(graphqlUser.first_name);           // "Jane"
console.log(graphqlUser.job_info?.hire_date);  // "2024-02-01"
```

### Nested Object Mappers

The mapper also provides specialized functions for nested objects:

```typescript
import {
  mapJobInfoFromGraphQL,
  mapContactInfoFromGraphQL,
  mapPersonalInfoFromGraphQL,
  mapEmergencyContactFromGraphQL,
  mapDepartmentFromGraphQL
} from '$lib/types/user-mapper';
```

### Bulk Operations

For mapping arrays of users:

```typescript
import { mapUsersFromGraphQL, mapUsersToGraphQL } from '$lib/types/user-mapper';

// Convert array of GraphQL users to Client users
const clientUsers = mapUsersFromGraphQL(graphqlUsers);

// Convert array of Client users to GraphQL users
const graphqlUsers = mapUsersToGraphQL(clientUsers);
```

## Real-World Examples

### Example 1: User Profile Display Component

```svelte
<!-- src/routes/profile/+page.svelte -->
<script lang="ts">
  import type { UserClient } from '$lib/types/user-mapper';

  // Data from +page.server.ts (already mapped to camelCase)
  let { data }: { data: { user: UserClient } } = $props();
</script>

<div class="profile">
  <h1>{data.user.displayName}</h1>
  <p>Email: {data.user.email}</p>
  <p>Job Title: {data.user.jobTitle}</p>

  {#if data.user.jobInfo}
    <div class="job-details">
      <p>Hire Date: {data.user.jobInfo.hireDate}</p>
      <p>Employment Type: {data.user.jobInfo.employmentType}</p>
      <p>Remote: {data.user.jobInfo.isRemote ? 'Yes' : 'No'}</p>
    </div>
  {/if}

  {#if data.user.emergencyContacts}
    <h2>Emergency Contacts</h2>
    {#each data.user.emergencyContacts as contact}
      <div class="contact">
        <p>{contact.name} ({contact.relationship})</p>
        <p>Phone: {contact.phoneNumber}</p>
        {#if contact.isPrimary}
          <span class="badge">Primary</span>
        {/if}
      </div>
    {/each}
  {/if}
</div>
```

```typescript
// src/routes/profile/+page.server.ts
import { mapUserFromGraphQL } from '$lib/types/user-mapper';
import { GET_USER_QUERY } from '$lib/graphql/user-operations';

export const load: PageServerLoad = async ({ locals }) => {
  const client = createUrqlClient();

  const result = await client.query(GET_USER_QUERY, {
    id: locals.user.id
  }).toPromise();

  if (!result.data?.user) {
    throw error(404, 'User not found');
  }

  // Convert GraphQL snake_case to client camelCase
  const user = mapUserFromGraphQL(result.data.user);

  return { user };
};
```

### Example 2: User Edit Form with Mutation

```typescript
// src/routes/profile/edit/+page.server.ts
import { mapUserFromGraphQL, mapUserToGraphQL } from '$lib/types/user-mapper';
import { UPDATE_USER_MUTATION } from '$lib/graphql/user-operations';

export const load: PageServerLoad = async ({ locals }) => {
  const client = createUrqlClient();
  const result = await client.query(GET_USER_QUERY, { id: locals.user.id }).toPromise();

  return {
    user: mapUserFromGraphQL(result.data.user)
  };
};

export const actions = {
  updateProfile: async ({ request, locals }) => {
    const formData = await request.formData();

    // Build UserClient object from form
    const userClient: UserClient = {
      id: locals.user.id,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      displayName: formData.get('displayName') as string,
      phoneNumber: formData.get('phoneNumber') as string,
      jobInfo: {
        employmentType: formData.get('employmentType') as string,
        isRemote: formData.get('isRemote') === 'true'
      }
    };

    // Convert to GraphQL snake_case for mutation
    const userGraphQL = mapUserToGraphQL(userClient);

    const client = createUrqlClient();
    const result = await client.mutation(UPDATE_USER_MUTATION, {
      id: userClient.id,
      input: userGraphQL
    });

    if (result.error) {
      return fail(400, { error: result.error.message });
    }

    return { success: true };
  }
};
```

### Example 3: Auth Store Integration

```typescript
// src/lib/stores/auth.svelte.ts
import { mapUserFromGraphQL, type UserClient } from '$lib/types/user-mapper';

class AuthStore {
  user = $state<UserClient | null>(null);

  async setUser(userGraphQL: UserGraphQL): Promise<void> {
    // Convert GraphQL user to client format
    this.user = mapUserFromGraphQL(userGraphQL);
    await this.loadUserRoles(this.user.id);
  }

  async refreshUser(): Promise<void> {
    if (!this.user?.id) return;

    const client = createUrqlClient();
    const result = await client.query(GET_USER_QUERY, {
      id: this.user.id
    }).toPromise();

    if (result.data?.user) {
      this.user = mapUserFromGraphQL(result.data.user);
    }
  }
}
```

## Migration Guide

### Step 1: Update Server-Side Data Loading

Replace direct GraphQL responses with mapped data:

**Before:**
```typescript
export const load: PageServerLoad = async () => {
  const result = await client.query(GET_USER_QUERY, { id }).toPromise();
  return { user: result.data.user }; // snake_case
};
```

**After:**
```typescript
import { mapUserFromGraphQL } from '$lib/types/user-mapper';

export const load: PageServerLoad = async () => {
  const result = await client.query(GET_USER_QUERY, { id }).toPromise();
  return {
    user: mapUserFromGraphQL(result.data.user) // camelCase
  };
};
```

### Step 2: Update Component Type Annotations

Replace generic User types with UserClient:

**Before:**
```typescript
let { data }: { data: { user: User } } = $props();
```

**After:**
```typescript
import type { UserClient } from '$lib/types/user-mapper';

let { data }: { data: { user: UserClient } } = $props();
```

### Step 3: Update Property Access

No code changes needed! Components already use camelCase:

```typescript
// These all work automatically after mapping
user.displayName
user.firstName
user.jobInfo?.hireDate
user.emergencyContacts?.[0].phoneNumber
```

## Best Practices

### 1. Map at the Server Boundary

Always perform mapping in `+page.server.ts` or `+layout.server.ts` files:

```typescript
✅ DO: Map in server files
export const load: PageServerLoad = async () => {
  const graphqlData = await fetchFromAPI();
  return { user: mapUserFromGraphQL(graphqlData.user) };
};

❌ DON'T: Map in components
// Component
$: mappedUser = mapUserFromGraphQL(user); // Inefficient
```

### 2. Use Type Annotations

Always annotate with the correct type:

```typescript
✅ DO: Use UserClient for components
const user: UserClient = mapUserFromGraphQL(graphqlUser);

❌ DON'T: Use any or generic types
const user: any = mapUserFromGraphQL(graphqlUser);
```

### 3. Leverage Nested Mappers

Use specialized mappers for partial updates:

```typescript
✅ DO: Map only what you need
const updatedJobInfo = mapJobInfoFromGraphQL(graphqlJobInfo);

❌ DON'T: Map entire user for partial data
const user = mapUserFromGraphQL({ id, job_info: graphqlJobInfo });
```

### 4. Handle Null/Undefined Safely

The mapper handles optional fields gracefully:

```typescript
const user = mapUserFromGraphQL(graphqlUser);

// Safe access with optional chaining
const hireDate = user.jobInfo?.hireDate;
const primaryContact = user.emergencyContacts?.[0]?.phoneNumber;
```

## TypeScript Support

The mapper provides full TypeScript support with:

- **Strict typing** for all properties
- **Autocomplete** for nested objects
- **Type safety** for mutations
- **Compile-time checks** for property access

Example of TypeScript catching errors:

```typescript
const user = mapUserFromGraphQL(graphqlUser);

user.displayName;  // ✅ Valid - camelCase
user.display_name; // ❌ TypeScript error - snake_case not allowed

user.jobInfo?.hireDate;      // ✅ Valid - camelCase
user.job_info?.hire_date;    // ❌ TypeScript error - snake_case not allowed
```

## Performance Considerations

- **Lightweight transformations**: Only property renaming, no deep cloning
- **Lazy evaluation**: Nested objects mapped on-demand
- **No runtime overhead**: Pure function transformations
- **Tree-shakeable**: Unused mappers removed in production builds

## Troubleshooting

### Common Issues

**Issue 1: "Property 'displayName' does not exist on type 'User'"**

**Solution:** Ensure you're using `UserClient` type and mapping the data:

```typescript
import { mapUserFromGraphQL, type UserClient } from '$lib/types/user-mapper';

const user: UserClient = mapUserFromGraphQL(graphqlUser);
```

**Issue 2: "Cannot read property 'hireDate' of undefined"**

**Solution:** Use optional chaining for nested objects:

```typescript
const hireDate = user.jobInfo?.hireDate;
```

**Issue 3: "Mutation input validation failed"**

**Solution:** Use `mapUserToGraphQL` before sending to API:

```typescript
const graphqlUser = mapUserToGraphQL(clientUser);
await client.mutation(UPDATE_USER_MUTATION, { input: graphqlUser });
```

## Future Enhancements

Potential improvements for this mapper:

1. **Codegen integration**: Auto-generate mappers from GraphQL schema
2. **Validation layer**: Add runtime validation with Zod schemas
3. **Caching**: Memoize frequently mapped objects
4. **Batch operations**: Optimize bulk user mapping
5. **Partial mapping**: Support for patching specific fields only

## Related Documentation

- [GraphQL Operations](/src/lib/graphql/user-operations.ts)
- [Type Definitions](/src/lib/types/index.ts)
- [Auth Store](/src/lib/stores/auth.svelte.ts)
- [RBAC System](/CLAUDE.md#rbac-implementation-guide)

## Support

For questions or issues with the user mapper:

1. Check this README first
2. Review the type definitions in `user-mapper.ts`
3. Examine working examples in `+page.server.ts` files
4. Consult the main CLAUDE.md project documentation
