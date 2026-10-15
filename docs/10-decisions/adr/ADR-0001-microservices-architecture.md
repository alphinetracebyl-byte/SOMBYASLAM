# ADR-0001 — Microservices Architecture over Monolith

**Date:** 2026-07-18
**Status:** Accepted
**Deciders:** SOMLITS Technical Lead, MoLFR IT Administration

---

## Context

SOMLITS must support 14 distinct functional domains: identity, owner registration, premises, tag inventory, animal registry, veterinary health, movement permits, markets, quarantine and export, abattoir and slaughter, certification, notifications, reporting and traceability, and audit. These domains are operated by different actors (pastoralists, field officers, Ministry administrators), have different scaling profiles, and have different data ownership and regulatory retention requirements.

The platform must remain operational during partial infrastructure failures (e.g., the notification service is down but movement permits must still be issued). It must be deployable in phases — the Owner Registration module must go live in Phase 0 before the Export Certification module is ready in Phase 3. Teams at MoLFR and development partners may need to work on different domains concurrently.

A single deployable monolith was considered as an alternative.

---

## Decision

**SOMLITS is built as a set of 14 independently deployable microservices**, each owning its own data, exposing its own REST API, and communicating with other services exclusively through those APIs or through domain events on Azure Service Bus.

No service may directly read from or write to another service's database table.

---

## Rationale

| Driver | Microservices | Monolith |
|---|---|---|
| Independent deployability per phase | Each phase deploys only the services it needs | Entire application must be deployed together |
| Failure isolation | Abattoir service outage does not affect movement permits | One bug can bring down all functionality |
| Independent scaling | abattoir-service scales to zero overnight; spikes at Eid. notification-service scales to handle SMS bursts | All modules must scale together |
| Team autonomy | Different teams own different services with clear API contracts | Shared codebase creates merge conflicts and coordination overhead |
| Regulatory data isolation | Audit records require different retention (10 years) and access controls than operational records | Difficult to enforce separate retention policies on tables in a shared DB |
| Technology evolution | Individual services can adopt new library versions without a full-system regression | All modules must stay on the same framework version |

---

## Consequences

**Accepted costs:**
- Distributed systems complexity: network latency between services, eventual consistency, need for idempotency and the outbox pattern for reliable event publishing.
- Operational overhead: 14 separate Container Apps, 14 separate PostgreSQL databases, 14 separate CI/CD pipelines per service.
- Cross-service tracing: requires correlation IDs and distributed tracing (Azure Application Insights) to follow a request across service boundaries.
- Service-to-service authentication: each inter-service call must carry a service account JWT; cannot use a shared in-process call.

**Mitigations:**
- Monorepo reduces tooling fragmentation — shared Maven parent POM, shared GitHub Actions job matrix.
- Correlation ID middleware added to every service to propagate `X-Correlation-ID` headers automatically.
- TestContainers used in integration tests to bring up dependent services' databases and the Service Bus emulator, keeping local testing self-contained.

---

## Alternatives Considered

### Modular Monolith
Build one deployable JAR with strictly separated internal modules. Cheaper to operate initially but does not provide independent deployability or failure isolation, and makes phase-by-phase rollout harder.

### Two-tier (backend + reporting split)
All transactional logic in one service; reporting in another. Insufficient: does not address the divergent scaling needs (abattoir vs. movement vs. notification), and does not allow different teams to work independently.

---

## Review Trigger

Re-evaluate if: operational cost of managing 14 services outweighs the benefits during the Phase 0–1 period when only 3–4 services are active. In that case, a temporary merged service for low-activity domains (e.g., market-trade-service + abattoir-service) is acceptable until scale justifies splitting.
