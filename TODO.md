# SvelteHR Master TODO List

**Last Updated**: 2025-10-27
**Project**: SvelteHR - Modern HR Management System

---

## 🔴 Critical Priority

### Technical Debt
- [ ] **User/Employee Table Merge** (See: TECH_DEBT_USER_EMPLOYEE_MERGE.md)
  - [ ] Database migration: Add employee_id to users
  - [ ] Link existing users to employees
  - [ ] Update Rust User/Employee models
  - [ ] Update GraphQL schema to join employee data
  - [ ] Update frontend to use employee data
  - [ ] Remove duplicate fields from users table
  - **Estimated**: 2-3 days
  - **Impact**: Fixes data consistency issues, resolves "User" display bug

### Authentication & Security
- [ ] Implement proper session timeout handling
- [ ] Add CSRF protection for forms
- [ ] Review and audit RBAC permissions
- [ ] Implement rate limiting on auth endpoints

---

## 🟡 High Priority

### Dashboard Improvements
- [x] Add random greeting to dashboard header
- [x] Integrate weather from wttr.in/Boise
- [x] Fix My Tasks card to use real API data
- [x] Replace Manage button with QuickAddTask component
- [x] Fix user display name (System vs User)
- [ ] Add task completion percentage calculation
- [ ] Add loading states for all dashboard widgets
- [ ] Implement dashboard widget customization

### Task System
- [x] Department-level task assignment
- [x] Exclusive assignment validation (user OR department)
- [x] Update seed data with department tasks
- [x] Fix task display across all pages
- [ ] Implement task status change workflow
- [ ] Add task dependency management
- [ ] Add task comments/activity feed
- [ ] Implement task notifications
- [ ] Add task templates system
- [ ] Bulk task operations (assign, update status, etc.)

### Employee Management
- [ ] Fix employee profile edit functionality
- [ ] Add employee photo upload
- [ ] Implement employee onboarding workflow
- [ ] Add employee offboarding process
- [ ] Employee directory search improvements
- [ ] Export employee data (CSV, Excel)

---

## 🟢 Medium Priority

### Calendar & Events (Feature 027)
- [x] FullCalendar 6.x integration with Svelte 5 wrapper
- [x] 3-month buffer strategy for performance
- [x] Recurring events with RRULE (RFC 5545)
- [x] Image upload with cropping (16:9 and 9:16 aspect ratios)
- [x] Conflict detection algorithm
- [x] GraphQL subscriptions for real-time updates
- [x] Event notification preferences store
- [ ] Calendar sharing and permissions
- [ ] iCal/Google Calendar sync
- [ ] Event reminders and notifications
- [ ] Recurring event exceptions handling

### Leave & Attendance
- [ ] Implement leave request approval workflow
- [ ] Add leave balance tracking
- [ ] Attendance clock-in/clock-out functionality
- [ ] Attendance reports and analytics
- [ ] Holiday calendar management
- [ ] Leave policy configuration

### Performance & Goals
- [ ] Goal setting and tracking
- [ ] Performance review workflow
- [ ] 360-degree feedback system
- [ ] OKR (Objectives & Key Results) management
- [ ] Goal templates and categories
- [ ] Performance analytics dashboard

### Departments
- [ ] Department hierarchy visualization
- [ ] Department budget tracking
- [ ] Department head management
- [ ] Inter-department task assignments
- [ ] Department reports and analytics

---

## 🔵 Low Priority

### UI/UX Improvements
- [ ] Implement skeleton loading states
- [ ] Add empty state illustrations
- [ ] Improve mobile responsiveness
- [ ] Add keyboard shortcuts
- [ ] Implement command palette (Cmd+K)
- [ ] Add toast notification system improvements
- [ ] Dark mode refinements
- [ ] Accessibility audit and improvements

### Documentation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Component library documentation (Storybook)
- [ ] User guide and help center
- [ ] Admin documentation
- [ ] Developer onboarding guide
- [ ] Database schema documentation

### Reports & Analytics
- [ ] Headcount reports
- [ ] Turnover analysis
- [ ] Compensation reports
- [ ] Attendance reports
- [ ] Performance metrics dashboard
- [ ] Custom report builder

### Admin Features
- [ ] System settings management
- [ ] Email template customization
- [ ] Notification preferences
- [ ] Audit log viewer improvements
- [ ] Bulk data import/export
- [ ] System health monitoring

---

## 🟣 Future Features

### Integrations
- [ ] Slack integration for notifications
- [ ] Google Workspace SSO
- [ ] Microsoft 365 integration
- [ ] ADP/Payroll system integration
- [ ] Background check integrations
- [ ] E-signature integration (DocuSign, HelloSign)

### Advanced Features
- [ ] AI-powered resume parsing
- [ ] Predictive analytics for turnover
- [ ] Automated performance review scheduling
- [ ] Smart task recommendations
- [ ] Natural language search
- [ ] Workflow automation builder

### Mobile App
- [ ] React Native mobile app
- [ ] Push notifications
- [ ] Offline mode
- [ ] Mobile-first workflows

---

## 🐛 Known Bugs

### High Priority
- [ ] Weather widget showing "Weather unavailable" (wttr.in fetch issue)
- [ ] Task quick-add form action handler needed on dashboard
- [ ] Inconsistent date formatting across pages

### Medium Priority
- [ ] Profile image upload sometimes fails
- [ ] Task list pagination issues on mobile
- [ ] Department dropdown doesn't filter properly

### Low Priority
- [ ] Sidebar animation glitch on mobile
- [ ] Calendar event hover tooltip positioning
- [ ] Dark mode toggle flicker

---

## ✅ Recently Completed

### 2025-10-27
- [x] Add random greeting to dashboard
- [x] Integrate wttr.in weather widget
- [x] Fix My Tasks card to use real GraphQL data
- [x] Replace "Manage" button with QuickAddTask component
- [x] Fix user display name priority (firstName > displayName)
- [x] Update sidebar to show firstName correctly
- [x] Add form action handler for dashboard task creation
- [x] Department-level task assignment implementation
- [x] Exclusive assignment validation (user OR department)
- [x] Update TaskCard to show department assignments
- [x] Fix task status enum values (TODO, IN_PROGRESS, etc.)
- [x] Remove "Back to Tasks" button from task detail page

### Previous Work
- [x] RBAC system implementation
- [x] Task system expansion (Feature 028)
- [x] Events calendar with FullCalendar (Feature 027)
- [x] Audit logging widgets (Feature 020)
- [x] Rollback request system
- [x] GraphQL Rust backend integration
- [x] Svelte 5 migration with runes

---

## 📊 Technical Debt Items

1. **User/Employee Table Redundancy** (Critical)
   - See: TECH_DEBT_USER_EMPLOYEE_MERGE.md
   - Status: Documented, ready for implementation

2. **GraphQL Query Optimization**
   - Too many N+1 queries in task listings
   - Need to implement DataLoader pattern
   - Add query complexity limits

3. **Frontend Bundle Size**
   - Current bundle: ~800KB
   - Goal: <500KB
   - Actions: Code splitting, tree shaking, dynamic imports

4. **Test Coverage**
   - Current: ~45%
   - Goal: >80%
   - Focus: E2E tests for critical flows

5. **Error Handling**
   - Inconsistent error messages
   - Need centralized error handling
   - Better user-facing error messages

6. **Type Safety**
   - Some `any` types still in codebase
   - GraphQL code generation needed
   - Strict TypeScript mode

---

## 🔧 Development Improvements

### Tooling
- [ ] Set up Playwright for E2E tests
- [ ] Configure Vitest for component tests
- [ ] Add pre-commit hooks (lint, type-check, test)
- [ ] Set up CI/CD pipeline
- [ ] Add code coverage reporting
- [ ] Implement automated visual regression testing

### Code Quality
- [ ] ESLint configuration improvements
- [ ] Prettier configuration standardization
- [ ] Add JSDoc comments to complex functions
- [ ] Refactor large components (>500 lines)
- [ ] Extract reusable hooks and utilities

### Performance
- [ ] Implement virtual scrolling for large lists
- [ ] Add service worker for offline support
- [ ] Optimize image loading (lazy loading, WebP)
- [ ] Bundle size analysis and optimization
- [ ] Database query optimization
- [ ] Add caching layer (Redis)

---

## 📝 Notes

- **Naming Convention**: Frontend uses camelCase, backend API uses snake_case
- **GraphQL Enum Values**: Rust backend returns SCREAMING_SNAKE_CASE
- **Database**: PostgreSQL with soft deletes (deleted_at)
- **Authentication**: Session-based with cookies (no JWT in frontend)
- **State Management**: Svelte stores + Svelte 5 runes

---

## 🎯 Sprint Planning

### Current Sprint (Week of 2025-10-28)
- [ ] User/Employee table merge (Day 1-3)
- [ ] Weather widget fix
- [ ] Task status change workflow
- [ ] Dashboard widget loading states

### Next Sprint
- [ ] Leave request approval workflow
- [ ] Employee profile improvements
- [ ] Mobile responsiveness audit
- [ ] Performance optimization

### Future Sprints
- [ ] Calendar improvements
- [ ] Reports and analytics
- [ ] Integrations (Slack, Google)
- [ ] Mobile app planning

---

## 🚀 Deployment Checklist

Before each deployment:
- [ ] Run `npm run check` (TypeScript validation)
- [ ] Run `npm run lint` (ESLint + Prettier)
- [ ] Run `npm run test:unit -- --run` (Unit tests)
- [ ] Run `npm run test:e2e` (E2E tests)
- [ ] Run `npm run build` (Production build)
- [ ] Database backup created
- [ ] Migration scripts tested on staging
- [ ] Rollback plan documented
- [ ] Team notified of deployment
- [ ] Monitor logs for 1 hour post-deployment

---

## 📚 Resources

- **Project Docs**: `/CLAUDE.md`
- **Technical Debt**: `/TECH_DEBT_USER_EMPLOYEE_MERGE.md`
- **Architecture**: `graphql-rust-server/README.md`
- **GraphQL Schema**: `graphql-rust-server/schema.graphql`
- **Component Library**: Run `npm run storybook`

---

## 🤝 Contributing

When adding new todos:
1. Choose appropriate priority (🔴 Critical, 🟡 High, 🟢 Medium, 🔵 Low)
2. Add estimated effort if >1 day
3. Link related issues or PRs
4. Update "Recently Completed" when done
5. Move to appropriate section (bugs, features, etc.)
