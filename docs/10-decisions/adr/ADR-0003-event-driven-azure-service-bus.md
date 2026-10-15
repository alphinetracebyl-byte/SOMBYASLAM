# ADR-0003 — Event-Driven Architecture with Azure Service Bus

**Date:** 2026-07-18
**Status:** Accepted
**Deciders:** SOMLITS Technical Lead

---

## Context

SOMLITS microservices need to communicate state changes to each other without creating tight runtime coupling. A representative example: when animal-registry-service records an animal's death, the movement-service must immediately block any new permits for that animal, the reporting-traceability-service must record the death event in the trace timeline, the notification-service must send a notification to the owner, and the audit-service must log the state change. Achieving this through synchronous REST calls from animal-registry-service to each downstream service creates:

- Runtime coupling (if notification-service is down, the death recording fails)
- Cascading latency (each downstream call adds to the total response time)
- Circular dependency risk (movement-service calling animal-registry-service while animal-registry-service is calling movement-service)

An asynchronous messaging layer is required. The choice is between a message broker (publish-subscribe model) and an event streaming platform.

---

## Decision

**SOMLITS uses Azure Service Bus Premium tier as the message broker for all inter-service domain events**, following a publish-subscribe topology:

- One topic per producing service (14 services → 10 producing topics; 4 services are consumers only)
- Each consuming service has its own named subscription on the topics it cares about
- All messages use a standard envelope: `eventType`, `aggregateType`, `aggregateId`, `occurredAt`, `correlationId`, `payload`
- **Outbox pattern**: every event is written to an `outbox_events` table in the producing service's own database within the same database transaction as the state change, then a background relay process reads from the outbox and publishes to Service Bus. This guarantees at-least-once delivery with no phantom events.
- Consumers are idempotent: they check `processed_event_id` before acting on a message and silently discard duplicates.

---

## Rationale

### Why asynchronous messaging over synchronous REST calls

| Concern | Synchronous REST | Async Messaging |
|---|---|---|
| Downstream service unavailability | Upstream call fails; state change may be lost or rolled back | Message is durably stored; downstream processes when it recovers |
| Latency | Total response time = sum of all downstream call times | Producing service responds immediately; downstream processes asynchronously |
| Circular dependencies | High risk in a domain with bidirectional constraints (movement ↔ health restriction) | Impossible — producers don't know who subscribes |
| Audit completeness | Each service must be explicitly called; easy to forget one | Any service can subscribe to any event without modifying the producer |

### Why Azure Service Bus over Apache Kafka / Azure Event Hubs

| Factor | Azure Service Bus | Kafka / Event Hubs |
|---|---|---|
| Message ordering | Per-session ordering supported natively | Partition-level ordering; requires careful partition key design |
| Dead-letter queue | Built-in DLQ per subscription; messages inspectable in Azure portal | Requires custom DLQ infrastructure |
| Message lock and peek-lock | Supported natively | Not applicable (Kafka is a log, not a queue) |
| Long-term event replay | Not designed for it | Core Kafka use case |
| Operational complexity | Managed PaaS; MoLFR IT team can manage via portal | Requires Kafka expertise for operations |
| Somalia data volumes | SOMLITS peak volumes (~10,000 events/day) are far below Service Bus limits | Kafka is designed for millions of events/second; oversized |
| IGAD regional data sync | Service Bus supports a bridge to IGAD's regional database via a relay service | Same capability achievable but more complex |

Long-term event replay (e.g., rebuilding the reporting-traceability-service CQRS read model from scratch) is handled by querying each service's own database history, not by replaying Service Bus messages. Service Bus message retention is 14 days — sufficient for operational processing but not for long-term replay.

### Why the outbox pattern

Without the outbox pattern, a service might write to the database successfully but then fail to publish the Service Bus message (network timeout, Service Bus unavailability). The result is a state change with no downstream notification — a silent inconsistency. The outbox pattern makes the event a durable part of the database transaction: either both the state change and the event record are committed, or neither is.

The relay process (a Spring Boot scheduled task running in the same Container App as the service) reads unpublished outbox events and publishes them to Service Bus. If the relay fails, it retries on the next poll cycle. Once Service Bus acknowledges receipt, the outbox record is marked published.

### Why Premium tier (not Standard)

- Premium tier provides geo-redundancy (paired region failover) — required for production RTO/RPO targets
- Premium tier supports 1 MB messages (Standard: 256 KB) — needed for AHC certificate payloads and bulk animal event lists
- Premium tier supports Virtual Network integration for private endpoint connectivity from Container Apps

---

## Topic Topology

| Topic | Producing Service | Key Subscribers |
|---|---|---|
| `somlits.identity` | identity-access-service | audit-service |
| `somlits.owner-org` | owner-org-service | animal-registry-service, reporting-traceability-service, audit-service, notification-service |
| `somlits.premises` | premises-service | movement-service, quarantine-export-service, reporting-traceability-service, audit-service |
| `somlits.tag-inventory` | tag-inventory-service | animal-registry-service, reporting-traceability-service, audit-service |
| `somlits.animal-registry` | animal-registry-service | movement-service, reporting-traceability-service, audit-service, notification-service |
| `somlits.veterinary-health` | veterinary-health-service | movement-service, quarantine-export-service, reporting-traceability-service, audit-service, notification-service |
| `somlits.movement` | movement-service | animal-registry-service, reporting-traceability-service, audit-service, notification-service |
| `somlits.quarantine-export` | quarantine-export-service | movement-service, animal-registry-service, reporting-traceability-service, audit-service, notification-service |
| `somlits.abattoir` | abattoir-service | animal-registry-service, reporting-traceability-service, audit-service |
| `somlits.certification` | certification-service | reporting-traceability-service, audit-service, notification-service |

---

## Consequences

**Accepted costs:**
- Eventual consistency: a movement-service's blocking cache may be up to a few seconds behind an animal-registry-service death event. This is acceptable for livestock management (not a real-time financial system).
- Dead-letter queue monitoring: DLQ messages require operational attention. An Azure Monitor alert fires when DLQ depth > 0 for more than 5 minutes.
- Idempotency implementation: every consumer must maintain a `processed_event_id` table or equivalent deduplication store.
- Outbox relay process: adds a small latency between state change and event delivery (typically < 1 second under normal load).

---

## Alternatives Considered

### Direct REST calls between services
Rejected: runtime coupling, cascading latency, and risk of inconsistency on partial failures.

### Apache Kafka / Azure Event Hubs
Rejected: operational complexity exceeds MoLFR IT team capacity; long-term replay (Kafka's primary advantage) is not required; built-in DLQ and message lock of Service Bus is more suitable for low-volume, high-reliability livestock event processing.

### RabbitMQ on Container Apps
Rejected: requires MoLFR IT team to operate a message broker; Azure Service Bus is a managed PaaS service with zero operational overhead.
