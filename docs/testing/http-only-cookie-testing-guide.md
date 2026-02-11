# HTTP-Only Cookie Implementation - Testing Guide

## 🎯 Quick Test Summary

All HTTP-only cookie functionality has been implemented for JWT refresh tokens. This guide will help you verify the implementation works correctly.

---

## Prerequisites

- Docker running (for backend)
- Node.js installed (for frontend)
- Test user credentials:
  - Email: `admin@mountainhr.dev`
  - Password: `admin123`

---

## Step 1: Start the Services

### Start Backend (Docker)

```bash
cd /home/chanway/Documents/SvelteHR
mise run dev:docker
```

**Wait for:** `🚀 Server starting on http://0.0.0.0:4000`

### Start Frontend (Local)

```bash
cd /home/chanway/Documents/SvelteHR
npm run dev
```

**Wait for:** `Local: http://localhost:5173/`

---

## Step 2: Browser Testing (Recommended)

### 2.1 Test Login Flow

1. **Open Browser:** Navigate to http://localhost:5173
2. **Open DevTools:** Press F12
3. **Open Application Tab:** Application → Cookies → http://localhost:5173
4. **Login:** Use credentials above
5. **Verify Cookie:**
   - ✅ Cookie named `refresh_token` exists
   - ✅ HttpOnly flag is checked
   - ✅ Secure flag is checked (if HTTPS)
   - ✅ SameSite is "Strict"
   - ✅ Path is "/"
   - ✅ Expires in ~7 days

### 2.2 Test Response Body

1. **Open Network Tab:** Network → Filter: GraphQL
2. **Login again** (refresh page first)
3. **Check login response:**
   - ✅ Contains: `accessToken`
   - ✅ Contains: `tokenType` ("Bearer")
   - ✅ Contains: `expiresIn` (900 seconds)
   - ❌ Does NOT contain: `refreshToken`
   - ❌ Does NOT contain: `refreshTokenPlaintext`

### 2.3 Test JavaScript Cannot Access Cookie

1. **Open Console Tab**
2. **Run command:**
   ```javascript
   console.log(document.cookie);
   ```
3. **Verify:**
   - ❌ `refresh_token` should NOT appear in output
   - ✅ HttpOnly cookies are hidden from JavaScript

### 2.4 Test Token Refresh

1. **Stay logged in** for 14+ minutes (or modify timer for testing)
2. **Monitor Network Tab:** Watch for `refreshToken` mutation
3. **Verify:**
   - ✅ Mutation called automatically
   - ✅ No `refreshToken` parameter in request body
   - ✅ Cookie automatically sent in request headers
   - ✅ New access token received
   - ✅ Cookie updated (check Application tab timestamp)

### 2.5 Test Logout

1. **Click Logout** button
2. **Check Application Tab → Cookies**
3. **Verify:**
   - ✅ `refresh_token` cookie is deleted OR
   - ✅ Cookie has `Max-Age=0` (expired)
4. **Try accessing protected route:**
   - ✅ Redirected to login page

---

## Step 3: Command Line Testing

### 3.1 Test Login Returns Cookie

```bash
curl -c /tmp/cookies.txt -i -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation{login(input:{email:\"admin@mountainhr.dev\",password:\"admin123\"}){...on AuthSuccess{user{email}tokens{accessToken tokenType expiresIn}}...on AuthError{code message}}}"}'
```

**Expected Output:**

```
Set-Cookie: refresh_token=<jwt>:<plaintext>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800
```

**Check Cookie File:**

```bash
cat /tmp/cookies.txt | grep refresh_token
```

### 3.2 Test Token Refresh Uses Cookie

```bash
curl -b /tmp/cookies.txt -i -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation{refreshToken{...on AuthSuccess{tokens{accessToken}}...on AuthError{code message}}}"}'
```

**Expected:**

- ✅ Request includes Cookie header automatically
- ✅ Response includes new Set-Cookie header
- ✅ New access token returned

### 3.3 Test Logout Clears Cookie

```bash
# First get access token from login response above, then:
curl -b /tmp/cookies.txt -i -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"query":"mutation{logout{success message}}"}'
```

**Expected:**

```
Set-Cookie: refresh_token=; Max-Age=0
```

---

## Step 4: Run Automated Tests

### 4.1 Unit Tests

```bash
npm run test:unit -- tests/unit/stores/jwt-auth.test.ts
```

**Expected:** All tests pass

### 4.2 E2E Tests

```bash
npm run test:e2e -- tests/e2e/jwt-auth.spec.ts
```

**Expected:** 27 tests pass

---

## Step 5: Security Verification

### 5.1 Verify All 3 Security Fixes

| Vulnerability          | Test                                            | Expected Result                |
| ---------------------- | ----------------------------------------------- | ------------------------------ |
| 1. Dev Password Bypass | Try login with `admin@mountainhr.dev` / `admin` | ❌ Should fail                 |
| 2. Rate Limiting       | Send 150 rapid login requests                   | ✅ Get 429 after ~100 requests |
| 3. HTTP-Only Cookies   | Check `document.cookie` in console              | ❌ Refresh token NOT visible   |

### 5.2 Check Cookie Attributes

```bash
# In browser console after login:
const cookies = document.cookie.split(';');
console.log(cookies);
// refresh_token should NOT be in the list
```

### 5.3 Check Network Headers

In DevTools Network tab, check login request:

**Request Headers:**

```
Content-Type: application/json
```

**Response Headers:**

```
Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800
```

---

## Troubleshooting

### Issue: Backend not responding

**Solution:**

```bash
docker logs sveltehr-graphql-rust --tail 50
# Look for compilation errors or startup messages
```

### Issue: Frontend can't connect to backend

**Solution:**

```bash
# Check CORS is configured for localhost:5173
grep -r "5173" graphql-rust-server/src/main.rs
```

### Issue: Cookie not being set

**Solution:**

- Check browser console for errors
- Verify backend is on localhost:4000
- Check cookie domain matches frontend domain

### Issue: Cookie visible in JavaScript

**Solution:**

- Verify HttpOnly flag is set in Response Headers
- Check browser security settings

---

## Expected Behavior Summary

### ✅ What Should Work:

1. Login sets HTTP-only cookie
2. Cookie has correct security attributes
3. Refresh token NOT in GraphQL response body
4. Token refresh happens automatically (no parameters)
5. Cookie sent automatically with all requests
6. JavaScript cannot access the cookie
7. Logout clears the cookie
8. Old cookie invalidated after refresh (token rotation)

### ❌ What Should NOT Work:

1. Accessing `document.cookie` shows refresh token
2. Login with dev bypass credentials (`admin` / `admin`)
3. 150+ rapid login requests without rate limiting
4. Using old refresh token after new one issued
5. Refresh token visible in Network tab response body

---

## Success Criteria

- ✅ All 27 E2E tests pass
- ✅ Manual browser testing confirms HTTP-only flag
- ✅ Refresh token not in response body
- ✅ Token refresh works automatically
- ✅ Logout clears cookie
- ✅ Rate limiting active (429 after limit)
- ✅ Dev password bypass removed

---

## Production Deployment Checklist

Before deploying to production:

- [ ] All tests pass (unit + E2E)
- [ ] Manual testing completed
- [ ] Security scan performed
- [ ] Documentation updated
- [ ] HTTPS enforced (Secure cookie requires it)
- [ ] Environment variables configured
- [ ] JWT keys generated for production
- [ ] Monitoring/alerting configured
- [ ] Backup/rollback plan ready

---

## Additional Resources

- **Security Audit Report:** `docs/security/security-verification-report.md`
- **JWT Documentation:** `docs/authentication/`
- **E2E Tests:** `tests/e2e/jwt-auth.spec.ts`
- **Backend Cookie Module:** `graphql-rust-server/src/cookie.rs`

---

**Testing Status:** Ready for manual verification
**Implementation Status:** ✅ Complete
**Security Status:** ✅ All 3 critical vulnerabilities fixed
