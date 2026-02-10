# JWT Authentication Test Plan

## Manual Testing Checklist

### Prerequisites

- [ ] Backend running on http://localhost:8080
- [ ] Frontend running on http://localhost:5173
- [ ] Test user exists in database (email: test@example.com)
- [ ] Database is seeded with test data

### Test Cases

#### 1. Login Flow

- [ ] Navigate to /auth/login
- [ ] Enter valid credentials
- [ ] Submit form
- [ ] Verify redirect to dashboard
- [ ] Verify user is authenticated
- [ ] Verify access token is stored in memory (not localStorage)
- [ ] Verify refresh token cookie is set (HTTP-only)

#### 2. Authenticated Requests

- [ ] Navigate to protected route (e.g., /dashboard)
- [ ] Verify GraphQL requests include Authorization header
- [ ] Verify requests succeed with valid token
- [ ] Verify user data is loaded correctly

#### 3. Token Refresh

- [ ] Wait for token to approach expiry (or manually trigger)
- [ ] Verify automatic token refresh occurs
- [ ] Verify new access token is received
- [ ] Verify old refresh token is invalidated
- [ ] Verify user remains authenticated

#### 4. Session Restoration

- [ ] Login successfully
- [ ] Refresh the page (F5)
- [ ] Verify session is restored via refresh token
- [ ] Verify user remains authenticated
- [ ] Verify access token is restored

#### 5. Logout Flow

- [ ] Click logout button
- [ ] Verify tokens are cleared
- [ ] Verify redirect to login page
- [ ] Verify cannot access protected routes
- [ ] Verify refresh token is invalidated on backend

#### 6. Error Handling

- [ ] Test invalid credentials
- [ ] Test expired refresh token
- [ ] Test revoked tokens
- [ ] Test network errors
- [ ] Verify appropriate error messages

#### 7. Security Validation

- [ ] Verify access token NOT in localStorage
- [ ] Verify access token NOT in sessionStorage
- [ ] Verify refresh token is HTTP-only cookie
- [ ] Verify Authorization header format: "Bearer <token>"
- [ ] Verify HTTPS in production

## Automated E2E Test Plan

### Test 1: Successful Login

```typescript
test('should login successfully with valid credentials', async ({ page }) => {
	await page.goto('http://localhost:5173/auth/login');
	await page.fill('[data-testid="login-username-input"]', 'test@example.com');
	await page.fill('[data-testid="login-password-input"]', 'password123');
	await page.click('[data-testid="login-submit-button"]');

	// Should redirect to dashboard
	await expect(page).toHaveURL(/\/dashboard/);

	// Should have authentication state
	const isAuthenticated = await page.evaluate(() => {
		return window.jwtAuth?.isAuthenticated ?? false;
	});
	expect(isAuthenticated).toBe(true);
});
```

### Test 2: Invalid Credentials

```typescript
test('should show error for invalid credentials', async ({ page }) => {
	await page.goto('http://localhost:5173/auth/login');
	await page.fill('[data-testid="login-username-input"]', 'test@example.com');
	await page.fill('[data-testid="login-password-input"]', 'wrongpassword');
	await page.click('[data-testid="login-submit-button"]');

	// Should show error message
	await expect(page.locator('[data-testid="login-error-message"]')).toBeVisible();
	await expect(page.locator('[data-testid="login-error-message"]')).toContainText('Invalid');
});
```

### Test 3: Protected Route Redirect

```typescript
test('should redirect to login when accessing protected route', async ({ page }) => {
	await page.goto('http://localhost:5173/dashboard');

	// Should redirect to login
	await expect(page).toHaveURL(/\/auth\/login/);
});
```

### Test 4: Logout

```typescript
test('should logout and clear authentication', async ({ page }) => {
	// Login first
	await page.goto('http://localhost:5173/auth/login');
	await page.fill('[data-testid="login-username-input"]', 'test@example.com');
	await page.fill('[data-testid="login-password-input"]', 'password123');
	await page.click('[data-testid="login-submit-button"]');
	await expect(page).toHaveURL(/\/dashboard/);

	// Logout
	await page.click('[data-testid="logout-button"]'); // Adjust selector

	// Should redirect to login
	await expect(page).toHaveURL(/\/auth\/login/);

	// Should not be authenticated
	const isAuthenticated = await page.evaluate(() => {
		return window.jwtAuth?.isAuthenticated ?? false;
	});
	expect(isAuthenticated).toBe(false);
});
```

### Test 5: Session Restoration

```typescript
test('should restore session after page refresh', async ({ page }) => {
	// Login first
	await page.goto('http://localhost:5173/auth/login');
	await page.fill('[data-testid="login-username-input"]', 'test@example.com');
	await page.fill('[data-testid="login-password-input"]', 'password123');
	await page.click('[data-testid="login-submit-button"]');
	await expect(page).toHaveURL(/\/dashboard/);

	// Refresh page
	await page.reload();

	// Should still be authenticated
	await expect(page).toHaveURL(/\/dashboard/);
	const isAuthenticated = await page.evaluate(() => {
		return window.jwtAuth?.isAuthenticated ?? false;
	});
	expect(isAuthenticated).toBe(true);
});
```

## GraphQL Testing

### Test GraphQL Login Mutation

```bash
# Using curl
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { login(input: { email: \"test@example.com\", password: \"password123\" }) { __typename ... on AuthSuccess { user { id email } tokens { accessToken } } ... on AuthError { code message } } }"
  }'
```

### Test Authenticated GraphQL Query

```bash
# Using curl with JWT token
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "query": "query { me { id email firstName lastName } }"
  }'
```

### Test Token Refresh Mutation

```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { refreshToken(input: { refreshToken: \"<JWT>\", refreshTokenPlaintext: \"<PLAINTEXT>\" }) { __typename ... on AuthSuccess { tokens { accessToken } } ... on AuthError { code message } } }"
  }'
```

## Test Data Requirements

### Test User

```sql
-- Should exist in database
INSERT INTO users (id, email, password_hash, first_name, last_name, is_active, force_password_change)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'test@example.com',
  '$2b$12$...',  -- bcrypt hash of 'password123'
  'Test',
  'User',
  true,
  false
);
```

## Success Criteria

✅ **Login Flow**

- User can login with valid credentials
- Invalid credentials show error
- Tokens are properly stored

✅ **Authentication**

- Protected routes require authentication
- GraphQL requests include JWT
- Token validation works

✅ **Token Management**

- Auto-refresh works before expiry
- Session restoration works after refresh
- Logout clears all tokens

✅ **Security**

- Access tokens NOT in localStorage
- Refresh tokens are HTTP-only
- HTTPS in production

✅ **Error Handling**

- Clear error messages
- Graceful degradation
- Automatic retry on auth errors
