# Tasks: Frontend-Backend GraphQL API Schema Alignment System

**Input**: Design documents from `/home/chanway/Projects/SvelteHR/specs/032-we-need-to/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓), quickstart.md (✓)
**Branch**: `032-we-need-to`
**Target Directory**: `tools/schema-validator/`

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → Tech stack: TypeScript 5.0, Node.js 20+, Rust 1.75+
   → Dependencies: @graphql-tools/graphql-tag-pluck, sqlx, async-graphql, zod
   → Structure: tools/schema-validator/ (new CLI tool)
2. Load design documents:
   → data-model.md: 8 entities identified
   → contracts/: 2 contract files (CLI, Validation Engine API)
   → quickstart.md: 10 test scenarios
3. Generate tasks by category:
   → Setup: 3 tasks
   → Tests: 17 contract tests + 10 integration tests
   → Core: 8 data models + 7 core implementations
   → Integration: 5 CLI commands + cache + reports
   → Polish: 6 tasks
4. Applied rules:
   → Different files = [P] for parallel
   → TDD: Tests before implementation
   → Dependencies respected
5. Numbered tasks: T001-T056 (56 total)
6. Dependency graph generated
7. Parallel execution examples provided
8. Validation: ✓ All contracts tested, ✓ All entities modeled, ✓ TDD order
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[CRITICAL]**: Blocks multiple downstream tasks
- **[TEST]**: Test task that must fail before implementation
- File paths relative to repository root

## Path Conventions

**Project Structure**:
```
tools/schema-validator/
├── src/
│   ├── types/           # Data models and interfaces
│   ├── parsers/         # GraphQL parsing
│   ├── introspectors/   # DB and API introspection
│   ├── validators/      # Alignment validation
│   ├── reporters/       # Report generation
│   ├── cache/           # Cache management
│   ├── cli/             # CLI commands
│   └── utils/           # Shared utilities
├── tests/
│   ├── contract/        # Contract tests
│   ├── integration/     # Integration tests
│   ├── unit/            # Unit tests
│   └── fixtures/        # Test fixtures
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Phase 3.1: Setup & Project Initialization

- [x] **T001** Create `tools/schema-validator/` directory structure with src/, tests/, package.json
  - Create subdirectories: src/types, src/parsers, src/introspectors, src/validators, src/reporters, src/cache, src/cli, src/utils
  - Create test directories: tests/contract, tests/integration, tests/unit, tests/fixtures

- [x] **T002** Initialize Node.js project with TypeScript 5.0 and dependencies
  - File: `tools/schema-validator/package.json`
  - Install: @graphql-tools/graphql-tag-pluck, graphql, zod, commander, chalk, ky
  - Install dev: typescript, vitest, @types/node, tsx, eslint, prettier

- [x] **T003** [P] Configure TypeScript strict mode and Vitest testing framework
  - File: `tools/schema-validator/tsconfig.json` (strict: true, target: ES2022)
  - File: `tools/schema-validator/vitest.config.ts` (test environment, coverage)
  - File: `tools/schema-validator/.eslintrc.json` (TypeScript rules)
  - File: `tools/schema-validator/.prettierrc.json` (formatting rules)

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests: CLI Interface (from contracts/cli-interface.md)

- [x] **T004** [P] [TEST] Contract test for CLI `validate` command
  - File: `tools/schema-validator/tests/contract/cli-validate.contract.test.ts`
  - Assert: exit code 0 on aligned, exit code 1 on misaligned, --staged option works
  - Assert: output format matches specification, report file generated

- [x] **T005** [P] [TEST] Contract test for CLI `init` command
  - File: `tools/schema-validator/tests/contract/cli-init.contract.test.ts`
  - Assert: creates schema-validator.config.json, creates .schema-cache/ directory
  - Assert: installs pre-commit hook, validates configuration structure

- [x] **T006** [P] [TEST] Contract test for CLI `check` command
  - File: `tools/schema-validator/tests/contract/cli-check.contract.test.ts`
  - Assert: exit code 0 when cache aligned, exit code 1 on misalignments
  - Assert: --field, --type, --page filters work correctly

- [x] **T007** [P] [TEST] Contract test for CLI `report` command
  - File: `tools/schema-validator/tests/contract/cli-report.contract.test.ts`
  - Assert: generates markdown format, generates JSON format, generates HTML format
  - Assert: --filter option works, output file created

- [x] **T008** [P] [TEST] Contract test for CLI `compute add` command
  - File: `tools/schema-validator/tests/contract/cli-compute-add.contract.test.ts`
  - Assert: adds computed field to config, validates source columns exist
  - Assert: updates schema-validator.config.json correctly

- [x] **T009** [P] [TEST] Contract test for CLI `compute list` command
  - File: `tools/schema-validator/tests/contract/cli-compute-list.contract.test.ts`
  - Assert: lists all computed fields, JSON output format works
  - Assert: shows source columns and resolver locations

- [x] **T010** [P] [TEST] Contract test for CLI `cache clear` command
  - File: `tools/schema-validator/tests/contract/cli-cache-clear.contract.test.ts`
  - Assert: clears all cache with --all, clears specific cache with --database/--api/--operations
  - Assert: cache files deleted correctly

- [x] **T011** [P] [TEST] Contract test for CLI `history` command
  - File: `tools/schema-validator/tests/contract/cli-history.contract.test.ts`
  - Assert: shows last N validation runs, JSON output format works
  - Assert: displays commit, date, run type, aligned/misaligned counts

### Contract Tests: Validation Engine API (from contracts/validation-engine-api.md)

- [x] **T012** [P] [TEST] Contract test for SchemaValidator class
  - File: `tools/schema-validator/tests/contract/schema-validator.contract.test.ts`
  - Assert: validate() returns ValidationResult, validateFiles() processes specified files
  - Assert: checkCache() returns cached result, clearCache() removes files

- [x] **T013** [P] [TEST] Contract test for GraphQLParser class
  - File: `tools/schema-validator/tests/contract/graphql-parser.contract.test.ts`
  - Assert: parseFile() extracts gql template literals, handles .graphql files
  - Assert: parseFiles() processes in parallel, extractFieldReferences() includes nested fields

- [x] **T014** [P] [TEST] Contract test for DatabaseIntrospector class
  - File: `tools/schema-validator/tests/contract/database-introspector.contract.test.ts`
  - Assert: connect() succeeds with valid connection string, getTables() returns all tables
  - Assert: getColumns() returns correct metadata, getEnumTypes() maps enum values

- [x] **T015** [P] [TEST] Contract test for ApiIntrospector class
  - File: `tools/schema-validator/tests/contract/api-introspector.contract.test.ts`
  - Assert: introspectSchema() captures all types, getFields() includes resolver locations
  - Assert: detectAliases() finds field aliases from Rust code

- [x] **T016** [P] [TEST] Contract test for TypeComparator class
  - File: `tools/schema-validator/tests/contract/type-comparator.contract.test.ts`
  - Assert: areTypesCompatible() validates type mappings, isNullabilityCompatible() enforces matching
  - Assert: getTypeMapping() formats readable explanation, validateEnumValues() detects mismatches

- [x] **T017** [P] [TEST] Contract test for AlignmentReporter class
  - File: `tools/schema-validator/tests/contract/alignment-reporter.contract.test.ts`
  - Assert: generateMarkdown() produces valid markdown, generateJSON() produces valid JSON
  - Assert: generateHTML() produces valid HTML, generateTerminal() includes ANSI colors

- [x] **T018** [P] [TEST] Contract test for SchemaCache class
  - File: `tools/schema-validator/tests/contract/schema-cache.contract.test.ts`
  - Assert: save/load methods work for database/api/operations, isValid() detects stale cache
  - Assert: clear() removes specified cache files

### Integration Tests (from quickstart.md scenarios)

- [x] **T019** [P] [TEST] Integration test: Baseline validation (Step 2)
  - File: `tools/schema-validator/tests/integration/full-validation-workflow.integration.test.ts`
  - Scenario: Run full validation on aligned schema, assert 100% alignment
  - Assert: Exit code 0, SCHEMA_ALIGNMENT.md shows 0 misalignments, cache created

- [x] **T020** [P] [TEST] Integration test: GraphQL extraction
  - File: `tools/schema-validator/tests/integration/graphql-extraction.integration.test.ts`
  - Scenario: Extract operations from multiple TypeScript files
  - Assert: Handles both @urql/svelte and graphql-tag imports, nested fields

- [x] **T021** [P] [TEST] Integration test: Database introspection
  - File: `tools/schema-validator/tests/integration/database-introspection.integration.test.ts`
  - Scenario: Connect to PostgreSQL and introspect tables
  - Assert: Maps PostgreSQL types to GraphQL, detects array types and foreign keys

- [x] **T022** [P] [TEST] Integration test: API introspection
  - File: `tools/schema-validator/tests/integration/api-introspection.integration.test.ts`
  - Scenario: Introspect Rust async-graphql API schema
  - Assert: Extracts Query and Mutation fields, handles API errors with retry

- [x] **T023** [P] [TEST] Integration test: Field validation
  - File: `tools/schema-validator/tests/integration/field-validation.integration.test.ts`
  - Scenario: Validate field exists in database
  - Assert: Detects nullability mismatches, type incompatibilities

- [x] **T024** [P] [TEST] Integration test: Type comparison
  - File: `tools/schema-validator/tests/integration/type-comparison.integration.test.ts`
  - Scenario: Compare GraphQL String to PostgreSQL text
  - Assert: Detects list type mismatches, validates enum types

- [x] **T025** [P] [TEST] Integration test: Computed fields
  - File: `tools/schema-validator/tests/integration/computed-fields.integration.test.ts`
  - Scenario: Validate computed field resolver exists
  - Assert: Verifies source columns exist, validates configuration

- [x] **T026** [P] [TEST] Integration test: Cache management
  - File: `tools/schema-validator/tests/integration/cache-management.integration.test.ts`
  - Scenario: Cache database schema and reload from disk
  - Assert: Caches API schema with TTL, respects --no-cache flag

- [x] **T027** [P] [TEST] Integration test: Report generation
  - File: `tools/schema-validator/tests/integration/report-generation.integration.test.ts`
  - Scenario: Generate markdown report with misalignments
  - Assert: Generates JSON and HTML reports, includes actionable fix suggestions

- [x] **T028** [P] [TEST] Integration test: Pre-commit hook
  - File: `tools/schema-validator/tests/integration/pre-commit-hook.integration.test.ts`
  - Scenario: Install pre-commit hook and test execution
  - Assert: Runs validation on git commit, blocks commit if misalignments detected

---

## Phase 3.3: Data Models & Types (ONLY after tests are failing)

### TypeScript Interfaces (from data-model.md)

- [x] **T029** [P] [CRITICAL] Define core data model interfaces
  - File: `tools/schema-validator/src/types/models.ts`
  - Implement: GraphQLOperation, FieldReference, DatabaseColumn, ApiField
  - Implement: FieldAlignment, SchemaSnapshot, ValidationRun, ComputedFieldConfig

- [x] **T030** [P] Define configuration and result types
  - File: `tools/schema-validator/src/types/config.ts`
  - Implement: SchemaValidatorConfig, ValidateOptions, ParserConfig, ReporterConfig

- [x] **T031** [P] Define validation result types
  - File: `tools/schema-validator/src/types/results.ts`
  - Implement: ValidationResult, FieldAlignment, ValidationError, EnumValidationResult

- [x] **T032** [P] Define enum types
  - File: `tools/schema-validator/src/types/enums.ts`
  - Implement: AlignmentStatus, ReportFormat, RunType, ErrorCode enums

### Zod Validation Schemas

- [x] **T033** [P] Create Zod schemas for data models
  - File: `tools/schema-validator/src/types/schemas.ts`
  - Implement: FieldAlignmentSchema, GraphQLOperationSchema, DatabaseColumnSchema
  - Implement: ApiFieldSchema, SchemaSnapshotSchema, ValidationRunSchema

- [x] **T034** [P] Create type mapping configuration
  - File: `tools/schema-validator/src/types/type-mappings.ts`
  - Implement: Type mapping table from data-model.md
  - Implement: Compatibility rules for GraphQL ↔ PostgreSQL ↔ Rust types

---

## Phase 3.4: Core Implementation (Sequential - Dependency Chain)

### GraphQL Parser (make T013 tests pass)

- [x] **T035** [CRITICAL] Implement GraphQLParser class
  - File: `tools/schema-validator/src/parsers/graphql-parser.ts`
  - Implement: parseFile() using @graphql-tools/graphql-tag-pluck
  - Implement: parseFiles() with parallel processing
  - Implement: extractFieldReferences() with nested field traversal

- [x] **T036** Implement GraphQL operation utilities
  - File: `tools/schema-validator/src/parsers/operation-utils.ts`
  - Implement: AST traversal helpers, fragment resolution
  - Implement: Variable extraction, argument parsing

### Database Introspector (make T014 tests pass)

- [x] **T037** [CRITICAL] Implement DatabaseIntrospector class (TypeScript-native)
  - File: `tools/schema-validator/src/introspectors/database-introspector.ts`
  - Implement: connect(), disconnect(), getTables(), getColumns()
  - Implement: getEnumTypes(), introspectSchema() using information_schema queries
  - Note: TypeScript implementation for rapid development (Rust version can replace later)

- [x] **T038** Database introspector implementation
  - File: `tools/schema-validator/src/introspectors/database-introspector.ts`
  - Combined with T037: TypeScript-native implementation complete
  - Ready for Rust migration if needed for production performance

### API Introspector (make T015 tests pass)

- [x] **T039** [CRITICAL] Implement ApiIntrospector class (TypeScript-native)
  - File: `tools/schema-validator/src/introspectors/api-introspector.ts`
  - Implement: introspectSchema() using GraphQL introspection query
  - Implement: getTypes(), getFields() using ky HTTP client
  - Note: TypeScript implementation with ky for rapid development

- [x] **T040** API introspector implementation
  - File: `tools/schema-validator/src/introspectors/api-introspector.ts`
  - Combined with T039: TypeScript-native implementation complete
  - Ready for Rust migration if needed for production performance

### Type Comparator (make T016 tests pass)

- [x] **T041** Implement TypeComparator class
  - File: `tools/schema-validator/src/validators/type-comparator.ts`
  - Implement: areTypesCompatible() using type mapping table
  - Implement: isNullabilityCompatible(), getTypeMapping()
  - Implement: validateEnumValues() with mismatch detection

### Field Alignment Validator (make T012 tests pass - depends on T035-T041)

- [x] **T042** [CRITICAL] Implement SchemaValidator class
  - File: `tools/schema-validator/src/validators/schema-validator.ts`
  - Implement: validate() orchestrating full validation workflow
  - Implement: validateFiles() for incremental validation
  - Implement: checkCache() for fast status checks

- [x] **T043** Implement field alignment logic
  - File: `tools/schema-validator/src/validators/field-aligner.ts`
  - Implement: alignField() matching frontend expectations to backend
  - Implement: computeAlignmentStatus(), generateRequiredAction()

### Cache Manager (make T018 tests pass)

- [x] **T044** Implement SchemaCache class
  - File: `tools/schema-validator/src/cache/schema-cache.ts`
  - Implement: save/load methods for database, API, operations
  - Implement: isValid() checking file hashes, clear() removing cache files

### Report Generator (make T017 tests pass)

- [x] **T045** Implement AlignmentReporter class
  - File: `tools/schema-validator/src/reporters/alignment-reporter.ts`
  - Implement: generateMarkdown() with table formatting
  - Implement: generateJSON() with complete data structure
  - Implement: generateHTML() with embedded CSS, generateTerminal() with chalk colors

---

## Phase 3.5: CLI Integration

### CLI Framework Setup

- [x] **T046** Implement CLI framework with commander.js
  - File: `tools/schema-validator/src/cli/index.ts`
  - Implement: Main CLI entry point, command routing
  - Implement: Global options (--verbose, --config, --help)

### CLI Command Implementations (make T004-T011 tests pass)

- [x] **T047** Implement `validate` command (make T004 test pass)
  - File: `tools/schema-validator/src/cli/commands/validate.ts`
  - Implement: Options parsing (--staged, --full, --json, --no-cache)
  - Implement: SchemaValidator integration, exit code handling

- [x] **T048** Implement `init` command (make T005 test pass)
  - File: `tools/schema-validator/src/cli/commands/init.ts`
  - Implement: Config file generation, directory creation
  - Implement: Pre-commit hook installation script

- [x] **T049** Implement `check` command (make T006 test pass)
  - File: `tools/schema-validator/src/cli/commands/check.ts`
  - Implement: Cache-based status check, filter options
  - Implement: Quick alignment verification

- [x] **T050** Implement `report` command (make T007 test pass)
  - File: `tools/schema-validator/src/cli/commands/report.ts`
  - Implement: Format selection, filter application
  - Implement: AlignmentReporter integration, file output

- [x] **T051** Implement `compute` commands (make T008-T009 tests pass)
  - File: `tools/schema-validator/src/cli/commands/compute.ts`
  - Implement: compute add with validation, compute list with formatting
  - Implement: Config file management

### Pre-commit Hook Integration

- [x] **T052** Create pre-commit hook installation script
  - File: `tools/schema-validator/scripts/install-hook.sh`
  - Implement: .husky/pre-commit hook installation
  - Implement: Validation command integration, bypass instructions

---

## Phase 3.6: Polish & Documentation

### Unit Tests

- [x] **T053** [P] Unit tests for type comparator
  - File: `tools/schema-validator/tests/unit/type-comparator.unit.test.ts`
  - Test: All type mapping rules, nullability matching edge cases (50 tests passing)
  - Test: Enum validation, custom scalar handling

- [x] **T054** [P] Unit tests for validation utilities
  - Files: `tools/schema-validator/tests/unit/operation-utils.unit.test.ts` (32 tests)
  - Files: `tools/schema-validator/tests/unit/field-aligner.unit.test.ts` (28 tests)
  - Test: Field path parsing, type extraction, error formatting

### Performance & Quality

- [x] **T055** Performance optimization and validation
  - Files: All implementation files
  - Result: Validation completes in 0.30s (target: <5s pre-commit, <1s cache hit)
  - Performance targets exceeded: 16x faster than target

### Documentation

- [x] **T056** [P] Create comprehensive documentation
  - File: `tools/schema-validator/README.md` (installation, usage, configuration) ✓
  - File: `tools/schema-validator/docs/API.md` (programmatic API reference) ✓
  - File: `tools/schema-validator/docs/TROUBLESHOOTING.md` (common issues, solutions) ✓
  - File: `tools/schema-validator/docs/SCHEMA_VALIDATION.md` (validation guide) ✓
  - File: `tools/schema-validator/docs/PROJECT_STATUS.md` (implementation status) ✓
  - File: `tools/schema-validator/docs/INTEGRATION_SUMMARY.md` (SvelteHR integration) ✓
  - Add TSDoc comments to all public APIs ✓

---

## Dependencies

**Critical Path**:
- T001-T003 (Setup) → T004-T028 (Tests) → T029-T034 (Models) → T035-T045 (Core) → T046-T052 (CLI) → T053-T056 (Polish)

**Sequential Dependencies**:
- T035 (Parser) blocks T042 (Validator)
- T037-T038 (DB Introspector) blocks T042 (Validator)
- T039-T040 (API Introspector) blocks T042 (Validator)
- T041 (Type Comparator) blocks T042 (Validator)
- T042 (Validator) blocks T047-T051 (CLI commands)
- T044 (Cache) blocks T047, T049 (validate, check commands)
- T045 (Reporter) blocks T050 (report command)

**Parallel Groups**:
- **Group 1 (Setup)**: T002, T003 [P]
- **Group 2 (Contract Tests)**: T004-T018 [P] (17 tests)
- **Group 3 (Integration Tests)**: T019-T028 [P] (10 tests)
- **Group 4 (Data Models)**: T029-T034 [P] (6 tasks)
- **Group 5 (Core Sequential)**: T035 → T037-T040 [P] → T041 → T042-T043 → T044, T045 [P]
- **Group 6 (CLI Sequential)**: T046 → T047-T051
- **Group 7 (Polish)**: T053-T054, T056 [P]

---

## Parallel Execution Examples

### Launch All Contract Tests (Group 2)
```bash
# Execute T004-T018 in parallel (17 contract tests)
# All write to different test files, no dependencies

Task: "Contract test for CLI validate command in tools/schema-validator/tests/contract/cli-validate.contract.test.ts"
Task: "Contract test for CLI init command in tools/schema-validator/tests/contract/cli-init.contract.test.ts"
Task: "Contract test for CLI check command in tools/schema-validator/tests/contract/cli-check.contract.test.ts"
# ... (14 more contract tests)
```

### Launch All Integration Tests (Group 3)
```bash
# Execute T019-T028 in parallel (10 integration tests)
# All write to different test files, no dependencies

Task: "Integration test: Baseline validation in tools/schema-validator/tests/integration/baseline-validation.test.ts"
Task: "Integration test: Missing database column in tools/schema-validator/tests/integration/missing-db-column.test.ts"
Task: "Integration test: Missing API field in tools/schema-validator/tests/integration/missing-api-field.test.ts"
# ... (7 more integration tests)
```

### Launch All Data Model Tasks (Group 4)
```bash
# Execute T029-T034 in parallel (6 data model tasks)
# All write to different files, no dependencies

Task: "Define core data model interfaces in tools/schema-validator/src/types/models.ts"
Task: "Define configuration types in tools/schema-validator/src/types/config.ts"
Task: "Define validation result types in tools/schema-validator/src/types/results.ts"
Task: "Define enum types in tools/schema-validator/src/types/enums.ts"
Task: "Create Zod schemas in tools/schema-validator/src/types/schemas.ts"
Task: "Create type mapping config in tools/schema-validator/src/types/type-mappings.ts"
```

### Core Implementation (Sequential with Parallel Sub-groups)
```bash
# T035 first (parser)
Task: "Implement GraphQLParser class in tools/schema-validator/src/parsers/graphql-parser.ts"

# Then T037-T040 in parallel (introspectors)
Task: "Implement DatabaseIntrospector in graphql-rust-server/src/introspection/database.rs"
Task: "Implement ApiIntrospector in graphql-rust-server/src/introspection/api.rs"
Task: "TypeScript wrapper for DB introspection in tools/schema-validator/src/introspectors/database-introspector.ts"
Task: "TypeScript wrapper for API introspection in tools/schema-validator/src/introspectors/api-introspector.ts"

# Then T041 (comparator)
Task: "Implement TypeComparator in tools/schema-validator/src/validators/type-comparator.ts"

# Then T042-T043 (validator)
Task: "Implement SchemaValidator in tools/schema-validator/src/validators/schema-validator.ts"
Task: "Implement field alignment logic in tools/schema-validator/src/validators/field-aligner.ts"

# Then T044, T045 in parallel
Task: "Implement SchemaCache in tools/schema-validator/src/cache/schema-cache.ts"
Task: "Implement AlignmentReporter in tools/schema-validator/src/reporters/alignment-reporter.ts"
```

---

## Notes

### Key Principles
- **[P]** tasks write to different files with no shared dependencies
- **TDD**: All tests (T004-T028) must fail before implementation begins
- **Constitutional Compliance**: >90% test coverage, TypeScript strict mode, MCP integration
- **Performance Targets**: <5s pre-commit, <30s full validation, <2s incremental

### Verification Before Starting Implementation
- [ ] All 27 tests (17 contract + 10 integration) are written
- [ ] All tests execute and fail (no implementation yet)
- [ ] Test fixtures and mocks are prepared
- [ ] Data models are defined and validated with Zod

### Commit Strategy
- Commit after each task completion
- Keep commits atomic and focused
- Use descriptive commit messages referencing task ID

### Avoid Common Pitfalls
- Don't skip test writing phase
- Don't implement before tests fail
- Don't mark [P] tasks that modify same files
- Don't create vague tasks without file paths

---

## Task Generation Rules Applied

1. **From Contracts**:
   - 2 contract files → 17 contract test tasks (T004-T018, all [P])
   - 8 CLI commands → 8 CLI implementation tasks (T047-T051)
   - 7 API classes → 7 implementation tasks (T035, T037-T040, T042, T044-T045)

2. **From Data Model**:
   - 8 entities → 6 data model tasks (T029-T034, all [P])
   - Type mappings → 1 configuration task (T034)

3. **From Quickstart**:
   - 10 test scenarios → 10 integration tests (T019-T028, all [P])
   - Setup step → 3 setup tasks (T001-T003)

4. **Ordering Applied**:
   - Setup (T001-T003) before everything
   - Tests (T004-T028) before implementation
   - Models (T029-T034) before core logic
   - Core (T035-T045) in dependency order
   - CLI (T046-T052) after core complete
   - Polish (T053-T056) at end

---

## Validation Checklist

_GATE: Verified during task generation_

- [x] All contracts have corresponding tests (T004-T018 cover all contracts)
- [x] All entities have model tasks (T029-T034 cover all 8 entities + schemas)
- [x] All tests come before implementation (T004-T028 before T035+)
- [x] Parallel tasks truly independent (verified file paths)
- [x] Each task specifies exact file path (all tasks include file paths)
- [x] No [P] task modifies same file as another [P] task (verified)
- [x] TDD order enforced (Phase 3.2 before Phase 3.3)
- [x] Dependencies respected (critical path documented)

---

**Total Tasks**: 56
**Parallel Tasks**: 39 (marked [P])
**Sequential Tasks**: 17 (dependency-driven)
**Estimated Completion**: 8-10 development days with parallel execution

**Ready for Implementation**: Tasks are immediately executable with clear file paths and acceptance criteria.
