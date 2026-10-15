# ADR-0007 — Offline-First Mobile Strategy

**Date:** 2026-07-18
**Status:** Accepted
**Deciders:** SOMLITS Technical Lead, MoLFR IT Administration

---

## Context

SOMLITS field operations take place across Somalia's pastoral landscape: remote grazing areas, desert regions, and conflict-affected zones where mobile internet is unreliable or completely absent. Risk R-001 (connectivity gaps) and R-004 (conflict zone inaccessibility) are rated Critical.

Field officers may work at a farm visit or community registration event for 4–8 hours without any connectivity. Livestock owners in remote districts may have intermittent 2G SMS connectivity but no mobile data. A system that requires continuous internet access cannot be the national LITS for Somalia.

The mobile strategy must address:
1. Full functionality for field officers during extended offline periods
2. Data persistence and queueing of write operations until connectivity is restored
3. Sync without data loss when connectivity returns
4. Offline functionality for Farmer Platform users with low-end devices
5. SMS fallback for users with no smartphone

Options evaluated:
- Native Android app (offline-first via Room DB)
- Flutter app (cross-platform, offline-first)
- Progressive Web App (PWA) with IndexedDB and Service Workers
- Hybrid app (PWA wrapped in Capacitor/Cordova)

---

## Decision

**SOMLITS Farmer and Field platforms are built as Progressive Web Apps (PWAs)** with:
- Service workers (Workbox) managing cache strategy and background sync
- IndexedDB (Dexie.js) as the local persistent store for queued writes and cached reads
- An ordered, dependency-aware offline queue that survives app restarts and browser reloads
- Background sync via the Web Background Synchronization API (where available) supplemented by periodic manual sync trigger
- PKCE OAuth flow with long-lived offline tokens (90 days for Field; 30 days for Farmer) stored securely in the device

**SMS fallback** for Farmer Platform users without smartphones via Africa's Talking API routed through notification-service.

The Field Platform additionally wraps in **Capacitor** for access to:
- Android Keystore (secure offline token storage)
- Bluetooth Low Energy API (RFID reader integration)
- Camera capture (not limited by PWA browser permissions)

---

## Rationale

### Why PWA over native Android app

| Factor | Native Android | PWA (+Capacitor for hardware) |
|---|---|---|
| Codebase | Separate Android codebase (Kotlin/Java) alongside the React frontends | Single React TypeScript codebase shared with Ministry Platform; Capacitor wrapper adds minimal code |
| Distribution | Requires Google Play Store or manual APK distribution | Installed from browser (Add to Home Screen) or via Capacitor; no Play Store dependency |
| Update delivery | APK update must be downloaded and installed | Service worker updates automatically on next network connection |
| Offline capability | Room DB + WorkManager provides equivalent offline capability | IndexedDB + Workbox Background Sync provides equivalent offline capability |
| Development cost | Full separate Android team required | Frontend team extends existing React skills |
| Hardware access | Full native API access | Camera: ✓ (getUserMedia); GPS: ✓ (Geolocation API); BLE: Capacitor plugin; Keystore: Capacitor plugin |
| Somalia device landscape | Android dominant; iOS negligible | PWA works on any Android browser; Capacitor targets Android only (no iOS needed) |

The primary advantage of native Android (richer system-level integration) is matched by Capacitor for the specific hardware APIs SOMLITS requires (BLE, Keystore). The primary advantage of PWA (single codebase, frictionless update) outweighs any residual native advantage for this project.

### Why Progressive Web App over Flutter

Flutter provides cross-platform coverage (Android, iOS, web) with a single Dart codebase. For SOMLITS:
- The Ministry Platform is a data-dense desktop web app with complex table, map, and chart views that benefit from React's mature ecosystem (TanStack Table, Recharts, Leaflet). Rewriting this in Flutter web would sacrifice these libraries.
- The team's planned technology stack is React + TypeScript throughout. Introducing Flutter adds a second language (Dart) and a second framework, splitting a small team.
- Flutter web PWA is less mature for offline scenarios than Workbox + IndexedDB (a well-proven combination).

### Why IndexedDB (Dexie.js) over alternative local stores

| Option | Capacity | Structured queries | Reactivity | Offline queue |
|---|---|---|---|---|
| LocalStorage | 5–10 MB | No (key-value only) | No | Not feasible |
| SessionStorage | 5–10 MB; cleared on tab close | No | No | Not feasible |
| Cache Storage API | Large; opaque blobs | No | No | Not suitable for structured data |
| IndexedDB (Dexie.js) | Limited only by device storage; typically GB | Yes (indexes, cursors) | Yes (Dexie.js liveQuery) | Full support |
| SQLite via OPFS (future) | Large | Yes | External | Possible future upgrade |

Dexie.js adds a clean, Promise-based, TypeScript-typed API over the raw IndexedDB API. Its `liveQuery` feature enables reactive UI updates when offline data changes (e.g., the offline queue badge count updates without polling).

### Why long-lived offline tokens

Field officers in Somalia may work in the field for days without connectivity. A standard 15-minute access token TTL would require a network call to refresh every 15 minutes — impossible in an offline scenario. Keycloak's offline token grants a long-lived (7 days for Field, 30 days for Farmer) offline refresh token that allows the client to obtain new access tokens using only the local token store and the cached Keycloak JWKS public key, without contacting Keycloak.

The offline token is stored in the Android Keystore (via Capacitor Secure Storage Plugin) on the Field Platform. On the Farmer Platform, it is stored in an encrypted IndexedDB entry using a key derived from the user's PIN.

### Why Workbox (not a custom service worker)

Writing a production-quality service worker from scratch is error-prone (cache invalidation, update lifecycle, background sync retry logic). Workbox is Google's production-grade service worker library, widely used in PWA development, with:
- Built-in caching strategies (network-first, cache-first, stale-while-revalidate)
- Background Sync plugin with retry scheduling
- Precaching with versioned cache manifests (automatic cache invalidation on new build)
- Well-maintained and tested library

### Offline queue design

The offline queue is the most critical component of the offline strategy:

```
Offline Queue Architecture:

offline_queue (IndexedDB table)
  ├── id              — auto-increment
  ├── operationId     — client-generated UUID (idempotency key)
  ├── endpoint        — POST /v1/animals
  ├── payload         — request body JSON
  ├── dependsOn       — id[] of queue items that must succeed first
  ├── status          — pending | syncing | success | failed
  ├── attempt         — retry count
  ├── error           — last error message
  └── createdAt       — timestamp

Processing:
  1. On network reconnect (navigator.onLine event):
     a. Filter queue for status=pending with all dependsOn items = success
     b. Submit each item to APIM
     c. On 200/201: mark item success; unlock dependents
     d. On 409 (duplicate): mark success (server already has it — idempotency)
     e. On 4xx (validation error): mark failed; surface to user for review
     f. On 5xx / timeout: mark pending; increment attempt; retry on next sync
  2. Maximum 5 retry attempts; after 5, item is escalated to "needs review"
  3. Each request carries operationId as X-Idempotency-Key header
  4. Server-side idempotency: if operationId already exists, return the original result (not a new resource)
```

### SMS Fallback

For livestock owners with feature phones (2G-only), a structured SMS command set is supported via Africa's Talking API:

| Command | Response |
|---|---|
| `REG [national-id]` | Reference number for registration |
| `STATUS [animal-code]` | Animal status and current location |
| `PERMIT [permit-no]` | Permit validity and expiry |
| `LOST [tag-number]` | Tag loss report confirmation |
| `HELP` | Command list in Somali |

SMS commands are processed by notification-service acting as an inbound message handler. Responses are sent in Somali (configurable per user account language preference).

---

## Consequences

**Accepted costs:**
- Eventual consistency: an animal registered offline will not appear in the national database until the field officer's device syncs. For a system where the nearest district office may be hours away, this is a deliberate and necessary trade-off.
- Conflict resolution complexity: two field officers may register the same animal offline (e.g., at a shared market event). The server detects duplicate tag numbers and returns a 409. The officer's offline queue marks the item as "needs review". The officer must reconcile through the Field Platform's conflict resolution screen.
- Browser storage eviction: iOS Safari aggressively evicts IndexedDB storage when device storage is low. Mitigated by: the Farmer Platform is Android-primary (iOS has negligible market share in Somalia); the Field Platform uses Capacitor which provides more persistent storage guarantees.
- Workbox service worker updates require a page reload. The app prompts users to reload when a new service worker is detected.

---

## Alternatives Considered

### Require connectivity for all write operations
Rejected: makes the system unusable for the majority of Somalia's livestock-keeping territory. Risk R-001 is rated Critical precisely because this approach fails for Somalia's context.

### Native Android app with Room DB
Provides equivalent offline functionality but requires a separate Android codebase (Kotlin), splitting the team and doubling maintenance cost. The hardware APIs needed (BLE, Keystore) are accessible via Capacitor plugins without full native development. Rejected.

### Sync via paper forms only (no offline app)
Acceptable as a supplementary fallback (CSV batch upload at district office) but not as the primary method. Paper-only data collection introduces transcription errors, delays, and scanning bottlenecks. Retained as a supplementary path for areas where even Capacitor apps cannot be distributed.
