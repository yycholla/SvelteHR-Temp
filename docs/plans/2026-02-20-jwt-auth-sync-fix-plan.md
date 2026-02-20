# JWT Auth State Synchronization Fix - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix JWT login redirect failure by synchronizing auth stores and using JWT GraphQL client for role loading.

**Architecture:** Unified JWT authentication with synchronized `jwtAuth` and `auth` stores. Auth store uses `jwtGraphQLClient` for all role/permission queries and properly awaits role loading before allowing navigation.

**Tech Stack:** SvelteKit 2.43+, Svelte 5 (runes), TypeScript, URQL GraphQL client, JWT authentication

---

## Pre-Implementation Status

**Already Fixed (no action needed):**

- ✅ `src/routes/login/+page.svelte` - JWT user sync to auth store (lines 73-85)
- ✅ `src/lib/graphql/jwt-client.ts` - willAuthError() returns false (line 75)
- ✅ `src/lib/server/hooks/security.ts` - CSP allows localhost:4000 (line 186)

**Remaining Work:**

- ❌ `src/lib/stores/auth.svelte.ts` - Import JWT client, use in loadUserRoles(), await in setUser()
- ❌ Manual testing to verify fix works end-to-end

---

## Task 1: Update Auth Store to Use JWT Client

**Files:**

- Modify: `src/lib/stores/auth.svelte.ts`

**Step 1: Read current auth store implementation**

Read the file to understand current structure:

```bash
cat src/lib/stores/auth.svelte.ts | head -250
```

Expected: See imports at top, `setUser()` around line 229, `loadUserRoles()` around line 241

---

**Step 2: Add JWT client import**

Add import at the top of the file (after existing imports):

```typescript
import { jwtGraphQLClient } from '$lib/graphql/jwt-client';
```

Location: After line 6 (after `import { createUrqlClient } from '$lib/graphql/client';`)

Run verification:

```bash
grep "jwtGraphQLClient" src/lib/stores/auth.svelte.ts
```

Expected: Should show the new import line

---

**Step 3: Update loadUserRoles() to use JWT client**

Find line 241 (in `loadUserRoles()` method) and change:

```typescript
// BEFORE (line 241):
const client = createUrqlClient();

// AFTER:
const client = jwtGraphQLClient;
```

Run verification:

```bash
grep -A2 "async loadUserRoles" src/lib/stores/auth.svelte.ts | grep "jwtGraphQLClient"
```

Expected: Should show `const client = jwtGraphQLClient;`

---

**Step 4: Update setUser() to await role loading**

Find lines 229-236 (`setUser()` method) and change from fire-and-forget to await:

```typescript
// BEFORE (lines 229-236):
async setUser(user: User): Promise<void> {
	this.user = user;
	// Load roles in background (non-blocking) - user can navigate while roles load
	this.loadUserRoles(user.id).catch((err) => {
		logger.warn(`Role loading failed, using guest permissions: ${err}`);
		this.isLoading = false;
	});
}

// AFTER:
async setUser(user: User): Promise<void> {
	this.user = user;
	// Load roles and await completion - ensures isLoading updates correctly
	try {
		await this.loadUserRoles(user.id);
	} catch (err) {
		logger.warn(`Role loading failed, using guest permissions: ${err}`);
		this.isLoading = false;
	}
}
```

Run verification:

```bash
grep -A8 "async setUser" src/lib/stores/auth.svelte.ts
```

Expected: Should show `await this.loadUserRoles(user.id);` inside try block

---

**Step 5: Review changes**

Check all changes made:

```bash
git diff src/lib/stores/auth.svelte.ts
```

Expected output should show:

1. New import: `import { jwtGraphQLClient } from '$lib/graphql/jwt-client';`
2. Line 241 changed: `const client = jwtGraphQLClient;`
3. Lines 229-236 changed: `try { await this.loadUserRoles(user.id); } catch...`

---

**Step 6: Check TypeScript compilation**

Verify no type errors:

```bash
npx svelte-check --threshold error
```

Expected: No errors (warnings are okay)

If errors appear, read them and fix before proceeding.

---

## Task 2: Manual Testing - Happy Path

**Goal:** Verify login works end-to-end with successful redirect

**Step 1: Start development server**

If not already running:

```bash
mise run dev
```

Expected: Server starts on http://localhost:5173

---

**Step 2: Clear browser state**

Open browser DevTools (F12) → Application tab:

- Clear all cookies
- Clear localStorage
- Clear sessionStorage

Or use Playwright:

```bash
playwright-cli close 2>/dev/null || true
playwright-cli open http://localhost:5173/login
```

---

**Step 3: Test login flow**

Using Playwright:

```bash
# Fill login form
playwright-cli fill e29 "admin@mountainhr.dev"
playwright-cli fill e33 "admin123"

# Submit form
playwright-cli click e43

# Wait for redirect
sleep 5

# Check current page
playwright-cli snapshot
```

**Expected Results:**

- Page URL: `http://localhost:5173/dashboard` (redirected successfully!)
- Page Title: NOT "MountainHR" login page
- Console: 0-1 errors (only performance warnings acceptable)

**Verification checklist:**

- [ ] Redirect happened within 5 seconds
- [ ] Now on dashboard page
- [ ] No "Something went wrong" error page
- [ ] Console shows "[JWT Auth] Authentication successful"
- [ ] Console shows successful role loading

---

**Step 4: Verify auth state**

Check console for auth state logs:

```bash
playwright-cli console
```

Expected logs (in order):

1. `[JWT Auth] Attempting session restoration`
2. `[JWT Auth] No active session to restore`
3. `[JWT Auth] Authentication successful`
4. `[Auth] Loaded N permissions for role: ...`

**Red flags:**

- ❌ "Auth state loading timeout" - means await didn't work
- ❌ "Network error: <html>" - means wrong client used
- ❌ Still on `/login` page - redirect failed

---

**Step 5: Verify dashboard access**

Check that protected routes work:

```bash
# Reload dashboard
playwright-cli reload

# Should stay on dashboard (not redirect to login)
playwright-cli snapshot
```

Expected: Page URL still `/dashboard`, user info visible

---

**Step 6: Check user permissions**

Verify roles/permissions loaded correctly:

Look for role-based UI elements on dashboard (admin-only buttons, etc.)

Expected: Admin user should see all admin features

---

## Task 3: Manual Testing - Error Scenarios

**Goal:** Verify error handling works correctly

**Step 1: Test invalid credentials**

```bash
# Reload login page
playwright-cli goto http://localhost:5173/login

# Enter wrong password
playwright-cli fill e29 "admin@mountainhr.dev"
playwright-cli fill e33 "wrongpassword"
playwright-cli click e43

# Wait and check
sleep 2
playwright-cli snapshot
```

**Expected Results:**

- Still on `/login` page
- Error message displayed (look for Alert/error text in snapshot)
- No redirect happened
- Form is re-enabled (not stuck in loading state)

---

**Step 2: Test protected route access while logged out**

```bash
# Logout
playwright-cli goto http://localhost:5173/dashboard

# Check if redirected to login
playwright-cli snapshot
```

**Expected Results:**

- Redirected to `/login?redirectTo=%2Fdashboard`
- Login form displayed
- No crash or blank page

---

**Step 3: Test redirect after login**

After being redirected from protected route:

```bash
# Login
playwright-cli fill e29 "admin@mountainhr.dev"
playwright-cli fill e33 "admin123"
playwright-cli click e43

sleep 5
playwright-cli snapshot
```

**Expected Results:**

- Redirected back to `/dashboard` (the original destination)
- Not stuck on login page

---

## Task 4: Commit and Document

**Goal:** Save working changes and update documentation

**Step 1: Stage changes**

```bash
git add src/lib/stores/auth.svelte.ts
```

---

**Step 2: Commit with descriptive message**

```bash
git commit -m "$(cat <<'EOF'
fix(auth): use JWT client for role loading and await completion

Changes:
- Import jwtGraphQLClient in auth store
- Update loadUserRoles() to use jwtGraphQLClient instead of createUrqlClient()
- Change setUser() to await loadUserRoles() instead of fire-and-forget

Fixes:
- Login now successfully redirects to dashboard
- Roles load correctly with JWT authentication
- Auth state polling no longer times out
- No more "Network error: <html>" when loading roles

This completes the JWT-only auth migration by ensuring the auth
store uses the correct GraphQL client for all queries.

Related: docs/plans/2026-02-20-jwt-auth-sync-fix-design.md
EOF
)"
```

---

**Step 3: Update acceptance criteria in design doc**

Mark completed items:

```bash
# Edit the design doc
```

Change these lines:

```markdown
- [x] Manual testing completed successfully
- [x] No regression in other auth flows
```

---

**Step 4: Verify git status**

```bash
git status
```

Expected: No uncommitted changes in `src/lib/stores/auth.svelte.ts`

---

**Step 5: Push changes (if on a feature branch)**

```bash
git log --oneline -3
```

Verify commit message looks correct, then:

```bash
# Only if you're on a feature branch and ready to push
git push origin HEAD
```

---

## Success Criteria Checklist

Before marking this plan complete, verify ALL of these:

- [x] Auth store imports `jwtGraphQLClient`
- [x] `loadUserRoles()` uses JWT client (line 241)
- [x] `setUser()` awaits `loadUserRoles()` (lines 229-236)
- [ ] Login with valid credentials redirects to `/dashboard` in < 5 seconds
- [ ] Console shows no errors during happy path
- [ ] Roles load successfully (console shows "Loaded N permissions")
- [ ] Invalid credentials show error message (don't redirect)
- [ ] Protected routes redirect to login when not authenticated
- [ ] After login from protected route, redirects back to original destination
- [ ] No TypeScript compilation errors
- [ ] Changes committed with clear message

---

## Troubleshooting

### Issue: Login succeeds but still doesn't redirect

**Check:**

1. Is `await` keyword present in `setUser()`?
   ```bash
   grep -A5 "async setUser" src/lib/stores/auth.svelte.ts | grep await
   ```
2. Is `jwtGraphQLClient` used (not `createUrqlClient()`)?
   ```bash
   grep "jwtGraphQLClient" src/lib/stores/auth.svelte.ts
   ```
3. Check console for "Auth state loading timeout" - if present, await isn't working
4. Check for import statement at top of file

### Issue: "Network error: <html>" in console

**Cause:** Still using `createUrqlClient()` instead of `jwtGraphQLClient`

**Fix:** Verify line 241 uses `jwtGraphQLClient`

### Issue: TypeScript errors after changes

**Common errors:**

- "Cannot find module 'jwt-client'" - check import path spelling
- "Property 'jwtGraphQLClient' does not exist" - check export in jwt-client.ts

**Fix:** Read error message, verify imports match exactly

### Issue: Server not picking up changes

**Fix:** Restart dev server:

```bash
pkill -9 node
mise run dev
```

---

## Notes

- The login page sync code (lines 73-85 in `src/routes/login/+page.svelte`) is already implemented
- The JWT client fix (`willAuthError()`) is already implemented
- The CSP fix is already implemented
- This plan ONLY implements the auth store changes
- Total estimated time: 20-30 minutes including testing
