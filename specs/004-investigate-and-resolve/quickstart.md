# Quickstart: Authorization System Testing

**Purpose**: End-to-end validation scenarios for the authorization system
**Prerequisites**: Development environment running with PostgreSQL and PostGraphile

## Test Environment Setup

### 1. Database Preparation

```bash
# Start development database
make db-up

# Run authorization migrations
psql -h localhost -U postgres -d hr_system -f migrations/auth-system.sql

# Verify test users exist
psql -h localhost -U postgres -d hr_system -c "
  SELECT email, display_name,
         (SELECT name FROM user_roles ur
          JOIN user_role_assignments ura ON ur.id = ura.role_id
          WHERE ura.user_id = u.id AND ura.is_active = true LIMIT 1) as role
  FROM users u WHERE email LIKE '%@postgraphile-hr.com';
"
```

### 2. Service Startup

```bash
# Start PostGraphile backend (if not already running)
npm run backend:dev

# Start SvelteKit frontend (if not already running)
npm run frontend:dev

# Verify services are responding
curl http://localhost:4000/graphql -X POST -H "Content-Type: application/json" -d '{"query":"{ __schema { queryType { name } } }"}'
curl http://localhost:5173/api/auth/me
```

## Authentication Flow Validation

### Test Case 1: Admin User Login

**Objective**: Verify admin user can authenticate and access admin functions

```bash
# Step 1: Attempt login with admin credentials
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@postgraphile-hr.com","password":"AdminPass123!","rememberMe":false}' \
  -c cookies.txt -v

# Expected: 200 OK with Set-Cookie header containing jwt-token
# Expected Response: {"success":true,"user":{"id":"...","email":"admin@postgraphile-hr.com","displayName":"System Administrator"}}
```

```bash
# Step 2: Verify admin can access protected admin endpoint
curl -X GET http://localhost:5173/api/admin/users \
  -b cookies.txt

# Expected: 200 OK with user list data
# Expected: Admin user can see all users
```

```bash
# Step 3: Verify token refresh works
curl -X POST http://localhost:5173/api/auth/refresh \
  -b cookies.txt -c cookies.txt

# Expected: 200 OK with new jwt-token in Set-Cookie
# Expected Response: {"success":true,"user":{...},"isValid":true}
```

### Test Case 2: Employee User Access Control

**Objective**: Verify employee user has restricted access

```bash
# Step 1: Login as employee user
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"employee@postgraphile-hr.com","password":"EmployeePass123!","rememberMe":false}' \
  -c employee-cookies.txt

# Expected: 200 OK with employee user data
```

```bash
# Step 2: Attempt admin endpoint access (should fail)
curl -X GET http://localhost:5173/api/admin/users \
  -b employee-cookies.txt

# Expected: 403 Forbidden or redirect to unauthorized page
# Expected: Employee cannot access admin functions
```

```bash
# Step 3: Verify employee can access own profile
curl -X GET http://localhost:5173/api/auth/me \
  -b employee-cookies.txt

# Expected: 200 OK with employee user profile
```

### Test Case 3: Session Persistence After Page Refresh

**Objective**: Verify authentication state persists across browser refresh

```bash
# Step 1: Login and get initial session
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@postgraphile-hr.com","password":"AdminPass123!"}' \
  -c session-cookies.txt

# Step 2: Simulate page refresh by calling auth validation
curl -X POST http://localhost:5173/api/auth/refresh \
  -b session-cookies.txt

# Expected: 200 OK, user session maintained
# Expected: Same user data returned
```

### Test Case 4: Invalid Authentication Handling

**Objective**: Verify proper error handling for invalid credentials

```bash
# Step 1: Attempt login with wrong password
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@postgraphile-hr.com","password":"WrongPassword123!"}' \
  -v

# Expected: 401 Unauthorized
# Expected Response: {"success":false,"error":"Invalid email or password"}
```

```bash
# Step 2: Attempt access with no authentication
curl -X GET http://localhost:5173/api/auth/me

# Expected: 401 Unauthorized or redirect to login
```

```bash
# Step 3: Attempt access with expired/invalid token
curl -X GET http://localhost:5173/api/auth/me \
  -H "Cookie: jwt-token=invalid.token.here"

# Expected: 401 Unauthorized
# Expected: Cookie should be cleared in response
```

## Role-Based Authorization Validation

### Test Case 5: Role Hierarchy Enforcement

**Objective**: Verify permission levels work correctly

```bash
# Test HR user permissions (level 80)
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"hr@postgraphile-hr.com","password":"HRPass123!"}' \
  -c hr-cookies.txt

# HR should access employee data but not system config
curl -X GET http://localhost:5173/api/hr/employees -b hr-cookies.txt
# Expected: 200 OK

curl -X GET http://localhost:5173/api/admin/system-config -b hr-cookies.txt
# Expected: 403 Forbidden
```

### Test Case 6: PostgreSQL RLS Policy Verification

**Objective**: Verify database-level security policies work

```bash
# Query PostGraphile GraphQL with different user tokens
# Admin user should see all data
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: jwt-token=$(cat admin-token.txt)" \
  -d '{"query":"{ users { nodes { id email displayName } } }"}'

# Expected: All users returned

# Employee user should see limited data
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: jwt-token=$(cat employee-token.txt)" \
  -d '{"query":"{ users { nodes { id email displayName } } }"}'

# Expected: Only own user data or public profiles
```

## Security Feature Validation

### Test Case 7: Token Expiration and Refresh

**Objective**: Verify token lifecycle management

```bash
# Step 1: Login and note token expiration
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@postgraphile-hr.com","password":"AdminPass123!"}' \
  -c fresh-cookies.txt

# Step 2: Wait for token to near expiration (or use a short-lived test token)
# Step 3: Verify refresh works before expiration
curl -X POST http://localhost:5173/api/auth/refresh \
  -b fresh-cookies.txt -c refreshed-cookies.txt

# Expected: New token issued successfully
```

### Test Case 8: Logout and Session Cleanup

**Objective**: Verify logout properly clears authentication state

```bash
# Step 1: Login and verify authentication works
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@postgraphile-hr.com","password":"AdminPass123!"}' \
  -c logout-test-cookies.txt

curl -X GET http://localhost:5173/api/auth/me -b logout-test-cookies.txt
# Expected: 200 OK with user data

# Step 2: Logout
curl -X POST http://localhost:5173/api/auth/logout \
  -b logout-test-cookies.txt -c logout-test-cookies.txt

# Expected: 200 OK with success message
# Expected: Set-Cookie header clearing jwt-token

# Step 3: Verify authentication no longer works
curl -X GET http://localhost:5173/api/auth/me -b logout-test-cookies.txt
# Expected: 401 Unauthorized
```

## Frontend Integration Validation

### Test Case 9: Browser-Based Flow (Manual Test)

**Objective**: Verify full browser integration works

**Manual Steps**:

1. Open browser to http://localhost:5173
2. Should redirect to /login if not authenticated
3. Enter admin credentials: admin@postgraphile-hr.com / AdminPass123!
4. Should redirect to /admin dashboard (not regular dashboard)
5. Refresh page - should remain on admin dashboard
6. Open new tab to http://localhost:5173/admin - should access directly
7. Logout - should redirect to login page
8. Back button should not allow access to admin pages

**Expected Results**:

- No authentication loops between login/dashboard
- Proper role-based routing (admin → /admin, others → /dashboard)
- Display name shows "System Administrator" not "User"
- Session persists across page refreshes
- Logout properly clears all access

### Test Case 10: Error Scenarios

**Objective**: Verify graceful error handling

```bash
# Test malformed requests
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"invalid":"json"}'
# Expected: 400 Bad Request

# Test PostGraphile service down (stop backend)
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@postgraphile-hr.com","password":"AdminPass123!"}'
# Expected: 500 Internal Server Error with user-friendly message
```

## Success Criteria

✅ **All test cases pass with expected results**
✅ **No authentication loops or infinite redirects**
✅ **Proper role-based access control enforced**
✅ **Session state persists across page refreshes**
✅ **Security policies prevent unauthorized access**
✅ **Error handling is graceful and informative**
✅ **JWT tokens are properly secured in httpOnly cookies**
✅ **Database-level RLS policies are enforced**

## Troubleshooting Common Issues

**Issue**: "Authentication service unavailable"
**Solution**: Check PostGraphile service is running on port 4000

**Issue**: "Invalid email or password" for correct credentials
**Solution**: Verify password hash in database matches expected format

**Issue**: Token refresh fails
**Solution**: Check JWT secret configuration matches between services

**Issue**: RLS policies not working
**Solution**: Verify PostgreSQL roles and current_setting() functions work

**Issue**: Frontend shows "User" instead of display name
**Solution**: Check auth store is properly hydrated from server data
