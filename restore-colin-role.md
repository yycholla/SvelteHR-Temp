# Restore Colin Hanway's Admin Role

This document contains GraphQL queries to restore Colin Hanway's Admin role after the mutation signature fix.

## Step 1: Find Colin's User ID

```graphql
query FindColinHanway {
  users(filter: { email: { eq: "chanway@mtncarerx.net" } }) {
    id
    email
    firstName
    lastName
    roles {
      id
      name
    }
  }
}
```

Expected result:
- If Colin has roles, they will show in the `roles` array
- If Colin has NO roles (likely the case), the array will be empty: `roles: []`
- Copy the `id` value from the result

## Step 2: Find Admin Role ID

```graphql
query FindAdminRole {
  roles(filter: { name: { eq: "Admin" } }) {
    id
    name
    description
    level
  }
}
```

Expected result:
- Should return the Admin role with its UUID
- Copy the `id` value from the result

## Step 3: Assign Admin Role to Colin

**IMPORTANT:** This uses the corrected mutation signature with `rbac` namespace!

```graphql
mutation RestoreColinAdminRole($input: AssignRoleInput!) {
  rbac {
    assignRoleToUser(input: $input) {
      id
      userId
      roleId
      createdAt
    }
  }
}
```

**Variables** (replace with actual UUIDs from steps 1 and 2):

```json
{
  "input": {
    "userId": "<COLIN_USER_ID_FROM_STEP_1>",
    "roleId": "<ADMIN_ROLE_ID_FROM_STEP_2>"
  }
}
```

Example with placeholder UUIDs:
```json
{
  "input": {
    "userId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "roleId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

## Step 4: Verify Assignment

Run the query from Step 1 again to verify Colin now has the Admin role:

```graphql
query VerifyColinRole {
  users(filter: { email: { eq: "chanway@mtncarerx.net" } }) {
    id
    email
    firstName
    lastName
    roles {
      id
      name
    }
  }
}
```

Expected result:
```json
{
  "data": {
    "users": [
      {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "email": "chanway@mtncarerx.net",
        "firstName": "Colin",
        "lastName": "Hanway",
        "roles": [
          {
            "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "name": "Admin"
          }
        ]
      }
    ]
  }
}
```

## How to Run These Queries

### Option 1: GraphQL Playground (Recommended)
1. Navigate to your GraphQL endpoint (usually `http://localhost:4000/graphql` or similar)
2. Paste each query into the left panel
3. Click the "Play" button to execute
4. Copy the UUIDs from results for use in subsequent queries

### Option 2: Using curl

```bash
# Step 1: Find Colin's User ID
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: hr_token=YOUR_SESSION_TOKEN" \
  -d '{"query": "query FindColinHanway { users(filter: { email: { eq: \"chanway@mtncarerx.net\" } }) { id email roles { id name } } }"}'

# Step 2: Find Admin Role ID
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: hr_token=YOUR_SESSION_TOKEN" \
  -d '{"query": "query FindAdminRole { roles(filter: { name: { eq: \"Admin\" } }) { id name } }"}'

# Step 3: Assign Role (replace with actual UUIDs)
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: hr_token=YOUR_SESSION_TOKEN" \
  -d '{"query": "mutation RestoreColinAdminRole($input: AssignRoleInput!) { rbac { assignRoleToUser(input: $input) { id userId roleId createdAt } } }", "variables": {"input": {"userId": "COLIN_ID", "roleId": "ADMIN_ID"}}}'
```

## Troubleshooting

**If you get "permission denied" error:**
- Make sure you're logged in as an Admin user
- Check that your session token is valid
- Verify RBAC permissions allow you to assign roles

**If you get "role already assigned" error:**
- This means Colin already has the Admin role
- Check the employees table to see if it's displaying correctly
- The issue might be with the frontend display, not the database

**If the employee table still shows "N/A":**
- Refresh the page (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
- Clear the session cache (the backend caches sessions for 60 seconds)
- Check browser console for errors

## Clean Up

After successfully restoring Colin's role, you can delete this file:

```bash
rm /home/mountain/SvelteHR/restore-colin-role.md
```
