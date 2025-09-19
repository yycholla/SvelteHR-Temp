# Authentication Contract: PostGraphile HR System

## Contract Overview

This contract defines the authentication flow and JWT token management for the PostGraphile HR system, replacing Hasura's authentication layer.

## Authentication Endpoints

### 1. Employee Authentication

**GraphQL Mutation:**

```graphql
mutation Authenticate($input: AuthenticateInput!) {
	authenticate(input: $input) {
		jwtToken
		refreshToken
		employee {
			id
			firstName
			lastName
			email
			roleLevel
			department {
				id
				name
			}
		}
	}
}
```

**Input Contract:**

```json
{
	"input": {
		"email": "employee@company.com",
		"password": "securePassword123"
	}
}
```

**Success Response Contract:**

```json
{
	"data": {
		"authenticate": {
			"jwtToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
			"refreshToken": "refresh_abc123...",
			"employee": {
				"id": 123,
				"firstName": "John",
				"lastName": "Doe",
				"email": "john.doe@company.com",
				"roleLevel": 60,
				"department": {
					"id": 5,
					"name": "Engineering"
				}
			}
		}
	}
}
```

**Error Response Contract:**

```json
{
	"data": {
		"authenticate": null
	},
	"errors": [
		{
			"message": "Invalid email or password",
			"extensions": {
				"code": "AUTHENTICATION_FAILED",
				"exception": {
					"field": "credentials"
				}
			}
		}
	]
}
```

### 2. Token Refresh

**GraphQL Mutation:**

```graphql
mutation RefreshToken($input: RefreshTokenInput!) {
	refreshToken(input: $input) {
		jwtToken
		refreshToken
	}
}
```

**Input Contract:**

```json
{
	"input": {
		"refreshToken": "refresh_abc123..."
	}
}
```

**Success Response Contract:**

```json
{
	"data": {
		"refreshToken": {
			"jwtToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
			"refreshToken": "refresh_def456..."
		}
	}
}
```

### 3. Logout

**GraphQL Mutation:**

```graphql
mutation Logout {
	logout {
		success
	}
}
```

**Response Contract:**

```json
{
	"data": {
		"logout": {
			"success": true
		}
	}
}
```

## JWT Token Structure

### Access Token Claims

```json
{
	"role": "hr_manager",
	"exp": 1706886000,
	"employee_id": 123,
	"department_id": 5,
	"role_level": 60,
	"is_admin": false,
	"permissions": ["view_department_employees", "approve_time_off", "conduct_performance_reviews"],
	"iat": 1706885100,
	"iss": "svelteHR"
}
```

### Token Validation Rules

- **Expiration**: 15 minutes maximum
- **Role**: Must be valid PostgreSQL role (hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin)
- **Employee ID**: Must exist in employees table
- **Department ID**: Must match employee's current department
- **Role Level**: Must match employee's role_level field
- **Permissions**: Must be subset of role's allowed permissions

## HTTP Headers

### Authorization Header

```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

### Required Headers for GraphQL

```
Content-Type: application/json
Authorization: Bearer <jwt_token>
X-Request-ID: uuid-for-tracing
```

## Role-Based Access Matrix

### GraphQL Operation Access by Role

| Operation               | Guest | Employee       | Manager         | HR Admin | Super Admin |
| ----------------------- | ----- | -------------- | --------------- | -------- | ----------- |
| `authenticate`          | ✅    | ✅             | ✅              | ✅       | ✅          |
| `currentEmployee`       | ❌    | ✅             | ✅              | ✅       | ✅          |
| `employee(id)`          | ❌    | ✅ (self only) | ✅ (department) | ✅ (all) | ✅ (all)    |
| `employees`             | ❌    | ❌             | ✅ (department) | ✅ (all) | ✅ (all)    |
| `createEmployee`        | ❌    | ❌             | ❌              | ✅       | ✅          |
| `updateEmployee`        | ❌    | ✅ (self only) | ✅ (department) | ✅ (all) | ✅ (all)    |
| `submitTimeOffRequest`  | ❌    | ✅             | ✅              | ✅       | ✅          |
| `approveTimeOffRequest` | ❌    | ❌             | ✅              | ✅       | ✅          |
| `departmentReport`      | ❌    | ❌             | ✅ (own dept)   | ✅ (all) | ✅ (all)    |
| `payrollSummary`        | ❌    | ❌             | ❌              | ✅       | ✅          |

## Error Codes and Messages

### Authentication Errors

- `AUTHENTICATION_FAILED`: Invalid email or password
- `ACCOUNT_DISABLED`: Employee account is disabled
- `ACCOUNT_LOCKED`: Too many failed login attempts
- `INVALID_TOKEN`: JWT token is malformed or invalid
- `TOKEN_EXPIRED`: JWT token has expired
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions

### Authorization Errors

- `FORBIDDEN`: Operation not allowed for current role
- `DEPARTMENT_ACCESS_DENIED`: Cannot access data from other departments
- `EMPLOYEE_ACCESS_DENIED`: Cannot access other employee's data
- `ADMIN_REQUIRED`: Operation requires administrative privileges

## Security Requirements

### Password Policy

- Minimum 12 characters
- Must include uppercase, lowercase, number, special character
- Cannot reuse last 12 passwords
- Must be changed every 90 days for admin roles

### Session Management

- Access token expiry: 15 minutes
- Refresh token expiry: 30 days
- Automatic logout on role change
- Session invalidation on password change

### Rate Limiting

- Authentication attempts: 5 per minute per IP
- Token refresh: 10 per minute per user
- GraphQL queries: 100 per minute per user
- Failed auth lockout: 15 minutes after 5 failures

## PostgreSQL Integration

### Database Functions Called

```sql
-- Authentication
hr_public.authenticate(email text, password text) → jwt_token

-- Token validation (automatic via PostGraphile)
hr_public.jwt_token_validation(token jwt_token) → boolean

-- Session management
hr_public.invalidate_tokens(employee_id integer) → void
```

### PostgreSQL Roles Assigned

```sql
-- Role assignment based on JWT claims
SET LOCAL ROLE hr_employee; -- role_level 20
SET LOCAL ROLE hr_manager;  -- role_level 60
SET LOCAL ROLE hr_admin;    -- role_level 80
SET LOCAL ROLE hr_super_admin; -- role_level 100
```

### Session Variables Set

```sql
-- User context variables for RLS policies
SET LOCAL "user.employee_id" = '123';
SET LOCAL "user.department_id" = '5';
SET LOCAL "user.role_level" = '60';
SET LOCAL "user.permissions" = '["approve_time_off"]';
```

## Integration with Frontend

### SvelteKit Authentication Store

```typescript
// Expected authentication state structure
interface AuthState {
	isAuthenticated: boolean;
	employee: Employee | null;
	token: string | null;
	refreshToken: string | null;
	permissions: string[];
	tokenExpiry: number;
}
```

### GraphQL Client Configuration

```typescript
// Urql client authentication configuration
const authExchange = authExchange({
	addAuthToOperation: ({ authState, operation }) => {
		if (!authState?.token) return operation;

		return makeOperation(operation.kind, operation, {
			...operation.context,
			fetchOptions: {
				...operation.context.fetchOptions,
				headers: {
					...operation.context.fetchOptions?.headers,
					Authorization: `Bearer ${authState.token}`
				}
			}
		});
	},

	getAuth: async ({ authState, mutate }) => {
		if (!authState?.refreshToken) return null;

		// Auto-refresh logic
		if (authState.tokenExpiry < Date.now()) {
			const result = await mutate(REFRESH_TOKEN_MUTATION, {
				input: { refreshToken: authState.refreshToken }
			});

			return {
				token: result.data?.refreshToken?.jwtToken,
				refreshToken: result.data?.refreshToken?.refreshToken,
				tokenExpiry: Date.now() + 15 * 60 * 1000 // 15 minutes
			};
		}

		return authState;
	}
});
```

## Testing Requirements

### Contract Test Cases

1. **Valid Authentication**: Employee can authenticate with correct credentials
2. **Invalid Credentials**: Authentication fails with wrong password
3. **Disabled Account**: Authentication fails for disabled employee
4. **Token Expiration**: Expired tokens are rejected
5. **Role-Based Access**: Each role can only access permitted operations
6. **Department Isolation**: Managers cannot access other departments
7. **Token Refresh**: Valid refresh tokens generate new access tokens
8. **Session Cleanup**: Logout invalidates all tokens for user

### Performance Requirements

- Authentication response time: <500ms
- Token validation: <50ms
- Role assignment: <10ms
- Session cleanup: <100ms

This contract ensures PostGraphile authentication maintains the same security standards as Hasura while providing the flexibility of database-driven authentication logic.
