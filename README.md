# SvelteHR - Modern HR Management System

A comprehensive HR management system built with **SvelteKit 2.22.0**, **Svelte 5.0**, **TypeScript 5.0**, and **Tailwind CSS 4.0**, integrated with a **Rust GraphQL backend** using **SeaORM** for database operations.

## 🚀 Features

### Core HR Management

- **Employee Management** - Complete employee lifecycle management with profiles, departments, and roles
- **Department Management** - Organizational structure with hierarchical department relationships
- **Role-Based Access Control (RBAC)** - Granular permissions with role-based authorization
- **Performance Reviews** - Performance tracking with goals, OKRs, and review cycles
- **Leave Management** - Leave requests, approvals, and balance tracking

### Events, Tasks, and Activity Management (Feature 019)

#### 📅 Event Management

- **Event Creation & Scheduling** - Create company-wide, department, or private events
- **RSVP System** - Track attendance with accepted, declined, tentative, and pending statuses
- **Event Visibility Controls** - Three-tier visibility: company-wide, department-only, specific people
- **Event Calendar** - Visual calendar view for all events (requires FullCalendar integration)
- **Event Statistics** - Track total events, upcoming events, and RSVP metrics
- **Manager Controls** - Managers and admins can create, edit, and delete events

**Pages**:

- `/dashboard/events` - Event list with filters (visibility, status, event type)
- `/dashboard/events/create` - Event creation form (manager-only)
- `/dashboard/events/[id]` - Event detail with RSVP button and attendee list
- `/dashboard/events/[id]/edit` - Event editing (organizer/admin only)

#### ✅ Task Management

- **Employee Task Assignment** - Assign tasks directly to specific employees
- **Department Task Assignment** - Assign tasks to entire departments (visible to all members)
- **Task Prioritization** - Four priority levels: urgent, high, medium, low
- **Task Status Tracking** - Track tasks through pending → in progress → completed
- **Due Date Management** - Set due dates with overdue and due-soon warnings
- **Task Statistics** - Dashboard with 7 metrics: total, pending, in progress, completed, overdue, urgent, high priority

**Pages**:

- `/dashboard/tasks/my-tasks` - Employee's assigned tasks with filters
- `/dashboard/tasks/department` - Department-wide tasks (manager-only)
- `/dashboard/tasks/create` - Task creation form (manager-only)
- `/dashboard/tasks/[id]` - Task detail with status controls

#### 📊 Activity Logging

- **Automatic Activity Tracking** - Database triggers automatically log all actions
- **Personal Activity Feed** - Employees see their own activities (RLS-enforced)
- **Admin Audit Logs** - System-wide activity logs for admins with advanced filtering
- **Resource Activity History** - View complete activity trail for any resource
- **Activity Statistics** - Track creates, updates, deletes, views, and logins
- **CSV Export** - Export audit logs for compliance and reporting

**Pages**:

- `/dashboard/activities` - Personal activity feed with date grouping
- `/dashboard/activities/audit` - System-wide audit logs (admin-only)

#### 🔔 Notification System

- **Dual-Channel Notifications** - In-app and email notifications
- **8 Notification Categories** - Task assignments, event invitations, leave approvals, performance reviews, system announcements, and more
- **Notification Bell** - Header bell icon with unread count badge
- **Mark as Read** - Individual and bulk mark-as-read functionality
- **Notification Filtering** - Filter by category, type, and read status
- **Click-to-Navigate** - Click notifications to navigate to related resources

**Pages**:

- `/dashboard/notifications` - Notification center with filtering and management

## 🛠️ Technology Stack

### Frontend

- **SvelteKit 2.22.0** with **Svelte 5.0** (runes syntax: `$state`, `$derived`, `$props`)
- **TypeScript 5.0** with strict mode enabled
- **Tailwind CSS 4.0** with custom design system
- **Vite 7.0.4** for lightning-fast development
- **Skeleton UI 3.1.7** component library
- **Lucide Svelte** icon library

### Backend Integration

- **MountainHR Go Backend** with RESTful API
- **PostGraphile** for auto-generated GraphQL from PostgreSQL
- **urql 4.x** GraphQL client with Svelte 5 integration
- **JWT Authentication** with automatic token refresh
- **Better Auth 1.3.4** for modern authentication

### Database & Security

- **PostgreSQL 14+** with Row-Level Security (RLS)
- **Row-Level Security (RLS)** enforced at database level
- **Database Triggers** for automatic activity logging and notifications
- **Immutable Audit Logs** for compliance

### Testing & Quality

- **Playwright 1.49.1** for E2E testing (59 test cases across 5 test files)
- **Vitest 3.2.3** for unit testing
- **Storybook 9.1.1** for component development (74 component variants)
- **TypeScript strict mode** with no `any` types

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- MountainHR Go backend running on port 8080
- PostgreSQL 14+ database

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd SvelteHR

# Install dependencies
npm install

# Run database migrations (in MountainHR-Backend)
# Migrations located in: ../MountainHR-Backend/migrations/
# Feature 019 migrations: 20250101_001 through 20250101_009

# Start development server (with Doppler secrets)
npm run dev

# Or start without Doppler for local development
npm run dev:local
```

## 🔄 Backend Migration: sqlx → SeaORM

### Migration Overview

The backend is currently undergoing migration from **sqlx** to **SeaORM** for improved type safety, better relationship handling, and enhanced developer experience.

### Migration Status

- **Phase 1**: ✅ Setup and foundational infrastructure complete
- **Phase 2**: 🔄 Core entity migration in progress
- **Phase 3**: ⏳ Frontend compatibility validation
- **Phase 4**: ⏳ Enhanced query capabilities

### Key Improvements

- **Type Safety**: Compile-time error detection for database operations
- **Relationship Handling**: Automatic loading of related entities
- **Query Building**: Fluent API for complex queries
- **Performance**: Connection pooling and query optimization
- **Maintainability**: Better code organization and debugging

### Migration Scope

- **20+ Entities**: Complete HR system including events, documents, compensation, time off
- **Advanced Features**: Document encryption, event waitlists, audit trails, versioning
- **Frontend Compatibility**: 100% GraphQL API preservation for SvelteKit integration
- **Data Integrity**: All constraints, validations, and business logic preserved

### Migration Documentation

- **Plan**: `specs/033-sea-orm-migration/plan.md`
- **Tasks**: `specs/033-sea-orm-migration/tasks.md`
- **Data Model**: `specs/033-sea-orm-migration/data-model.md`
- **Research**: `specs/033-sea-orm-migration/research.md`

## 🚀 Development Commands

### Core Development

```bash
npm run dev              # Start development server with Doppler
npm run dev:local        # Start without Doppler
npm run build            # Production build
npm run preview          # Preview production build
npm run check            # TypeScript and Svelte check (run before commits!)
npm run check:watch      # TypeScript check in watch mode
npm run lint             # Run Prettier check and ESLint
npm run format           # Format code with Prettier
```

### Testing

```bash
npm run test             # Run all tests (unit + e2e)
npm run test:unit        # Run Vitest unit tests in watch mode
npm run test:unit -- --run  # Run unit tests once (CI mode)
npm run test:e2e         # Run Playwright e2e tests
npm run test:e2e:ui      # Run Playwright with UI
npm run test:e2e:debug   # Debug Playwright tests
```

### Component Development

```bash
npm run storybook        # Start Storybook on port 6006
npm run build-storybook  # Build Storybook
```

## 📁 Project Structure

```
src/
├── lib/
│   ├── api/                  # API client and type definitions
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # Base UI component library
│   │   ├── events/          # EventCard, RSVPButton, EventCalendar
│   │   ├── tasks/           # TaskCard, TaskList
│   │   ├── activities/      # ActivityFeed
│   │   ├── notifications/   # NotificationBell
│   │   └── hr/              # HR-specific components
│   ├── graphql/             # GraphQL operations and types
│   │   ├── events-operations.ts      # Event queries and mutations
│   │   ├── tasks-operations.ts       # Task operations (enhanced)
│   │   ├── activity-logs-operations.ts  # Activity logging
│   │   ├── notifications-operations.ts  # Notification management
│   │   └── types.ts                 # Consolidated TypeScript types
│   ├── stores/              # Svelte stores for state management
│   ├── schemas/             # Zod validation schemas
│   ├── utils/               # Utility functions and helpers
│   │   ├── events.ts        # Event utility functions
│   │   ├── tasks.ts         # Task utility functions
│   │   └── activities.ts    # Activity utility functions
│   └── types/               # TypeScript type definitions
├── routes/                   # SvelteKit file-based routing
│   └── dashboard/
│       ├── events/          # Event management pages
│       ├── tasks/           # Task management pages
│       ├── activities/      # Activity log pages
│       └── notifications/   # Notification center
└── app.d.ts                 # Global type declarations

tests/
├── e2e/
│   ├── events/              # Event E2E tests
│   ├── tasks/               # Task E2E tests
│   ├── activities/          # Activity log E2E tests
│   └── notifications/       # Notification E2E tests
└── contract/                # Contract tests for GraphQL operations
```

## 🔐 Authentication & Authorization

### Authentication

- **Bearer Token Authentication**: `Authorization: Bearer <jwt_token>` required for all API calls
- **JWT tokens** stored in cookies as `hr_token` or `auth-token`
- **Server-side verification** via `hooks.server.ts` using `/api/v2/auth/verify`
- **Automatic token cleanup** when invalid or expired

### RBAC (Role-Based Access Control)

**Role Hierarchy**:

1. **Admin** (level 100) - Full system access
2. **HR Manager** (level 80) - HR-specific permissions
3. **Manager** (level 60) - Department management
4. **Employee** (level 20) - Basic access

**Feature-Specific Permissions**:

- **Event Creation**: Manager or higher (level ≥ 60)
- **Task Creation**: Manager or higher (level ≥ 60)
- **Department Tasks**: Manager-only access
- **Audit Logs**: Admin-only access (level 100)
- **Event Editing**: Event organizer or admin
- **Task Status Updates**: Task assignee or department member

### Row-Level Security (RLS)

**Database-level security policies**:

- **Events**: Users see only events matching their visibility level (company/department/specific)
- **Tasks**: Employees see only their assigned tasks or department tasks
- **Activities**: Employees see only their own activities; admins see all
- **Notifications**: Users see only notifications sent to them
- **Audit Logs**: Admin-only access to system-wide logs

## 🎨 UI Components (Feature 019)

All components built with Svelte 5 runes syntax and comprehensive Storybook documentation:

### EventCard.svelte

- Event summary with color-coded indicator
- RSVP status badge, event type, and visibility badges
- Organizer and attendee count display
- **15 Storybook variants**

### RSVPButton.svelte

- Dropdown RSVP status selector
- 5 status options: accepted, declined, tentative, pending, no_response
- Loading and disabled states
- **10 Storybook variants**

### TaskCard.svelte

- Task summary with priority color strip
- Interactive checkbox for status toggling
- Overdue and due-soon warning badges
- Department task indicator
- **15 Storybook variants**

### TaskList.svelte

- Sortable and filterable task list
- Statistics bar with 7 metrics
- Uses TaskCard components
- **12 Storybook variants**

### ActivityFeed.svelte

- Chronological activity display with date grouping
- Activity icons by resource type and action
- Relative timestamps ("2 hours ago")
- **12 Storybook variants**

### NotificationBell.svelte

- Bell icon with unread count badge
- Dropdown notification center
- Mark as read/delete actions
- **10 Storybook variants**

## 📊 Database Schema (Feature 019)

### Enhanced Tables

**tasks** (enhanced):

- Added `assigned_to_department_id` for department-wide tasks
- CHECK constraint for mutually exclusive assignment (employee OR department)

**events** (enhanced):

- Added `visibility_type` enum: company, department, specific
- Replaces old `is_public` boolean

**New Tables**:

**notifications**:

- Dual-channel notification system (email + in-app)
- 8 categories: task_assignment, event_invitation, leave_approval, performance_review, department_announcement, system_alert, reminder, other
- Read status tracking and metadata (JSONB)

**activity_logs**:

- Automatic activity tracking via database triggers
- 10 resource types tracked
- JSONB details field for additional context
- Immutable (no UPDATE/DELETE allowed via RLS)

**event_attendees** (existing, unchanged):

- Tracks RSVP status: accepted, declined, tentative, pending, no_response

## 🧪 Testing

### E2E Tests (Playwright) - 59 Test Cases

**Event Tests** (9 cases):

- Event list navigation
- RSVP status changes and persistence
- Event filtering (visibility, status, type)
- Manager event creation
- Edit/Delete authorization

**Task Tests** (23 cases):

- Employee task list and filtering
- Department task management (manager-only)
- Task status updates
- Task creation authorization
- Overdue task highlighting

**Activity Tests** (11 cases):

- Personal activity feed
- Admin audit log access
- RLS enforcement
- CSV export
- Activity filtering

**Notification Tests** (16 cases):

- Notification bell with unread count
- Mark as read/delete functionality
- Notification filtering
- Navigation to related resources
- Real-time updates

### Contract Tests (TDD RED Phase)

- 25 test cases for GraphQL operations
- Will turn GREEN after backend integration

## 📈 Progress & Statistics

**Feature 019 Implementation Progress**: 89% Complete (40 of 45 tasks)

| Phase                        | Status         | Lines of Code                           |
| ---------------------------- | -------------- | --------------------------------------- |
| Phase 1: Database Migrations | ✅ 100%        | ~900 lines (9 SQL files)                |
| Phase 2: Contract Tests      | ✅ 100%        | ~300 lines (25 test cases)              |
| Phase 3: GraphQL Operations  | ✅ 100%        | ~5,747 lines (6 files)                  |
| Phase 4: UI Components       | ✅ 85%         | ~2,100 lines (6 components, 74 stories) |
| Phase 5: SvelteKit Pages     | ✅ 100%        | ~5,335 lines (11 pages)                 |
| Phase 6: E2E Tests           | ✅ 100%        | ~2,030 lines (59 test cases)            |
| Phase 7: Documentation       | 🚧 In Progress | -                                       |

**Total Production Code**: ~15,207 lines

**Remaining Tasks**:

- T020: EventCalendar component (requires FullCalendar npm installation)
- T046: Storybook documentation
- T047: API documentation

## 🔒 Security Features

- ✅ **Row-Level Security (RLS)** enforced at database level
- ✅ **JWT Authentication** with automatic token refresh
- ✅ **Permission-based Access Control** with role hierarchy
- ✅ **Immutable Audit Logs** for compliance
- ✅ **Database Triggers** for automatic logging
- ✅ **HTTPS Support** (optional via certificates)
- ✅ **Tailscale Support** for remote development

## 🚀 Deployment

### Environment Variables

Required environment variables:

- `PUBLIC_API_URL` - MountainHR backend URL (default: `http://localhost:8080`)
- Doppler secrets for production deployment

### Pre-Deployment Checklist

```bash
# 1. Run TypeScript check
npm run check

# 2. Run linter
npm run lint

# 3. Run unit tests
npm run test:unit -- --run

# 4. Run E2E tests
npm run test:e2e

# 5. Build for production
npm run build
```

## 📝 Contributing

1. Follow **TypeScript strict mode** - no `any` types
2. Use **Svelte 5 runes syntax** (`$state`, `$derived`, `$props`)
3. Write **tests before implementation** (TDD approach)
4. Run `npm run check` before committing
5. Follow existing component and page patterns
6. Server-side data loading only (no client-side API calls)

## 📖 Documentation

- **CLAUDE.md** - Complete project documentation for Claude Code
- **Storybook** - Component documentation at `http://localhost:6006`
- **IMPLEMENTATION_PROGRESS.md** - Detailed progress tracking for feature 019

## 🙏 Acknowledgments

Built with:

- [SvelteKit](https://kit.svelte.dev/)
- [Svelte 5](https://svelte.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Skeleton UI](https://skeleton.dev/)
- [PostGraphile](https://www.graphile.org/postgraphile/)
- [Playwright](https://playwright.dev/)
- [Storybook](https://storybook.js.org/)

## 📄 License

[Add your license here]

---

**Last Updated**: 2025-10-01
**Current Branch**: 018-please-put-10
**Feature Status**: 019-we-need-to at 89% completion
