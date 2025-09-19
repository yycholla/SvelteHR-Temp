# Quickstart: Authentication Redirect Loop Fix

## Prerequisites

1. **Development Environment**:

   ```bash
   npm install
   npm run dev  # SvelteKit on http://localhost:5175
   ```

2. **Database Setup**:

   ```bash
   # PostGraphile should be running on http://localhost:4000
   # Verify GraphQL endpoint is accessible
   curl -X POST http://localhost:4000/graphql \
     -H "Content-Type: application/json" \
     -d '{"query": "query { __typename }"}'
   ```

3. **Test User Account**:
   - Email: `admin@postgraphile-hr.com`
   - Password: `admin123`
   - Role: `hr_admin` (level 100)

## Quick Validation Steps

### 1. Reproduce the Redirect Loop (Current Broken State)

**Expected Behavior**: Login should redirect to admin dashboard
**Current Broken Behavior**: Infinite redirects between login and admin

```bash
# Start the application
npm run dev

# Open browser to http://localhost:5175
# Should redirect to /login (this part works)

# Login with admin credentials
# PROBLEM: After successful login, redirects loop between pages
```

**Symptoms to observe**:

- Console shows multiple `validateSession: Starting validation` messages
- Browser shows rapid redirects between `/login` and `/admin`
- Network tab shows repeated requests
- Application becomes unusable

### 2. Run Playwright Tests (Should Fail)

```bash
# Create failing test first (TDD approach)
npm run test:e2e

# Expected result: Tests should fail, demonstrating the redirect loop
```

### 3. Authentication State Debugging

Open browser console and check:

```javascript
// Check authentication state
console.log('Auth state:', {
	localStorage: localStorage.getItem('postgraphile-jwt-token'),
	sessionStorage: Object.keys(sessionStorage).filter((k) => k.includes('hr_')),
	currentURL: window.location.href
});

// Check for repeated function calls
// Should see multiple "validateSession" logs indicating the problem
```

## Test Scenarios

### Scenario 1: Successful Admin Login (Currently Failing)

**Steps**:

1. Navigate to `http://localhost:5175`
2. Should redirect to `/login`
3. Enter admin credentials:
   - Email: `admin@postgraphile-hr.com`
   - Password: `admin123`
4. Click "Sign In"

**Expected Result**:

- JWT token stored in localStorage
- User redirected to `/admin` dashboard
- Admin page loads without further redirects

**Current Broken Result**:

- JWT token stored correctly
- Multiple redirects between pages
- Application becomes unusable

### Scenario 2: Already Authenticated User (Currently Failing)

**Steps**:

1. Complete Scenario 1 successfully (after fix)
2. Open new tab to `http://localhost:5175`
3. Should detect existing authentication

**Expected Result**:

- Immediate redirect to `/admin` (no login required)
- Single redirect, no loops

**Current Broken Result**:

- Multiple redirects even with valid token

### Scenario 3: Token Expiration Handling

**Steps**:

1. Login successfully
2. Manually expire the JWT token in localStorage
3. Navigate to protected route

**Expected Result**:

- Single redirect to `/login`
- Clear error message about session expiration

### Scenario 4: Multiple Browser Tabs

**Steps**:

1. Open application in two browser tabs
2. Login in one tab
3. Navigate in both tabs

**Expected Result**:

- Both tabs should share authentication state
- No redirect conflicts between tabs

## Performance Validation

### Authentication Speed Test

```bash
# Time the authentication flow
time curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { authenticate(input: {email: \"admin@postgraphile-hr.com\", password: \"admin123\"}) { jwtToken } }"
  }'

# Should complete in < 200ms
```

### Client-Side Validation Test

```javascript
// In browser console, measure client-side auth check speed
console.time('auth-validation');
// Trigger auth validation
console.timeEnd('auth-validation');
// Should complete in < 100ms
```

## Common Issues and Solutions

### Issue 1: "Too Many Redirects" Browser Error

**Symptoms**: Browser shows "This page isn't working - redirected you too many times"
**Cause**: Infinite redirect loop between pages
**Debug**: Check browser console for repeated validation calls

### Issue 2: JWT Token Present but Auth Fails

**Symptoms**: localStorage has token but user appears unauthenticated
**Cause**: Token validation failing silently
**Debug**: Check token expiration and PostGraphile connectivity

### Issue 3: Session Storage Conflicts

**Symptoms**: Auth works in one tab but not others
**Cause**: Session storage flags not being cleared properly
**Debug**: Check sessionStorage for `hr_*` keys

### Issue 4: Race Condition on Page Load

**Symptoms**: Sometimes works, sometimes doesn't
**Cause**: Auth state not stabilized before navigation decisions
**Debug**: Check timing of validateSession calls

## Success Criteria

After implementing the fix, all of these should work:

- [ ] Login redirects to admin dashboard without loops
- [ ] Already authenticated users skip login page
- [ ] Expired tokens redirect to login exactly once
- [ ] Multiple tabs share authentication state
- [ ] Browser back/forward buttons work correctly
- [ ] No console errors related to authentication
- [ ] Auth validation completes in < 200ms
- [ ] Page loads are responsive, not blocked by auth checks

## Rollback Plan

If the fix causes regressions:

1. **Immediate Rollback**:

   ```bash
   git checkout [previous-working-commit]
   npm run dev
   ```

2. **Identify Issues**:
   - Check console for new errors
   - Verify basic login still works
   - Test role-based access control

3. **Incremental Fix**:
   - Apply changes in smaller increments
   - Test each change independently
   - Use git bisect to isolate problems

## Monitoring and Logs

### Key Metrics to Track

- Authentication response time
- Number of redirect attempts per user session
- Error rates in authentication flow
- Console error frequency

### Log Messages to Monitor

- `validateSession: Starting validation` (should occur once per app load)
- `AuthGuard: Initializing authentication` (should occur once)
- `Admin layout: User is authorized` (should occur once per admin page load)
- Any redirect-related error messages

### Performance Benchmarks

- Initial page load: < 2 seconds
- Authentication validation: < 200ms
- Page navigation: < 100ms
- Zero redirect loops under normal operation
