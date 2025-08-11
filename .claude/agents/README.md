# SvelteHR Claude Code Agent Directory

This directory contains specialized Claude Code agents designed specifically for the SvelteHR project. Each agent is an expert in their domain and can be activated to provide focused assistance on specific aspects of the application.

## Available Agents

### 1. SvelteKit Specialist Agent
**File:** `svelte-specialist.md`  
**Expertise:** SvelteKit 5, TypeScript, modern Svelte patterns, runes syntax, routing, and build optimization.  
**Use When:** Implementing components, setting up routes, managing reactive state, or optimizing the build process.

### 2. HR Domain Expert Agent  
**File:** `hr-domain-expert.md`  
**Expertise:** Human resources workflows, compliance management, employee lifecycle, business rules, and HR data modeling.  
**Use When:** Designing HR-specific features, implementing business logic, or understanding HR compliance requirements.

### 3. API Integration Specialist Agent
**File:** `api-integration-specialist.md`  
**Expertise:** tRPC integration, HTTP client configuration, API performance optimization, caching, and real-time data streaming.  
**Use When:** Integrating with the Go backend, optimizing API calls, implementing data fetching patterns, or handling authentication.

### 4. Testing & Quality Assurance Specialist Agent
**File:** `testing-qa-specialist.md`  
**Expertise:** Vitest unit testing, Playwright E2E testing, Storybook component testing, quality gates, and test automation.  
**Use When:** Writing tests, setting up quality assurance processes, or ensuring code quality before deployment.

### 5. Performance Optimization Specialist Agent
**File:** `performance-optimization-specialist.md`  
**Expertise:** Bundle optimization, runtime performance, memory management, loading strategies, and performance monitoring.  
**Use When:** Optimizing application performance, reducing bundle size, implementing lazy loading, or monitoring Core Web Vitals.

### 6. UI/UX Design Specialist Agent
**File:** `ui-ux-design-specialist.md`  
**Expertise:** Design systems, accessibility (WCAG), responsive design, Skeleton UI, TailwindCSS, and user experience optimization.  
**Use When:** Creating user interfaces, ensuring accessibility compliance, implementing responsive designs, or improving user experience.

### 7. Database & Schema Specialist Agent
**File:** `database-schema-specialist.md`  
**Expertise:** Zod validation schemas, TypeScript types, data modeling, API response normalization, and data transformation.  
**Use When:** Defining data schemas, implementing validation, handling API response variations, or managing data integrity.

### 8. Documentation & Onboarding Specialist Agent
**File:** `documentation-onboarding-specialist.md`  
**Expertise:** Technical documentation, developer onboarding, code documentation, process guides, and knowledge management.  
**Use When:** Creating documentation, setting up onboarding processes, documenting APIs, or maintaining project knowledge base.

## How to Use These Agents

### 1. Identify Your Task Domain
Determine which specialist would be most appropriate for your current task:
- **Frontend Development** → SvelteKit Specialist
- **Business Logic** → HR Domain Expert  
- **API Work** → API Integration Specialist
- **Testing** → Testing & QA Specialist
- **Performance Issues** → Performance Optimization Specialist
- **UI/UX Design** → UI/UX Design Specialist
- **Data Schemas** → Database & Schema Specialist
- **Documentation** → Documentation & Onboarding Specialist

### 2. Reference the Agent Guide
Open the appropriate `.md` file to understand:
- The agent's specific expertise
- Key responsibilities and focus areas
- Code patterns and best practices
- Common commands and tools
- Integration points with other agents

### 3. Apply Agent Knowledge
Use the patterns, examples, and guidelines from the agent documentation to:
- Follow established project conventions
- Implement solutions using best practices
- Maintain consistency across the codebase
- Collaborate effectively with other specialists

## Agent Collaboration Matrix

Agents are designed to work together on complex tasks:

| Primary Agent | Common Collaborators | Typical Scenarios |
|---------------|---------------------|-------------------|
| SvelteKit Specialist | UI/UX Design, API Integration | Component development with data fetching |
| HR Domain Expert | Database Schema, API Integration | Implementing HR business logic |
| API Integration | Performance, Database Schema | Optimizing data fetching and validation |
| Testing & QA | All Agents | Quality assurance across all domains |
| Performance | SvelteKit, API Integration | Optimizing application performance |
| UI/UX Design | SvelteKit, Testing & QA | Creating accessible, tested components |
| Database Schema | HR Domain, API Integration | Designing data models and validation |
| Documentation | All Agents | Documenting specialized knowledge |

## Project-Specific Context

All agents are aware of the SvelteHR project's:
- **Tech Stack:** SvelteKit 5, TypeScript, TailwindCSS, Go backend
- **Development Commands:** `npm run check`, `npm run lint`, `npm run test`
- **Code Style:** CRUSH.md guidelines, Prettier configuration
- **Architecture:** Component-driven design, tRPC integration, Zod validation
- **Quality Standards:** TypeScript strict mode, comprehensive testing, accessibility compliance

## Quality Gates

All agents enforce these critical quality checks:
1. **TypeScript Compilation:** `npm run check` must pass
2. **Code Quality:** `npm run lint` must pass  
3. **Test Coverage:** Unit and E2E tests must pass
4. **Build Success:** `npm run build` must succeed
5. **Performance Standards:** Core Web Vitals within thresholds
6. **Accessibility:** WCAG 2.1 AA compliance

## Getting Started

1. **Identify your task** (e.g., "Create employee management component")
2. **Select appropriate agent** (SvelteKit Specialist + HR Domain Expert)
3. **Review agent guidelines** for patterns and best practices
4. **Implement solution** following agent recommendations
5. **Run quality checks** as specified by Testing & QA Specialist
6. **Document changes** per Documentation & Onboarding Specialist

## Contributing to Agent Knowledge

As the project evolves, these agent guides should be updated to reflect:
- New patterns and best practices discovered
- Changes to the tech stack or architecture
- Lessons learned from production deployment
- Team feedback and improved workflows

Each agent represents accumulated expertise that should grow with the project.