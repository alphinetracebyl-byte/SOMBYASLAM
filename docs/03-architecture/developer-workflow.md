# SOMLITS Developer Workflow

**Version:** 0.1 — Draft for Review
**Date:** 2026-07-18
**Status:** Awaiting Approval

This document defines the branching strategy, pull request process, and the Definition of Done for all SOMLITS work items. It supplements [cicd-and-environments.md](cicd-and-environments.md) which defines the CI/CD pipeline.

---

## 1. Branching Strategy

### 1.1 Branch Model

SOMLITS uses a **trunk-based development** model with short-lived feature branches. There is one permanent long-lived branch (`main`); all other branches are temporary.

```
main ─────────────────────────────────────────────────────────────────── (always deployable to dev/test)
  │
  ├──── feature/ANI-123-register-animal ──── (PR → main)
  │
  ├──── feature/MOV-45-movement-permit-eligibility ──── (PR → main)
  │
  └──── release/v1.0.0 ──── (cut from main; PR to main after hotfixes; deployed to stg/prod)
           │
           └──── hotfix/v1.0.1-fix-permit-expiry ──── (PR → release/v1.0.0 + cherry-pick to main)
```

### 1.2 Branch Types

| Branch | Pattern | Lifetime | Base | Merges to |
|---|---|---|---|---|
| Main | `main` | Permanent | — | — |
| Feature | `feature/{ticket-id}-{short-description}` | Hours to days | `main` | `main` (via PR) |
| Release | `release/v{major}.{minor}.{patch}` | Days to weeks | `main` | `main` (after hotfixes, via PR) |
| Hotfix | `hotfix/v{version}-{short-description}` | Hours | `release/v*` | `release/v*` + cherry-pick to `main` |
| Documentation | `docs/{topic}` | Hours | `main` | `main` (via PR) |

### 1.3 Branch Naming Rules

- Ticket ID is mandatory in feature branches: `feature/ANI-123-register-animal`
- Use kebab-case for the description: `feature/MOV-45-movement-permit-eligibility-check`
- Description is 3–6 words maximum
- No personal identifiers in branch names (not `feature/johns-work`)
- Ticket IDs come from the SOMLITS GitHub Issues tracker

### 1.4 Branch Protection Rules (GitHub)

**`main` branch:**
- Require pull request before merging (no direct push — for anyone including repo admins)
- Required reviews: minimum 1 approval
- Required checks must pass: `CI — Backend Services` + `CI — Frontend Platforms` + `CI — Infrastructure`
- Dismiss stale reviews when new commits pushed
- Require conversation resolution before merge
- Restrict merging to squash merge only (keeps main history linear)

**`release/v*` branches:**
- Require pull request before merging
- Required reviews: minimum 2 approvals (tech lead must be one)
- Required checks: same as main
- Restrict to merge commits (preserves release branch history for audit)

### 1.5 Commit Message Convention

All commits (before squash) use Conventional Commits format:

```
{type}({scope}): {short summary}

{optional body — explain WHY, not WHAT}

{optional footer — Breaking Change, Closes #issue}
```

**Types:**

| Type | Used for |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `test` | Adding or updating tests |
| `refactor` | Code restructuring with no behaviour change |
| `chore` | Build, CI, tooling, dependency updates |
| `perf` | Performance improvement |
| `security` | Security fix (use instead of `fix` when CVE or vulnerability is addressed) |

**Scopes** (use the service or platform name):

```
feat(animal-registry): add bulk registration endpoint
fix(movement): prevent permit approval for deceased animals
docs(farmer-platform): add offline queue screen documentation
test(veterinary-health): add integration test for OIE notification trigger
chore(infra): update Keycloak to 25.0.3
```

**Squash merge title** (GitHub auto-generates from branch; edit before merging):

```
feat(animal-registry): implement animal registration with tag assignment (#45)
```

---

## 2. Pull Request Process

### 2.1 Opening a Pull Request

Before opening a PR, the author must:

1. Run all tests locally and confirm they pass (`./mvnw verify` or `pnpm test`)
2. Run the linter locally and fix any violations (`./mvnw checkstyle:check` or `pnpm lint`)
3. Run the formatter locally (`pnpm format:check`; fix with `pnpm format:fix`)
4. Self-review the diff — read every line as if you are the reviewer
5. Write a clear PR description using the template below

### 2.2 PR Description Template

Every PR must use this template (stored at `.github/pull_request_template.md`):

```markdown
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

## How to test
<!-- Step-by-step instructions for the reviewer to test this change manually -->
1. Start `docker compose up -d postgres-animal-registry keycloak`
2. Run the service with `./mvnw spring-boot:run -Dspring-boot.run.profiles=local`
3. POST to `/internal/v1/animals` with the payload in `test-data/register-animal.json`
4. Confirm response is 201 with an `animal_code` in the body

## Checklist
<!-- Complete this before requesting review — do not open a draft PR without completing it -->
- [ ] Unit tests added or updated for new behaviour
- [ ] Integration tests added for new endpoints or events
- [ ] OpenAPI spec updated in `libs/api-contracts/{service-name}.yaml` (if API changed)
- [ ] Flyway migration added (if schema changed)
- [ ] `application-local.yml.example` updated (if new configuration added)
- [ ] Foundation standards followed (package conventions, error format, logging, etc.)
- [ ] No secrets committed
- [ ] No `System.out.println`, `TODO`, or debug log statements
- [ ] Documentation updated if behaviour changed

## Breaking changes
<!-- List any breaking API changes, schema changes, or event contract changes -->
None / [describe change]

## Screenshots (UI changes only)
<!-- Attach screenshots for Farmer, Field, or Ministry platform changes -->
```

### 2.3 PR Size Guidelines

| PR Size | Lines changed | Action |
|---|---|---|
| Small | < 200 | Ideal — fast to review |
| Medium | 200–500 | Acceptable — reviewers may ask for split |
| Large | 500–1000 | Requires justification in PR description |
| Too large | > 1000 | Must be split before review; draft PR acceptable for context |

Generated code (Flyway migrations, MapStruct-generated classes) is excluded from the line count.

### 2.4 Review Expectations

**Reviewer responsibilities:**
- Review within 1 business day of PR assignment (CODEOWNERS auto-assigns)
- Check: logic correctness, standards compliance, test coverage, security, performance edge cases
- Leave constructive, specific comments (not "this is wrong" — explain what and why)
- Approve only when genuinely satisfied — not as a courtesy

**Author responsibilities:**
- Address all comments before requesting re-review
- Do not force-push to a PR branch after review starts (add new commits instead)
- If a reviewer comment is disputed, discuss in the PR thread before changing the code; escalate to tech lead if not resolved within 24 hours

**Merge:**
- Only the author merges after receiving the required approvals and all CI checks passing
- Use "Squash and merge" for feature branches to `main`
- Use "Create a merge commit" for hotfix branches to `release/v*`
- Delete the feature branch after merge

---

## 3. Pull-Request Checklist

This checklist is embedded in the PR template above. It is reproduced here as a reference:

### 3.1 Before Committing

- [ ] No secrets, passwords, connection strings, or tokens in any file
- [ ] No TODO comments (create a GitHub Issue for deferred work)
- [ ] No commented-out code
- [ ] No `System.out.println` (use SLF4J logger)
- [ ] No `console.log` in production code (use structured logger)
- [ ] All new public methods in domain and application layers have Javadoc

### 3.2 Code Standards

- [ ] Java package structure follows [foundation-standards.md](foundation-standards.md) Section 2
- [ ] No `@Entity` or `@RestController` in wrong layers
- [ ] Constructor injection used (no `@Autowired` field injection)
- [ ] All `java.time.*` (no `java.util.Date`)
- [ ] All timestamps in UTC
- [ ] UUIDs generated by application (not database)
- [ ] Business codes follow naming convention (Section 10 of foundation-standards.md)
- [ ] TypeScript `strict: true` compliant (no `any`)
- [ ] Component naming and folder structure follow Section 3 of foundation-standards.md

### 3.3 Error Handling

- [ ] All exceptions mapped to RFC 7807 Problem Details responses
- [ ] No stack traces exposed in HTTP responses
- [ ] Business rule violations return 422 (not 400 or 500)
- [ ] 409 used for duplicate/conflict situations
- [ ] All error types registered in `libs/api-contracts/errors.yaml`

### 3.4 Logging

- [ ] Significant state changes logged at INFO
- [ ] Errors logged at ERROR with full context
- [ ] No sensitive data in log messages (national IDs, phone numbers, tokens)
- [ ] Correlation ID propagated in all outbound calls and Service Bus messages

### 3.5 API and Schema

- [ ] OpenAPI spec updated if endpoint added, changed, or removed
- [ ] Flyway migration added for any schema change (never modify existing migrations)
- [ ] Migration follows naming convention (`V{n}__{description}.sql`)
- [ ] Migration includes: UUID PK, `created_at`, `updated_at`, explicit FK names, explicit index names
- [ ] Optimistic locking (`version` column) present on aggregate root tables

### 3.6 Events and Messaging

- [ ] New domain events added to outbox_events table within the same DB transaction as the state change
- [ ] Consumer idempotency: duplicate event checked before processing
- [ ] Service Bus message includes `correlationId` in ApplicationProperties
- [ ] Event payload follows standard envelope format

### 3.7 Security

- [ ] All new endpoints have `@PreAuthorize` (or equivalent) — no unprotected endpoints
- [ ] Authorization checked at method level, not just controller level
- [ ] No tenant data crossover (owner can only see their own animals)
- [ ] Sensitive fields (national ID, phone) encrypted at column level where required
- [ ] OWASP Dependency Check passes (no CVSS ≥ 7.0 new vulnerabilities)

### 3.8 Tests

- [ ] Unit tests for all new domain logic and application service methods
- [ ] Integration test for each new API endpoint (full HTTP → DB round-trip)
- [ ] Integration test for each new Service Bus event (publish → consume)
- [ ] Test coverage ≥ 80% for changed files
- [ ] No mocked PostgreSQL in integration tests (use TestContainers)
- [ ] Frontend component tests for all new components
- [ ] MSW handlers added for any new API calls in frontend tests

### 3.9 Documentation

- [ ] OpenAPI spec (`libs/api-contracts/{service-name}.yaml`) is up to date
- [ ] `application-local.yml.example` updated for any new configuration keys
- [ ] Module documentation updated if workflow or data model changed
- [ ] No internal service URLs or IP addresses in documentation (use service names)

---

## 4. Definition of Done

A work item (feature, bug fix, or task) is **Done** only when ALL of the following are true:

### 4.1 Development Complete

- [ ] All acceptance criteria from the GitHub Issue are met
- [ ] All items in the PR checklist (Section 3) are satisfied
- [ ] PR is merged to `main`
- [ ] Feature branch is deleted

### 4.2 Tests Pass

- [ ] All unit tests pass (`./mvnw test` or `pnpm test`)
- [ ] All integration tests pass (`./mvnw verify`)
- [ ] Code coverage meets the 80% line / 70% branch minimum
- [ ] No new ESLint, TypeScript, Checkstyle, or SpotBugs errors
- [ ] OWASP Dependency Check passes
- [ ] Lighthouse CI PWA/accessibility scores maintained (for frontend changes)

### 4.3 Deployed to Development Environment

- [ ] CI pipeline is green for the merged commit
- [ ] CD pipeline has deployed the change to the `dev` environment
- [ ] Smoke tests pass in `dev`
- [ ] No new errors in Azure Application Insights for `dev` within 15 minutes of deploy

### 4.4 Documentation Updated

- [ ] All module documentation reflects the completed behaviour
- [ ] OpenAPI spec is accurate and matches the deployed service
- [ ] Any open business questions resolved by this feature are closed in `open-ministry-decisions.md` or the relevant module doc
- [ ] If any Ministry-pending decision (class [C]) was unblocked, the open-ministry-decisions.md entry is updated to "Resolved"

### 4.5 Review and Sign-Off

- [ ] At least 1 peer approval on the PR (2 for security-sensitive changes)
- [ ] Tech lead informed of any architectural decisions made during implementation
- [ ] If the change affects an existing approved workflow, schema, or API contract: tech lead sign-off required before merge

### 4.6 For Module Completion (End of a Phase)

When an entire module phase (e.g., Phase 1 Documentation, Phase 3 Backend) is complete, additionally:

- [ ] All acceptance criteria from the module specification are verified
- [ ] Integration test suite covers all critical paths
- [ ] Performance test (k6) confirms no regression vs. baseline
- [ ] Security test (OWASP ZAP baseline) passes
- [ ] Module documentation reviewed and approved by MoLFR representative
- [ ] Demo conducted with MoLFR stakeholder
- [ ] Formal written approval received before proceeding to the next phase

---

## 5. Issue and Task Management

### 5.1 GitHub Issues

All work items are tracked as GitHub Issues in the SOMLITS monorepo. Labels:

| Label | Meaning |
|---|---|
| `module:{name}` | Which SOMLITS module this belongs to |
| `phase:{0-5}` | Which rollout phase |
| `type:feature` | New capability |
| `type:bug` | Bug fix |
| `type:docs` | Documentation |
| `type:chore` | Infrastructure, tooling, maintenance |
| `type:security` | Security improvement or fix |
| `status:blocked` | Blocked by external dependency (often a Ministry decision) |
| `status:ministry-pending` | Blocked by a class [C] Ministry decision |
| `priority:critical` | Must be resolved before next deployment |
| `priority:high` | Next sprint |
| `priority:medium` | Backlog |

### 5.2 Linking Issues to PRs

Every PR must reference a GitHub Issue using `Closes #123` or `Fixes #123` in the PR description. This automatically closes the issue when the PR is merged to `main`.

### 5.3 Ministry-Blocked Issues

Issues blocked by a Ministry decision (class [C]) are labelled `status:ministry-pending` and linked to the relevant `D-0xx` entry in `docs/10-decisions/open-ministry-decisions.md`. These issues must not be worked around or have assumptions hard-coded without explicit written confirmation from the Ministry.

---

## 6. Release Process

### 6.1 Release Cadence

SOMLITS does not have a fixed release cadence during the development phase. Releases are cut when a meaningful set of features is ready for staging validation and Ministry UAT.

### 6.2 Cutting a Release

```bash
# 1. Ensure main is green in CI and deployed to dev/test
# 2. Create release branch from main
git checkout main && git pull
git checkout -b release/v1.0.0

# 3. Bump version numbers
#    - In each service: update pom.xml <version>
#    - In each platform: update package.json version
#    - Commit: chore(release): bump version to v1.0.0
git commit -am "chore(release): bump version to v1.0.0"

# 4. Push release branch
git push origin release/v1.0.0

# 5. Open a PR from release/v1.0.0 to main (for visibility only — do not merge yet)
# 6. Trigger the CD — Staging pipeline via GitHub Actions workflow_dispatch
# 7. Conduct staging validation and Ministry UAT
# 8. If hotfixes required: branch from release/v1.0.0, fix, PR back to release, cherry-pick to main
# 9. On Ministry/tech lead sign-off: trigger CD — Production pipeline
# 10. After successful production deploy: tag the release commit
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
# 11. Create GitHub Release from the tag with auto-generated release notes
```

### 6.3 Hotfix Process

```bash
# Branch from the active release branch
git checkout release/v1.0.0
git checkout -b hotfix/v1.0.1-fix-permit-expiry

# Make the fix, test locally
# Open PR → release/v1.0.0 (not main)
# After merge: cherry-pick the fix commit to main
git checkout main
git cherry-pick {fix-commit-sha}
git push origin main
```

---

STEP COMPLETE — awaiting approval before continuing.
