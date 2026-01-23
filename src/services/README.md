# Services Layer

Application services that orchestrate domain logic with external systems.

**Rules:**

- Can import from `domain/`
- Must depend on Ports (interfaces), not concrete implementations
- Receives dependencies via constructor injection
- Handles errors, logging, validation

**Examples:**

- EmployeeService
- AuthService
- PerformanceReviewService
