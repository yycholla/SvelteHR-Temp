# PostGraphile Test Queries

## GraphiQL Access

Open your browser and navigate to: **http://localhost:4000/graphiql**

If the explorer shows "no schema available", try:

1. Refresh the page (Ctrl+R or Cmd+R)
2. Check the endpoint URL in GraphiQL settings (gear icon) - should be `/graphql`
3. Clear browser cache and reload

## Sample Queries to Test

### 1. Basic Schema Introspection

```graphql
{
	__schema {
		queryType {
			name
			fields {
				name
			}
		}
	}
}
```

### 2. List All Users

```graphql
query GetAllUsers {
	allUsers {
		nodes {
			id
			email
			displayName
			isActive
			createdAt
		}
	}
}
```

### 3. Get User with Related Data

```graphql
query GetUserWithRelations($userId: UUID!) {
	userById(id: $userId) {
		id
		email
		displayName
		jobInfosByEmployeeId {
			nodes {
				jobTitle
				employmentStatus
				departmentByDepartmentId {
					name
				}
			}
		}
		contactInfosByEmployeeId {
			nodes {
				phoneNumber
				city
				state
			}
		}
	}
}
```

### 4. Department Hierarchy

```graphql
query GetDepartments {
	allDepartments {
		nodes {
			id
			name
			departmentByParentDepartmentId {
				name
			}
			userByManagerId {
				displayName
				email
			}
			jobInfosByDepartmentId {
				totalCount
			}
		}
	}
}
```

### 5. User Roles and Permissions

```graphql
query GetUserRoles {
	allUserRoles {
		nodes {
			id
			name
			description
			priority
			userRoleAssignmentsByRoleId {
				nodes {
					userByUserId {
						email
						displayName
					}
					assignedAt
					isActive
				}
			}
		}
	}
}
```

### 6. Create New User (Mutation)

```graphql
mutation CreateUser($input: CreateUserInput!) {
	createUser(input: $input) {
		user {
			id
			email
			displayName
			createdAt
		}
	}
}
```

Variables:

```json
{
	"input": {
		"user": {
			"email": "newuser@example.com",
			"passwordHash": "hashed_password_here",
			"displayName": "New User"
		}
	}
}
```

### 7. Update User

```graphql
mutation UpdateUser($id: UUID!, $patch: UserPatch!) {
	updateUserById(input: { id: $id, userPatch: $patch }) {
		user {
			id
			email
			displayName
			isActive
		}
	}
}
```

Variables:

```json
{
	"id": "user-uuid-here",
	"patch": {
		"displayName": "Updated Name",
		"isActive": true
	}
}
```

## Authentication Headers

For authenticated queries, add the Authorization header:

```json
{
	"Authorization": "Bearer YOUR_JWT_TOKEN_HERE"
}
```

## Troubleshooting

### If GraphiQL Explorer isn't working:

1. Check browser console for errors (F12 → Console)
2. Verify PostGraphile is running: `curl http://localhost:4000/health`
3. Test direct GraphQL endpoint: `curl -X POST http://localhost:4000/graphql -H "Content-Type: application/json" -d '{"query":"{ __typename }"}'`
4. Check CORS settings if accessing from a different port

### Common Issues:

- **"No schema available"**: Usually a browser cache issue - hard refresh (Ctrl+Shift+R)
- **Network errors**: Check if PostGraphile is running on port 4000
- **Permission denied**: Some queries require authentication via JWT token
- **Empty results**: Check if database has sample data
