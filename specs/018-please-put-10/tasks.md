# Tasks: Comprehensive Sample Data System

**Input**: Design documents from `/home/yycholla/Documents/SvelteHR/specs/018-please-put-10/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓)

## Execution Flow (main)

```
1. Load plan.md from feature directory ✓
   → Tech stack: TypeScript 5.0, Node.js 18+, PostGraphile, Faker.js
   → Structure: Web app (backend/src/, frontend/src/)
2. Load design documents: ✓
   → data-model.md: 9 core entities → model tasks
   → contracts/: 2 files → contract test tasks
   → research.md: Technical decisions → setup tasks
3. Generate tasks by category:
   → Setup: dependencies, configuration, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, schema discovery, batch operations
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness: ✓
   → All contracts have tests ✓
   → All entities have models ✓
   → All CLI commands implemented ✓
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- Web app structure: `backend/src/`, `backend/scripts/`, `backend/tests/`

## Phase 3.1: Setup

- [x] **T001** Create backend sample data directory structure in `backend/src/sample-data/`
- [x] **T002** Initialize TypeScript configuration for sample data system in `backend/tsconfig.sample-data.json`
- [x] **T003** [P] Install Faker.js, pg-promise, and command-line dependencies in `backend/package.json`
- [x] **T004** [P] Configure ESLint and Prettier for sample data scripts in `backend/.eslintrc.sample-data.js`
- [x] **T005** Create sample data configuration file structure in `backend/config/sample-data.json`

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests [P] - All can run in parallel

- [ ] **T006** [P] Contract test for SampleDataConfig interface in `backend/tests/contracts/sample-data-config.test.ts`
- [ ] **T007** [P] Contract test for TableConfig interface in `backend/tests/contracts/table-config.test.ts`
- [ ] **T008** [P] Contract test for DatabaseSchema interface in `backend/tests/contracts/database-schema.test.ts`
- [ ] **T009** [P] Contract test for SampleDataResult interface in `backend/tests/contracts/sample-data-result.test.ts`
- [ ] **T010** [P] Contract test for CLI interfaces in `backend/tests/contracts/cli-interface.test.ts`
- [ ] **T011** [P] Contract test for error classes in `backend/tests/contracts/error-types.test.ts`

### Integration Tests [P] - All can run in parallel

- [ ] **T012** [P] Integration test for database schema discovery in `backend/tests/integration/schema-discovery.test.ts`
- [ ] **T013** [P] Integration test for sample data generation workflow in `backend/tests/integration/data-generation.test.ts`
- [ ] **T014** [P] Integration test for data merging with existing records in `backend/tests/integration/data-merging.test.ts`
- [ ] **T015** [P] Integration test for CLI command execution in `backend/tests/integration/cli-commands.test.ts`
- [ ] **T016** [P] Integration test for cross-machine consistency in `backend/tests/integration/deterministic-generation.test.ts`
- [ ] **T017** [P] Integration test for error recovery scenarios in `backend/tests/integration/error-recovery.test.ts`

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Data Models [P] - All can run in parallel

- [ ] **T018** [P] SampleDataConfig model with validation in `backend/src/sample-data/models/SampleDataConfig.ts`
- [ ] **T019** [P] TableConfig model with validation in `backend/src/sample-data/models/TableConfig.ts`
- [ ] **T020** [P] DatabaseSchema model in `backend/src/sample-data/models/DatabaseSchema.ts`
- [ ] **T021** [P] TableSchema model in `backend/src/sample-data/models/TableSchema.ts`
- [ ] **T022** [P] SampleDataResult model in `backend/src/sample-data/models/SampleDataResult.ts`
- [ ] **T023** [P] Error classes (SampleDataError, ValidationError, etc.) in `backend/src/sample-data/models/Errors.ts`

### Core Services [P] - Independent services can run in parallel

- [ ] **T024** [P] SchemaDiscoveryService for PostgreSQL introspection in `backend/src/sample-data/services/SchemaDiscoveryService.ts`
- [ ] **T025** [P] DataGenerationService with Faker.js integration in `backend/src/sample-data/services/DataGenerationService.ts`
- [ ] **T026** [P] ConfigurationService for JSON config management in `backend/src/sample-data/services/ConfigurationService.ts`
- [ ] **T027** [P] ProgressReporter for console output formatting in `backend/src/sample-data/services/ProgressReporter.ts`

### Database Operations

- [ ] **T028** DatabaseService for PostgreSQL connections and transactions in `backend/src/sample-data/services/DatabaseService.ts`
- [ ] **T029** BatchInsertService for UPSERT operations and bulk processing in `backend/src/sample-data/services/BatchInsertService.ts`

### Data Generation Engine

- [ ] **T030** FakerService for deterministic data generation in `backend/src/sample-data/services/FakerService.ts`
- [ ] **T031** TableDataGenerator for table-specific data patterns in `backend/src/sample-data/generators/TableDataGenerator.ts`
- [ ] **T032** RelationshipManager for foreign key dependency handling in `backend/src/sample-data/services/RelationshipManager.ts`

### CLI Commands [P] - Each command is independent

- [ ] **T033** [P] generate-sample-data CLI command in `backend/scripts/generate-sample-data.ts`
- [ ] **T034** [P] clean-sample-data CLI command in `backend/scripts/clean-sample-data.ts`
- [ ] **T035** [P] sample-data-status CLI command in `backend/scripts/sample-data-status.ts`
- [ ] **T036** [P] validate-sample-config CLI command in `backend/scripts/validate-sample-config.ts`
- [ ] **T037** [P] discover-schema CLI command in `backend/scripts/discover-schema.ts`

## Phase 3.4: Integration

### Main Orchestrator

- [ ] **T038** SampleDataOrchestrator main workflow coordinator in `backend/src/sample-data/SampleDataOrchestrator.ts`

### CLI Framework Integration

- [ ] **T039** CLI command registry and argument parsing in `backend/src/sample-data/cli/CLIFramework.ts`
- [ ] **T040** Output formatter for JSON, table, and minimal formats in `backend/src/sample-data/cli/OutputFormatter.ts`
- [ ] **T041** Error handler for CLI commands in `backend/src/sample-data/cli/ErrorHandler.ts`

### Configuration and Environment

- [ ] **T042** Environment configuration loader in `backend/src/sample-data/config/EnvironmentConfig.ts`
- [ ] **T043** Default configuration generator in `backend/src/sample-data/config/DefaultConfig.ts`
- [ ] **T044** Configuration validation service in `backend/src/sample-data/config/ConfigValidator.ts`

### Database Integration

- [ ] **T045** Connection pool management for PostgreSQL in `backend/src/sample-data/database/ConnectionManager.ts`
- [ ] **T046** Transaction management for atomic operations in `backend/src/sample-data/database/TransactionManager.ts`

## Phase 3.5: Build System Integration

### Package.json Scripts

- [ ] **T047** Add npm scripts for all CLI commands in `backend/package.json`
- [ ] **T048** Create Makefile targets for sample data operations in root `Makefile`

### Configuration Files

- [ ] **T049** Create default sample-data.json configuration in `backend/config/sample-data.json`
- [ ] **T050** Create environment-specific config overrides in `backend/config/sample-data.development.json`

## Phase 3.6: Performance and Polish

### Unit Tests [P] - All can run in parallel

- [ ] **T051** [P] Unit tests for SchemaDiscoveryService in `backend/tests/unit/services/SchemaDiscoveryService.test.ts`
- [ ] **T052** [P] Unit tests for DataGenerationService in `backend/tests/unit/services/DataGenerationService.test.ts`
- [ ] **T053** [P] Unit tests for FakerService deterministic generation in `backend/tests/unit/services/FakerService.test.ts`
- [ ] **T054** [P] Unit tests for ConfigurationService in `backend/tests/unit/services/ConfigurationService.test.ts`
- [ ] **T055** [P] Unit tests for BatchInsertService in `backend/tests/unit/services/BatchInsertService.test.ts`
- [ ] **T056** [P] Unit tests for validation logic in `backend/tests/unit/validation/ConfigValidation.test.ts`

### Performance Tests

- [ ] **T057** Performance test for full database population (<5 seconds) in `backend/tests/performance/full-generation.test.ts`
- [ ] **T058** Performance test for individual table generation (<1 second) in `backend/tests/performance/table-generation.test.ts`
- [ ] **T059** Memory usage test during large dataset generation in `backend/tests/performance/memory-usage.test.ts`

### End-to-End Validation

- [ ] **T060** E2E test for quickstart scenarios using Playwright in `tests/e2e/sample-data-quickstart.spec.ts`
- [ ] **T061** E2E test for application pages with sample data in `tests/e2e/sample-data-application.spec.ts`

### Documentation and Polish

- [ ] **T062** [P] Create README.md for sample data system in `backend/src/sample-data/README.md`
- [ ] **T063** [P] Update main project documentation in `README.md` with sample data instructions
- [ ] **T064** Code cleanup and remove any TODO comments from implementation files
- [ ] **T065** Verify all error messages are user-friendly and actionable

## Phase 3.7: Git Integration

### Version Control

- [ ] **T066** Add all implementation files to git with `git add -A`
- [ ] **T067** Commit comprehensive sample data system with descriptive message
- [ ] **T068** Push all changes to GitHub repository

## Dependencies

### Critical Dependencies (Must Complete Before Next Phase)

- **Setup (T001-T005)** before all other tasks
- **All Tests (T006-T017)** before **ANY Implementation (T018-T046)**
- **Models (T018-T023)** before **Services (T024-T032)**
- **Services (T024-T032)** before **CLI Commands (T033-T037)**
- **Core Implementation (T018-T037)** before **Integration (T038-T046)**
- **All Implementation (T018-T048)** before **Polish (T051-T065)**
- **All Tasks (T001-T065)** before **Git Integration (T066-T068)**

### Internal Dependencies

- T028 (DatabaseService) blocks T029 (BatchInsertService), T045 (ConnectionManager)
- T024 (SchemaDiscoveryService) blocks T032 (RelationshipManager)
- T025 (DataGenerationService) blocks T031 (TableDataGenerator)
- T038 (SampleDataOrchestrator) requires T024-T032 (all services)
- T047-T048 (Build integration) requires T033-T037 (CLI commands)

## Parallel Execution Examples

### Contract Tests Phase (T006-T011)

```bash
# Launch T006-T011 together:
Task: "Contract test for SampleDataConfig interface in backend/tests/contracts/sample-data-config.test.ts"
Task: "Contract test for TableConfig interface in backend/tests/contracts/table-config.test.ts"
Task: "Contract test for DatabaseSchema interface in backend/tests/contracts/database-schema.test.ts"
Task: "Contract test for SampleDataResult interface in backend/tests/contracts/sample-data-result.test.ts"
Task: "Contract test for CLI interfaces in backend/tests/contracts/cli-interface.test.ts"
Task: "Contract test for error classes in backend/tests/contracts/error-types.test.ts"
```

### Integration Tests Phase (T012-T017)

```bash
# Launch T012-T017 together:
Task: "Integration test for database schema discovery in backend/tests/integration/schema-discovery.test.ts"
Task: "Integration test for sample data generation workflow in backend/tests/integration/data-generation.test.ts"
Task: "Integration test for data merging with existing records in backend/tests/integration/data-merging.test.ts"
Task: "Integration test for CLI command execution in backend/tests/integration/cli-commands.test.ts"
Task: "Integration test for cross-machine consistency in backend/tests/integration/deterministic-generation.test.ts"
Task: "Integration test for error recovery scenarios in backend/tests/integration/error-recovery.test.ts"
```

### Data Models Phase (T018-T023)

```bash
# Launch T018-T023 together:
Task: "SampleDataConfig model with validation in backend/src/sample-data/models/SampleDataConfig.ts"
Task: "TableConfig model with validation in backend/src/sample-data/models/TableConfig.ts"
Task: "DatabaseSchema model in backend/src/sample-data/models/DatabaseSchema.ts"
Task: "TableSchema model in backend/src/sample-data/models/TableSchema.ts"
Task: "SampleDataResult model in backend/src/sample-data/models/SampleDataResult.ts"
Task: "Error classes (SampleDataError, ValidationError, etc.) in backend/src/sample-data/models/Errors.ts"
```

### CLI Commands Phase (T033-T037)

```bash
# Launch T033-T037 together:
Task: "generate-sample-data CLI command in backend/scripts/generate-sample-data.ts"
Task: "clean-sample-data CLI command in backend/scripts/clean-sample-data.ts"
Task: "sample-data-status CLI command in backend/scripts/sample-data-status.ts"
Task: "validate-sample-config CLI command in backend/scripts/validate-sample-config.ts"
Task: "discover-schema CLI command in backend/scripts/discover-schema.ts"
```

### Unit Tests Phase (T051-T056)

```bash
# Launch T051-T056 together:
Task: "Unit tests for SchemaDiscoveryService in backend/tests/unit/services/SchemaDiscoveryService.test.ts"
Task: "Unit tests for DataGenerationService in backend/tests/unit/services/DataGenerationService.test.ts"
Task: "Unit tests for FakerService deterministic generation in backend/tests/unit/services/FakerService.test.ts"
Task: "Unit tests for ConfigurationService in backend/tests/unit/services/ConfigurationService.test.ts"
Task: "Unit tests for BatchInsertService in backend/tests/unit/services/BatchInsertService.test.ts"
Task: "Unit tests for validation logic in backend/tests/unit/validation/ConfigValidation.test.ts"
```

## Notes

- **[P] tasks** = different files, no dependencies - can run simultaneously
- **Verify tests fail** before implementing (TDD requirement)
- **Commit after each major task** for progress tracking
- **Sequential tasks** modify shared files or have dependencies
- **All file paths** are relative to repository root
- **TypeScript strict mode** required throughout
- **Performance targets**: <5s full generation, <1s individual tables
- **Final git operations** include all changes with `git add -A`

## Task Generation Rules Applied

1. **From Contracts**:
   - sample-data-api.ts → 6 contract test tasks (T006-T011)
   - cli-interface.ts → CLI command implementation tasks (T033-T037)

2. **From Data Model**:
   - 9 core entities → 6 model creation tasks (T018-T023)
   - Relationships → service layer tasks (T024-T032)

3. **From Research Decisions**:
   - Faker.js → deterministic generation tasks (T030, T053)
   - PostgreSQL → schema discovery and database tasks (T024, T028-T029)
   - CLI integration → Make and npm script tasks (T047-T048)

4. **From Quickstart Scenarios**:
   - Integration test tasks (T012-T017)
   - E2E validation tasks (T060-T061)
   - Performance validation tasks (T057-T059)

## Validation Checklist

- [x] All contracts have corresponding tests (T006-T011)
- [x] All entities have model tasks (T018-T023)
- [x] All tests come before implementation (T006-T017 before T018+)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Git integration tasks included (T066-T068)
- [x] All CLI commands implemented (T033-T037)
- [x] Performance requirements addressed (T057-T059)
- [x] TDD workflow enforced (tests first, implementation second)

**Total Tasks**: 68 tasks
**Parallel Tasks**: 32 tasks can run in parallel
**Estimated Completion**: 25-30 hours of development work