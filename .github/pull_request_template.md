## Summary
<!-- 2–4 sentences: what does this PR do and why? -->

## Ticket
Closes #<!-- issue number -->

## Type of change
- [ ] Feature (new capability)
- [ ] Bug fix
- [ ] Refactoring (no behaviour change)
- [ ] Documentation
- [ ] Infrastructure / configuration
- [ ] Test improvement
- [ ] Security fix

## How to test
<!-- Step-by-step instructions for the reviewer to verify this change -->
1.
2.
3.

## Breaking changes
<!-- List any breaking API changes, schema changes, or event contract changes. -->
None

## Checklist

### Before committing
- [ ] No secrets, passwords, or connection strings committed
- [ ] No `TODO` comments (use GitHub Issues instead)
- [ ] No commented-out code
- [ ] No `System.out.println` or `console.log` in production code

### Code standards
- [ ] Java package structure follows `foundation-standards.md` Section 2
- [ ] No `@Autowired` field injection — constructor injection only
- [ ] All `java.time.*` — no `java.util.Date`
- [ ] All timestamps in UTC
- [ ] TypeScript `strict: true` compliant — no `any`

### Error handling
- [ ] All exceptions map to RFC 7807 Problem Details responses
- [ ] Business rule violations return 422, conflicts return 409
- [ ] No stack traces in HTTP responses

### Logging
- [ ] State changes logged at INFO with relevant IDs
- [ ] No personal data (national IDs, phone numbers) in log messages
- [ ] Correlation ID propagated in outbound calls

### API and schema
- [ ] OpenAPI spec updated (`libs/api-contracts/{service-name}.yaml`) if endpoint changed
- [ ] Flyway migration added for schema changes (never modify existing migrations)
- [ ] Migration follows `V{n}__{description}.sql` naming

### Events and messaging
- [ ] New events written to `outbox_events` within the same DB transaction
- [ ] Consumer idempotency implemented (duplicate event check)

### Security
- [ ] All new endpoints have `@PreAuthorize`
- [ ] No cross-owner data access possible

### Tests
- [ ] Unit tests added for new domain logic
- [ ] Integration test added for each new endpoint
- [ ] Coverage ≥ 80% for changed files
- [ ] No mocked PostgreSQL — TestContainers only
- [ ] Frontend component tests added for new components

### Documentation
- [ ] OpenAPI spec is up to date
- [ ] `application-local.yml.example` updated for new config keys
- [ ] Module spec updated if workflow or data model changed

## Screenshots (UI changes only)
<!-- Attach before/after screenshots for Farmer, Field, or Ministry platform changes -->
