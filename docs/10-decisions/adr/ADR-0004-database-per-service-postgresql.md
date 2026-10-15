# ADR-0004 — Database-per-Service with PostgreSQL

**Date:** 2026-07-18
**Status:** Accepted
**Deciders:** SOMLITS Technical Lead

---

## Context

SOMLITS is built as 14 microservices (ADR-0001). A foundational microservices architecture question is whether services share a database or each own a dedicated database. Sharing a database is simpler to operate but reintroduces the coupling that microservices are meant to eliminate. A separate database per service provides strict isolation but increases operational overhead.

Additionally, a database engine must be selected. The choices evaluated are PostgreSQL, MySQL, and Azure Cosmos DB.

---

## Decision

**Each SOMLITS service owns one dedicated Azure Database for PostgreSQL Flexible Server instance.** No service may connect to another service's database. Cross-service data access must go through the owning service's REST API or through domain events on Azure Service Bus.

**PostgreSQL 16** is the selected engine for all 15 databases (14 services + 1 dedicated Keycloak database).

Schema migrations are managed by **Flyway** embedded in each service's Spring Boot application, running at startup.

**PgBouncer** runs as a sidecar container in each Container App, providing transaction-mode connection pooling. Services connect to PgBouncer on `localhost:5432`; PgBouncer manages the connection pool to the Azure PostgreSQL server.

---

## Rationale

### Why database-per-service over shared database

| Concern | Shared database | Database-per-service |
|---|---|---|
| Data encapsulation | Any service can read/write any table — high risk of accidental coupling | Each service's schema is private; changes cannot break other services |
| Independent schema evolution | Schema changes require co-ordination across all services | Each service evolves its schema independently via its own Flyway migrations |
| Access control | All services share one DB credential or complex per-table grants | Each service has its own credential with access only to its own schema |
| Regulatory data isolation | Audit records (10-year retention) must be isolated from operational data | audit-service database is completely separate — different retention policy, different backup schedule |
| Performance isolation | A slow reporting query blocks a registration transaction | reporting-traceability-service's heavy joins do not affect animal-registry-service's OLTP throughput |
| Deployment independence | Schema migration must be co-ordinated across all services before any service deploys | Each service deploys its migration independently |

The IGAD framework (Art. 14–15) requires the national database to maintain a complete, auditable record. Database-per-service does not compromise this — the reporting-traceability-service's CQRS read model aggregates the event timeline across all services into a unified trace view.

### Why PostgreSQL over alternatives

**PostgreSQL vs MySQL:**
- PostgreSQL's JSONB column type is used for `country_specific_fields` in AHC records and `previous_state`/`new_state` in audit events. MySQL's JSON support is less mature and JSONB indexing is a PostgreSQL strength.
- PostgreSQL's `pgcrypto` extension is used to encrypt sensitive personal data (owner national IDs, phone numbers) at the column level.
- PostgreSQL's row-level security (RLS) is available as an additional control layer for multi-tenant scenarios (e.g., regional data partitioning).
- Spring Data JPA and the SOMLITS team have stronger PostgreSQL operational experience.

**PostgreSQL vs Azure Cosmos DB:**
- SOMLITS data is highly relational: animals relate to owners, premises, tags, health events, movement permits, and certificates with complex foreign key integrity requirements. A document database would require application-level joins, increasing complexity and risk of inconsistency.
- Azure Cosmos DB's automatic multi-region writes introduce complexity around conflict resolution that is inappropriate for a system where each animal must have exactly one current owner and one current active tag.
- Flyway migration management is well-established for PostgreSQL but not for Cosmos DB.

### Why Azure Database for PostgreSQL Flexible Server (not self-hosted)

- Managed HA (zone-redundant), automated backups, PITR, read replicas — all without operational burden on MoLFR IT team.
- Built-in Defender for PostgreSQL (threat detection, audit logging).
- Managed Identity integration: Container Apps authenticate to PostgreSQL via Azure AD without a stored password.
- PITR retention up to 35 days in production satisfies the requirement to be able to restore to any point within the last month.

### Why PgBouncer (connection pooling)

Azure Container Apps can scale a service to multiple replicas. Without connection pooling, each replica opens direct connections to PostgreSQL. At the default `max_connections = 100` for PostgreSQL B2s and D4s SKUs, 14 services × multiple replicas can exhaust the connection limit quickly. PgBouncer in transaction mode multiplexes many application connections over a small number of server connections.

Transaction mode (not session mode) is appropriate because SOMLITS services do not use server-side session state (no `SET LOCAL`, no advisory locks held across statements).

---

## Database Inventory

| Database Name | Owning Service | Primary Purpose |
|---|---|---|
| `somlits_{env}_identity_db` | identity-access-service | User accounts, roles, permissions, login events |
| `somlits_{env}_owner_org_db` | owner-org-service | Owner registrations, delegate grants |
| `somlits_{env}_premises_db` | premises-service | Premises registrations, certificates |
| `somlits_{env}_tag_inventory_db` | tag-inventory-service | Tag bags, devices, custody chain |
| `somlits_{env}_animal_registry_db` | animal-registry-service | Animal identity, ownership, premises, tag records |
| `somlits_{env}_vet_health_db` | veterinary-health-service | Health events, campaigns, samples, results, restrictions |
| `somlits_{env}_movement_db` | movement-service | Movement permits, confirmations, walking permits |
| `somlits_{env}_market_trade_db` | market-trade-service | Markets, sessions, arrivals, departures |
| `somlits_{env}_quarantine_export_db` | quarantine-export-service | Quarantine orders, export consignments |
| `somlits_{env}_abattoir_db` | abattoir-service | Slaughter sessions, events, carcass labels |
| `somlits_{env}_certification_db` | certification-service | Certificates, AHC details, revocations |
| `somlits_{env}_notification_db` | notification-service | Templates, preferences, notification log |
| `somlits_{env}_reporting_db` | reporting-traceability-service | CQRS read model, trace events, report results |
| `somlits_{env}_audit_db` | audit-service | Immutable audit events |
| `somlits_{env}_keycloak_db` | Keycloak (external) | Keycloak realm data |

---

## Consequences

**Accepted costs:**
- 15 PostgreSQL servers to provision and monitor. Mitigated by Bicep loop over a service list — all 15 are provisioned from a single module invocation.
- Cross-service queries (e.g., "show me animal + owner + current premises") require the client or an aggregating service to make multiple API calls. The reporting-traceability-service's CQRS read model pre-computes these aggregations from events, so most reporting queries hit a single database.
- Distributed transactions are not used. Eventual consistency is accepted. Saga pattern is used for workflows spanning multiple services (e.g., export consignment creation triggers quarantine-export-service → certification-service → notification-service via events).

---

## Alternatives Considered

### Shared database, schema-per-service
Provides some isolation via PostgreSQL schemas but still allows accidental cross-schema joins, shared connection pool exhaustion, and coupled deployment (all services must agree on schema evolution timing). Rejected.

### Shared database, table-per-service with access controls
Row-level security can enforce isolation but does not provide independent backup, retention, or scaling. Rejected.

### MongoDB / Azure Cosmos DB
Rejected for relational integrity reasons (see above). SOMLITS data model has strong relational structure that benefits from foreign key constraints and transactional integrity.
