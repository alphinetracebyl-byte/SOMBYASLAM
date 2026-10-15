# SOMLITS CI/CD Pipeline, Environments, and Repository Strategy

**Version:** 0.1 — Draft for Review
**Date:** 2026-07-18
**Status:** Awaiting Ministry Approval

---

## 1. Repository Strategy

### 1.1 Decision: Monorepo

SOMLITS uses a single Git monorepo hosted on GitHub under the MoLFR organisation account. All 14 backend services, 3 frontend platforms, shared libraries, infrastructure-as-code, and documentation live in one repository.

**Rationale:**
- Atomic commits across service and frontend boundaries (e.g., a new API field and the frontend that uses it land in one PR)
- Single CI/CD pipeline definition with per-service job filtering (no inter-repo orchestration complexity)
- Shared library changes (design tokens, API contracts, common domain types) are immediately visible and tested
- Simpler developer onboarding: one repo clone, one pull request workflow
- Consistent tooling: one lint configuration, one test framework convention, one dependabot configuration

**Trade-off accepted:** The repo will grow large over time. Mitigated by: sparse checkout for developers working only on a subset, GitHub Actions path filters to avoid running all jobs on every commit.

### 1.2 Monorepo Directory Structure

```
somlits/
├── .github/
│   ├── workflows/
│   │   ├── ci-backend.yml         # All 14 services — build, test, publish
│   │   ├── ci-frontend.yml        # All 3 platforms — build, lint, test
│   │   ├── ci-infra.yml           # Bicep lint + what-if validation
│   │   ├── cd-dev.yml             # Deploy to dev (auto on main merge)
│   │   ├── cd-test.yml            # Deploy to test (auto on main merge)
│   │   ├── cd-staging.yml         # Deploy to staging (manual approval gate)
│   │   └── cd-prod.yml            # Deploy to prod (manual approval gate)
│   └── CODEOWNERS
├── services/
│   ├── identity-access-service/
│   │   ├── src/
│   │   ├── pom.xml
│   │   └── Dockerfile
│   ├── owner-org-service/
│   ├── premises-service/
│   ├── tag-inventory-service/
│   ├── animal-registry-service/
│   ├── veterinary-health-service/
│   ├── movement-service/
│   ├── market-trade-service/
│   ├── quarantine-export-service/
│   ├── abattoir-service/
│   ├── certification-service/
│   ├── notification-service/
│   ├── reporting-traceability-service/
│   └── audit-service/
├── platforms/
│   ├── farmer/
│   │   ├── src/
│   │   ├── public/
│   │   └── package.json
│   ├── field/
│   └── ministry/
├── libs/
│   ├── design-tokens/             # Shared design system npm package
│   ├── api-contracts/             # OpenAPI specs shared between services and clients
│   └── common-domain/             # Shared Java domain types (parent Maven module)
├── infra/
│   ├── bicep/
│   │   ├── main.bicep
│   │   ├── modules/
│   │   │   ├── container-apps.bicep
│   │   │   ├── postgres.bicep
│   │   │   ├── service-bus.bicep
│   │   │   ├── apim.bicep
│   │   │   ├── keyvault.bicep
│   │   │   ├── monitoring.bicep
│   │   │   └── static-web-apps.bicep
│   │   └── parameters/
│   │       ├── dev.bicepparam
│   │       ├── test.bicepparam
│   │       ├── staging.bicepparam
│   │       └── prod.bicepparam
│   └── scripts/
│       ├── bootstrap-keycloak.sh  # Initial realm + client setup
│       └── seed-reference-data.sh # Species, regions, AID types
├── docs/
│   ├── 01-business-requirements/
│   ├── 02-workflows/
│   ├── 03-architecture/
│   └── 10-decisions/
│       ├── adr/
│       └── open-ministry-decisions.md
└── README.md
```

### 1.3 Branch Strategy

| Branch | Purpose | Protection Rules |
|---|---|---|
| `main` | Integration branch; always deployable to dev/test | Require PR; require CI green; require 1 approval; no direct push |
| `feature/*` | Developer feature branches | No protection — developers branch from and merge back to main |
| `release/v*` | Release candidate branches cut from main before staging/prod | Require PR; require CI green; require 2 approvals including tech lead |
| `hotfix/*` | Emergency production fixes | Branch from `release/v*`; fast-track PR review; deploy directly to staging → prod |

Semantic versioning (SemVer) is used for service versions. Each service maintains its own version in `pom.xml` / `package.json`. Versions increment independently — not all services increment on every release.

### 1.4 Code Ownership

`CODEOWNERS` file assigns ownership to ensure the right reviewers are auto-requested:

```
# CODEOWNERS
/services/identity-access-service/    @somlits/backend-core-team
/services/animal-registry-service/    @somlits/backend-registry-team
/platforms/farmer/                    @somlits/frontend-farmer-team
/platforms/ministry/                  @somlits/frontend-ministry-team
/infra/                               @somlits/infra-team
/docs/                                @somlits/tech-lead
```

---

## 2. Environments

### 2.1 Environment Overview

SOMLITS maintains four environments. Each environment is an independent Azure resource group with full infrastructure isolation.

| Environment | Purpose | Data | Deployment trigger | Approvers |
|---|---|---|---|---|
| **Development (dev)** | Day-to-day development and integration testing | Synthetic test data only | Auto on merge to `main` | None (auto) |
| **Test / QA (test)** | Functional QA, integration tests, UAT for field officers | Synthetic test data only | Auto on merge to `main` after dev deploy success | None (auto) |
| **Staging (stg)** | Pre-production validation; performance testing; Ministry UAT | Anonymised clone of production data (refreshed monthly) | Manual trigger; PR from `release/v*` to deploy | Tech Lead + MoLFR IT Admin |
| **Production (prod)** | Live national system | Real data | Manual trigger after staging sign-off | Tech Lead + MoLFR IT Admin + CVO IT Liaison |

### 2.2 Environment Configuration Matrix

| Resource | Development | Test / QA | Staging | Production |
|---|---|---|---|---|
| **Container Apps environment** | Consumption plan | Consumption plan | Consumption plan | Consumption plan |
| **Container Apps replicas (per service)** | Min 0, Max 2 | Min 0, Max 3 | Min 1, Max 5 | Min 1, Max 10 |
| **PostgreSQL SKU** | Burstable B2s | Burstable B2s | General Purpose D4s v5 | General Purpose D8s v5 |
| **PostgreSQL HA** | Off | Off | Zone-redundant | Zone-redundant |
| **Service Bus tier** | Standard | Standard | Premium | Premium |
| **Service Bus geo-redundancy** | Off | Off | Off | Active (paired region) |
| **Azure Front Door** | Off (direct APIM) | Off (direct APIM) | On | On |
| **Key Vault SKU** | Standard | Standard | Premium (HSM) | Premium (HSM) |
| **Static Web Apps** | Free tier | Free tier | Standard tier | Standard tier |
| **Azure region** | UAE North | UAE North | UAE North + South Africa North | UAE North + South Africa North |
| **Log retention** | 30 days | 60 days | 90 days | 365 days (audit: 10 years) |
| **Backup PITR** | 7 days | 7 days | 14 days | 35 days |

### 2.3 Environment Isolation Rules

- No service in dev/test/stg may contact a live external API (SMS gateway, AHC export API). Stubs are provided via WireMock containers.
- Database connection strings are environment-specific secrets stored in Key Vault. No service configuration file contains a connection string.
- No production data ever copied to dev or test. Staging receives an anonymised export only.
- The production Key Vault is accessible only by production Container App managed identities. No developer identity has direct access to production secrets.
- The production Azure subscription is a separate subscription from dev/test/stg. Access requires MoLFR IT Admin approval via Privileged Identity Management (PIM).

### 2.4 Environment Naming Convention

Azure resources follow the pattern: `somlits-{env}-{component}[-{suffix}]`

Examples:
- `somlits-prod-containerenv` — Production Container Apps environment
- `somlits-prod-animal-registry-db` — Production PostgreSQL for animal-registry-service
- `somlits-prod-servicebus` — Production Service Bus namespace
- `somlits-prod-keyvault` — Production Key Vault
- `somlits-dev-apim` — Development API Management instance

---

## 3. CI/CD Pipeline Design

### 3.1 Pipeline Overview

```
Developer Push → Feature Branch
         │
         ▼
  Pull Request opened
         │
         ▼
  [CI — on PR] ──────────────────────────────────────────────────────┐
    ├── Lint (Checkstyle / ESLint)                                   │
    ├── Unit tests (JUnit 5 / Vitest)                                │
    ├── Build (Maven / Vite)                                         │
    ├── Docker image build (multi-stage, no push)                    │
    ├── SAST scan (GitHub CodeQL)                                    │
    ├── Dependency vulnerability scan (Dependabot / OWASP Dependency Check) │
    └── Bicep lint + what-if (infra changes only)                   │
                                                                    │
  PR approved + merged to `main`                                    │
         │                                                          │
         ▼                                                          │
  [CD — Dev + Test] (auto)                                         │
    ├── Build changed services (path filter)                       │
    ├── Push Docker image to Azure Container Registry               │
    ├── Deploy to dev (Bicep apply; Container App revision swap)    │
    ├── Run smoke tests against dev                                 │
    ├── Deploy to test                                              │
    └── Run integration test suite against test                    │
                                                                    │
  Release branch cut → Manual approval                             │
         │                                                          │
         ▼                                                          │
  [CD — Staging] (manual approval gate)                            │
    ├── Tag Docker images with release version                     │
    ├── Deploy to stg (Bicep apply)                                │
    ├── Run full regression suite + performance tests              │
    ├── Ministry/MoLFR UAT sign-off                                │
    └── Generate release notes (GitHub Release draft)              │
                                                                    │
  Staging sign-off → Manual approval                              │
         │                                                          │
         ▼                                                          │
  [CD — Production] (manual approval gate)                        │
    ├── Confirm same Docker image digest as staging                │
    ├── Blue/green deploy (new revision, 0% traffic)              │
    ├── Smoke test on new revision                                 │
    ├── Traffic shift: 10% → 50% → 100% (5min intervals)         │
    ├── Monitor error rate + latency (auto-rollback if threshold exceeded) │
    └── Decommission old revision after 15 minutes               │
```

### 3.2 Backend Service CI Pipeline (`ci-backend.yml`)

The pipeline uses GitHub Actions path filters: a job for service X only runs if files under `services/X/**` or `libs/common-domain/**` changed.

```yaml
name: CI — Backend Services

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      # One output per service: true/false
      identity-access: ${{ steps.filter.outputs.identity-access }}
      animal-registry: ${{ steps.filter.outputs.animal-registry }}
      # ... etc for all 14 services

  build-and-test:
    needs: detect-changes
    strategy:
      matrix:
        service:
          - identity-access-service
          - owner-org-service
          - premises-service
          - tag-inventory-service
          - animal-registry-service
          - veterinary-health-service
          - movement-service
          - market-trade-service
          - quarantine-export-service
          - abattoir-service
          - certification-service
          - notification-service
          - reporting-traceability-service
          - audit-service
    steps:
      - name: Checkout
      - name: Set up Java 21 (Temurin)
      - name: Cache Maven repository
      - name: Lint (Checkstyle)
      - name: Build + unit tests (mvn verify)
      - name: Integration tests (TestContainers — PostgreSQL + Service Bus emulator)
      - name: OWASP Dependency Check
      - name: Build Docker image (multi-stage)
      - name: Scan image (Trivy)
      - name: Push to ACR (on main only)
        if: github.ref == 'refs/heads/main'
```

**Test strategy per service:**
- Unit tests: pure domain logic, no external dependencies
- Integration tests: use TestContainers (PostgreSQL 16 + Azure Service Bus emulator) for full persistence and messaging layer tests
- Minimum coverage gate: 80% line coverage (enforced by JaCoCo Maven plugin)

### 3.3 Frontend Platform CI Pipeline (`ci-frontend.yml`)

```yaml
name: CI — Frontend Platforms

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  build-and-test:
    strategy:
      matrix:
        platform: [farmer, field, ministry]
    steps:
      - name: Checkout
      - name: Set up Node.js 22
      - name: Install dependencies (pnpm install --frozen-lockfile)
      - name: Lint (ESLint + TypeScript tsc --noEmit)
      - name: Unit tests (Vitest)
      - name: Build (Vite)
      - name: Bundle size check (bundlesize — fails if main bundle > 500KB gzipped)
      - name: Lighthouse CI (PWA score, performance, accessibility)
        if: matrix.platform != 'ministry'
      - name: Upload build artifact
        if: github.ref == 'refs/heads/main'
```

### 3.4 Infrastructure CI Pipeline (`ci-infra.yml`)

```yaml
name: CI — Infrastructure (Bicep)

on:
  pull_request:
    paths: ['infra/**']
  push:
    branches: [main]
    paths: ['infra/**']

jobs:
  validate:
    steps:
      - name: Checkout
      - name: Azure login (OIDC federated identity)
      - name: Bicep lint (az bicep lint)
      - name: What-if against dev (az deployment group what-if)
      - name: What-if against test
      - name: Post what-if summary as PR comment
```

Bicep what-if results are posted as a PR comment so reviewers can see the infrastructure diff before approving.

### 3.5 Deployment Pipeline — Dev and Test (`cd-dev.yml`)

```yaml
name: CD — Dev + Test

on:
  workflow_run:
    workflows: ["CI — Backend Services", "CI — Frontend Platforms"]
    types: [completed]
    branches: [main]

jobs:
  deploy-dev:
    environment: development
    steps:
      - name: Azure login (OIDC)
      - name: Apply Bicep (dev parameters)
        run: az deployment group create --parameters infra/bicep/parameters/dev.bicepparam
      - name: Update Container App revision (each changed service)
        run: az containerapp update --image acr.azurecr.io/somlits/$SERVICE:$SHA
      - name: Run smoke tests
        run: |
          curl --fail https://api-dev.somlits.gov.so/health
          # Per-service health check endpoints
      - name: Deploy Static Web Apps (all 3 platforms)

  deploy-test:
    needs: deploy-dev
    environment: test
    steps:
      - name: Apply Bicep (test parameters)
      - name: Update Container Apps
      - name: Run integration test suite (Newman / Playwright)
      - name: Publish test report
```

### 3.6 Deployment Pipeline — Staging and Production

```yaml
name: CD — Staging

on:
  workflow_dispatch:
    inputs:
      release_branch:
        description: Release branch name (e.g. release/v1.2.0)
        required: true

jobs:
  deploy-staging:
    environment: staging          # Requires manual approval from configured reviewers
    steps:
      - name: Checkout release branch
      - name: Tag Docker images with release version
      - name: Apply Bicep (stg parameters)
      - name: Update Container Apps
      - name: Run full regression suite
      - name: Run performance tests (k6)
      - name: Generate GitHub Release draft
```

```yaml
name: CD — Production

on:
  workflow_dispatch:
    inputs:
      release_tag:
        description: Exact release tag to deploy (e.g. v1.2.0)
        required: true

jobs:
  pre-deploy-checks:
    steps:
      - name: Verify Docker image digest matches staging deployed digest
      - name: Verify all integration tests passed on staging
      - name: Verify staging was approved by required approvers

  deploy-production:
    needs: pre-deploy-checks
    environment: production       # Requires manual approval from Tech Lead + MoLFR IT Admin
    steps:
      - name: Apply Bicep (prod parameters)
      - name: Create new Container App revision (0% traffic)
      - name: Smoke test new revision
      - name: Shift 10% traffic → wait 5 minutes → monitor
      - name: Shift 50% traffic → wait 5 minutes → monitor
      - name: Shift 100% traffic
      - name: Deactivate old revision after 15 minutes
      - name: Create GitHub Release (published)
      - name: Post deployment notification (Slack → MoLFR IT channel)
```

### 3.7 Rollback Procedure

| Scenario | Rollback Method | Time to rollback |
|---|---|---|
| New Container App revision fails smoke test | Activate previous revision (Azure CLI); traffic back to 0% on new | < 2 minutes |
| Error rate spike after traffic shift | GitHub Actions auto-rollback step triggers via Azure Monitor alert webhook | < 5 minutes |
| Database migration causes errors | Flyway undo migration (or restore from PITR snapshot if undo not available) | 15–60 minutes |
| Production secret rotation breaks service | Previous secret version re-activated in Key Vault | < 5 minutes |

### 3.8 Secret and Configuration Management in Pipelines

- GitHub Actions environments use federated OIDC identity (no long-lived secrets in GitHub)
- Azure Managed Identity is used by Container Apps to access Key Vault — no secret is injected at deploy time
- Environment-specific APIM subscription keys and JWT signing keys are stored in Key Vault and fetched by services at startup
- Bicep parameters files contain no secrets — only public configuration values (SKUs, replica counts, region names)
- A separate `secrets.bicepparam` file (git-ignored) contains Key Vault secret reference names for local developer use

---

## 4. Container Image Strategy

### 4.1 Multi-Stage Docker Build

All 14 services use a consistent multi-stage Dockerfile pattern:

```dockerfile
# Stage 1: Build
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine AS runtime
RUN addgroup -S somlits && adduser -S somlits -G somlits
USER somlits
WORKDIR /app
COPY --from=build /workspace/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Non-root user enforced. No shell in final image. JRE-only (not JDK). Image size target: < 200MB.

### 4.2 Azure Container Registry

- Registry name: `somliitscr.azurecr.io`
- Geo-replication: UAE North + South Africa North
- Image tags: `{service}:{git-sha}` (immutable) and `{service}:{version}` (updated on release)
- Retention policy: delete untagged images after 30 days; retain tagged images for 2 years
- Vulnerability scanning: Microsoft Defender for Container Registry (on push)

### 4.3 Keycloak Container

Keycloak 25 runs as a Container App with a dedicated PostgreSQL database (`somlits-{env}-keycloak-db`). It is deployed from the official Keycloak Docker image pinned to a specific patch version. Realm configuration (clients, roles, identity providers) is managed via Keycloak's export/import mechanism with the realm JSON stored in the repository under `infra/keycloak/`.

---

## 5. Testing Strategy

### 5.1 Test Pyramid

```
                    ▲
                   / \
                  / E2E\          Playwright — 20 critical user journeys per platform
                 /  Tests\        Runs in: staging only
                /──────────\
               / Integration \    Newman (API) + TestContainers — per service
              /    Tests      \   Runs in: CI (on PR and main)
             /──────────────────\
            /    Unit Tests       \   JUnit 5 (backend) + Vitest (frontend)
           /________________________\  Runs in: CI (on every commit)
```

### 5.2 Test Data Management

- Unit and integration tests: test-specific data created and torn down within each test
- Dev environment: seed data loaded by `seed-reference-data.sh` (species, regions, AID types, 100 synthetic owners/animals)
- Test environment: same seed data; synthetic transaction generation script for load simulation
- Staging: anonymised production data export (owner national IDs hashed; phone numbers replaced; animal IDs retained)
- Production: no test data

### 5.3 Performance Testing

k6 performance tests are run against staging before every production deployment:

| Scenario | Target | Pass/Fail Threshold |
|---|---|---|
| Farmer login (concurrent) | 200 concurrent users | p95 < 2s; error rate < 0.1% |
| Animal registration batch (50 animals) | 10 concurrent field officers | p95 < 5s per animal; error rate < 0.1% |
| Movement permit eligibility check | 100 concurrent requests | p95 < 1s |
| Report generation (RPT-001) | 5 concurrent report runs | p95 < 30s |
| Dashboard load (Ministry) | 50 concurrent users | p95 < 3s |

Eid al-Adha spike scenario: 500 concurrent abattoir-service slaughter event submissions; p95 < 10s; error rate < 1%.

---

## 6. Infrastructure as Code Conventions

### 6.1 Bicep Module Structure

```
infra/bicep/
├── main.bicep                  # Top-level: calls all modules with env parameters
├── modules/
│   ├── container-apps.bicep    # Container Apps environment + all app definitions
│   ├── postgres.bicep          # All 15 PostgreSQL flexible servers (loop over service list)
│   ├── service-bus.bicep       # Service Bus namespace + topics + subscriptions
│   ├── apim.bicep              # API Management + products + policies + backends
│   ├── keyvault.bicep          # Key Vault + access policies
│   ├── monitoring.bicep        # Log Analytics + App Insights + alert rules
│   ├── static-web-apps.bicep   # 3 Static Web App instances
│   ├── acr.bicep               # Container Registry
│   └── front-door.bicep        # Azure Front Door + WAF policy
└── parameters/
    ├── dev.bicepparam
    ├── test.bicepparam
    ├── staging.bicepparam
    └── prod.bicepparam
```

### 6.2 Drift Detection

A weekly GitHub Actions scheduled workflow runs `az deployment group what-if` against all four environments and posts a summary to the MoLFR IT Slack channel. Manual changes detected in the Azure portal are flagged for remediation (IaC is authoritative).

---

## 7. Security Controls in the Pipeline

| Control | Implementation |
|---|---|
| No secrets in code | GitHub secret scanning (push protection enabled) |
| Dependency vulnerabilities | Dependabot automated PRs + OWASP Dependency Check in CI |
| Container image vulnerabilities | Trivy scan in CI; Defender for Container Registry on push |
| SAST | GitHub CodeQL on every PR |
| DAST | OWASP ZAP baseline scan on staging after each deployment |
| SBOM | CycloneDX Maven plugin generates SBOM per service on release build |
| Signed images | Docker Content Trust (image signing) on production pushes |
| Audit of deployments | All Azure deployments logged in Azure Activity Log and audit-service |

---

STEP COMPLETE — awaiting approval before continuing.
