# Task Completion Checklist for SvelteHR

## Before Committing Any Code

Always run these commands in order:

### 1. Type Checking (CRITICAL)

```bash
npm run check
```

- Must pass without errors
- Ensures TypeScript/Svelte compilation
- Catches type errors early

### 2. Code Quality (REQUIRED)

```bash
npm run lint
```

- Must pass without errors
- Runs ESLint and Prettier checks
- Ensures consistent formatting

### 3. Unit Tests (IMPORTANT)

```bash
npm run test:unit -- --run
```

- All existing tests must pass
- Write tests for new functionality
- Maintain test coverage

### 4. Production Build (VERIFICATION)

```bash
npm run build
```

- Must build successfully
- Verifies no build-time errors
- Ensures production readiness

## For Major Changes

Run additional verification:

### 5. End-to-End Tests

```bash
npm run test:e2e
```

- Run relevant E2E tests for modified areas
- Use specific test commands for targeted testing

### 6. Visual Testing

```bash
npm run storybook
```

- Check component stories are working
- Verify visual changes in Storybook

## Code Review Checklist

- [ ] Follows CRUSH.md guidelines
- [ ] Uses proper TypeScript types
- [ ] Follows existing component patterns
- [ ] Has appropriate error handling
- [ ] Uses Zod schemas for validation
- [ ] Includes proper tests
- [ ] Documentation updated if needed

## Performance Considerations

- [ ] Uses pagination for large datasets
- [ ] Implements proper loading states
- [ ] Handles errors gracefully
- [ ] Optimizes bundle size
- [ ] Uses streaming where appropriate

## Git Workflow

- [ ] Feature branches from main
- [ ] Semantic commit messages
- [ ] PR reviews required
- [ ] Regular main branch updates

## Definition of Done

- [ ] Feature complete per specifications
- [ ] All checks pass (type, lint, test, build)
- [ ] Tests written and passing
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Deployed to staging (if applicable)
