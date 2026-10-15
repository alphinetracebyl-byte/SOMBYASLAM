# SOMLITS Local Development Environment

**Version:** 0.1 — Draft for Review
**Date:** 2026-07-18
**Status:** Awaiting Approval

---

## 1. Prerequisites

Install all tools before starting. Pin versions as listed to ensure team-wide consistency.

| Tool | Required Version | Installation |
|---|---|---|
| Docker Desktop | 4.x (latest) | https://www.docker.com/products/docker-desktop |
| Java (Temurin JDK 21) | 21.x | `winget install EclipseAdoptium.Temurin.21.JDK` or SDKMAN |
| Maven | 3.9.x | Bundled via `mvnw` wrapper in each service — no separate install needed |
| Node.js | 22.x LTS | `nvm install 22` (nvm recommended) |
| pnpm | 9.x | `corepack enable && corepack prepare pnpm@9 --activate` |
| Git | 2.40+ | Latest |
| IntelliJ IDEA | 2024.x (Community or Ultimate) | https://www.jetbrains.com/idea/ |
| VS Code | Latest | https://code.visualstudio.com/ (for frontend) |
| Azure CLI | 2.60+ | `winget install Microsoft.AzureCLI` |

Optional but recommended:
- `jq` — for inspecting JSON API responses in terminal
- `httpie` or `curl` — for manual API testing
- DBeaver Community — for inspecting local PostgreSQL databases
- TablePlus — alternative PostgreSQL GUI

---

## 2. First-Time Setup

### 2.1 Clone the Repository

```bash
git clone https://github.com/molfrsom/somlits.git
cd somlits
```

### 2.2 Configure Git Identity

Ensure your Git identity matches your GitHub account. The commit hook enforces this.

```bash
git config user.name "Your Name"
git config user.email "your.name@molfrsom.gov.so"
```

### 2.3 Install Frontend Dependencies

```bash
cd somlits
pnpm install      # installs all platform and lib dependencies from pnpm-workspace.yaml
```

### 2.4 Set Up Java Maven Wrapper

The `mvnw` wrapper is committed. No separate Maven install is needed. Verify:

```bash
cd services/animal-registry-service
./mvnw --version
```

### 2.5 Configure Local Environment Files

Copy the example environment file for each service or platform you intend to run:

```bash
# For a backend service
cp services/animal-registry-service/src/main/resources/application-local.yml.example \
   services/animal-registry-service/src/main/resources/application-local.yml

# For a frontend platform
cp platforms/farmer/.env.local.example platforms/farmer/.env.local
```

The `.yml.example` and `.env.local.example` files are committed to the repo as templates. The actual `application-local.yml` and `.env.local` files are git-ignored and must never be committed.

---

## 3. Docker Compose — Local Dependencies

The `docker-compose.yml` at the repo root starts all infrastructure dependencies needed for local development.

### 3.1 Full Stack (all dependencies)

```bash
docker compose up -d
```

### 3.2 Selective Start (recommended for service-specific development)

Start only what you need:

```bash
# Working on animal-registry-service only
docker compose up -d postgres-animal-registry keycloak servicebus-emulator

# Working on farmer platform frontend only (uses mock API via WireMock)
docker compose up -d wiremock keycloak
```

### 3.3 Services Provided by Docker Compose

| Container | Image | Local Port | Purpose |
|---|---|---|---|
| `postgres-identity` | `postgres:16-alpine` | 5433 | identity-access-service DB |
| `postgres-owner-org` | `postgres:16-alpine` | 5434 | owner-org-service DB |
| `postgres-premises` | `postgres:16-alpine` | 5435 | premises-service DB |
| `postgres-tag-inventory` | `postgres:16-alpine` | 5436 | tag-inventory-service DB |
| `postgres-animal-registry` | `postgres:16-alpine` | 5437 | animal-registry-service DB |
| `postgres-vet-health` | `postgres:16-alpine` | 5438 | veterinary-health-service DB |
| `postgres-movement` | `postgres:16-alpine` | 5439 | movement-service DB |
| `postgres-market-trade` | `postgres:16-alpine` | 5440 | market-trade-service DB |
| `postgres-quarantine-export` | `postgres:16-alpine` | 5441 | quarantine-export-service DB |
| `postgres-abattoir` | `postgres:16-alpine` | 5442 | abattoir-service DB |
| `postgres-certification` | `postgres:16-alpine` | 5443 | certification-service DB |
| `postgres-notification` | `postgres:16-alpine` | 5444 | notification-service DB |
| `postgres-reporting` | `postgres:16-alpine` | 5445 | reporting-traceability-service DB |
| `postgres-audit` | `postgres:16-alpine` | 5446 | audit-service DB |
| `postgres-keycloak` | `postgres:16-alpine` | 5447 | Keycloak DB |
| `keycloak` | `quay.io/keycloak/keycloak:25` | 8180 | OIDC/OAuth2 identity provider |
| `servicebus-emulator` | Azure Service Bus emulator | 5672 | AMQP-compatible emulator |
| `wiremock` | `wiremock/wiremock:3` | 8888 | Stub external APIs (SMS gateway, export APIs) |

All local PostgreSQL containers use the same credentials: user `somlits_dev`, password `localdev_only`. These are never used outside of the local Docker network.

### 3.4 Keycloak Local Setup

On first start, Keycloak imports the SOMLITS realm from `infra/keycloak/realm-export.json`. This creates:
- Realm: `somlits`
- Clients: `somlits-farmer-local`, `somlits-field-local`, `somlits-ministry-local`
- Roles: all SOMLITS roles (LIVESTOCK_OWNER, CAHW, FIELD_OFFICER, etc.)
- Test users (see Section 4)

Keycloak admin console: http://localhost:8180 (admin / localdev_only)

### 3.5 Service Bus Emulator

The Azure Service Bus emulator provides an AMQP 1.0 endpoint at `localhost:5672`. Services connect to it using the emulator's connection string:

```
Endpoint=sb://localhost;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=SAS_KEY_VALUE;UseDevelopmentEmulator=true
```

This is pre-configured in `application-local.yml` for all services.

### 3.6 WireMock Stubs

WireMock stubs are stored in `infra/wiremock/mappings/`. Each stub is a JSON file that maps a request pattern to a response. Stubs cover:

- Africa's Talking SMS API (`POST /version1/messaging`)
- AHC receiving-country verification APIs (Saudi Arabia, UAE — per D-011 when defined)
- IGAD regional database API (future)

Add new stubs to `infra/wiremock/mappings/` when a new external API is integrated.

---

## 4. Local Test Users

The following test users are pre-loaded in the local Keycloak realm:

| Username | Password | Role | Use case |
|---|---|---|---|
| `owner.test@somlits.local` | `Test1234!` | LIVESTOCK_OWNER | Test Farmer Platform |
| `cahw.test@somlits.local` | `Test1234!` | CAHW | Test CAHW registration flows |
| `officer.test@somlits.local` | `Test1234!` | FIELD_OFFICER | Test Field Platform |
| `distrvet.test@somlits.local` | `Test1234!` | DISTRICT_VET | Test permit approval, registration approval |
| `nationalvet.test@somlits.local` | `Test1234!` | NATIONAL_VET | Test quarantine orders, health surveillance |
| `admin.test@somlits.local` | `Test1234!` | SYSTEM_ADMIN | Test Ministry Platform, user management |
| `cvo.test@somlits.local` | `Test1234!` | CVO | Test AHC signing, OIE notification |

These users exist only in the local Keycloak realm. They are seeded by `infra/keycloak/realm-export.json`.

---

## 5. Running a Backend Service Locally

### 5.1 From IntelliJ IDEA

1. Open `services/animal-registry-service` as a Maven project.
2. In Run Configurations, add VM option: `-Dspring.profiles.active=local`
3. Run `AnimalRegistryApplication`.
4. Service starts on `http://localhost:8081` (port configured in `application-local.yml`).

### 5.2 From Terminal

```bash
cd services/animal-registry-service
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

### 5.3 Local Port Assignments

To avoid port conflicts when running multiple services, each service is assigned a distinct local port:

| Service | Local Port |
|---|---|
| identity-access-service | 8080 |
| owner-org-service | 8081 |
| premises-service | 8082 |
| tag-inventory-service | 8083 |
| animal-registry-service | 8084 |
| veterinary-health-service | 8085 |
| movement-service | 8086 |
| market-trade-service | 8087 |
| quarantine-export-service | 8088 |
| abattoir-service | 8089 |
| certification-service | 8090 |
| notification-service | 8091 |
| reporting-traceability-service | 8092 |
| audit-service | 8093 |

### 5.4 Running Tests

```bash
# Unit tests only (fast — no Docker needed)
./mvnw test

# Unit + integration tests (requires Docker for TestContainers)
./mvnw verify

# Single test class
./mvnw test -Dtest=AnimalRegistrationServiceTest

# Coverage report (generated in target/site/jacoco/index.html)
./mvnw verify jacoco:report
```

---

## 6. Running a Frontend Platform Locally

### 6.1 Farmer Platform

```bash
cd platforms/farmer
pnpm dev
# Starts at http://localhost:3000
```

The Farmer Platform in local mode points to `http://localhost:8080/v1` as the API base (via `VITE_API_BASE_URL` in `.env.local`). Either start the relevant backend services locally or point to WireMock.

### 6.2 Field Platform

```bash
cd platforms/field
pnpm dev
# Starts at http://localhost:3001
```

### 6.3 Ministry Platform

```bash
cd platforms/ministry
pnpm dev
# Starts at http://localhost:3002
```

### 6.4 All Platforms Simultaneously

From the repo root (uses pnpm workspace):

```bash
pnpm --filter "./platforms/*" dev
```

### 6.5 Frontend Tests

```bash
cd platforms/farmer

# Unit tests (watch mode)
pnpm test

# Unit tests (single run with coverage)
pnpm test:coverage

# Type check only
pnpm type-check

# Lint
pnpm lint

# Format check
pnpm format:check

# Format and fix
pnpm format:fix
```

---

## 7. API Exploration

### 7.1 Swagger UI (Local)

Each backend service exposes Swagger UI in local and dev profiles:

```
http://localhost:{port}/internal/v1/swagger-ui
```

Example: `http://localhost:8084/internal/v1/swagger-ui` for animal-registry-service.

Swagger UI is **disabled** in staging and production environments.

### 7.2 OpenAPI JSON

Machine-readable OpenAPI spec:

```
http://localhost:{port}/internal/v1/api-docs
```

### 7.3 Actuator Endpoints

Spring Boot Actuator endpoints available in local + dev environments:

| Endpoint | Purpose |
|---|---|
| `/actuator/health` | Combined health status |
| `/actuator/health/liveness` | Liveness probe |
| `/actuator/health/readiness` | Readiness probe |
| `/actuator/info` | Service name and version |
| `/actuator/loggers` | View and change log levels at runtime |
| `/actuator/metrics` | Micrometer metrics |
| `/actuator/flyway` | Migration history |

---

## 8. Seed Data

A seed data script is provided for local development to create a minimal set of reference and test data:

```bash
# After starting services locally:
./infra/scripts/seed-reference-data.sh --env local
```

This script creates:
- All species (`CATTLE`, `CAMEL`, `SHEEP`, `GOAT`)
- All region and district codes
- All AID types
- One test owner (linked to `owner.test@somlits.local`)
- One test premises (Mogadishu district)
- Five test animals (one of each species + one extra cattle)

The seed script uses the REST APIs (not direct DB access) to ensure it exercises the correct service workflows.

---

## 9. Debugging Tips

### 9.1 Enable SQL Logging (Local Only)

Add to `application-local.yml`:

```yaml
logging:
  level:
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql: TRACE
```

### 9.2 Enable Service Bus Message Tracing

```yaml
logging:
  level:
    com.azure.messaging.servicebus: DEBUG
```

### 9.3 Simulate Offline Mode (Frontend)

In Chrome DevTools → Network tab → Throttling → Offline. The Farmer and Field platforms should queue write operations in IndexedDB and sync when the network is restored (set throttling back to "No throttling").

To inspect IndexedDB contents: Chrome DevTools → Application → Storage → IndexedDB → `somlits-offline-db`.

### 9.4 Common Issues

| Issue | Solution |
|---|---|
| Port already in use | Check `lsof -i :{port}` (macOS/Linux) or `netstat -ano \| findstr :{port}` (Windows); kill conflicting process |
| Keycloak realm not imported | Delete `keycloak` container volume and restart: `docker compose rm -sv keycloak && docker compose up -d keycloak` |
| Flyway checksum mismatch | Never modify an applied migration. If on local DB only: drop and recreate DB, restart service |
| TestContainers timeout | Ensure Docker Desktop is running and has at least 4 GB RAM allocated |
| pnpm install fails | Delete `node_modules` at repo root and all platforms: `find . -name "node_modules" -type d -prune -exec rm -rf {} \;` then `pnpm install` |

---

STEP COMPLETE — awaiting approval before continuing.
