# SOMLITS Platform Designs

**Version:** 0.1 — Draft for Review
**Date:** 2026-07-18
**Status:** Awaiting Ministry Approval

---

## Overview

SOMLITS is delivered through three distinct client platforms. Each serves a different actor group with different connectivity, device, literacy, and capability requirements. All three platforms are React 19 Progressive Web Apps (PWAs) served from Azure Static Web Apps, but their feature sets, UX paradigms, authentication flows, and offline behaviour differ substantially.

| Attribute | Farmer Platform | Field Platform | Ministry Platform |
|---|---|---|---|
| **Primary users** | Livestock owners, traders, CAHWs | LITS officers, district vets | MoLFR admin, national vets, CVO |
| **Devices** | Low-end Android smartphones, feature phones (SMS) | Android tablets (10"–12") | Desktop browsers (Chrome, Edge) |
| **Connectivity** | Intermittent or absent | Intermittent, field locations | Reliable office internet |
| **Language** | Somali primary; Arabic; English | Somali and English | English primary |
| **Literacy level** | Mixed — design for low literacy | Trained officer literacy | Professional literacy |
| **Offline requirement** | Full offline — queue and sync | Full offline — queue and sync | Not required |
| **Key hardware** | Camera (tag photo), SMS | Camera, RFID Bluetooth reader, GPS | Standard keyboard and mouse |
| **Authentication** | Phone OTP (SMS), PIN | Username + password + TOTP | SSO via Azure AD / username+TOTP |
| **Session type** | Long-lived offline token | Long-lived offline token | Short session (8h) |

---

## 1. Farmer Platform

### 1.1 Purpose

The Farmer Platform is the public-facing entry point for livestock owners, pastoralists, traders, and Community Animal Health Workers (CAHWs). It must be usable by people with low digital literacy, minimal connectivity, and low-end Android devices. The design prioritises task completion over feature richness.

### 1.2 Scope of Features

| Feature Area | Features Included |
|---|---|
| **Registration** | Submit owner registration; upload national ID photo; view registration status |
| **Animal management** | View owned animal list; report birth; report tag loss (replacement request); view animal details; view animal status |
| **Premises** | View registered premises; submit premises registration request |
| **Movement** | Apply for movement permit; view active permits; share permit QR code |
| **Health** | View vaccination history for owned animals; report suspected illness (field alert) |
| **Notifications** | Receive SMS and push notifications; view notification history |
| **Certificates** | View and download AHCs for owned export consignments |
| **Support** | Offline help content; contact district office |

**Out of scope for Farmer Platform:**
- Movement permit approval (officer role only)
- Quarantine order management
- Lab result entry
- Market session management (market operator role only, via Field Platform or dedicated portal)
- Any reporting or analytics

### 1.3 Authentication and Identity

```
Registration flow:
  1. User enters phone number
  2. Keycloak sends OTP via SMS (Africa's Talking gateway)
  3. User enters OTP → short-lived token issued
  4. User sets a 6-digit PIN (stored as TOTP seed in Keycloak)
  5. Subsequent logins: phone number + PIN → full offline JWT

Offline token:
  - Access token TTL: 15 minutes (in-memory refresh)
  - Refresh token TTL: 30 days (stored in IndexedDB, encrypted with PIN-derived key)
  - Offline token TTL: 90 days (allows background sync without re-auth)
  - On PIN change: all offline tokens revoked
```

CAHW users share the same phone-OTP flow but are assigned an additional `CAHW` realm role in Keycloak, unlocking bulk animal registration and vaccination recording.

### 1.4 Offline Architecture

```
Farmer Platform — Offline Data Flow

  [Service Worker (Workbox)]
       │
       ├── Cache Strategy: Network-first with offline fallback
       ├── Precaches: App shell, Somali/Arabic/English strings, icons
       └── Background Sync: Queues write operations when offline

  [IndexedDB (Dexie.js)]
       │
       ├── animals        — owner's own animals (synced on login)
       ├── permits        — active permits for owned animals
       ├── notifications  — unread notifications
       ├── offline_queue  — pending write operations (FIFO)
       └── draft_forms    — partially completed forms

  Sync trigger:
    1. Network reconnect event → service worker fires background sync
    2. Manual "Sync now" button in app
    3. Periodic background sync (Chrome: every 12h minimum)

  Conflict resolution:
    - Server is authoritative
    - Client shows "your registration was updated" notification on conflict
    - Duplicate animal registration: server returns 409 with existing record
```

### 1.5 UI / UX Design Principles

**Low-literacy design rules:**
- Every action has a large icon above the label (minimum 48×48dp)
- Colour is never the sole differentiator (accessible for colour-blindness)
- Text label always accompanies icon
- Voice guidance: Somali audio prompt on each form field (uses Web Speech Synthesis with Somali locale file)
- Forms: maximum 4 fields per screen; one question per screen for multi-step flows
- Success and error states use full-screen feedback (not toast notifications)
- Camera integration for tag number entry: OCR scan of printed tag (fallback: manual entry)

**Language:**
- Default: Somali (so-SO)
- User-selectable: Arabic (ar), English (en)
- All string keys maintained in `/i18n/` directory with one JSON file per locale
- RTL layout enforced for Arabic locale

**Navigation:**
- Bottom navigation bar: 5 tabs (My Animals, Permits, Health, Notifications, More)
- No nested navigation beyond 2 levels
- Breadcrumb shown on all detail views

**Accessibility:**
- WCAG 2.1 AA minimum
- Minimum touch target: 44×44dp
- Contrast ratio: ≥ 4.5:1 for all body text

### 1.6 SMS Fallback

For users on feature phones without smartphone capability or app installation, a subset of Farmer Platform features is available via SMS using Africa's Talking API, routed through the notification-service:

| SMS Command | Action |
|---|---|
| `REG [national-id]` | Request owner registration (response: reference number) |
| `STATUS [animal-code]` | Query animal status |
| `PERMIT [permit-number]` | Query permit validity |
| `LOST [tag-number]` | Report tag loss |
| `HELP` | Return list of available commands in Somali |

SMS responses are sent in Somali. Commands are case-insensitive. All SMS interactions are logged in notification-service.

### 1.7 Key Technical Components

| Component | Technology / Library |
|---|---|
| Framework | React 19 + TypeScript |
| PWA shell | Vite PWA plugin + Workbox |
| Service worker | Workbox (GenerateSW mode) |
| Offline storage | Dexie.js (IndexedDB wrapper) |
| State management | Zustand |
| HTTP client | Axios with offline interceptor |
| Forms | React Hook Form + Zod |
| i18n | i18next + react-i18next |
| UI components | Radix UI primitives + custom design tokens |
| Camera / OCR | `@zxing/library` (QR + barcode scanner) |
| Notifications | Firebase Cloud Messaging (push) + Africa's Talking (SMS) |
| Auth | Keycloak JS adapter (PKCE) |
| Bundler | Vite |
| Testing | Vitest + React Testing Library |

### 1.8 Screen Inventory

| Screen | Route | Auth required |
|---|---|---|
| Welcome / language select | `/` | No |
| Login (phone + OTP) | `/login` | No |
| PIN setup | `/setup-pin` | Yes (post-OTP) |
| PIN login | `/login/pin` | No |
| Dashboard | `/dashboard` | Yes |
| My Animals list | `/animals` | Yes |
| Animal detail | `/animals/:id` | Yes |
| Report birth | `/animals/birth` | Yes |
| Report tag loss | `/animals/:id/tag-loss` | Yes |
| Movement permit list | `/permits` | Yes |
| Apply for permit | `/permits/new` | Yes |
| Permit detail + QR | `/permits/:id` | Yes |
| Health events for animal | `/animals/:id/health` | Yes |
| Report illness | `/animals/:id/illness-report` | Yes |
| Notifications | `/notifications` | Yes |
| My premises | `/premises` | Yes |
| Register premises | `/premises/new` | Yes |
| Certificates | `/certificates` | Yes |
| Settings / language | `/settings` | Yes |
| Offline queue status | `/settings/sync` | Yes |
| Help (offline content) | `/help` | No |

---

## 2. Field Platform

### 2.1 Purpose

The Field Platform is used by LITS field officers (DVS officers, district veterinarians, border inspection officers, abattoir inspectors, and market monitors). It is optimised for an Android tablet in a rugged environment: dusty, bright sunlight, intermittent connectivity, with Bluetooth RFID readers and device cameras. Officers use it to perform registrations, health checks, movement verifications, market check-ins, pre-slaughter inspections, and border crossings.

### 2.2 Scope of Features

| Feature Area | Features Included |
|---|---|
| **Owner / premises registration** | Register new owner; register premises; approve pending registration (if DISTRICT_VET) |
| **Animal registration** | Register new animal; apply tag (single and bulk batch); photograph tag; add identification notes |
| **Tag operations** | Replace lost tag; deactivate destroyed tag; scan RFID tag; scan visual tag (camera) |
| **Movement** | Issue movement permit; approve/reject permit (if authorised); verify permit QR at checkpoint |
| **Health events** | Record vaccination (single and campaign); record clinical exam; collect sample; record mortality |
| **Market** | Open market session; check animals in; check animals out; record untagged animal incident |
| **Abattoir** | Record pre-slaughter check; record slaughter event; print carcass label; record Halal declaration |
| **Quarantine** | Issue quarantine order; add/remove premises from quarantine zone; lift quarantine |
| **Border inspection** | Check arriving animals; register imported animals; reject non-compliant animals |
| **Notifications** | Receive operational notifications; view quarantine alerts |

### 2.3 Authentication

```
Officer authentication flow:
  1. Username + password on login screen
  2. TOTP (Google Authenticator or Microsoft Authenticator) as second factor
  3. Keycloak issues access token (15min) + refresh token (8h) + offline token (7 days)
  4. Offline token stored in encrypted device keystore (Android Keystore via Capacitor plugin)

Offline mode:
  - Field officer can perform any local operation with cached offline token
  - Token is validated locally (JWT signature check against cached public key)
  - Sensitive operations (quarantine order, permit rejection) require connectivity confirmation
    before final commit — shown to officer as "requires sync before confirmation"

Role enforcement:
  - Roles are embedded in JWT claims
  - Local enforcement by the React app based on JWT roles
  - Server re-validates on every API call when online
```

### 2.4 Offline Architecture

The Field Platform requires more sophisticated offline capability than the Farmer Platform because officers perform multi-step workflows (e.g., registering 50 animals at a farm visit), and each step must be transactional.

```
Field Platform — Offline Data Flow

  [Service Worker (Workbox)]
       │
       ├── Cache: App shell + all form definitions + validation rules
       ├── Cache: Reference data (species list, AID types, region codes, disease list)
       └── Background Sync: Ordered transaction queue

  [IndexedDB (Dexie.js)]
       │
       ├── owned_work_queue    — ordered list of pending transactions (with dependencies)
       ├── draft_inspections   — in-progress multi-step workflows
       ├── cached_animals      — animals registered this session + recently scanned
       ├── cached_premises     — premises in officer's district
       ├── cached_owners       — owners recently accessed
       ├── scan_history        — last 500 RFID scans (24h rolling window)
       └── reference_data      — species, region codes, AID types, diseases (refreshed daily)

  Transaction dependencies:
    - If officer registers owner A, then premises under A, then animal under premises:
      these three writes form a dependency chain
    - Offline queue processes them in order
    - If write 1 fails (duplicate owner), writes 2 and 3 are held pending manual review

  Conflict resolution:
    - Server-authoritative
    - On sync: conflicts reported per transaction
    - Officer sees "Review needed" screen with detail of each conflict
    - Officer can accept server state, re-submit with correction, or escalate
```

### 2.5 RFID Integration

The Field Platform integrates with Bluetooth Low Energy (BLE) RFID readers (e.g., HID Bluetooth RFID, Handheld Scientific Bluetooth readers) that are commonly used in livestock identification programs.

```
RFID scan flow:
  1. Officer taps "Scan RFID" button
  2. App connects to paired BLE RFID reader via Web Bluetooth API
  3. Reader emits ISO 11784/11785 RFID tag ID
  4. App parses tag ID against national numbering scheme (D-004)
  5. App looks up animal in local cache → shows animal detail immediately
  6. If not in cache: queues API lookup for when online
  7. RFID read event stored in scan_history
  8. If tag not found in national DB: creates "unregistered animal" incident record

Alternative for visual tags:
  1. Officer taps "Scan Visual Tag"
  2. Device camera opens with ZXing barcode scanner
  3. Scans barcode on visual tamperproof tag
  4. Same lookup flow as RFID
```

### 2.6 GPS Integration

All Field Platform transactions include a GPS coordinate captured at the time of the event. This is used for:
- Animal registration: records premises GPS for mapping
- Slaughter event: records abattoir GPS
- Movement permit issuance: records starting premises GPS
- Market check-in: confirms animals physically arrived at the market GPS location
- Quarantine zone: officer marks quarantine boundary GPS polygon

```typescript
// GPS capture — always attempted; stored null if unavailable
interface GpsCapture {
  latitude: number | null;
  longitude: number | null;
  accuracyMetres: number | null;
  capturedAt: string; // ISO 8601 UTC
  source: 'device_gps' | 'manual_entry' | 'unavailable';
}
```

GPS coordinates are attached to every API request payload as `gps_capture` and stored on the server-side event record.

### 2.7 Bulk Registration

A key field workflow is batch animal registration at a farm visit or community registration event:

```
Bulk registration workflow:
  1. Officer selects owner + premises
  2. Officer enters batch size (e.g., 50 goats)
  3. System pre-validates: owner Active, premises Active
  4. For each animal in batch:
     a. Select species, sex, estimated age, colour/markings
     b. Scan or manually enter tag number
     c. Photograph tag on ear
     d. Confirm
  5. After all animals: "Submit batch" → creates offline_queue entry per animal
  6. On sync: all 50 submitted; failures reported individually
  7. Officer receives "48 of 50 registered successfully; 2 need review" notification

CSV bulk upload (CAHW at office with connectivity):
  - CAHW completes a structured offline paper form
  - At district office, LITS officer uploads CSV via Field Platform
  - System validates: species code, sex, estimated birth year, owner national ID, premises code
  - Supervisor reviews before DB commit (D-level approval required)
```

### 2.8 Key Technical Components

| Component | Technology / Library |
|---|---|
| Framework | React 19 + TypeScript |
| PWA shell | Vite PWA plugin + Workbox |
| Offline storage | Dexie.js (IndexedDB) |
| State management | Zustand with persist middleware |
| HTTP client | Axios with offline queue interceptor |
| Forms | React Hook Form + Zod |
| i18n | i18next |
| UI components | Radix UI + custom field-optimised design tokens |
| RFID | Web Bluetooth API + custom BLE adapter |
| Camera / OCR | `@zxing/library` (barcode scanner) + camera capture |
| GPS | Geolocation API (browser native) |
| Secure token storage | Capacitor Secure Storage Plugin (Android Keystore) |
| Maps | Leaflet.js + OpenStreetMap tiles (tiles cached offline) |
| QR code generation | `qrcode` npm library (permit QR display) |
| Auth | Keycloak JS adapter (PKCE) |
| Bundler | Vite |
| Testing | Vitest + React Testing Library + Playwright (E2E) |

### 2.9 Screen Inventory

| Screen Group | Key Screens |
|---|---|
| **Auth** | Login, TOTP verification, offline PIN fallback |
| **Dashboard** | Today's tasks, unsynced items count, connectivity indicator, quarantine alerts |
| **Owner & Premises** | Owner search, owner detail, register owner, premises list, register premises, approve registration |
| **Animal** | Animal search (RFID/barcode/text), animal detail, register animal, bulk registration wizard, tag replacement |
| **Movement** | Issue permit, permit search, permit verification (QR scan at checkpoint), permit history |
| **Health** | Record health event, vaccination campaign wizard, collect sample, record result, mortality recording |
| **Market** | Market session list, open session, check-in scanner, session summary, close session |
| **Abattoir** | Pre-slaughter check, slaughter event recording, carcass label print, Halal declaration |
| **Quarantine** | Issue quarantine order, quarantine zone map, premises in zone, lift quarantine |
| **Border** | Arrival inspection, import registration, rejection recording |
| **Sync** | Offline queue review, conflict resolution, sync progress |
| **Settings** | RFID reader pairing, language, notification preferences |

---

## 3. Ministry Platform

### 3.1 Purpose

The Ministry Platform is the national administration and oversight console used by MoLFR headquarters, the CVO's office, national veterinary officers, regional managers, and system administrators. It runs in a desktop browser on reliable office internet. It does not need offline capability. It has access to the full breadth of SOMLITS data: national statistics, all premises and animals, all trace-back results, audit logs, certificate revocation, and system configuration.

### 3.2 Scope of Features

| Feature Area | Features Included |
|---|---|
| **Dashboard** | National KPI dashboard; real-time registered animals/owners/premises counts; disease alert map; export consignment pipeline |
| **User administration** | Create/edit/suspend user accounts; assign roles; reset credentials; audit login history |
| **Owner management** | Search and view all owners; approve/reject/suspend registrations; manage delegate grants |
| **Premises management** | Search and view all premises; approve/reject/suspend; view premises map; manage premises certificates |
| **Animal registry** | Search all animals (national); view full animal lifecycle; manually correct status (with reason); bulk export |
| **Tag inventory** | Manage tag bag stock; approve allocations; view tag loss statistics |
| **Movement** | View all permits (national); override permit; view movement heatmaps; manage walking permits |
| **Health** | Disease surveillance dashboard; vaccination campaign management; lab result management; OIE notification workflow |
| **Quarantine** | National quarantine order register; lift quarantine; quarantine zone map (national) |
| **Markets** | Market register; view session histories; market activity analytics |
| **Abattoir** | Abattoir register; slaughter statistics; Halal compliance reports |
| **Export** | Export consignment pipeline; AHC approval; export market eligibility matrix; exit declaration |
| **Certification** | Certificate register; revoke certificate; manage AHC templates per export market |
| **Traceability** | Trace-back and trace-forward (full national); epidemiological mapping; contact animal reports |
| **Reports** | Run, schedule, and download all report types; configure scheduled reports |
| **Audit log** | Search immutable audit trail; export audit evidence for investigations |
| **Configuration** | Species list; AID types; region/district codes; system parameters |
| **Notifications** | Configure national alert thresholds; view notification logs; manage SMS templates |

### 3.3 Authentication

Ministry Platform users authenticate via Azure AD (for government identity federation) or Keycloak username + TOTP:

```
Azure AD path (government users):
  1. User clicks "Login with Government ID"
  2. Redirected to Azure AD government tenant
  3. Azure AD issues SAML assertion → Keycloak identity broker accepts it
  4. Keycloak issues SOMLITS access token with user's role
  5. Session TTL: 8 hours (office working day)

Keycloak direct path (non-government admin accounts):
  1. Username + password
  2. TOTP (Google/Microsoft Authenticator)
  3. Session TTL: 8 hours

Security features:
  - IP allowlist enforced at APIM level for Ministry product (government office IP ranges)
  - All sessions logged in identity-access-service
  - Concurrent session limit: 1 per user
  - Forced re-auth for critical operations (certificate revocation, quarantine order, AHC approval)
```

### 3.4 UI / UX Design Principles

**Professional desktop design:**
- Sidebar navigation with collapsible sections
- Data-dense table views with sort, filter, and pagination
- Multi-panel layouts for compare and trace views
- Full keyboard navigation (accessibility requirement)
- Map views embedded inline (Leaflet.js with Somalia administrative boundaries)

**Language:**
- English primary
- Somali available for all labels via toggle
- Technical configuration screens: English only

**Data tables:**
- Server-side pagination (page size 25/50/100)
- Column-level filter and sort
- Row selection for bulk operations
- CSV/Excel export from every table
- Saved filter presets (stored in user profile)

**Maps:**
- Somalia administrative boundary polygons (region and district)
- Premises plotted as pins (colour-coded by status)
- Quarantine zones as polygon overlays
- Movement flow heatmap (origin → destination density)
- Disease alert cluster view
- Export of map as PNG for reports

### 3.5 Disease Surveillance Dashboard

The disease surveillance dashboard is a critical Ministry-only feature that aggregates:

```
Disease Surveillance Dashboard components:
  1. Active health restrictions map (quarantine zones highlighted)
  2. Suspected illness reports table (last 30 days, by district)
  3. Lab sample pipeline (submitted → received → in analysis → result ready)
  4. OIE-notifiable positive results (with notification status)
  5. Species-level vaccination coverage by region (% vaccinated / registered)
  6. Trend chart: new health events per day (30/90/365 day rolling)
  7. Contact animal count for active trace-backs
```

Data is read from reporting-traceability-service's CQRS read model. Dashboard auto-refreshes every 60 seconds. Critical alerts (OIENotifiable confirmed) trigger a full-screen modal requiring acknowledgement.

### 3.6 Traceability Interface

Trace-back and trace-forward are Ministry-only workflows (restricted to DISTRICT_VET and above):

```
Trace-back flow (Ministry UI):
  1. Officer enters index animal ID or tag number
  2. System queries reporting-traceability-service /trace-back
  3. Result displayed as:
     a. Timeline view: chronological event list (birth → moves → health → current status)
     b. Map view: premises visited plotted chronologically with movement arcs
     c. Contact animal list: animals co-located at same premises/market within 21-day window
  4. Officer selects contact animals → triggers health restriction if required
  5. Full trace-back report exportable as PDF

Trace-forward flow:
  1. Same entry point as trace-back
  2. Displays all animals that received this animal's progeny (birth events)
     or that were co-located after this animal's confirmed disease event
  3. Used for depopulation order management (D-029)
```

### 3.7 Report Catalogue

The Ministry Platform provides a curated set of reports generated by reporting-traceability-service:

| Report ID | Name | Schedule Options |
|---|---|---|
| RPT-001 | National livestock register snapshot | Monthly, quarterly, on-demand |
| RPT-002 | Vaccination coverage by region and species | Monthly, on-demand |
| RPT-003 | Movement permit activity by corridor | Weekly, on-demand |
| RPT-004 | Export consignment pipeline | Daily, on-demand |
| RPT-005 | Disease surveillance summary | Weekly, on-demand |
| RPT-006 | Tag inventory status by region | Monthly, on-demand |
| RPT-007 | Owner registration activity | Monthly, on-demand |
| RPT-008 | Abattoir throughput by facility | Monthly, on-demand |
| RPT-009 | Premises compliance status | Quarterly, on-demand |
| RPT-010 | Audit event summary | Monthly, on-demand |
| RPT-011 | Cross-border movement register | Weekly, on-demand |
| RPT-012 | OIE notification history | On-demand |

Reports can be:
- Run immediately (on-demand)
- Scheduled (CRON expression stored in report_definition; triggered by Azure Container App scheduled job)
- Downloaded as PDF or CSV
- Emailed to a distribution list (Ministry officers)

### 3.8 AHC Template Management

The Ministry Platform includes a configuration interface for managing AHC templates per export market. This addresses risk R-014 (receiving country AHC format changes).

```
AHC template management:
  - One template per export market (e.g., Saudi Arabia, UAE, Oman, Egypt, Libya)
  - Templates stored as Handlebars HTML templates in certification-service
  - Ministry administrator edits template fields through a form builder UI
  - country_specific_fields (JSONB) defines which additional fields appear for that market
  - Template versioning: new version created on each edit; previous version retained
  - Template activation requires CVO approval (two-person approval workflow)
  - Change audit logged to audit-service
```

### 3.9 Key Technical Components

| Component | Technology / Library |
|---|---|
| Framework | React 19 + TypeScript |
| PWA shell | Vite (standard SPA, no offline requirement) |
| State management | Zustand |
| HTTP client | Axios |
| Forms | React Hook Form + Zod |
| i18n | i18next |
| UI components | Radix UI + custom design tokens (data-dense table variant) |
| Data tables | TanStack Table v8 (server-side sort/filter/page) |
| Charts | Recharts |
| Maps | Leaflet.js + `leaflet-geoman` (polygon drawing for quarantine zones) |
| PDF reports | Downloaded from reporting-traceability-service (server-generated) |
| Auth | Keycloak JS adapter (PKCE) + Azure AD identity broker |
| QR scanner | `@zxing/library` (certificate verification) |
| Bundler | Vite |
| Testing | Vitest + React Testing Library + Playwright (E2E) |

### 3.10 Screen Inventory (Summary)

| Module | Key Screens |
|---|---|
| **Dashboard** | National KPI dashboard, disease surveillance map, alert centre |
| **Users** | User list, user detail, create/edit user, role assignment, login history |
| **Owners** | Owner search, owner detail, approve/reject, delegate grants |
| **Premises** | Premises search, premises detail, premises map, approve/reject |
| **Animals** | Animal search, animal detail (full lifecycle), status correction |
| **Tags** | Bag inventory, allocate bags, tag loss stats |
| **Movement** | Permit search, permit detail, override, heatmap |
| **Health** | Surveillance dashboard, health event list, lab sample pipeline, campaign management |
| **Quarantine** | Quarantine order list, quarantine zone map, lift quarantine |
| **Markets** | Market register, session history, analytics |
| **Abattoir** | Abattoir register, slaughter stats, Halal compliance |
| **Export** | Consignment pipeline, AHC approval, eligibility matrix |
| **Certification** | Certificate register, revoke, AHC template manager |
| **Traceability** | Trace-back/forward search, timeline, map, contact animals, PDF export |
| **Reports** | Report catalogue, run/schedule, download, email distribution |
| **Audit** | Audit log search, export audit evidence |
| **Config** | Species, AID types, region codes, system parameters |
| **Notifications** | Alert thresholds, notification log, SMS template editor |

---

## 4. Shared Platform Concerns

### 4.1 Design System

All three platforms share a common design token library published as an internal npm package `@somlits/design-tokens`. It defines:
- Colour palette (primary, semantic: success / warning / error / info)
- Typography scale
- Spacing scale
- Border radii
- Shadow levels
- Breakpoints

The Radix UI primitive components are styled using these tokens. Each platform has its own theme variant (Farmer: large touch targets, high contrast; Field: bright sunlight optimised; Ministry: data-dense).

### 4.2 APIM Product Routing

Each platform is bound to its own APIM product and set of subscriptions:

| Platform | APIM Product | Allowed Services |
|---|---|---|
| Farmer | `somlits-farmer` | owner-org, animal-registry, premises, movement, veterinary-health, notification, certification |
| Field | `somlits-field` | All services except audit admin endpoints |
| Ministry | `somlits-ministry` | All services including admin and audit |

Rate limiting and quotas are enforced at product level.

### 4.3 Error Handling Standards

All three platforms follow the same error handling contract:

```
API error response (RFC 7807 Problem Details):
{
  "type": "https://somlits.gov.so/errors/animal-not-found",
  "title": "Animal not found",
  "status": 404,
  "detail": "No animal with ID e4f1a2b3... exists in the registry.",
  "instance": "/api/v1/animals/e4f1a2b3...",
  "traceId": "ab12cd34"
}

Client handling:
  - 400: Show field-level validation errors
  - 401: Redirect to login
  - 403: Show "You do not have permission" screen; log access attempt
  - 404: Show "Not found" with back navigation
  - 409: Show conflict detail with resolution options
  - 422: Show business rule violation message in user's language
  - 429: Show "System busy" with retry countdown
  - 500/503: Show "Service unavailable" with offline queue note (Farmer/Field)
```

All error messages are localised. Error codes are stable across API versions.

### 4.4 Notification Integration

All three platforms receive real-time notifications:

| Platform | Push Method | SMS Fallback |
|---|---|---|
| Farmer | Firebase Cloud Messaging (PWA push) | Yes — Africa's Talking |
| Field | FCM + in-app notification panel | No (field officers have smartphones) |
| Ministry | In-app notification panel + email | No |

Notification preferences (opt-in per event type) are managed in notification-service. Ministry users can configure alert thresholds (e.g., "alert me if daily slaughter events > 1000").

---

STEP COMPLETE — awaiting approval before continuing.
