# JWT and GraphQL Integration

## Overview

The GraphQL API uses **JWT-based authentication** with RS256 signed tokens for secure, stateless authentication.

## Architecture

### Request Flow

```
Client Request
    ↓
Authorization Header: "Bearer <jwt_token>"
    ↓
Axum Middleware (jwt_auth_middleware)
    ├─ Extract Bearer token
    ├─ Validate with JwtService (signature, expiration, revocation)
    ├─ Extract claims (user_id, roles, permissions, email, department_id)
    └─ Store UserContext in request.extensions()
    ↓
GraphQL Handler (graphql_handler)
    ├─ Extract UserContext from extensions
    ├─ Add to GraphQL request context via request.data()
    └─ Execute GraphQL query/mutation
    ↓
GraphQL Resolver
    └─ Access via ctx.data::<UserContext>()
```

### UserContext Structure

JWT authentication stores user information in the `UserContext` structure:

```rust
pub struct UserContext {
    pub user_id: Uuid,
    pub email: Option<String>,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
    pub department_id: Option<Uuid>,
    pub organization_id: Option<Uuid>,
}
```

## Usage in GraphQL Resolvers

### Accessing User Context

```rust
use async_graphql::*;
use crate::auth::UserContext;

#[Object]
impl QueryRoot {
    async fn me(&self, ctx: &Context<'_>) -> Result<User> {
        // Get authenticated user from context
        let user_context = ctx.data::<UserContext>()?;

        // Access user information
        let user_id = user_context.user_id;
        let roles = &user_context.roles;

        // Query database...
        Ok(user)
    }
}
```

### Authorization Checks

```rust
#[Object]
impl MutationRoot {
    async fn delete_user(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
        let user_context = ctx.data::<UserContext>()?;

        // Check if user has Admin role
        if !user_context.roles.contains(&"Admin".to_string()) {
            return Err(Error::new("Forbidden: Admin role required"));
        }

        // Check specific permission
        if !user_context.permissions.contains(&"users:delete".to_string()) {
            return Err(Error::new("Forbidden: Missing users:delete permission"));
        }

        // Proceed with deletion...
        Ok(true)
    }
}
```

### Using Guard Directives

For declarative authorization, use guard directives:

```rust
use crate::middleware::{RequireRole, RequirePermission};

#[Object]
impl MutationRoot {
    #[graphql(guard = "RequireRole::new(\"Admin\")")]
    async fn admin_operation(&self, ctx: &Context<'_>) -> Result<String> {
        // Only accessible to users with Admin role
        Ok("Success".to_string())
    }

    #[graphql(guard = "RequirePermission::new(\"users:delete\")")]
    async fn delete_user(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
        // Only accessible to users with users:delete permission
        Ok(true)
    }
}
```

## Client Integration

### Making Authenticated Requests

**Frontend (JavaScript/TypeScript):**

```typescript
// Store JWT tokens after login
const accessToken = localStorage.getItem('access_token');

// Add Authorization header to all GraphQL requests
const client = new Client({
	url: '/graphql',
	fetchOptions: {
		headers: {
			Authorization: `Bearer ${accessToken}`
		}
	}
});

// Execute query
const result = await client.query(ME_QUERY, {});
```

**Using URQL:**

```typescript
import { createClient, fetchExchange } from '@urql/core';

const client = createClient({
	url: '/graphql',
	fetchOptions: () => {
		const token = localStorage.getItem('access_token');
		return {
			headers: {
				authorization: token ? `Bearer ${token}` : ''
			}
		};
	}
});
```

**Using Apollo Client:**

```typescript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
	uri: '/graphql'
});

const authLink = setContext((_, { headers }) => {
	const token = localStorage.getItem('access_token');
	return {
		headers: {
			...headers,
			authorization: token ? `Bearer ${token}` : ''
		}
	};
});

const client = new ApolloClient({
	link: authLink.concat(httpLink),
	cache: new InMemoryCache()
});
```

## Error Handling

### Authentication Errors

When JWT validation fails, the middleware returns `401 Unauthorized`:

- **Missing token:** No Authorization header
- **Invalid format:** Not "Bearer <token>"
- **Invalid signature:** Token tampered with
- **Expired token:** Token past expiration time
- **Revoked token:** User logged out or token invalidated

### GraphQL Resolver Errors

When authorization checks fail in resolvers:

```rust
// Returns GraphQL error with message
return Err(Error::new("Forbidden: Admin role required"));
```

Client receives:

```json
{
	"data": null,
	"errors": [
		{
			"message": "Forbidden: Admin role required",
			"path": ["deleteUser"]
		}
	]
}
```

## Testing

### Unit Testing Resolvers

```rust
#[tokio::test]
async fn test_me_query() {
    use async_graphql::*;

    // Create test user context
    let user_context = UserContext {
        user_id: Uuid::new_v4(),
        email: Some("test@example.com".to_string()),
        roles: vec!["Employee".to_string()],
        permissions: vec!["users:read".to_string()],
        department_id: None,
        organization_id: None,
    };

    // Build test schema with context
    let schema = Schema::build(QueryRoot, EmptyMutation, EmptySubscription)
        .data(user_context)
        .finish();

    // Execute query
    let query = "{ me { id email } }";
    let result = schema.execute(query).await;

    assert!(result.errors.is_empty());
}
```

### Integration Testing with JWT

```rust
#[tokio::test]
async fn test_graphql_with_jwt() {
    let test_db = TestDatabase::new().await;
    let jwt_service = setup_jwt_service(&test_db).await;
    let test_user = TestUser::admin(&test_db).await;

    // Generate access token
    let access_token = jwt_service
        .generate_access_token(
            test_user.id,
            test_user.email.clone(),
            test_user.display_name.clone(),
            None,
        )
        .await
        .expect("Failed to generate token");

    // Make request with Authorization header
    let response = client
        .post("/graphql")
        .header("Authorization", format!("Bearer {}", access_token))
        .json(&json!({
            "query": "{ me { id email } }"
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), 200);
}
```

## JWT Authentication Flow

The system uses JWT-based authentication exclusively:

### Token Issuance

- Login endpoint returns access token (15 min) + refresh token (7 days)
- Access token contains user claims (id, email, roles, permissions)
- Refresh token stored in database for rotation

### Token Validation

- Every GraphQL request validates JWT access token
- Middleware extracts Bearer token from Authorization header
- JwtService validates signature, expiration, revocation

### Context Storage

JWT middleware stores `UserContext` in request extensions:

```rust
// In JWT middleware
request.extensions_mut().insert(user_context);

// In GraphQL handler
if let Some(Extension(user_context)) = user_context_ext {
    request = request.data(user_context);
}

// In resolver
let user_context = ctx.data::<UserContext>()?;
```

## Security Considerations

### Token Storage

**DO:**

- Store access tokens in memory (JavaScript variable)
- Store refresh tokens in HTTP-only cookies (when implemented)

**DON'T:**

- Store tokens in localStorage (XSS vulnerability)
- Store tokens in sessionStorage (XSS vulnerability)
- Include tokens in URLs

### Token Validation

Every GraphQL request validates:

1. **Signature** - Token signed by server
2. **Expiration** - Not past expiry time
3. **Revocation** - Check `tokens_valid_after` timestamp
4. **Claims** - Valid user_id, format

### HTTPS Required

JWT authentication **requires HTTPS** in production:

- Prevents token interception
- Protects against MITM attacks
- Enforced by secure cookie settings

## Troubleshooting

### "Unauthenticated" Error

**Symptom:** GraphQL returns authentication error

**Solutions:**

1. Check Authorization header format: `Bearer <token>`
2. Verify token not expired (15 minute default)
3. Check token not revoked (user logged out)
4. Ensure HTTPS in production

### "Forbidden" Error

**Symptom:** GraphQL returns authorization error

**Solutions:**

1. Verify user has required role
2. Check user has required permission
3. Review guard directive configuration
4. Check RLS policies in database

### Missing UserContext

**Symptom:** `ctx.data::<UserContext>()` returns error

**Solutions:**

1. Ensure route uses auth middleware
2. Check middleware order in route configuration
3. Verify token extraction succeeds
4. Check request extensions populated

## Performance

### Token Validation Overhead

- **Signature verification:** ~1-2ms (RS256)
- **Database query:** ~5-10ms (user lookup)
- **Total overhead:** ~10-15ms per request

### Caching Strategies

Future optimization: Cache user context per token:

- Key: SHA256(token)
- TTL: Token expiration - 60 seconds
- Invalidate: On revocation

### Database Queries

JWT validation is highly efficient:

1. **One query** - User lookup for `tokens_valid_after` check
2. **Zero additional queries** - Roles/permissions already in JWT claims
3. **Total overhead** - ~10-15ms per request

This is significantly faster than traditional session-based auth which requires multiple database queries for session lookup, user lookup, and RBAC queries.
