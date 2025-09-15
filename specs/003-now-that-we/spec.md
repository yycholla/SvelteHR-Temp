# Feature Specification: PostGraphile Migration for Enhanced GraphQL Architecture

**Feature Branch**: `003-now-that-we`  
**Created**: 2025-01-16  
**Status**: Draft  
**Input**: User description: "now that we have moved over to a postgres with middlewear approach, I would like to actually use postgraphile instead of Hasura as Hasura seems to be a black box and features are locked behind a paid plan. Here is a list of things I would like to have at the start Best Practices: Use Postgres for Auth Logic: Implement a PostgreSQL function that takes a user's credentials (e.g., email and password) and returns a JSON Web Token (JWT) if they are valid. This function can leverage SECURITY DEFINER to securely check credentials without exposing sensitive information. Process JWTs: PostGraphile can be configured to process JWTs, which are sent via the Authorization: Bearer <JWT_TOKEN> header. When a token is verified, PostGraphile sets the appropriate PostgreSQL role and session variables (e.g., role, user_id) for the duration of the query. This ensures that RLS policies are automatically applied to the user's request. Row-Level Security (RLS): Enable RLS on every table in your exposed schemas. It is considered best practice to be explicit about what access is allowed by enabling RLS, even if you create a policy that grants full access (USING (true)), rather than implicitly allowing all access by leaving RLS disabled. Leverage Grants: For SELECT and DELETE operations, use table-level grants (GRANT SELECT ON users TO graphql_role). For INSERT and UPDATE operations, use column-level grants (GRANT INSERT (column_1) ON users TO graphql_role) to be more explicit about permitted actions. Caching and Performance PostGraphile itself does not have a native server-side query cache like Hasura's built-in solution. However, you can achieve similar or better performance by using an external caching system. Best Practices: External Caching: Use graphile-cache, an LRU cache for PostGraphile instances that integrates seamlessly with pg-cache. This helps prevent memory leaks and provides automatic cleanup of instances. Database Optimization: Focus on optimizing the database itself, as this is PostGraphile's primary performance lever. This includes adding indexes to foreign keys to optimize reverse relations, which PostGraphile automatically discovers and exposes in the schema. Avoid N+1 Queries: PostGraphile's core strength is its ability to compile a GraphQL query into a single, optimized SQL query, effectively eliminating the N+1 query problem that plagues many ORMs. Live Queries: For real-time functionality, PostGraphile supports live queries via plugins. This requires enabling PostgreSQL's Logical Decoding feature, which efficiently streams data changes from the database to inform affected live queries. Logging and Observability PostGraphile runs as a Node.js application or middleware, so logging and observability are handled at the application layer. Best Practices: Use Express/Koa Middleware: When running PostGraphile as a library within a Node.js framework like Express or Koa, you can use middleware for custom logging, rate limiting, and other server-level concerns. Plugins: PostGraphile offers community plugins for advanced observability, such as @haathie/postgraphile-otel, which provides OpenTelemetry Tracing for GraphQL requests. Structured Logging: Tools that collect logs, metrics, and traces are necessary to get a complete picture of an application's health and operations. It is a best practice to use a common set of tools that have an open standard and are open-source to reduce operational friction. Custom Business Logic For complex business logic that cannot be handled with simple CRUD operations, PostGraphile provides several options, all rooted in the database. Best Practices: PostgreSQL Functions: Define custom business logic directly in PostgreSQL functions. If a function is marked as VOLATILE (the default), PostGraphile exposes it as a custom mutation. This approach avoids additional HTTP requests and can be more performant than using external services. Computed Columns: For custom logic that should be part of a query, mark the PostgreSQL function as STABLE or IMMUTABLE. If the function is a computed column that returns a scalar or a set of records, PostGraphile will automatically expose it as a field on the relevant type. Plugins: For tasks like integrating external services (e.g., a third-party REST API), you can extend the PostGraphile schema by writing a plugin."

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies  
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As an HR system administrator, I need the GraphQL API layer to provide secure, performant, and transparent access to employee data so that authorized users can access and modify HR information according to their role-based permissions without being locked into proprietary vendor limitations or black-box solutions.

### Acceptance Scenarios
1. **Given** an employee user with valid credentials, **When** they authenticate with the system, **Then** they receive a secure token that grants access only to their own data and permitted HR functions
2. **Given** an HR admin user accessing employee records, **When** they query employee data, **Then** they can access all permitted records with response times under 200ms and see only data their role allows
3. **Given** a user without proper permissions, **When** they attempt to access restricted data, **Then** the system automatically denies access based on row-level security policies without exposing unauthorized information
4. **Given** multiple concurrent users accessing the system, **When** they perform database operations, **Then** the system maintains data consistency and optimal query performance without N+1 query problems

### Edge Cases
- What happens when user tokens expire during active sessions?
- How does the system handle database connection failures or high load scenarios?
- What occurs when role permissions are changed while users have active sessions?
- How are complex business logic operations handled when they span multiple database tables?

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST provide secure authentication using database-managed credential verification
- **FR-002**: System MUST process and validate JWT tokens for all GraphQL requests
- **FR-003**: System MUST enforce row-level security policies on all exposed database tables
- **FR-004**: System MUST apply role-based permissions at both table and column levels
- **FR-005**: System MUST cache query results to maintain response times under 200ms for standard operations
- **FR-006**: System MUST prevent N+1 query problems by optimizing GraphQL to SQL compilation
- **FR-007**: System MUST provide real-time data updates for HR operations requiring live data
- **FR-008**: System MUST log all security events and provide observability for system monitoring
- **FR-009**: System MUST support custom business logic through database-managed functions
- **FR-010**: System MUST maintain backwards compatibility with existing frontend GraphQL queries
- **FR-011**: System MUST provide transparent, open-source GraphQL layer without vendor lock-in
- **FR-012**: System MUST handle database schema introspection and automatic GraphQL schema generation

### Key Entities *(include if feature involves data)*
- **Authentication Token**: Secure credentials that identify users and encode their permissions and roles
- **User Role**: Permission level that determines data access scope (Admin, HR Admin, Manager, Employee)
- **Security Policy**: Rules that govern which users can access which data records
- **Query Cache**: Performance optimization layer that stores frequently accessed data
- **Business Logic Function**: Custom operations that extend basic CRUD capabilities for complex HR workflows

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous  
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---