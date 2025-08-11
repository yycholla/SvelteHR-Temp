# Product Mission

## Pitch

SvelteHR is a modern HR management platform that helps HR teams and managers manage employees, onboarding, compliance, and reporting with a fast SvelteKit web app and a secure Go API.

## Users

### Primary Customers

- Small to mid-sized organizations: Need a lightweight, fast HRIS focused on core workflows
- Healthcare and regulated teams: Require compliance tracking and audit-friendly records

### User Personas

**HR Manager** (30-55 years old)
- **Role:** Oversees employee data, onboarding, and compliance
- **Context:** Manages HR operations and reporting across departments
- **Pain Points:** Fragmented systems, manual reporting, compliance risk
- **Goals:** Centralize employee records, reduce manual work, ensure compliance

**People Operations** (25-45 years old)
- **Role:** Executes day-to-day HR workflows and data updates
- **Context:** High volume admin tasks; needs efficient UI
- **Pain Points:** Slow legacy HRIS, repetitive data entry
- **Goals:** Faster workflows, fewer clicks, accurate data

**Team Manager** (28-50 years old)
- **Role:** Reviews team metrics, approves requests
- **Context:** Uses HR portal occasionally, expects clarity
- **Pain Points:** Hard-to-find info, slow dashboards
- **Goals:** Quick insights, simple approvals

**Employee** (18-65 years old)
- **Role:** Views profile, submits requests
- **Context:** Mobile-first usage
- **Pain Points:** Confusing UI, unclear status
- **Goals:** Self-serve access to personal data and tasks

## The Problem

### Fragmented HR Data
Manual spreadsheets and disjointed tools increase errors and compliance risk. Hours per week are lost reconciling data across systems.

**Our Solution:** A single source of truth with structured models and APIs.

### Slow, Legacy Interfaces
Older HRIS systems impede adoption and productivity.

**Our Solution:** A responsive SvelteKit UI with role-aware dashboards.

### Limited Real-Time Insight
Teams lack real-time visibility into workforce metrics.

**Our Solution:** Streaming dashboards for live KPIs and status updates.

## Differentiators

### Real-time streaming dashboards
Unlike static HR portals, SvelteHR provides optional streaming mode for dashboards and list views. This results in faster situational awareness and fewer manual refreshes.

### Developer-friendly modular architecture
Unlike monolithic HR suites, SvelteHR separates a SvelteKit frontend and a Go backend with clear contracts (tRPC BFF on the frontend, REST/Swagger on the backend), enabling independent iteration and reliable testing.

### Modern DX and test coverage
Unlike untested internal tools, SvelteHR ships with Playwright e2e and Vitest unit tests, Storybook stories, and Tailwind v4 for rapid, consistent UI delivery.

## Key Features

### Core Features
- Authentication and route protection (JWT cookie, login UX)
- Role-aware dashboard with static and streaming modes
- Employees directory with search, filters, pagination
- TRPC client/server wiring for auth/session in frontend
- Accessible, responsive UI components (Tailwind v4, Lucide)

### Data & Ops
- Go backend with Chi, GORM (PostgreSQL), Swagger/OpenAPI
- Docker Compose for local API + DB
- Playwright e2e tests and Vitest unit tests



