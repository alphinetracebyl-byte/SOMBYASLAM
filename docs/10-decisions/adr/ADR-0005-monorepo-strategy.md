# ADR-0005 — Monorepo Repository Strategy

**Date:** 2026-07-18
**Status:** Accepted
**Deciders:** SOMLITS Technical Lead, MoLFR IT Administration

---

## Context

SOMLITS consists of 14 backend microservices, 3 frontend platforms, shared design tokens, shared OpenAPI contracts, shared Java domain types, infrastructure-as-code (Bicep), and documentation. A repository organisation strategy must be chosen before development begins: all code in one repository (monorepo) or each service and platform in its own repository (polyrepo / multirepo).

The development team is expected to be small (5–10 engineers total across backend and frontend), working for MoLFR through a contracted development partner. There is no pre-existing CI/CD infrastructure to reuse.

---

## Decision

**SOMLITS uses a single Git monorepo** hosted on GitHub under the MoLFR organisation. All services, platforms, infrastructure, shared libraries, and documentation live in this repository.

---

## Rationale

### Why monorepo over polyrepo

| Factor | Monorepo | Polyrepo |
|---|---|---|
| Cross-cutting changes | One PR can change an API contract, the service implementing it, and the frontend consuming it | Requires co-ordinated PRs across 3+ repos; easy to miss a repo |
| Shared library updates | Design tokens or common domain types update in one commit; all consumers see the change immediately | Each repo must update its dependency version; drift is common |
| CI/CD setup cost | One pipeline configuration; per-service job matrix with path filters | 17+ separate pipeline files to maintain |
| Developer onboarding | One repo clone; one PR workflow | Engineers must know which repo holds which service |
| Code search and navigation | Cross-service search works with one `git grep` or GitHub code search | Must search across multiple repos |
| Dependency versioning | Shared parent Maven POM enforces consistent Spring Boot version across all services | Each service may drift to different versions |
| Team size fit | Monorepos are most productive at small team sizes where coordination overhead of polyrepo outweighs the build time savings | Polyrepos excel at very large teams (100+ engineers) where independent release cadences matter more |

### Why a small-team SOMLITS project fits monorepo particularly well

- The development team is expected to remain under 15 engineers for the foreseeable future.
- SOMLITS has strong cross-service contracts (OpenAPI) that change together with their frontend consumers. Atomic cross-repo changes are frequent.
- Shared reference data (species codes, region codes, AID types) are used across 10+ services and both backend and frontend — a shared library in the monorepo makes this trivial.
- MoLFR's IT team will manage the repository after handover. One repo is simpler to govern, back up, and audit.

### Build time mitigation

The primary cost of a monorepo is that naive CI pipelines rebuild everything on every commit. This is mitigated by:

1. **GitHub Actions path filters**: Each service's CI job only runs when files under `services/{service-name}/**` or `libs/common-domain/**` change.
2. **Maven module structure**: The root `pom.xml` is a parent POM. `mvn -pl services/animal-registry-service -am install` builds only the changed service and its dependencies.
3. **pnpm workspaces**: Frontend platforms share `node_modules` via pnpm workspaces. Vite builds only the changed platform.
4. **Turbo / Nx (future)**: If build times become excessive as the codebase grows, a build caching tool (Turborepo) can be added without changing the repository structure.

---

## Repository Layout

See [cicd-and-environments.md](../cicd-and-environments.md) Section 1.2 for the full directory tree.

Key structural points:
- `services/` — 14 Spring Boot Maven projects
- `platforms/` — 3 React TypeScript Vite projects
- `libs/` — shared packages (design-tokens, api-contracts, common-domain)
- `infra/` — Azure Bicep modules and parameters
- `docs/` — all project documentation

---

## Consequences

**Accepted costs:**
- Repository size will grow. Mitigated by: sparse checkout for developers working on a subset, Git LFS for binary reference documents.
- All tests run on the same CI runner pool. A very large test suite could create queue backlog. Mitigated by: parallel matrix jobs and path filtering.
- A single misconfigured `.github/workflows/` file can affect all services. Mitigated by: CODEOWNERS requiring infra team review for any workflow file change.

**Not a cost:**
- "Monorepos force a monolith mindset." The SOMLITS monorepo enforces service boundaries through: separate `pom.xml` per service, no cross-service Java imports (each service is a standalone Spring Boot JAR), no shared database access, and CODEOWNERS with per-service ownership.

---

## Alternatives Considered

### Polyrepo (one repo per service)
Rejected for a small team. The overhead of managing 17 repositories (14 services + 3 platforms) — separate CI files, separate branch protection rules, separate dependency update PRs — outweighs any benefit at this team size and coordination frequency.

### Monorepo with Nx or Turborepo from day one
Not selected for day one — adds tooling complexity before the team is established. Can be adopted incrementally if build times grow.

### Separate repos for documentation and infrastructure
Not selected. Documentation and IaC must be versioned alongside the code that they describe. A separate docs repo would drift out of sync with the implementation.
