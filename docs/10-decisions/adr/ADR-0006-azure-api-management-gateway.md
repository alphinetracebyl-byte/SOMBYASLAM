# ADR-0006 — Azure API Management as the API Gateway

**Date:** 2026-07-18
**Status:** Accepted
**Deciders:** SOMLITS Technical Lead

---

## Context

SOMLITS exposes REST APIs from 14 microservices to three client platforms (Farmer, Field, Ministry) and to future external integrations (IGAD regional database, receiving-country AHC verification endpoints, partner NGO systems). Clients must not call individual service endpoints directly: this would require each client to know the internal network address of every service, duplicate authentication and rate-limiting logic across all services, and expose internal topology to external callers.

A single, managed API gateway is required to provide:
- A stable public URL for all three client platforms
- Centralised JWT validation before any request reaches a microservice
- Per-client rate limiting and quota enforcement
- Request routing to the correct backend service
- API versioning support
- Observability: unified request logging across all services
- Future: developer portal for partner API access

---

## Decision

**Azure API Management (APIM) in the Consumption or Developer/Standard tier** is used as the single API gateway for all SOMLITS external traffic.

All three client platforms call only APIM endpoints. No client has a direct network route to any Container App. APIM routes requests to the appropriate Container App backend over an internal virtual network.

The gateway is structured into four APIM Products:

| Product | Consumers | Services Exposed |
|---|---|---|
| `somlits-farmer` | Farmer PWA, SMS relay | owner-org, animal-registry, premises, movement, veterinary-health, notification, certification |
| `somlits-field` | Field PWA | All services except audit admin endpoints |
| `somlits-ministry` | Ministry PWA | All services including audit and configuration |
| `somlits-system` | Service-to-service, IGAD relay, partner integrations | Specific read endpoints per partner agreement |

---

## Rationale

### Why a dedicated API gateway at all

Without an API gateway, each client must:
- Know the direct URL of every microservice (14 different hostnames)
- Implement JWT validation locally (token format changes break all clients)
- Duplicate rate limiting logic
- Call each service independently for data that spans multiple services

An API gateway provides a single, stable, versioned surface. When an internal service is split or renamed, only the APIM routing policy changes — client URLs remain stable.

### Why Azure APIM over alternatives

| Factor | Azure APIM | Kong Gateway | AWS API Gateway | Spring Cloud Gateway |
|---|---|---|---|---|
| Managed service | Yes | Self-hosted (or Kong Cloud) | Yes (AWS-specific) | Self-hosted on Container Apps |
| Azure integration | Native: Managed Identity to Key Vault, App Insights tracing, Azure AD JWT validation | Requires plugins | AWS-only | Custom integration required |
| JWT validation policy | Built-in `validate-jwt` policy | Plugin required | Authorizer Lambda | Filter bean |
| Developer portal | Built-in | Available in paid tiers | Limited | Not included |
| Rate limiting | Built-in per product/subscription/IP | Plugin required | Built-in | Custom filter |
| Policy language | APIM policy XML — well-documented | Lua plugins | JSON/YAML | Java config |
| Team familiarity | Matches MoLFR Azure-first strategy (ADR-0002) | Additional product to learn | Ties to AWS (rejected, ADR-0002) | Requires Spring Cloud expertise |
| Operational burden | Zero — managed PaaS | Moderate — Kubernetes or VM required | Moderate — AWS-specific config | Moderate — Container App management |

### Why APIM Products (not a flat subscription)

APIM Products allow different rate limits, quotas, and allowed API sets per consumer group without duplicating policy definitions. The Farmer product enforces stricter rate limits (to protect against runaway SMS commands) than the Ministry product (trusted users, predictable load). The System product can be locked to specific IP ranges for partner integrations.

### Policy stack applied at APIM

Applied in order on every inbound request:

1. **JWT validation**: `validate-jwt` policy verifies signature against Keycloak's JWKS endpoint. Extracts `sub`, `roles`, `realm_access` claims.
2. **Correlation ID**: If `X-Correlation-ID` header absent, generate UUID and set it. Forward to backend.
3. **Rate limiting**: Product-level `rate-limit-by-key` policy (per client IP or per subscription key).
4. **IP allowlist** (Ministry product only): `ip-filter` policy restricts to government office IP ranges.
5. **Request logging**: Log method, URL, client IP, correlation ID, JWT subject to Application Insights.
6. **Backend routing**: Forward to appropriate Container App internal endpoint.
7. **Response transformation** (outbound): Strip internal `X-Internal-*` headers; add `X-Correlation-ID` to response.
8. **Error standardisation**: `on-error` section returns RFC 7807 Problem Details JSON for gateway-level errors (401, 403, 429, 502).

### URL routing structure

All public URLs follow the pattern: `https://api.somlits.gov.so/v1/{service-path}`

| Client URL | APIM routes to |
|---|---|
| `POST /v1/animals` | animal-registry-service: `POST /internal/animals` |
| `GET /v1/permits/{id}` | movement-service: `GET /internal/permits/{id}` |
| `POST /v1/certificates/ahc` | certification-service: `POST /internal/certificates/ahc` |

Service containers listen on their own path prefixes at internal URLs. APIM rewrites the public path to the internal path on each backend.

### API versioning strategy

APIM supports URL versioning (`/v1/`, `/v2/`) and header versioning. SOMLITS uses URL versioning (`/v1/`). When a breaking API change is required:
- A new `/v2/` version is added in APIM for the affected service
- `/v1/` continues to route to the old backend revision during a transition period
- Client platforms are updated before the old version is retired

---

## Consequences

**Accepted costs:**
- APIM adds ~5–20ms latency per request (policy execution overhead). Acceptable for livestock management operations (no sub-second SLA required).
- APIM policy XML must be maintained alongside service API changes. Mitigated by: IaC-managed APIM policies stored in Bicep/ARM templates in the monorepo.
- APIM Standard/Premium tiers are more expensive than basic reverse proxies. Mitigated by: the built-in developer portal, rate limiting, JWT validation, and Application Insights integration eliminate the need for separate tools, making total cost comparable.

---

## Alternatives Considered

### Spring Cloud Gateway (self-hosted on Container Apps)
Provides similar routing and filter capabilities but must be maintained as a custom service (Container App, Docker image, custom filter code). No built-in developer portal. JWT validation requires custom Spring Security filter. Rejected: higher maintenance burden with no benefit over managed APIM for this deployment profile.

### No gateway (direct client-to-service)
Rejected: requires each client to manage 14 service URLs, implement JWT validation, and implement rate limiting independently. Internal service topology is exposed to all three client platforms.

### Nginx reverse proxy on Container Apps
Rejected: no native JWT validation, rate limiting, or developer portal. Config management via nginx.conf is error-prone compared to APIM policy XML managed in Bicep.
