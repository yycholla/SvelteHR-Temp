# Quickstart Guide: GelDB Login Integration (Updated)

**Feature**: GelDB Login Page Integration  
**Date**: 2025-01-13 (Updated for existing MountainHR-Backend)  
**Audience**: Developers, QA Engineers, Product Managers

This guide provides step-by-step instructions to integrate SvelteKit frontend with the existing MountainHR-Backend GelDB authentication system.

---

## Prerequisites

### Development Environment
- **Node.js**: 18+ with npm
- **MountainHR-Backend**: Already running at `/home/yycholla/Documents/MountainHR-Backend/`
- **GelDB Instance**: Already configured with Auth extension (port 10700)
- **Go Backend**: Already running on port 8080
- **Environment Variables**: Properly configured in both projects

### Required Configuration

```bash
# SvelteKit Frontend Environment (.env.local)
PUBLIC_API_URL=http://localhost:8080  # MountainHR-Backend API
PRIVATE_API_URL=http://localhost:8080  # Server-side API calls
NODE_ENV=development

# MountainHR-Backend already configured with:
# - GelDB on port 10700
# - Magic Link provider enabled
# - Auth signing keys configured
```

### Existing GelDB Configuration (Already Done ✅)

```sql
-- ✅ Auth extension already enabled in MountainHR-Backend
using extension auth;

-- ✅ Magic Link provider already configured
-- Check configuration:
SELECT ext::auth::AuthConfig { 
    providers, 
    allowed_redirect_urls 
};

-- ✅ RBAC system already implemented
SELECT RBAC::User { 
    email, 
    roles: { name }, 
    identity_id  -- New field added for GelDB integration
} LIMIT 5;
```

---

## Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
# Clone and install
git checkout 002-i-would-like
npm install

# Verify environment
npm run check
```

### 2. Verify Backend Setup
```bash
# Check MountainHR-Backend is running
curl -X GET http://localhost:8080/api/v1/health

# Verify GelDB auth extension (from backend directory)
cd /home/yycholla/Documents/MountainHR-Backend
edgedb query "SELECT ext::auth::AuthConfig { providers }"

# Confirm schema updates are applied
edgedb query "SELECT RBAC::User { identity_id } LIMIT 1"
```

### 3. Start Development Server
```bash
# Start with Doppler (recommended)
npm run dev

# Or start locally
npm run dev:local
```

### 4. Verify Integration Setup
- **Backend**: Visit http://localhost:8080/api/v1/health (should return OK)
- **Frontend**: Visit http://localhost:5173 (should show login page)
- **Auth Flow**: Frontend should integrate with existing MountainHR-Backend auth
- **Magic Link**: Uses existing GelDB Magic Link provider configuration

---

## User Journey Testing

### Primary Authentication Flow

**Step 1: Initiate Login**
```bash
# Visit application
curl -I http://localhost:5173

# Should redirect to /auth/login (302)
# Verify PKCE cookie is set
```

**Step 2: Start Authentication**
```bash
# Click login button (or test endpoint)
curl -X GET http://localhost:5173/auth/login \
  -c cookies.txt -L

# Should redirect to GelDB UI with challenge parameter
# Verify gel-pkce-verifier cookie is set
```

**Step 3: Complete Magic Link Flow**
1. Enter email address in GelDB UI
2. Check email for magic link
3. Click magic link
4. Should redirect back to http://localhost:5173/auth/callback

**Step 4: Handle Callback (via MountainHR-Backend)**
```bash
# Callback goes through existing backend auth system
curl -X GET "http://localhost:5173/auth/callback?code=AUTH_CODE_HERE" \
  -b cookies.txt -c cookies.txt -L

# Frontend calls MountainHR-Backend to exchange code for token
# Backend validates with GelDB and returns authenticated session
# Should redirect to dashboard (302)
```

**Step 5: Verify Authentication (via Backend)**
```bash
# Test authentication through MountainHR-Backend
curl -X GET http://localhost:8080/api/v2/auth/verify \
  -H "Authorization: Bearer TOKEN_HERE"

# Should return RBAC::User data with roles and permissions
# Frontend uses this data for authorization decisions
```

---

## RBAC Testing

### Role-Based Page Access

**Admin User**
```bash
# Access admin pages
curl -X GET http://localhost:5173/admin/users \
  -b cookies.txt

# Should return 200 (allowed)
```

**Manager User**
```bash
# Access employee management
curl -X GET http://localhost:5173/employees \
  -b cookies.txt

# Should return 200 (allowed)

# Try admin pages
curl -X GET http://localhost:5173/admin/system \
  -b cookies.txt

# Should return 403 (forbidden)
```

**Employee User**
```bash
# Access own profile
curl -X GET http://localhost:5173/profile \
  -b cookies.txt

# Should return 200 (allowed)

# Try HR pages
curl -X GET http://localhost:5173/hr/reports \
  -b cookies.txt

# Should return 403 (forbidden)
```

### Permission Checking API

```bash
# Check specific permission
curl -X POST http://localhost:5173/api/permissions/check \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"permission": "employees:read"}'

# Response:
# {"allowed": true, "permission": "employees:read"}
```

---

## Integration Testing

### Contract Tests (Frontend-Backend Integration)

```bash
# Run integration contract tests
npm run test:contract -- auth

# Expected output:
# ✅ MountainHR-Backend auth API integration
# ✅ Frontend auth service client
# ✅ RBAC permission validation
# ✅ Token exchange and validation
```

### End-to-End Tests

```bash
# Run E2E auth flow
npm run test:e2e -- auth.spec.ts

# Test scenarios:
# ✅ Complete login flow
# ✅ Role-based page access
# ✅ Session management
# ✅ Logout flow
```

### Backend Integration Tests

```bash
# Run with existing MountainHR-Backend
npm run test:integration -- auth

# Tests:
# ✅ Frontend-backend auth flow integration
# ✅ RBAC::User identity_id linking
# ✅ Session management via backend API
# ✅ Permission-based route protection
```

---

## Troubleshooting

### Common Issues

**1. PKCE Verifier Cookie Missing**
```bash
# Check browser cookies
# Verify secure cookie settings
# Check CORS configuration
```

**2. MountainHR-Backend Unavailable**
```bash
# Verify backend is running
curl -X GET http://localhost:8080/api/v1/health

# Check GelDB auth extension (from backend directory)
cd /home/yycholla/Documents/MountainHR-Backend
edgedb query "SELECT ext::auth::AuthConfig"
```

**3. Token Validation Failing**
```bash
# Check token format
curl -X GET http://localhost:5173/api/auth/verify \
  -H "Cookie: gel-auth-token=invalid" -v

# Verify signing key configuration
```

**4. RBAC Permissions Not Working**
```bash
# Check user roles
edgedb query "
  SELECT RBAC::User { 
    email, roles: { name } 
  } FILTER .email = 'user@example.com'
"

# Verify role permissions
edgedb query "
  SELECT RBAC::Role { 
    name, permissions 
  }
"
```

### Debug Commands

```bash
# Check session state
npm run auth:debug -- session

# Verify RBAC configuration
npm run rbac:debug -- permissions

# Test token validation
npm run auth:debug -- validate-token
```

---

## Production Checklist

### Security Validation
- [ ] HTTPS enforced
- [ ] Secure cookie flags set
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Audit logging active

### Performance Validation
- [ ] Auth redirect < 200ms
- [ ] Token validation < 100ms
- [ ] Session lookup optimized
- [ ] Database queries indexed

### Monitoring Setup
- [ ] Auth event logging
- [ ] Error alerting
- [ ] Performance metrics
- [ ] Security incident detection

### Deployment Verification
- [ ] Frontend environment variables configured
- [ ] MountainHR-Backend schema updates applied
- [ ] Frontend-backend API integration tested
- [ ] RBAC permissions properly configured

---

## API Examples

### Authentication Flow (Frontend-Backend Integration)

```typescript
// 1. Initiate login (SvelteKit frontend)
const loginResponse = await fetch('/auth/login', {
  method: 'GET',
  redirect: 'manual'
});
// Frontend redirects to GelDB UI via MountainHR-Backend

// 2. Handle callback (SvelteKit + Backend API)
// User completes magic link flow in GelDB UI
// Callback processed by SvelteKit, exchanges code via backend API

// 3. Verify authentication (via MountainHR-Backend)
const userResponse = await fetch('/api/auth/verify', {
  credentials: 'include'  // Server-side call to backend API
});
const user = await userResponse.json();
console.log(user.roles); // RBAC::User roles from backend
```

### RBAC Usage (Frontend-Backend Integration)

```typescript
// Server-side permission check in +page.server.ts
export const load: PageServerLoad = async ({ cookies }) => {
  const apiClient = new MountainHRApiClient();
  const token = cookies.get('hr_token');
  apiClient.setToken(token);
  
  // Verify user and get permissions from backend
  const { data: userContext } = await apiClient.get('/api/v2/auth/verify');
  
  return {
    user: userContext.user,
    permissions: userContext.permissions,
    canDeleteEmployees: userContext.permissions.includes('employees:delete')
  };
};

// Client-side usage in Svelte component
export let data;
$: canDelete = data.canDeleteEmployees;
```

---

## Next Steps

After successful quickstart:

1. **Customize Roles**: Modify RBAC roles for your organization
2. **Add Permissions**: Define fine-grained permissions for resources
3. **Implement Audit**: Set up audit logging and monitoring
4. **Performance Tuning**: Optimize auth queries and caching
5. **Production Deploy**: Follow twelve-factor deployment practices

**Documentation Links**:
- [Data Model](./data-model.md)
- [API Contracts](./contracts/)
- [Implementation Tasks](./tasks.md) (generated by `/tasks`)

---

**Support**: Contact team@sveltehr.com for implementation assistance.