# SOMLITS Foundation Standards

**Version:** 0.1 — Draft for Review
**Date:** 2026-07-18
**Status:** Awaiting Approval

These standards apply to every line of code, every migration, and every test written for SOMLITS. They are not suggestions. Deviations require a new ADR.

---

## 1. Repository Structure

The full monorepo layout is defined in [cicd-and-environments.md](cicd-and-environments.md) Section 1.2. The key top-level directories are:

```
somlits/
├── services/           14 Spring Boot microservices
├── platforms/          3 React PWA platforms (farmer, field, ministry)
├── libs/               Shared libraries (design-tokens, api-contracts, common-domain)
├── infra/              Azure Bicep IaC
└── docs/               All project documentation
```

---

## 2. Java Package Conventions

### 2.1 Root Package

Every service uses the root package `com.somlits.{servicename}` where `{servicename}` is the service name with hyphens removed and camelCase applied.

| Service | Root Package |
|---|---|
| animal-registry-service | `com.somlits.animalregistry` |
| owner-org-service | `com.somlits.ownerorg` |
| veterinary-health-service | `com.somlits.veterinaryhealth` |
| quarantine-export-service | `com.somlits.quarantineexport` |
| reporting-traceability-service | `com.somlits.reportingtraceability` |
| (all others follow the same pattern) | |

### 2.2 Internal Package Structure

Each service follows a strict layered package structure. The layers may only be called top-to-bottom:

```
com.somlits.{servicename}/
│
├── api/                          # HTTP layer — controllers, DTOs, mappers
│   └── v1/
│       ├── controller/           # @RestController classes
│       ├── dto/
│       │   ├── request/          # Inbound request DTOs
│       │   └── response/         # Outbound response DTOs
│       └── mapper/               # MapStruct mappers: domain ↔ DTO
│
├── application/                  # Use-case layer — orchestrates domain logic
│   ├── command/                  # Write use cases (CreateAnimalCommand, etc.)
│   │   ├── handler/              # CommandHandler implementations
│   │   └── {UseCase}Service.java # One class per use case (not one god service)
│   └── query/                    # Read use cases
│       ├── handler/
│       └── {UseCase}QueryService.java
│
├── domain/                       # Pure domain model — no Spring, no JPA, no I/O
│   ├── model/                    # Domain aggregates, entities, value objects
│   ├── event/                    # Domain event records (outgoing)
│   ├── repository/               # Repository interfaces (contracts only)
│   └── exception/                # Domain-specific exceptions
│
├── infrastructure/               # Implements domain contracts
│   ├── persistence/
│   │   ├── entity/               # JPA @Entity classes
│   │   ├── repository/           # Spring Data JPA repository implementations
│   │   └── mapper/               # MapStruct mappers: domain ↔ JPA entity
│   ├── messaging/
│   │   ├── publisher/            # Service Bus message publishers (outbox relay)
│   │   └── consumer/             # @ServiceBusMessageHandler consumers
│   ├── outbox/                   # Outbox relay scheduler + repository
│   ├── external/                 # HTTP clients for external APIs (e.g., Africa's Talking)
│   └── config/                   # Spring @Configuration beans
│
└── {ServiceName}Application.java # Main class
```

### 2.3 Naming Rules

| Artefact | Convention | Example |
|---|---|---|
| Controller | `{Resource}Controller` | `AnimalController` |
| Request DTO | `{Action}{Resource}Request` | `RegisterAnimalRequest` |
| Response DTO | `{Resource}Response` | `AnimalResponse` |
| Application service | `{UseCase}Service` | `RegisterAnimalService` |
| Domain model | noun, no suffix | `Animal`, `MovementPermit` |
| Domain event | `{Subject}{PastTense}Event` | `AnimalRegisteredEvent` |
| Repository interface | `{Domain}Repository` | `AnimalRepository` |
| JPA entity | `{Domain}Entity` | `AnimalEntity` |
| JPA repository | `{Domain}JpaRepository` | `AnimalJpaRepository` |
| Mapper (domain↔DTO) | `{Resource}ApiMapper` | `AnimalApiMapper` |
| Mapper (domain↔entity) | `{Resource}PersistenceMapper` | `AnimalPersistenceMapper` |
| Exception | `{Domain}{Reason}Exception` | `AnimalNotFoundException`, `DuplicateTagException` |
| Configuration class | `{Topic}Configuration` | `ServiceBusConfiguration` |

### 2.4 Forbidden Patterns

- No `@Entity` class in the `api/` or `application/` packages — JPA entities never leave the infrastructure layer.
- No `@RestController` method that returns a JPA entity — always map to a response DTO.
- No `@Autowired` field injection — use constructor injection exclusively.
- No `java.util.Date` or `java.util.Calendar` — use `java.time.*` exclusively.
- No `System.out.println` or `java.util.logging` — use SLF4J only.
- No `Optional.get()` without `isPresent()` or `orElseThrow()`.

### 2.5 Maven Module Structure

The monorepo uses a parent POM at `services/pom.xml` (aggregator) and each service has its own `pom.xml`:

```
services/
├── pom.xml                          # Parent POM (Spring Boot BOM, shared dependencies, plugins)
├── animal-registry-service/
│   └── pom.xml                      # Inherits parent; service-specific deps only
├── owner-org-service/
│   └── pom.xml
└── ... (14 services total)
```

The parent POM pins:
- Spring Boot version (one version for all services)
- Java version (21)
- Dependency versions for all shared libraries (no version declared in child POMs)
- Plugin configuration (Checkstyle, JaCoCo, Surefire, Failsafe, OWASP, Flyway)

---

## 3. React / TypeScript Folder Conventions

### 3.1 Platform Directory Structure

```
platforms/{platform}/                  # farmer | field | ministry
│
├── src/
│   ├── api/                           # APIM client functions (Axios instances per API group)
│   │   ├── client.ts                  # Axios instance with auth interceptor
│   │   ├── animals.ts                 # Animal API calls
│   │   ├── permits.ts
│   │   └── ... (one file per service area)
│   │
│   ├── assets/                        # Static assets (SVG icons, images, fonts)
│   │
│   ├── components/                    # Shared, reusable components (no business logic)
│   │   └── {ComponentName}/
│   │       ├── index.tsx              # Component definition
│   │       ├── {ComponentName}.test.tsx
│   │       └── types.ts               # Component-local types (if needed)
│   │
│   ├── features/                      # Feature modules (business-domain slices)
│   │   └── {feature-name}/            # e.g., animal-registration, movement-permits
│   │       ├── components/            # Feature-specific components
│   │       ├── hooks/                 # Feature-specific custom hooks
│   │       ├── store/                 # Zustand store slice for this feature
│   │       ├── types.ts               # Feature-specific TypeScript types
│   │       └── index.ts               # Public API of this feature module
│   │
│   ├── hooks/                         # Shared custom hooks (useOfflineQueue, useAuth, etc.)
│   │
│   ├── i18n/                          # Internationalisation
│   │   ├── index.ts                   # i18next initialisation
│   │   ├── so.json                    # Somali (primary)
│   │   ├── ar.json                    # Arabic
│   │   └── en.json                    # English
│   │
│   ├── lib/                           # Pure utility functions (no React, no side-effects)
│   │   ├── dates.ts                   # Date formatting helpers
│   │   ├── validation.ts              # Zod schemas shared across features
│   │   └── constants.ts               # App-wide constants
│   │
│   ├── offline/                       # Farmer and Field platforms only
│   │   ├── db.ts                      # Dexie.js database definition
│   │   ├── queue.ts                   # Offline queue operations
│   │   ├── sync.ts                    # Sync orchestration
│   │   └── service-worker.ts          # Workbox service worker registration
│   │
│   ├── router/                        # React Router v6 configuration
│   │   ├── index.tsx                  # Root router definition
│   │   └── guards/                    # Route auth guards
│   │
│   ├── store/                         # Zustand global stores
│   │   ├── auth.store.ts              # Auth state (user, roles, token)
│   │   ├── notifications.store.ts
│   │   └── index.ts                   # Re-exports all stores
│   │
│   ├── types/                         # Shared TypeScript types (API response shapes, enums)
│   │   ├── api.types.ts               # Generated from OpenAPI specs (or hand-maintained)
│   │   └── domain.types.ts            # Domain type aliases
│   │
│   └── main.tsx                       # App entry point
│
├── public/
│   └── sw.js                          # Service worker entry (Workbox generates this)
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── .env.local.example                 # Template for local .env.local (git-ignored)
```

### 3.2 Naming Rules

| Artefact | Convention | Example |
|---|---|---|
| Component file | PascalCase | `AnimalCard.tsx` |
| Component directory | PascalCase | `AnimalCard/` |
| Hook file | camelCase, prefix `use` | `useOfflineQueue.ts` |
| Store file | camelCase, suffix `.store` | `auth.store.ts` |
| API client file | camelCase, noun | `animals.ts` |
| Type file | camelCase, suffix `.types` | `api.types.ts` |
| Utility file | camelCase | `dates.ts` |
| Feature directory | kebab-case | `animal-registration/` |
| Test file | same name as subject + `.test` | `AnimalCard.test.tsx` |
| i18n key | `{feature}.{element}.{modifier}` | `animalReg.tagNumber.label` |

### 3.3 TypeScript Rules

- `"strict": true` in all `tsconfig.json` files — no exceptions.
- No `any` type — use `unknown` and narrow, or define a proper type.
- All API response shapes must be typed — no implicit `any` from `axios.get()`.
- Prefer `interface` over `type` for object shapes; use `type` for unions and aliases.
- All exported functions must have explicit return types.
- No default exports from component files — use named exports (`export const AnimalCard`).
- Feature module public API (`index.ts`) uses named re-exports only.

### 3.4 Component Rules

- One component per file.
- Props interface defined in the same file as the component (unless shared across files).
- Components do not call API functions directly — use a hook that calls the API function.
- No business logic in components — extract to custom hooks or Zustand store actions.
- No inline styles — use design tokens from `@somlits/design-tokens`.

---

## 4. Shared Libraries Policy

The `libs/` directory contains three shared packages:

### 4.1 `@somlits/design-tokens` (npm package)

- Contains: colour palette, typography scale, spacing scale, breakpoints, border radii, shadow levels.
- Consumed by: all three React platforms.
- Published to: internal GitHub Packages registry.
- Versioned independently. Major version bump required for breaking design changes.
- No React components — tokens only. Components are platform-specific.

### 4.2 `libs/api-contracts` (OpenAPI YAML files)

- Contains: OpenAPI 3.1 YAML specifications for all 14 service APIs.
- One file per service: `{service-name}.yaml`
- Consumed by: frontend platforms (as documentation reference; types may be generated), APIM (for policy validation), integration tests.
- These specifications are the authoritative API contract — code must conform to the spec, not the other way around.
- Any change to a service API must update the corresponding YAML in the same PR.

### 4.3 `libs/common-domain` (Maven module)

- Contains: shared Java value objects and enums used across multiple services.
- Allowed contents: `Species`, `AnimalStatus`, `PermitStatus`, `CertificateStatus`, `AidType`, and other enums defined in the IGAD domain.
- Must never contain: Spring annotations, JPA annotations, or service-specific logic.
- Consumed by: all 14 backend services via parent POM dependency.
- Changes that affect the shared module must be reviewed by the tech lead.

### 4.4 Policy: What Must Not Be Shared

The following must NOT be placed in shared libraries:

- Business logic (even if two services appear to need the same calculation)
- Database entities or JPA repositories
- Application services or use-case handlers
- Spring configuration beans (except where genuinely cross-cutting, e.g., a shared logging filter)
- Service-specific DTOs

When two services appear to need the same logic, resist the temptation to extract it into a shared library. Duplication between services is intentional — it preserves service independence.

---

## 5. API Versioning Strategy

### 5.1 URL-Based Versioning

All SOMLITS REST APIs use URL path versioning:

```
https://api.somlits.gov.so/v1/{resource}
https://api.somlits.gov.so/v2/{resource}    (future, if breaking change required)
```

Internal Container App endpoints mirror this: `http://animal-registry-service/internal/v1/animals`

### 5.2 Version Rules

- **v1** is the initial version for all services at launch.
- A new version is required only for **breaking changes**: removing or renaming a field, changing a field's type, removing an endpoint, changing required/optional semantics.
- **Non-breaking changes** (adding optional fields, adding new endpoints, adding new enum values) do not require a new version.
- A new API version must be maintained alongside the old version for a minimum of **90 days** before the old version is retired, to allow client platform updates.
- API version deprecation requires notification to all registered APIM consumers (automated via APIM deprecation policy) and Ministry sign-off.

### 5.3 Internal vs External Paths

| Layer | URL Pattern | Notes |
|---|---|---|
| APIM (public) | `https://api.somlits.gov.so/v1/animals` | Used by all three client platforms |
| Container App (internal) | `http://animal-registry-service/internal/v1/animals` | APIM rewrites `/v1/` → `/internal/v1/`; services never directly routed from outside |
| Service-to-service | `http://animal-registry-service/internal/v1/animals` | Service-to-service calls use the same internal path; requires service JWT |

### 5.4 OpenAPI Documentation

Every service must expose its OpenAPI 3.1 spec at:
- `/internal/v1/api-docs` — machine-readable JSON
- `/internal/v1/swagger-ui` — human-readable UI (development and test environments only; disabled in production)

The spec is also maintained as a canonical YAML file in `libs/api-contracts/{service-name}.yaml`. The YAML file and the live Spring OpenAPI endpoint must be kept in sync (verified by a CI test that diffs the two).

---

## 6. Error Response Standard

### 6.1 Format — RFC 7807 Problem Details

All error responses from any SOMLITS service or from APIM must use RFC 7807 Problem Details format:

```json
{
  "type": "https://somlits.gov.so/errors/duplicate-tag",
  "title": "Duplicate tag number",
  "status": 409,
  "detail": "Tag number SO-C-MG-012345-00000001 is already active on animal e4f1a2b3-...",
  "instance": "/internal/v1/animals",
  "traceId": "ab12cd34ef56gh78",
  "errors": [
    {
      "field": "tagNumber",
      "code": "DUPLICATE_TAG",
      "message": "This tag number is already registered to another active animal."
    }
  ]
}
```

Fields:

| Field | Required | Description |
|---|---|---|
| `type` | Yes | URI identifying the error type. Stable across versions. |
| `title` | Yes | Short, human-readable error type name. |
| `status` | Yes | HTTP status code (integer). |
| `detail` | Yes | Instance-specific human-readable explanation. |
| `instance` | Yes | URI of the request that caused the error. |
| `traceId` | Yes | Correlation ID for tracing through logs. |
| `errors` | No | Array of field-level validation errors (used for 400/422 responses). |

### 6.2 HTTP Status Code Semantics

| Status | Used for |
|---|---|
| 200 | Successful GET, PUT, PATCH |
| 201 | Successful POST that creates a resource (include `Location` header) |
| 204 | Successful DELETE or state transition with no response body |
| 400 | Syntactically invalid request (missing required field, wrong type) |
| 401 | No valid JWT or expired token |
| 403 | Valid JWT but insufficient role or ownership |
| 404 | Resource not found |
| 409 | Business conflict (duplicate tag, invalid status transition) |
| 422 | Semantically invalid request (business rule violation — animal not Active, premises Suspended) |
| 429 | Rate limit exceeded (APIM-generated) |
| 500 | Unexpected server error (never expose stack traces) |
| 503 | Service temporarily unavailable (health check failing, DB unreachable) |

### 6.3 Error Type Registry

Error types are defined in `libs/api-contracts/errors.yaml` and each is a stable URI:

```
https://somlits.gov.so/errors/validation-error        — 400
https://somlits.gov.so/errors/unauthenticated          — 401
https://somlits.gov.so/errors/forbidden                — 403
https://somlits.gov.so/errors/not-found                — 404
https://somlits.gov.so/errors/duplicate-tag            — 409
https://somlits.gov.so/errors/invalid-status-transition — 422
https://somlits.gov.so/errors/animal-deceased          — 422
https://somlits.gov.so/errors/premises-not-active      — 422
https://somlits.gov.so/errors/health-restriction-active — 422
https://somlits.gov.so/errors/quarantine-active        — 422
https://somlits.gov.so/errors/rate-limit-exceeded      — 429
https://somlits.gov.so/errors/internal-server-error    — 500
```

New error types are added to this registry before they are used in code.

### 6.4 Never Expose

- Stack traces in error responses (log internally; return only `traceId`)
- Database error messages
- Internal service hostnames or network paths
- JPA/Hibernate exceptions unwrapped to the client

---

## 7. Logging Standard

### 7.1 Structured JSON Logging

All SOMLITS services write logs as structured JSON to stdout. Logback is configured to output JSON using the `logstash-logback-encoder` library. Azure Monitor ingests stdout from Container Apps automatically.

**Standard log record:**

```json
{
  "timestamp": "2026-07-18T08:30:00.000Z",
  "level": "INFO",
  "service": "animal-registry-service",
  "version": "1.2.0",
  "environment": "prod",
  "correlationId": "ab12cd34-ef56-gh78-ij90-kl1234567890",
  "traceId": "azure-app-insights-trace-id",
  "spanId": "azure-app-insights-span-id",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "userRoles": ["FIELD_OFFICER", "DISTRICT_VET"],
  "httpMethod": "POST",
  "httpPath": "/internal/v1/animals",
  "httpStatus": 201,
  "durationMs": 145,
  "message": "Animal registered successfully",
  "animalId": "e4f1a2b3-...",
  "tagNumber": "SO-C-MG-012345-00000001",
  "ownerId": "550e8400-..."
}
```

### 7.2 Mandatory Fields

Every log record must include:

| Field | Source |
|---|---|
| `timestamp` | Logback — UTC ISO 8601 |
| `level` | Logback |
| `service` | `spring.application.name` |
| `version` | Maven `project.version` injected at build time |
| `environment` | `SOMLITS_ENV` environment variable (`dev`, `test`, `stg`, `prod`) |
| `correlationId` | Extracted from `X-Correlation-ID` request header by MDC filter |
| `message` | Logger call |

### 7.3 Conditional Fields

Added to log records when available (not every request has all of these):

| Field | When included |
|---|---|
| `traceId` | When Azure Application Insights agent is active |
| `spanId` | When within a distributed trace |
| `userId` | When JWT is present and validated |
| `userRoles` | When JWT is present |
| `httpMethod`, `httpPath`, `httpStatus`, `durationMs` | On HTTP request completion |
| Domain-specific IDs | Added by the application layer (e.g., `animalId`, `permitId`) |

### 7.4 Log Levels

| Level | Used for |
|---|---|
| `ERROR` | Unhandled exceptions; external system failures; security violations |
| `WARN` | Expected but notable events: business rule violations, retried operations, DLQ messages |
| `INFO` | Normal lifecycle events: resource created, status changed, message published |
| `DEBUG` | Detailed diagnostic information (disabled in production) |
| `TRACE` | SQL queries, full request/response bodies (development only) |

Production log level is INFO. DEBUG is enabled per-service via Azure Monitor without redeployment (dynamic log level via Spring Boot Actuator `/actuator/loggers`).

### 7.5 What Must Never Be Logged

- Passwords or credentials of any kind
- JWT token values
- Full national ID numbers (log only last 4 characters: `****1234`)
- Full phone numbers (log only last 4 digits: `****7890`)
- Payment information (not in scope for SOMLITS but noted for future)
- Personal health information beyond what is directly required for the audit trail

---

## 8. Correlation ID Standard

### 8.1 Header Name

```
X-Correlation-ID
```

This header is the single trace identifier flowing through all layers of SOMLITS.

### 8.2 Lifecycle

```
1. Client (PWA) → APIM:
   If X-Correlation-ID is absent, APIM generates a UUID v4 and sets the header.
   If X-Correlation-ID is present and valid UUID, APIM forwards it unchanged.

2. APIM → Container App (service):
   X-Correlation-ID is forwarded unchanged.

3. Service (inbound filter):
   X-Correlation-ID is extracted from the request header.
   It is stored in MDC (SLF4J Mapped Diagnostic Context) as key "correlationId".
   All log records written within this request thread automatically include it.

4. Service → Service (outbound):
   When a service makes an API call to another service, it must add
   X-Correlation-ID from the current MDC to the outgoing request header.
   Use a Spring RestTemplate / WebClient interceptor to do this automatically.

5. Service → Service Bus (outbox):
   The correlationId is included in the Service Bus message's ApplicationProperties
   as "correlationId". Consumers extract it and store in their MDC.

6. Error responses:
   Every RFC 7807 error response includes "traceId": "{correlationId}".

7. Audit events:
   Every audit_event record stores the correlationId in the correlation_id column.
```

### 8.3 Format

Correlation ID must be a UUID v4 (lowercase, hyphenated):

```
ab12cd34-ef56-4789-b012-kl1234567890
```

Reject or replace any `X-Correlation-ID` value that is not a valid UUID v4. APIM enforces this via a `validate-parameters` policy before forwarding to services.

### 8.4 Frontend Responsibility

Every Axios request from the three platforms must include a client-generated UUID in `X-Correlation-ID`. The Axios instance in `src/api/client.ts` sets this as a default header using `crypto.randomUUID()`.

---

## 9. Date, Time, and Timezone Standard

### 9.1 Rules

| Layer | Rule |
|---|---|
| **API request/response** | ISO 8601 with UTC offset: `2026-07-18T08:30:00Z` (always `Z` for UTC, never `+00:00`) |
| **Database** | `TIMESTAMP WITH TIME ZONE` columns only; PostgreSQL stores UTC internally |
| **Java** | `Instant` for points in time; `LocalDate` for calendar dates (birth year, permit expiry date); never `Date`, `Calendar`, or `Timestamp` |
| **TypeScript** | ISO 8601 string (`string` type) for API payloads; `Date` object for local manipulation; always call `.toISOString()` before sending to API |
| **Audit records** | UTC always; never local time |
| **Display (UI)** | Convert UTC to East Africa Time (EAT, UTC+3, IANA zone `Africa/Mogadishu`) for display; use `Intl.DateTimeFormat` with `timeZone: 'Africa/Mogadishu'` |
| **Scheduled jobs** | CRON expressions are in UTC; schedule offsets for EAT market hours accordingly |

### 9.2 Calendar Dates

Animal birth dates are typically approximate in pastoral contexts. The API uses:
- `birthYear` — 4-digit integer year (always present)
- `birthMonth` — 1–12 integer (optional)
- `birthDay` — 1–31 integer (optional)

These are stored as three separate columns, not as a `DATE` column, to capture the known granularity honestly. A `DATE` column would imply a precision that does not exist.

### 9.3 Duration and Validity Periods

Movement permit validity periods and other durations are stored as:
- `validFrom` — `TIMESTAMP WITH TIME ZONE`
- `validUntil` — `TIMESTAMP WITH TIME ZONE`

The system checks `NOW() <= validUntil` at the time of movement permit use. Validity periods pending Ministry decision (D-007): 14 days domestic, 30 days export.

---

## 10. UUID and Business Code Standard

### 10.1 UUID (Internal Primary Keys)

- Version: UUID v4 (random), generated by the **application**, not by the database.
- Format: lowercase hyphenated: `550e8400-e29b-41d4-a716-446655440000`
- Database column type: `UUID` (native PostgreSQL type, not `VARCHAR`)
- Java type: `java.util.UUID`
- TypeScript type: `string` (with JSDoc `@format uuid`)
- Generation: `UUID.randomUUID()` in Java; `crypto.randomUUID()` in TypeScript
- Never expose raw UUIDs as route parameters without validating format (400 on invalid UUID in path)

### 10.2 Business Codes (Human-Readable Identifiers)

Business codes are separate from UUID primary keys. They are human-readable, printable on documents, and memorable. They are stored as separate columns alongside the UUID PK.

| Resource | Business Code Format | Example | Notes |
|---|---|---|---|
| Animal | `SO-{SPECIES}-{REGION}-{PREMISES}-{SEQ}` | `SO-C-MG-012345-00000001` | Pending Ministry D-004 |
| Premises | `{REGION}-{DISTRICT}-{SEQ}` | `MG-HD-000123` | Pending Ministry D-005 |
| Owner | `OWN-{REGION}-{SEQ6}` | `OWN-MG-001234` | System-generated at registration |
| Movement permit | `MP-{YEAR}-{SEQ8}` | `MP-2026-00000001` | Resets annually |
| Certificate (AHC) | `AHC-{YEAR}-{SEQ6}` | `AHC-2026-000001` | Resets annually |
| Tag bag | `BAG-{SUPPLIER}-{YEAR}-{SEQ6}` | `BAG-INT-2026-000001` | |
| Quarantine order | `QZ-{YEAR}-{SEQ6}` | `QZ-2026-000001` | |
| Export consignment | `EXP-{YEAR}-{SEQ6}` | `EXP-2026-000001` | |
| Slaughter session | `SLG-{ABATTOIR}-{DATE}-{SEQ4}` | `SLG-MGA01-20260718-0001` | |

**Sequence generation:** Sequences are database sequences (`CREATE SEQUENCE`). The service reads the next value and formats it into the business code. Sequences never reset except for year-based codes (reset at the sequence's owner service on 1 January via a scheduled job).

**Species codes** (pending Ministry D-002 / D-004 confirmation):

| Species | Code |
|---|---|
| Cattle | `C` |
| Camel | `K` |
| Sheep | `S` |
| Goat | `G` |

**Region codes**: 2-letter codes matching Somalia's 18-region administrative structure (e.g., `MG` = Mogadishu/Benadir, `BK` = Bakool, `BY` = Bay). Full list in `libs/common-domain/src/main/java/com/somlits/domain/RegionCode.java`.

---

## 11. Database Migration Standard

### 11.1 Tool

**Flyway** (embedded in Spring Boot). Migrations run automatically at service startup. The migration history table `flyway_schema_history` is created automatically in each service's database.

### 11.2 File Naming Convention

```
V{version}__{description}.sql
```

- `{version}`: integer sequence starting at `1`. Never skip a number.
- `__`: double underscore separator.
- `{description}`: snake_case description (max 40 characters).
- All lowercase.

Examples:
```
V1__create_animal_table.sql
V2__create_animal_status_event_table.sql
V3__add_rfid_type_to_animal.sql
V4__create_animal_ownership_record_table.sql
```

Repeatable migrations (for views, stored procedures): prefix `R__`:
```
R__animal_current_status_view.sql
```

### 11.3 Migration Content Rules

- Every table must have: `id UUID PRIMARY KEY`, `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`.
- All foreign keys explicitly named: `CONSTRAINT fk_{table}_{referenced_table} FOREIGN KEY (...) REFERENCES ...`
- All indexes explicitly named: `CREATE INDEX idx_{table}_{column} ON {table} ({column});`
- All unique constraints explicitly named: `CONSTRAINT uq_{table}_{column} UNIQUE ({column})`
- Never use `ALTER TABLE DROP COLUMN` in a migration — mark columns as deprecated with a comment and plan removal for a future migration after the code no longer uses the column.
- Never modify an existing migration file. If a migration has been applied in any environment, it is frozen. Fix errors with a new migration.
- Each migration is a single logical change. Do not bundle unrelated changes.

### 11.4 Standard Table Template

```sql
CREATE TABLE animal (
    id                  UUID            NOT NULL DEFAULT gen_random_uuid(),
    animal_code         VARCHAR(40)     NOT NULL,
    species             VARCHAR(10)     NOT NULL,
    status              VARCHAR(30)     NOT NULL DEFAULT 'PENDING_REGISTRATION',
    owner_id            UUID            NOT NULL,
    premises_id         UUID,
    version             INTEGER         NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    created_by          UUID            NOT NULL,
    updated_by          UUID            NOT NULL,

    CONSTRAINT pk_animal PRIMARY KEY (id),
    CONSTRAINT uq_animal_animal_code UNIQUE (animal_code)
);

CREATE INDEX idx_animal_owner_id    ON animal (owner_id);
CREATE INDEX idx_animal_status      ON animal (status);
CREATE INDEX idx_animal_premises_id ON animal (premises_id);

COMMENT ON TABLE  animal           IS 'Authoritative animal identity record. Soft-delete only — no physical deletion.';
COMMENT ON COLUMN animal.version   IS 'Optimistic locking version counter.';
```

### 11.5 Optimistic Locking

All aggregate root tables include a `version INTEGER NOT NULL DEFAULT 0` column. Spring Data JPA uses `@Version` on the corresponding entity field. Any concurrent update conflict raises `ObjectOptimisticLockingFailureException`, which the service translates to HTTP 409.

### 11.6 Soft Delete

No SOMLITS table uses physical delete for traceability records (animals, owners, premises, permits, certificates, health events, audit events). Instead, status columns control visibility. A `deleted_at TIMESTAMPTZ` column is acceptable for reference/configuration data (e.g., AID type definitions).

---

## 12. Testing Libraries

### 12.1 Backend (Java)

| Library | Purpose | Version |
|---|---|---|
| JUnit 5 (Jupiter) | Test runner and assertions | Via Spring Boot BOM |
| Mockito | Mocking in unit tests | Via Spring Boot BOM |
| AssertJ | Fluent, readable assertions | Via Spring Boot BOM |
| Spring Boot Test | `@SpringBootTest`, `@WebMvcTest`, `@DataJpaTest` slice tests | Via Spring Boot BOM |
| TestContainers | PostgreSQL and Service Bus emulator in integration tests | `1.20.x` |
| REST Assured | HTTP-level API tests against full Spring context | `5.x` |
| WireMock | Stub external HTTP calls (SMS gateway, receiving-country APIs) | `3.x` |
| JaCoCo | Code coverage reports and CI gate | Via Maven plugin |
| H2 | In-memory DB for `@DataJpaTest` slices (fast) | Via Spring Boot BOM |

### 12.2 Frontend (TypeScript)

| Library | Purpose | Version |
|---|---|---|
| Vitest | Unit test runner (Vite-native) | `2.x` |
| @testing-library/react | Component testing (render + query + assert) | `16.x` |
| @testing-library/user-event | Simulate real user interactions | `14.x` |
| @testing-library/jest-dom | Custom DOM matchers | `6.x` |
| MSW (Mock Service Worker) | Intercept API calls in component tests | `2.x` |
| Playwright | End-to-end tests (staging only) | `1.x` |
| happy-dom | Lightweight DOM for Vitest (faster than jsdom) | Via Vitest config |

### 12.3 Test Organisation

**Backend per-service:**
```
services/{service-name}/src/
├── main/java/...
└── test/java/com/somlits/{servicename}/
    ├── unit/
    │   ├── domain/             # Domain model unit tests
    │   └── application/        # Application service unit tests (mocked repos)
    ├── integration/
    │   ├── api/                # @SpringBootTest full stack: HTTP → DB
    │   └── messaging/          # Service Bus publish/consume integration tests
    └── fixture/                # Test data builders (Builder pattern, not static factories)
```

**Frontend per-platform:**
```
platforms/{platform}/src/
├── components/{ComponentName}/
│   └── {ComponentName}.test.tsx   # Co-located with component
├── features/{feature}/
│   ├── components/*.test.tsx
│   └── hooks/*.test.ts
└── __tests__/                     # Cross-feature integration tests
```

**Playwright E2E:**
```
platforms/{platform}/e2e/
├── {feature}.spec.ts
└── fixtures/                      # Page objects + test data
```

---

## 13. Code Quality Tools

### 13.1 Backend Code Quality

| Tool | Configuration | CI behaviour |
|---|---|---|
| **Checkstyle** | Google Java Style (`google_checks.xml`) with SOMLITS additions | Fails build on any violation |
| **SpotBugs** | Default bug patterns + `com.h3xstream.findsecbugs` plugin | Fails build on HIGH priority bugs |
| **OWASP Dependency Check** | CVE score threshold: 7.0 | Fails build if any dependency has CVSS ≥ 7.0 |
| **JaCoCo** | Line coverage minimum: 80%; branch coverage minimum: 70% | Fails build if below threshold |
| **GitHub CodeQL** | Java/Kotlin analysis, security queries | Fails PR merge on any HIGH severity finding |

Key Checkstyle rules beyond Google style:
- No `@SuppressWarnings` without a comment explaining why
- No `TODO` comments committed to `main` (use GitHub Issues instead)
- All public methods in domain and application layers must have Javadoc
- No wildcard imports (`import com.somlits.*`)

### 13.2 Frontend Code Quality

| Tool | Configuration | CI behaviour |
|---|---|---|
| **ESLint** | `typescript-eslint/strict`, `react-hooks`, `jsx-a11y`, `import` | Fails build on any error |
| **Prettier** | Single quotes, 2-space indent, trailing commas | Fails build on any formatting difference |
| **TypeScript** | `"strict": true`, `"noUncheckedIndexedAccess": true` | Fails build on any type error |
| **bundlesize** | Main bundle ≤ 500 KB gzipped; each lazy chunk ≤ 200 KB gzipped | Fails build if exceeded |
| **Lighthouse CI** | PWA score ≥ 90; Accessibility score ≥ 95 (Farmer + Field) | Fails CI on score drop ≥ 5 points |

ESLint rules of note:
- `react-hooks/exhaustive-deps`: error (no suppression without comment)
- `no-console`: error in production code (use logger instead)
- `jsx-a11y/alt-text`, `jsx-a11y/label-has-associated-control`: error
- `import/no-cycle`: error (no circular imports between features)

### 13.3 Formatting Consistency

Both backend and frontend use editors with auto-format on save configured via `.editorconfig` at the repo root and `.vscode/settings.json` for VS Code users.

---

## 14. Docker Strategy

### 14.1 Multi-Stage Build (Backend)

```dockerfile
# Stage 1 — Build
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace
COPY pom.xml .
# Download dependencies in a cacheable layer
RUN mvn -B dependency:go-offline -q
COPY src ./src
RUN mvn -B -DskipTests package -q

# Stage 2 — Runtime (minimal image)
FROM eclipse-temurin:21-jre-alpine AS runtime
RUN addgroup -S somlits && adduser -S somlits -G somlits
USER somlits
WORKDIR /app
COPY --from=build /workspace/target/*.jar app.jar
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health/liveness || exit 1
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
```

### 14.2 Multi-Stage Build (Frontend)

```dockerfile
# Stage 1 — Build
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /workspace
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Stage 2 — Serve via nginx
FROM nginx:1.27-alpine AS runtime
COPY --from=build /workspace/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

Note: In production, frontends are served from Azure Static Web Apps, not Docker. The Docker image is used for local development and for the Docker Compose environment only.

### 14.3 Image Standards

| Rule | Detail |
|---|---|
| Non-root user | All runtime containers run as the `somlits` user |
| No shell in runtime | `ENTRYPOINT ["java", ...]` form (exec form), not shell form |
| JVM tuning | `UseContainerSupport` + `MaxRAMPercentage=75.0` ensures JVM respects Container Apps memory limits |
| Image tag strategy | `:latest` never used in CI/CD; always `:{git-sha}` or `:{version}` |
| Base image pinning | Pin to minor version (`eclipse-temurin:21-jre-alpine`), not patch (`21.0.3`) — Alpine rolling patch updates are safe |
| Image size target | Backend runtime: < 200 MB; Frontend build output: < 10 MB gzipped |
| No secrets in image | No `.env` files copied into image; all secrets from Key Vault at runtime |

### 14.4 Docker Compose (Local Development)

The local `docker-compose.yml` (at repo root) provides all external dependencies for local development:

```yaml
services:
  postgres-animal-registry:   # One per service being developed locally
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: somlits_dev_animal_registry_db
      POSTGRES_USER: somlits_dev
      POSTGRES_PASSWORD: localdev_only
    ports: ["5432:5432"]

  keycloak:
    image: quay.io/keycloak/keycloak:25.0
    command: start-dev --import-realm
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: localdev_only
    volumes:
      - ./infra/keycloak/realm-export.json:/opt/keycloak/data/import/realm.json
    ports: ["8180:8080"]

  servicebus-emulator:
    image: mcr.microsoft.com/azure-messaging/servicebus-emulator:latest
    ports: ["5672:5672"]

  wiremock:
    image: wiremock/wiremock:3.x
    volumes:
      - ./infra/wiremock/mappings:/home/wiremock/mappings
    ports: ["8888:8080"]
```

A developer starting a new service needs only the relevant PostgreSQL container and Keycloak. The full `docker-compose.yml` starts all dependencies; `docker-compose up postgres-animal-registry keycloak` starts only what is needed for one service.

---

## 15. Environment Configuration

### 15.1 Spring Boot Configuration Hierarchy

Each service uses the standard Spring Boot layered configuration in this precedence order (highest first):

1. Environment variables (injected by Azure Container Apps from Key Vault references)
2. `application-{profile}.yml` (dev / test / stg / prod)
3. `application.yml` (common defaults — committed to repo, no secrets)

The `application.yml` contains only safe defaults. Any value that differs by environment is in `application-{profile}.yml`. Any value that is secret is not in any YAML file — it is an environment variable injected at runtime.

### 15.2 Spring Boot Configuration Structure

```yaml
# application.yml — safe defaults committed to repo
spring:
  application:
    name: animal-registry-service
  jpa:
    hibernate:
      ddl-auto: validate          # Flyway manages schema; Hibernate only validates
    open-in-view: false           # Disabled — no lazy loading in controllers
  flyway:
    enabled: true
    locations: classpath:db/migration

management:
  endpoints:
    web:
      exposure:
        include: health,info,loggers,metrics,prometheus
  endpoint:
    health:
      probes:
        enabled: true             # Liveness + readiness probes for Container Apps

somlits:
  service:
    name: animal-registry-service
    version: "@project.version@"  # Maven resource filtering
```

```yaml
# application-local.yml — local developer overrides (committed; no secrets)
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/somlits_dev_animal_registry_db
    username: somlits_dev
    password: localdev_only   # OK in local profile — never prod
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: http://localhost:8180/realms/somlits
```

```yaml
# application-prod.yml — prod overrides (committed; secrets via env vars)
spring:
  datasource:
    url: ${SOMLITS_DB_URL}          # Injected from Key Vault reference
    username: ${SOMLITS_DB_USER}
    password: ${SOMLITS_DB_PASSWORD}
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: ${SOMLITS_KEYCLOAK_ISSUER_URI}
```

### 15.3 Frontend Environment Variables (Vite)

Vite environment variables use the `VITE_` prefix. Only non-sensitive values belong here.

```bash
# .env.local.example (committed)   →   .env.local (git-ignored)
VITE_API_BASE_URL=http://localhost:4040/v1
VITE_KEYCLOAK_URL=http://localhost:8180
VITE_KEYCLOAK_REALM=somlits
VITE_KEYCLOAK_CLIENT_ID=somlits-farmer-local
VITE_ENV=local
```

Production values are injected by Azure Static Web Apps as application settings — never committed to the repository.

---

## 16. Secret Management

### 16.1 Principles

1. **Zero secrets in source code** — no passwords, tokens, keys, or connection strings in any committed file.
2. **Zero secrets in CI/CD secrets store** — GitHub Actions uses OIDC federated identity to authenticate to Azure; no long-lived credentials stored in GitHub.
3. **Zero secrets in environment variable files** — `.env.local` (local only, git-ignored) uses local Docker credentials only; these are not real secrets.
4. **Production secrets in Azure Key Vault** — every production secret lives in `somlits-prod-keyvault`.
5. **Managed Identity everywhere** — Container Apps authenticate to Key Vault, PostgreSQL, Service Bus, and Blob Storage using Azure Managed Identity; no credentials are stored.

### 16.2 Secret Naming Convention (Key Vault)

```
somlits-{service-short-name}-db-url
somlits-{service-short-name}-db-user
somlits-{service-short-name}-db-password
somlits-keycloak-client-secret
somlits-servicebus-connection-string
somlits-africas-talking-api-key
somlits-blob-storage-account-key
somlits-jwt-signing-key
```

### 16.3 Local Development Secret Handling

Local development uses Docker Compose containers with non-sensitive placeholder credentials (e.g., `localdev_only`). These are safe to commit in `application-local.yml` because:
- They have no network exposure beyond the developer's machine
- They are used only to connect to local Docker containers
- They provide no access to any real environment

Developers must never use production credentials on their local machine. Production access requires PIM activation and is logged in Azure Activity Log.

### 16.4 Secret Rotation

- Database passwords: rotated by MoLFR IT admin via Key Vault secret version update; Container Apps automatically pick up the new version on next restart (or sooner via Azure Container Apps secret sync).
- JWT signing key: rotated via Keycloak key rotation (automatic every 90 days); old key remains valid until all existing tokens expire.
- Africa's Talking API key: rotated manually by SOMLITS operations team when contractually required.

---

STEP COMPLETE — awaiting approval before continuing.
