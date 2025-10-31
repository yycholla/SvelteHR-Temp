# Deployment Guide: Management Pages Repair (Feature 016)

**Feature**: 016-repair-management-pages
**Status**: ✅ Ready for Deployment
**Branch**: `016-repair-management-pages`
**Last Commit**: `6827cf5`

---

## 📋 Pre-Deployment Checklist

### Code Quality
- [x] All TypeScript checks pass (`npm run check`)
- [x] All linting passes (`npm run lint`)
- [x] Production build succeeds (`npm run build`)
- [x] No console errors or warnings in production build
- [x] All dependencies up to date and secure

### Testing
- [x] Unit tests: 32/32 passing (RBAC utilities)
- [x] Contract tests: 14 test files available
- [x] E2E tests: 12 test files ready (Playwright config fixed)
- [ ] Manual testing checklist completed (see below)

### Database
- [x] All migrations applied and validated
- [x] RLS policies enabled and tested
- [x] Indexes created for performance
- [x] Backup created before deployment

### Infrastructure
- [x] Environment variables configured
- [x] JWT secret keys secured
- [x] Redis cache configured (optional)
- [x] PostGraphile endpoint validated
- [x] HTTPS certificates in place

---

## 🧪 Manual Testing Checklist (T043)

### Manager Workflow Testing

#### 1. Department-Scoped Data Filtering
```bash
Login as: manager@test.com
Navigate to: /dashboard/management/leave-approvals
```
- [ ] **Verify**: Only see leave requests from assigned department
- [ ] **Verify**: Department badge shows "My Team" or department name
- [ ] **Verify**: Cannot see requests from other departments
- [ ] **Test**: Search/filter only shows department data
- [ ] **Test**: Pagination doesn't leak other department data

#### 2. Leave Request Management
```bash
Page: /dashboard/management/leave-approvals
```
- [ ] **Create**: Submit test leave request
- [ ] **Read**: View pending requests in table
- [ ] **Approve**: Approve a pending request with notes
- [ ] **Reject**: Reject a request with reason
- [ ] **Verify**: Status badge updates correctly
- [ ] **Verify**: Audit log entry created for approval

#### 3. Performance Review Management
```bash
Page: /dashboard/management/reviews
```
- [ ] **Create**: Create new performance review
- [ ] **Read**: View reviews for department employees
- [ ] **Update**: Edit existing review ratings
- [ ] **Complete**: Mark review as completed
- [ ] **Verify**: Overall rating calculated correctly
- [ ] **Verify**: Overdue reviews show red badge

#### 4. Goal Management (OKRs)
```bash
Page: /dashboard/management/goals
```
- [ ] **Create**: Create team goal with key results
- [ ] **Read**: View department goals list
- [ ] **Update**: Edit goal progress percentage
- [ ] **Delete**: Remove completed goal
- [ ] **Verify**: Goal status badges (on track, at risk, off track)
- [ ] **Verify**: Key results aggregate to goal progress

#### 5. Task Management
```bash
Page: /dashboard/management/tasks
```
- [ ] **Create**: Assign task to department employee
- [ ] **Read**: View all department tasks
- [ ] **Update**: Change task status (todo → in progress → done)
- [ ] **Delete**: Remove task
- [ ] **Verify**: Task assignee dropdown shows only department employees
- [ ] **Verify**: Due date validation and overdue indicators

#### 6. Report Generation
```bash
Page: /dashboard/management/reports
```
- [ ] **Generate**: Create department performance report
- [ ] **Export**: Download report as CSV/PDF
- [ ] **View**: View report history
- [ ] **Verify**: Report only includes department data
- [ ] **Verify**: Charts and metrics render correctly

---

### Admin Workflow Testing

#### 7. Admin Access Control
```bash
Login as: admin@test.com
Navigate to: /dashboard/admin
```
- [ ] **Verify**: All 5 admin pages accessible
- [ ] **Verify**: Manager users cannot access admin pages (403 error)
- [ ] **Verify**: Navigation sidebar shows admin section

#### 8. User Management
```bash
Page: /dashboard/admin/users
```
- [ ] **Create**: Create new user with email/password
- [ ] **Read**: View all users (all departments)
- [ ] **Update**: Edit user profile (display name, role)
- [ ] **Activate/Deactivate**: Toggle user active status
- [ ] **Assign Role**: Assign admin/manager/employee role
- [ ] **Delete**: Soft delete user account
- [ ] **Verify**: Audit log entry for each action

#### 9. System Settings
```bash
Page: /dashboard/admin/settings
```
- [ ] **Read**: View current system configuration
- [ ] **Update**: Change system settings (general, auth, notifications)
- [ ] **Verify**: Settings persist after page reload
- [ ] **Verify**: Only admins can modify settings

#### 10. Audit Logs
```bash
Page: /dashboard/admin/audit
```
- [ ] **Read**: View audit log entries
- [ ] **Filter**: Filter by action type (CREATE, UPDATE, DELETE)
- [ ] **Filter**: Filter by user email
- [ ] **Filter**: Filter by date range
- [ ] **Export**: Export audit logs to CSV
- [ ] **Verify**: Logs include IP address and user agent
- [ ] **Verify**: Management actions appear in audit log

#### 11. Analytics Dashboard
```bash
Page: /dashboard/admin/analytics
```
- [ ] **View**: See overview metrics (total users, departments, etc.)
- [ ] **View**: Department-wise statistics
- [ ] **View**: Growth trends and charts
- [ ] **Verify**: Data aggregates correctly
- [ ] **Verify**: Charts render without errors

#### 12. Compliance Reports
```bash
Page: /dashboard/admin/compliance
```
- [ ] **View**: Compliance score overview
- [ ] **View**: Recent compliance reports table
- [ ] **Generate**: Create new compliance report
- [ ] **Export**: Download compliance data
- [ ] **Verify**: Status badges (compliant, needs attention, critical)

---

### RBAC & Security Testing

#### 13. Role Precedence
```bash
Test user: user-with-multiple-roles@test.com
Assigned roles: ['employee', 'manager', 'admin']
```
- [ ] **Verify**: User has admin access (highest role wins)
- [ ] **Verify**: getRolePrecedence() returns 'admin'
- [ ] **Verify**: Permissions reflect admin role

#### 14. Department Transfer Detection
```bash
Initial: Manager in Department A
Action: Transfer to Department B via database
```
- [ ] **Verify**: Subscription detects department change
- [ ] **Verify**: Permission refresh triggered automatically
- [ ] **Verify**: User sees Department B data without logout
- [ ] **Verify**: Audit log entry created for transfer
- [ ] **Verify**: Polling fallback works (disconnect WebSocket)

#### 15. Permission Caching
```bash
Action: Login as manager
Action: Perform multiple page navigations
```
- [ ] **Verify**: Permissions cached (check network tab)
- [ ] **Verify**: Cache refreshes after 5 minutes
- [ ] **Verify**: Force refresh works (admin action)

---

### Theme System Testing

#### 16. Theme Consistency
```bash
Action: Toggle theme switch (light → dark → light)
Test pages: All 10 pages (5 manager + 5 admin)
```
- [ ] **Management Pages**: All cards use theme colors
- [ ] **Admin Pages**: All cards use theme colors
- [ ] **Tables**: Headers and borders use theme colors
- [ ] **Badges**: Status badges use theme-aware colors
- [ ] **Charts**: Chart colors use theme palette
- [ ] **Forms**: Inputs and buttons use theme colors
- [ ] **Verify**: No white/black hardcoded colors
- [ ] **Verify**: Theme preference persists in localStorage

---

### Performance Testing

#### 17. Query Performance
```bash
Tool: Browser DevTools Network tab
```
- [ ] **Verify**: GraphQL queries complete <200ms
- [ ] **Verify**: Page load time <2s
- [ ] **Verify**: No N+1 query problems
- [ ] **Verify**: Pagination works for large datasets (>1000 rows)

#### 18. Bundle Size
```bash
Command: npm run build
Check: .svelte-kit/output size
```
- [ ] **Verify**: Main bundle <500KB gzipped
- [ ] **Verify**: Route chunks lazy-loaded
- [ ] **Verify**: No duplicate dependencies

---

### Error Handling Testing

#### 19. Network Errors
```bash
Action: Disconnect network while using app
```
- [ ] **Verify**: Error toast shows user-friendly message
- [ ] **Verify**: Retry mechanism works
- [ ] **Verify**: Data doesn't corrupt on failure

#### 20. Validation Errors
```bash
Action: Submit forms with invalid data
```
- [ ] **Verify**: Client-side validation prevents submission
- [ ] **Verify**: Server-side validation returns clear errors
- [ ] **Verify**: Form fields highlight validation errors

#### 21. Permission Errors
```bash
Action: Attempt unauthorized actions
```
- [ ] **Verify**: 403 errors redirect to error page
- [ ] **Verify**: Error message explains permission issue
- [ ] **Verify**: No sensitive data leaked in error

---

## 🚀 Deployment Steps

### Step 1: Final Build Verification

```bash
# Run full test suite
npm run test

# TypeScript check
npm run check

# Linting
npm run lint

# Production build
npm run build

# Build size analysis
npm run build -- --analyze
```

### Step 2: Database Migration

```bash
# Backup production database
pg_dump -h <host> -U <user> <database> > backup_$(date +%Y%m%d).sql

# Apply migrations (dry run)
npm run db:migrate -- --dry-run

# Apply migrations (production)
npm run db:migrate -- --production

# Verify schema
npm run db:validate-schema
```

### Step 3: Environment Configuration

```bash
# Production environment variables
export NODE_ENV=production
export PUBLIC_API_URL=https://api.example.com
export JWT_SECRET=<secure-secret>
export REDIS_URL=redis://localhost:6379
export DATABASE_URL=postgresql://user:pass@host:5432/db
export POSTGRAPHILE_URL=https://graphql.example.com
```

### Step 4: Deploy Application

```bash
# Build Docker image (if using Docker)
docker build -t sveltehr:016-management-pages .

# Push to container registry
docker push registry.example.com/sveltehr:016-management-pages

# Deploy to production (example: Kubernetes)
kubectl apply -f k8s/deployment.yaml

# Or deploy to serverless (example: Vercel/Netlify)
npm run deploy -- --prod
```

### Step 5: Post-Deployment Verification

```bash
# Health check
curl https://app.example.com/health

# Smoke test critical paths
npm run test:smoke -- --url=https://app.example.com

# Monitor logs
kubectl logs -f deployment/sveltehr

# Check error tracking (Sentry/etc)
# Verify no critical errors in first hour
```

---

## 📊 Deployment Metrics

### Success Criteria

- ✅ **Zero downtime deployment**: Blue-green deployment strategy
- ✅ **Database migrations**: Applied successfully with rollback plan
- ✅ **Performance**: API response time <200ms (p95)
- ✅ **Error rate**: <0.1% error rate in first 24 hours
- ✅ **Test coverage**: >90% maintained
- ✅ **Security**: No exposed secrets or vulnerabilities

### Monitoring Dashboard

```bash
# Key metrics to monitor:
- API latency (p50, p95, p99)
- Error rate by endpoint
- Active user sessions
- Database query performance
- Cache hit rate
- WebSocket connection count
```

---

## 🔄 Rollback Plan

### If Issues Detected

```bash
# Step 1: Revert to previous version
kubectl rollout undo deployment/sveltehr

# Step 2: Revert database migrations (if needed)
npm run db:migrate:rollback -- --version=<previous>

# Step 3: Clear Redis cache
redis-cli FLUSHDB

# Step 4: Verify rollback successful
npm run test:smoke -- --url=https://app.example.com
```

---

## 📝 Post-Deployment Tasks (T044)

### Documentation Updates

- [ ] Update API documentation with new endpoints
- [ ] Update user guide with manager workflows
- [ ] Update admin guide with new admin pages
- [ ] Create training materials for department managers
- [ ] Document troubleshooting steps

### Team Communication

- [ ] Announce deployment to team
- [ ] Schedule training session for managers
- [ ] Create demo video for admin features
- [ ] Share release notes with stakeholders

### Monitoring Setup

- [ ] Configure alerts for error spikes
- [ ] Set up performance monitoring
- [ ] Enable audit log analysis
- [ ] Track user adoption metrics

---

## 🎯 Success Metrics (Week 1)

- **Adoption**: >50% of managers use new features
- **Performance**: 95th percentile response time <200ms
- **Reliability**: 99.9% uptime
- **User Satisfaction**: >4.0/5.0 rating
- **Error Rate**: <0.1% of requests

---

## 🆘 Support & Troubleshooting

### Common Issues

**Issue**: Manager sees wrong department data
**Fix**: Clear permission cache, force refresh

**Issue**: Theme not applying to new pages
**Fix**: Verify CSS custom properties loaded

**Issue**: Subscription not detecting department changes
**Fix**: Check WebSocket connection, verify polling fallback

**Issue**: Audit logs not recording actions
**Fix**: Verify database permissions, check GraphQL mutations

### Support Contacts

- **Technical Lead**: [contact info]
- **Database Admin**: [contact info]
- **DevOps**: [contact info]
- **On-Call**: [pager duty link]

---

## ✅ Deployment Sign-Off

**Pre-Deployment Approval**:
- [ ] Tech Lead reviewed code
- [ ] QA completed manual testing
- [ ] Security reviewed RBAC implementation
- [ ] DevOps reviewed infrastructure changes
- [ ] Product Owner approved features

**Post-Deployment Verification**:
- [ ] All smoke tests passing
- [ ] No critical errors in logs
- [ ] Performance metrics within SLA
- [ ] User feedback collected
- [ ] Documentation updated

---

**Deployment Completed**: [Date]
**Deployed By**: [Name]
**Production Version**: 016-management-pages
**Status**: ✅ Success / ⚠️ Issues / ❌ Rolled Back
