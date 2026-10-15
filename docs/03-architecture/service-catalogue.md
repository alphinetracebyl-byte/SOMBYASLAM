# SOMLITS — Service Catalogue

**Version:** 0.1 — Draft for Review
**Date:** 2026-07-18
**Status:** Awaiting Ministry Approval

This document defines the responsibility, data ownership, APIs, events, dependencies, scaling needs, and security considerations for each of the 14 SOMLITS microservices.

---

## Classification Key

| Code | Meaning |
|---|---|
| **[IGAD]** | Derived from the IGAD LITS framework |
| **[SOMLITS]** | SOMLITS-specific design decision |

---

## Service 1 — Identity and Access Service

**Service name:** `identity-access-service`
**Database:** `somlits_identity`
**APIM prefix:** `/api/v1/auth/`

### Responsibility

Manages the SOMLITS user account lifecycle: creation, role assignment, suspension, and deletion. Issues and validates JWT tokens via Keycloak. Manages role definitions and permission sets for all three platforms. Provides the user identity context that all other services consume via the `X-User-Id` and `X-Roles` request headers injected by APIM.

This service wraps Keycloak's Admin REST API and exposes a SOMLITS-specific user management interface. Direct Keycloak Admin API access is blocked for all non-system callers.

### Owned Data

| Entity | Description |
|---|---|
| `user_account` | SOMLITS user record: UUID, Keycloak subject ID, phone number, email, status, created timestamp |
| `user_role` | Roles assigned to a user: OWNER, HERDSMAN, FIELD_OFFICER, CAHW, DISTRICT_VET, INSPECTOR, REGIONAL_COORD, CVO, ABATTOIR_OPERATOR, MARKET_OPERATOR, EXPORTER, SYSTEM_ADMIN |
| `role_permission` | Permission definitions per role (e.g., `animal:write`, `movement:approve`) |
| `login_event` | Audit of successful and failed logins |
| `token_revocation` | Revoked JWT IDs for immediate logout enforcement |

### API Endpoints

| Method | Path | Description | Min. Role |
|---|---|---|---|
| POST | `/auth/users` | Create a new user account | SYSTEM_ADMIN |
| GET | `/auth/users/{id}` | Get user profile | SYSTEM_ADMIN or self |
| PUT | `/auth/users/{id}/status` | Suspend or reactivate a user | SYSTEM_ADMIN |
| POST | `/auth/users/{id}/roles` | Assign roles to a user | SYSTEM_ADMIN |
| DELETE | `/auth/users/{id}/roles/{role}` | Remove a role | SYSTEM_ADMIN |
| GET | `/auth/roles` | List all defined roles | SYSTEM_ADMIN |
| POST | `/auth/tokens/revoke` | Revoke a JWT immediately | SYSTEM_ADMIN |
| GET | `/auth/health` | Liveness check | Public |

### Events Published

| Event | Trigger |
|---|---|
| `IdentityAccess.User.Created` | New user account created |
| `IdentityAccess.User.Suspended` | User suspended |
| `IdentityAccess.User.Reactivated` | User reactivated |
| `IdentityAccess.User.RoleAssigned` | Role assigned to user |

### Events Consumed

None. Identity service is a root dependency; it does not consume events from other services.

### Dependencies

- **Keycloak** (identity provider; Admin REST API)
- **Azure Key Vault** (Keycloak client secret, JWT signing key reference)

### Scaling Needs

Low baseline; login bursts during morning field-officer sync windows. Keycloak handles token issuance; this service handles management operations only. Scale to 2 replicas minimum in production; auto-scale to 5 on CPU > 70%.

### Security Considerations

- All endpoints require `SYSTEM_ADMIN` role except health check and self-service profile read
- Phone numbers hashed in the database; only the last four digits stored in plaintext
- Login failure rate monitored; account locked after 10 consecutive failures within 1 hour
- Token revocation list checked on every APIM policy evaluation (cached 60 seconds)

---

## Service 2 — Owner and Organisation Service

**Service name:** `owner-org-service`
**Database:** `somlits_owner`
**APIM prefix:** `/api/v1/owners/`

### Responsibility

Manages the registration and lifecycle of livestock owners and organisations. An owner may be an individual pastoralist, a commercial farm, or a corporate livestock dealer. Manages the delegate grant system: an owner grants scoped access to employees or agents, and revokes that access. Every delegate action is attributed to both the delegate and the owner they act for.

### Owned Data

| Entity | Description |
|---|---|
| `owner` | UUID, user_account_uuid (FK to identity), full name, national ID, phone, address, GPS of primary premises, owner categories (ENUM set), registration status, registration date, renewal date |
| `owner_category` | Farmer-private, Farmer-commercial, Agent, Importer, Exporter, Transporter, Cross-border-dealer, Meat-processor |
| `organisation` | Corporate owner entity: name, registration number, country |
| `delegate_grant` | Owner UUID, delegate user UUID, granted roles, valid-from, valid-until, granted-by, revoked-at, revoked-by |
| `owner_status_history` | Immutable log of owner status changes |

### API Endpoints

| Method | Path | Description | Min. Role |
|---|---|---|---|
| POST | `/owners` | Register a new owner | FIELD_OFFICER or self-register |
| GET | `/owners/{id}` | Get owner profile | OWNER (self) or INSPECTOR+ |
| PUT | `/owners/{id}` | Update owner profile | OWNER (self) or FIELD_OFFICER |
| PUT | `/owners/{id}/status` | Change registration status | REGIONAL_COORD+ |
| GET | `/owners/{id}/delegates` | List delegate grants | OWNER (self) or INSPECTOR+ |
| POST | `/owners/{id}/delegates` | Grant delegate access | OWNER (self) |
| DELETE | `/owners/{id}/delegates/{delegateId}` | Revoke delegate | OWNER (self) or SYSTEM_ADMIN |
| GET | `/owners` | Search / list owners | INSPECTOR+ |
| GET | `/owners/{id}/animals` | Animal count summary for owner | OWNER (self) or INSPECTOR+ |

### Events Published

| Event | Trigger |
|---|---|
| `OwnerOrg.Owner.Registered` | Owner registration completed |
| `OwnerOrg.Owner.StatusChanged` | Owner suspended, reactivated, or deregistered |
| `OwnerOrg.Delegate.Granted` | Delegate access granted |
| `OwnerOrg.Delegate.Revoked` | Delegate access revoked |

### Events Consumed

| Event | From | Action |
|---|---|---|
| `IdentityAccess.User.Suspended` | identity-access-service | Suspend all delegate grants for the suspended user |

### Dependencies

- **identity-access-service** (validate user UUID exists before creating owner)
- **Azure Key Vault** (DB connection string)

### Scaling Needs

Moderate; bursts during registration campaigns. Stateless; auto-scale 2–6 replicas.

### Security Considerations

- Owners can only read and update their own profile; INSPECTOR and above can read all
- Delegate grants expire after `valid-until`; service rejects expired grants at every operation
- National ID stored encrypted at rest (AES-256 via PostgreSQL pgcrypto)
- Owner phone number used for SMS notifications; treated as PII; access logged

---

## Service 3 — Premises Service

**Service name:** `premises-service`
**Database:** `somlits_premises`
**APIM prefix:** `/api/v1/premises/`

### Responsibility

Manages the registration, approval, and lifecycle of all LITS facilities: farms, pastoral areas, markets, abattoirs, quarantine stations, border inspection posts, transit facilities, and export holding facilities. Assigns the Premises Code on approval. Maintains the status (Pending → Active → Suspended → Closed) and enforces that no movement permit may reference a non-Active premises.

### Owned Data

| Entity | Description |
|---|---|
| `premises` | UUID, name, premises_code, type (ENUM), owner_uuid, GPS coordinates, region, district, address, status, registration date |
| `premises_type` | FARM, PASTORAL_AREA, WATERING_POINT, TRANSIT_YARD, MARKET, LOCAL_ABATTOIR, EXPORT_ABATTOIR, QUARANTINE_STATION, BORDER_INSPECTION_POST, EXPORT_HOLDING, CAHW_POST, VET_CLINIC |
| `premises_status_history` | Immutable log: previous status, new status, changed by, timestamp, reason |
| `premises_certificate` | LITS registration certificate: serial, issued date, valid-until, PDF blob reference |

### API Endpoints

| Method | Path | Description | Min. Role |
|---|---|---|---|
| POST | `/premises` | Register a premises | OWNER or FIELD_OFFICER |
| GET | `/premises/{id}` | Get premises detail | Any authenticated |
| PUT | `/premises/{id}` | Update premises details | OWNER (self) or FIELD_OFFICER |
| PUT | `/premises/{id}/status` | Approve, suspend, or close | DISTRICT_VET+ |
| GET | `/premises/{id}/status-history` | Get status history | INSPECTOR+ |
| GET | `/premises` | Search premises by owner, type, region, status | FIELD_OFFICER+ |
| GET | `/premises/{id}/certificate` | Download registration certificate | OWNER (self) or INSPECTOR+ |
| GET | `/premises/{id}/animals/count` | Current animal count summary | INSPECTOR+ |

### Events Published

| Event | Trigger |
|---|---|
| `Premises.Premises.Registered` | New premises submitted |
| `Premises.Premises.Approved` | Status changed to Active |
| `Premises.Premises.Suspended` | Status changed to Suspended |
| `Premises.Premises.Closed` | Status changed to Closed |

### Events Consumed

None directly; movement-service queries this service synchronously to check status before permit issuance.

### Dependencies

- **owner-org-service** (validate owner UUID exists)
- **certification-service** (generate registration certificate PDF)

### Scaling Needs

Low; premises registration is infrequent. 2 replicas minimum.

### Security Considerations

- Only the owner or a FIELD_OFFICER can register a premises
- Status changes require DISTRICT_VET or higher
- GPS coordinates visible to all authenticated users; address and owner details restricted to INSPECTOR+

---

## Service 4 — Tag Inventory Service

**Service name:** `tag-inventory-service`
**Database:** `somlits_tag`
**APIM prefix:** `/api/v1/tags/`

### Responsibility

Manages the complete lifecycle of Animal Identification Devices: Minister approval of device types, bag creation by manufacturer, custody chain from manufacturer to owner, allocation of tags to owners, activation of tags on individual animals, loss and compromise reporting. Every tag number is globally unique and traceable.

### Owned Data

| Entity | Description |
|---|---|
| `aid_type` | Approved AID type: type (VISUAL_EAR_TAG, RFID_EAR_TAG, RFID_BOLUS, BRAND etc.), approved by, approval date, Gazette reference |
| `tag_bag` | UUID, bag_serial, aid_type, tag_count (25), first_tag_number, last_tag_number, manufacturer_uuid, created_at, status (MANUFACTURED, IN_TRANSIT, AT_NATIONAL_STORE, AT_REGIONAL, AT_DISTRICT, AT_FIELD_OFFICER, ALLOCATED, FULLY_ACTIVATED, COMPROMISED) |
| `tag_device` | UUID, tag_number (business key), bag_uuid, status (UNALLOCATED, ALLOCATED, ACTIVE, LOST, REPLACED, DEACTIVATED_AT_SLAUGHTER, COMPROMISED) |
| `custody_event` | UUID, bag_uuid, from_party_uuid, from_party_type, to_party_uuid, to_party_type, event_date, notes |
| `tag_allocation` | UUID, tag_device_uuid, owner_uuid, allocated_by_uuid, allocated_at |

### API Endpoints

| Method | Path | Description | Min. Role |
|---|---|---|---|
| POST | `/tags/aid-types` | Register a new approved AID type | SYSTEM_ADMIN |
| GET | `/tags/aid-types` | List approved AID types | Any authenticated |
| POST | `/tags/bags` | Create a new tag bag (manufacturer notification) | SYSTEM_ADMIN |
| POST | `/tags/bags/{bagId}/custody` | Record a custody transfer | REGIONAL_COORD or FIELD_OFFICER |
| GET | `/tags/bags/{bagId}` | Get bag detail and custody history | REGIONAL_COORD+ |
| POST | `/tags/bags/{bagId}/allocate` | Allocate bag or tags from bag to owner | FIELD_OFFICER |
| PUT | `/tags/{tagNumber}/activate` | Activate a tag on an animal | ANIMAL_REGISTRY (service-to-service) |
| PUT | `/tags/{tagNumber}/status` | Mark tag as LOST, REPLACED, or COMPROMISED | OWNER (self) or FIELD_OFFICER |
| GET | `/tags/{tagNumber}` | Look up a tag by number | Any authenticated |
| GET | `/tags/bags` | Search bags by status, region, custodian | REGIONAL_COORD+ |
| GET | `/tags/owner/{ownerId}` | List all tags allocated to an owner | OWNER (self) or INSPECTOR+ |

### Events Published

| Event | Trigger |
|---|---|
| `TagInventory.TagBag.Created` | Manufacturer notification received |
| `TagInventory.Custody.Transferred` | Bag moved between parties |
| `TagInventory.Tag.Allocated` | Tag(s) allocated to an owner |
| `TagInventory.Tag.Activated` | Tag activated on an animal |
| `TagInventory.Tag.Lost` | Tag reported lost |
| `TagInventory.Tag.Compromised` | Bag lost; all 25 numbers compromised |

### Events Consumed

None directly.

### Dependencies

- **owner-org-service** (validate owner UUID before allocation)
- **animal-registry-service** (service-to-service call to activate tag on animal)

### Scaling Needs

Bursts during distribution campaigns. Tag lookup is a hot path (called on every animal scan at market and abattoir). Read replicas recommended for `tag_device` table. Scale 2–8 replicas.

### Security Considerations

- Tag activation is a service-to-service call only (animal-registry-service); not callable by end users directly
- Compromised tag numbers trigger immediate alert to regional coordinator and inspector
- Manufacturer can only create bags; cannot update custody or allocate

---

## Service 5 — Animal Registry Service

**Service name:** `animal-registry-service`
**Database:** `somlits_animal`
**APIM prefix:** `/api/v1/animals/`

### Responsibility

The authoritative source for every livestock animal in Somalia. Manages animal identity, species, breed, birth details, tag assignments, current owner, current premises, and status. Maintains a complete, immutable history of ownership transfers and premises changes. No animal record is ever deleted; only status is changed.

### Owned Data

| Entity | Description |
|---|---|
| `animal` | UUID, primary_tag_number (business key), secondary_tag_number, species, breed, sex, approximate_dob, colour, distinguishing_marks, traditional_marks (JSONB), birth_premises_uuid, registration_date, registered_by_uuid, status |
| `animal_status` | PendingTag, Active, HealthRestricted, Quarantined, Dead, Slaughtered, Exported, Lost, Stolen |
| `animal_status_event` | UUID, animal_uuid, from_status, to_status, changed_by, occurred_at, reason, source_service, source_event_id |
| `animal_ownership_record` | UUID, animal_uuid, owner_uuid, from_date, to_date (null if current), transfer_reason, recorded_by |
| `animal_premises_record` | UUID, animal_uuid, premises_uuid, from_date, to_date (null if current), movement_permit_uuid |
| `animal_tag_record` | UUID, animal_uuid, tag_number, is_primary, applied_at, removed_at, removal_reason |

### API Endpoints

| Method | Path | Description | Min. Role |
|---|---|---|---|
| POST | `/animals` | Register a new animal | OWNER or FIELD_OFFICER |
| GET | `/animals/{id}` | Get animal detail (current snapshot) | Any authenticated |
| GET | `/animals/{id}/history` | Full ownership, premises, tag, status history | OWNER (self) or INSPECTOR+ |
| GET | `/animals/tag/{tagNumber}` | Look up animal by tag number | Any authenticated |
| POST | `/animals/{id}/tags` | Assign or replace a tag | OWNER (self) or FIELD_OFFICER |
| POST | `/animals/{id}/ownership-transfer` | Transfer ownership | OWNER (self) or FIELD_OFFICER |
| PUT | `/animals/{id}/status` | Change animal status (internal or vet/inspector) | DISTRICT_VET+ (for restrictions); OWNER for loss/theft |
| GET | `/animals` | Search animals by owner, premises, species, status | FIELD_OFFICER+ |
| POST | `/animals/batch` | Batch register a herd | FIELD_OFFICER |
| GET | `/animals/owner/{ownerId}` | List animals for an owner | OWNER (self) or INSPECTOR+ |
| GET | `/animals/premises/{premisesId}` | List animals currently at a premises | INSPECTOR+ |

### Events Published

| Event | Trigger |
|---|---|
| `AnimalRegistry.Animal.Registered` | New animal registered |
| `AnimalRegistry.Animal.Tagged` | Tag applied or replaced |
| `AnimalRegistry.Tag.Replaced` | Tag replacement recorded |
| `AnimalRegistry.Ownership.Transferred` | Owner changed |
| `AnimalRegistry.Premises.Changed` | Animal moved to a new premises (on movement confirmation) |
| `AnimalRegistry.Animal.StatusChanged` | Any status transition |

### Events Consumed

| Event | From | Action |
|---|---|---|
| `Movement.MovementPermit.Confirmed` | movement-service | Update animal's current premises to destination |
| `VeterinaryHealth.HealthRestriction.Imposed` | veterinary-health-service | Transition animal status to HealthRestricted |
| `VeterinaryHealth.HealthRestriction.Lifted` | veterinary-health-service | Restore animal status to Active |
| `QuarantineExport.QuarantineOrder.Raised` | quarantine-export-service | Transition in-scope animals to Quarantined |
| `QuarantineExport.QuarantineOrder.Lifted` | quarantine-export-service | Restore in-scope animals to Active or HealthRestricted |
| `Abattoir.Animal.Slaughtered` | abattoir-service | Transition animal status to Slaughtered |
| `QuarantineExport.Animal.Exported` | quarantine-export-service | Transition animal status to Exported |
| `TagInventory.Tag.Compromised` | tag-inventory-service | Flag animals with compromised tags for inspector review |

### Dependencies

- **owner-org-service** (validate owner UUID)
- **premises-service** (validate premises UUID)
- **tag-inventory-service** (activate tag on registration; activate replacement tag)
- **veterinary-health-service** (read health status for movement pre-check; consumed via events)
- **movement-service** (consumed via events to update premises)

### Scaling Needs

Highest write volume of all services. Birth registration campaigns can spike. Read replicas for search. Scale 3–10 replicas. Animal lookup by tag number is the hottest single endpoint in the system (called at every market scan and abattoir check).

### Security Considerations

- Owners can only see their own animals in full detail; tag number lookup returns limited public view
- Status changes to Dead, Stolen, Lost can be made by the owner; to HealthRestricted and Quarantined only by DISTRICT_VET or above
- Batch registration limited to 100 animals per request; 500 per day per field officer (fraud prevention)
- All status transitions are recorded with the actor UUID and source service; no orphan transitions

---

## Service 6 — Veterinary Health Service

**Service name:** `veterinary-health-service`
**Database:** `somlits_health`
**APIM prefix:** `/api/v1/health/`

### Responsibility

Records all veterinary health events against individual animals or batches. Manages vaccination campaigns. Handles health restrictions that block movement permits. Manages lab sample chain of custody and lab results. Raises disease alerts for OIE-notifiable diseases.

### Owned Data

| Entity | Description |
|---|---|
| `health_event` | UUID, animal_uuid or batch_id, event_type (ENUM), recorded_by_uuid, event_date, premises_uuid, description, notes |
| `health_event_type` | VACCINATION, CLINICAL_EXAM, DISEASE_DIAGNOSIS, TREATMENT, LAB_SAMPLE_TAKEN, LAB_RESULT_RECEIVED, DEATH_ON_FARM |
| `vaccination_campaign` | UUID, name, vaccine_type, vaccine_batch, manufacturer, expiry_date, target_species, target_region, start_date, end_date, status |
| `vaccination_event` | UUID, campaign_uuid, animal_uuid or batch_id, vaccinator_uuid, date, dose_ml, premises_uuid |
| `lab_sample` | UUID, collected_by_uuid, collection_date, animal_uuid or batch_id, premises_uuid, disease_suspected, sample_type, lab_uuid, received_at_lab, status |
| `lab_result` | UUID, sample_uuid, lab_name, test_type, result (POSITIVE/NEGATIVE/INCONCLUSIVE), pathogen (if positive), report_date, report_document_blob_ref |
| `health_restriction` | UUID, restriction_type (ANIMAL/PREMISES/ZONE), target_uuid, imposed_by_uuid, imposed_at, reason, lifted_by_uuid, lifted_at, is_active |

### API Endpoints

| Method | Path | Description | Min. Role |
|---|---|---|---|
| POST | `/health/events` | Record a health event | DISTRICT_VET or CAHW |
| GET | `/health/events/animal/{animalId}` | Health history for an animal | OWNER (self) or DISTRICT_VET+ |
| POST | `/health/campaigns` | Create a vaccination campaign | REGIONAL_COORD+ |
| PUT | `/health/campaigns/{id}/status` | Open, close, or complete a campaign | REGIONAL_COORD+ |
| GET | `/health/campaigns` | List campaigns by region, species, status | FIELD_OFFICER+ |
| POST | `/health/vaccinations` | Record a vaccination event | DISTRICT_VET or CAHW |
| GET | `/health/vaccinations/campaign/{campaignId}` | List vaccinations under a campaign | REGIONAL_COORD+ |
| POST | `/health/lab-samples` | Create a lab sample request | DISTRICT_VET or INSPECTOR |
| PUT | `/health/lab-samples/{id}/result` | Record a lab result | SYSTEM (lab integration) or DISTRICT_VET |
| POST | `/health/restrictions` | Impose a health restriction | DISTRICT_VET+ |
| DELETE | `/health/restrictions/{id}` | Lift a health restriction | DISTRICT_VET+ |
| GET | `/health/restrictions` | List active restrictions by area | FIELD_OFFICER+ |
| GET | `/health/animals/{id}/restricted` | Is this animal currently restricted? | Any authenticated |

### Events Published

| Event | Trigger |
|---|---|
| `VeterinaryHealth.HealthEvent.Recorded` | Any health event created |
| `VeterinaryHealth.Campaign.Completed` | Campaign status set to COMPLETED |
| `VeterinaryHealth.HealthRestriction.Imposed` | New health restriction created |
| `VeterinaryHealth.HealthRestriction.Lifted` | Health restriction lifted |
| `VeterinaryHealth.LabResult.Received` | Lab result recorded |
| `VeterinaryHealth.Disease.OIENotifiable` | Lab result positive for an OIE-listed disease |

### Events Consumed

None; health-service is a producer. It is consulted synchronously by movement-service before permit issuance.

### Dependencies

- **animal-registry-service** (validate animal UUID)
- **premises-service** (validate premises UUID)
- **certification-service** (generate vaccination certificates)
- **National Veterinary Lab LIMS** (external; lab result webhook or polling)

### Scaling Needs

Spikes during vaccination campaigns and disease outbreaks. Campaign event recording may be high-volume. Scale 2–8 replicas; campaign batch endpoints should be async.

### Security Considerations

- Lab results containing OIE-notifiable disease confirmation trigger an immediate high-priority alert and cannot be deleted or modified after recording
- Health restriction lifting requires two-factor confirmation: the imposing officer or their supervisor must approve
- CAHW can record vaccinations and basic health observations but cannot impose health restrictions (DISTRICT_VET minimum)

---

## Service 7 — Movement Service

**Service name:** `movement-service`
**Database:** `somlits_movement`
**APIM prefix:** `/api/v1/movements/`

### Responsibility

Manages the full lifecycle of movement permits: application, eligibility validation, issuance, endorsement at destination, confirmation, expiry, and return. Checks all Art. 21(4) conditions before issuance. Records animal movement notices. Manages walking permits for pastoral grazing.

### Owned Data

| Entity | Description |
|---|---|
| `movement_permit` | UUID, permit_number (human readable), applicant_uuid, owner_uuid, origin_premises_uuid, destination_premises_uuid, applied_at, issued_at, valid_until, status, idempotency_key |
| `movement_permit_status` | PENDING, ISSUED, REJECTED, IN_TRANSIT, CONFIRMED, EXPIRED, RETURNED |
| `animal_movement_notice` | UUID, permit_uuid, animal_uuid, tag_number — list of animals on the permit |
| `permit_condition` | UUID, permit_uuid, condition_type, description |
| `movement_confirmation` | UUID, permit_uuid, confirmed_by_uuid, confirmed_at, destination_confirmed |
| `walking_permit` | UUID, owner_uuid, premises_uuid, grazing_area_description, issued_by_uuid, valid_from, valid_until |
| `permit_eligibility_check_log` | UUID, permit_uuid, check_type, check_result, checked_at, details (JSONB) |

### API Endpoints

| Method | Path | Description | Min. Role |
|---|---|---|---|
| POST | `/movements/permits` | Apply for a movement permit | OWNER or delegate |
| GET | `/movements/permits/{id}` | Get permit detail | OWNER (self) or FIELD_OFFICER+ |
| PUT | `/movements/permits/{id}/confirm` | Confirm receipt at destination | OWNER or delegate at destination |
| PUT | `/movements/permits/{id}/return` | Return unused permit | OWNER or FIELD_OFFICER |
| GET | `/movements/permits` | Search permits by owner, premises, status | FIELD_OFFICER+ |
| GET | `/movements/permits/{id}/eligibility` | Re-run eligibility check (pre-issuance review) | FIELD_OFFICER+ |
| PUT | `/movements/permits/{id}/approve` | Approve and issue permit | DISTRICT_LITS_OFFICER+ |
| PUT | `/movements/permits/{id}/reject` | Reject permit application | DISTRICT_LITS_OFFICER+ |
| POST | `/movements/walking-permits` | Issue a walking permit | FIELD_OFFICER |
| GET | `/movements/walking-permits/{id}` | Get walking permit | OWNER (self) or FIELD_OFFICER+ |

### Events Published

| Event | Trigger |
|---|---|
| `Movement.MovementPermit.Applied` | Application submitted |
| `Movement.MovementPermit.Issued` | Permit approved and issued |
| `Movement.MovementPermit.Rejected` | Application rejected |
| `Movement.MovementPermit.Confirmed` | Movement confirmed at destination |
| `Movement.MovementPermit.Expired` | Permit validity period elapsed without confirmation |
| `Movement.MovementPermit.Returned` | Unused permit returned |

### Events Consumed

| Event | From | Action |
|---|---|---|
| `VeterinaryHealth.HealthRestriction.Imposed` | veterinary-health-service | Mark affected premises/animals as restricted in local cache |
| `VeterinaryHealth.HealthRestriction.Lifted` | veterinary-health-service | Remove restriction from local cache |
| `QuarantineExport.QuarantineOrder.Raised` | quarantine-export-service | Mark quarantine zones in local cache; block permits |
| `QuarantineExport.QuarantineOrder.Lifted` | quarantine-export-service | Remove quarantine block |
| `Premises.Premises.Suspended` | premises-service | Invalidate any pending permits referencing the premises |
| `Premises.Premises.Closed` | premises-service | Invalidate pending permits |

### Eligibility Check Logic (pre-permit-issuance)

1. Animal bears an approved AID — query tag-inventory-service
2. Origin premises Active — query premises-service
3. Destination premises Active (or foreign export) — query premises-service
4. No health restriction on origin or destination premises — query veterinary-health-service
5. Animal not health-restricted — check animal status via animal-registry-service
6. No active quarantine order covering origin or destination — check movement-service local cache (populated via events)
7. Applicant is owner or has valid delegate grant — query owner-org-service
8. All previous permits for destination accounted for — internal query
9. Animal status is Active — query animal-registry-service

All checks must pass. Any failure results in permit rejection with specific reason codes returned to the applicant.

### Scaling Needs

Seasonal peaks at market season and Eid (pre-Eid movement surge for slaughter animals). Scale 2–10 replicas; eligibility checks involve multiple synchronous calls — keep p95 < 2 seconds.

### Security Considerations

- Idempotency key required on all permit applications to prevent duplicate permits during mobile retry
- Walking permits cannot be issued by owners; FIELD_OFFICER minimum
- Emergency movement exempt from permit; must submit retrospective notification within 48 hours

---

## Service 8 — Market and Trade Service

**Service name:** `market-trade-service`
**Database:** `somlits_market`
**APIM prefix:** `/api/v1/markets/`

### Responsibility

Manages the registration and operation of livestock markets (animal gatherings). Handles market sessions, animal check-in and check-out via tag scan, and electronic notification to the Authority of all movements within two working days. Detects animals arriving without a movement permit or a valid tag.

### Owned Data

| Entity | Description |
|---|---|
| `market` | UUID, premises_uuid (FK to premises), name, market_type (PERMANENT/PERIODIC/EXPORT_ASSEMBLY), schedule (JSONB), operator_uuid, status |
| `market_session` | UUID, market_uuid, session_date, opened_at, closed_at, status (OPEN/CLOSED/NOTIFIED) |
| `market_arrival` | UUID, session_uuid, animal_uuid, tag_number, movement_permit_uuid, arrived_at, checked_in_by |
| `market_departure` | UUID, session_uuid, animal_uuid, tag_number, destination_premises_uuid, movement_permit_uuid, departed_at, checked_out_by |
| `untagged_incident` | UUID, session_uuid, description, action_taken (RETURN_PERMIT_ISSUED / DETAINED), resolved_at |

### API Endpoints

| Method | Path | Description | Min. Role |
|---|---|---|---|
| POST | `/markets` | Register a market | FIELD_OFFICER |
| GET | `/markets/{id}` | Get market detail | Any authenticated |
| POST | `/markets/{id}/sessions` | Open a market session | MARKET_OPERATOR or FIELD_OFFICER |
| PUT | `/markets/{id}/sessions/{sessionId}/close` | Close a session | MARKET_OPERATOR or FIELD_OFFICER |
| POST | `/markets/{id}/sessions/{sessionId}/arrivals` | Record animal check-in (tag scan or manual) | MARKET_OPERATOR or FIELD_OFFICER |
| POST | `/markets/{id}/sessions/{sessionId}/departures` | Record animal check-out | MARKET_OPERATOR or FIELD_OFFICER |
| GET | `/markets/{id}/sessions/{sessionId}/manifest` | Get arrival + departure manifest | MARKET_OPERATOR or INSPECTOR+ |
| POST | `/markets/{id}/sessions/{sessionId}/notify` | Submit electronic notification to Authority | MARKET_OPERATOR or FIELD_OFFICER |
| GET | `/markets/{id}/sessions` | List sessions for a market | FIELD_OFFICER+ |

### Events Published

| Event | Trigger |
|---|---|
| `MarketTrade.Session.Opened` | Market session opened |
| `MarketTrade.Animal.CheckedIn` | Animal scanned in at market |
| `MarketTrade.Animal.CheckedOut` | Animal checked out |
| `MarketTrade.Session.NotificationSubmitted` | Electronic notification sent to Authority |
| `MarketTrade.Session.Closed` | Session closed |

### Events Consumed

None directly; consults movement-service to validate permits on check-in.

### Dependencies

- **premises-service** (market must be a registered premises of type MARKET)
- **animal-registry-service** (validate tag number on check-in)
- **movement-service** (validate incoming movement permit)

### Scaling Needs

Extreme spikes on market day (all arrivals within 2 hours). Offline queueing in Field app critical here. Scale 2–12 replicas on market days; scale-to-zero overnight.

### Security Considerations

- Animals without a valid incoming movement permit are logged as incidents; market operator cannot approve them; FIELD_OFFICER must intervene
- Check-in and check-out are idempotent; duplicate scans are detected and ignored

---

## Service 9 — Quarantine and Export Service

**Service name:** `quarantine-export-service`
**Database:** `somlits_quarantine`
**APIM prefix:** `/api/v1/quarantine/` and `/api/v1/exports/`

### Responsibility

**Quarantine:** Issues and manages quarantine orders affecting animals, premises, or geographic zones. Integrates with the movement service to block permits within active quarantine scope.

**Export:** Manages live-animal export consignments from consignment creation through pre-export quarantine, AHC request, exit declaration, and border crossing confirmation. Records the exit of each animal from Somalia.

### Owned Data

| Entity | Description |
|---|---|
| `quarantine_order` | UUID, order_number, issued_by_uuid, scope_type (ANIMAL/PREMISES/GPS_RADIUS/ADMIN_BOUNDARY), scope_definition (JSONB), reason, disease_suspected, raised_at, expected_duration_days, lifted_at, lifted_by_uuid, status |
| `quarantine_animal` | UUID, quarantine_order_uuid, animal_uuid — link table for animal-scope orders |
| `quarantine_premises` | UUID, quarantine_order_uuid, premises_uuid — link table for premises-scope orders |
| `export_consignment` | UUID, consignment_number, exporter_uuid, destination_country, destination_market, species, animal_count, origin_premises_uuid, export_holding_premises_uuid, created_at, status |
| `export_animal` | UUID, consignment_uuid, animal_uuid, tag_number |
| `pre_export_quarantine` | UUID, consignment_uuid, station_premises_uuid, start_date, end_date, supervising_vet_uuid, cleared |
| `exit_declaration` | UUID, consignment_uuid, declared_by_uuid, declared_at, border_post_premises_uuid, departure_date |

### API Endpoints

**Quarantine:**

| Method | Path | Description | Min. Role |
|---|---|---|---|
| POST | `/quarantine/orders` | Raise a quarantine order | DISTRICT_VET+ |
| GET | `/quarantine/orders/{id}` | Get quarantine order detail | FIELD_OFFICER+ |
| PUT | `/quarantine/orders/{id}/lift` | Lift quarantine order | DISTRICT_VET+ |
| GET | `/quarantine/orders` | List active quarantine orders | FIELD_OFFICER+ |
| GET | `/quarantine/orders/check` | Is a premises/animal currently quarantined? | movement-service (service-to-service) |

**Export:**

| Method | Path | Description | Min. Role |
|---|---|---|---|
| POST | `/exports/consignments` | Create export consignment | EXPORTER or FIELD_OFFICER |
| GET | `/exports/consignments/{id}` | Get consignment detail | EXPORTER (self) or INSPECTOR+ |
| POST | `/exports/consignments/{id}/animals` | Add animals to consignment | EXPORTER (self) |
| POST | `/exports/consignments/{id}/pre-export-quarantine` | Record pre-export quarantine | DISTRICT_VET |
| POST | `/exports/consignments/{id}/exit-declaration` | Submit exit declaration | EXPORTER or BORDER_INSPECTOR |
| PUT | `/exports/consignments/{id}/confirm-exit` | Confirm border crossing | BORDER_INSPECTOR |
| GET | `/exports/consignments` | List consignments by exporter, country, status | EXPORTER (self) or INSPECTOR+ |

### Events Published

| Event | Trigger |
|---|---|
| `QuarantineExport.QuarantineOrder.Raised` | New quarantine order issued |
| `QuarantineExport.QuarantineOrder.Lifted` | Quarantine lifted |
| `QuarantineExport.Consignment.Created` | Export consignment created |
| `QuarantineExport.Consignment.ExitDeclared` | Exit declaration submitted |
| `QuarantineExport.Animal.Exported` | Border crossing confirmed for each animal |

### Events Consumed

| Event | From | Action |
|---|---|---|
| `VeterinaryHealth.Disease.OIENotifiable` | veterinary-health-service | Auto-raise quarantine order for affected premises |
| `VeterinaryHealth.LabResult.Received` | veterinary-health-service | Evaluate need for quarantine expansion |

### Dependencies

- **animal-registry-service** (validate animals in consignment; receive status updates)
- **premises-service** (validate quarantine station and border post)
- **veterinary-health-service** (pre-export health status check)
- **certification-service** (request AHC for consignment)
- **movement-service** (block permits in quarantine scope)

### Scaling Needs

Quarantine: low baseline; spikes during disease outbreaks. Export: seasonal peak (Eid, dry season). 2–6 replicas.

### Security Considerations

- Quarantine order lifting requires the same DISTRICT_VET level; cannot be lifted by CAHW or FIELD_OFFICER
- Export consignment animals cannot overlap with active quarantine; system enforces this at consignment creation
- Exit confirmation only by BORDER_INSPECTOR role; prevents false closure of export records

---

## Service 10 — Abattoir Service

**Service name:** `abattoir-service`
**Database:** `somlits_abattoir`
**APIM prefix:** `/api/v1/abattoirs/`

### Responsibility

Manages animal slaughter at registered abattoirs. Runs the mandatory pre-slaughter eligibility check against the central database. Records slaughter events, AID removal, carcass marking for traceability, and Halal slaughter declaration for export abattoirs.

### Owned Data

| Entity | Description |
|---|---|
| `slaughter_session` | UUID, abattoir_premises_uuid, session_date, opened_by_uuid, closed_at |
| `pre_slaughter_check` | UUID, session_uuid, animal_uuid, tag_number, check_result (CLEARED/BLOCKED), health_status, origin_premises, movement_history_ok, eligibility_notes, checked_at |
| `slaughter_event` | UUID, session_uuid, animal_uuid, tag_number, slaughtered_at, slaughterman_uuid, halal_compliant, carcass_label_id, movement_permit_uuid |
| `carcass_label` | UUID, slaughter_event_uuid, label_number, label_format (QR/BARCODE), applied_at, traceability_link |
| `abattoir_termination_notice` | UUID, slaughter_event_uuid, submitted_to_lits_officer_uuid, submitted_at |

### API Endpoints

| Method | Path | Description | Min. Role |
|---|---|---|---|
| POST | `/abattoirs/sessions` | Open a slaughter session | ABATTOIR_OPERATOR |
| PUT | `/abattoirs/sessions/{id}/close` | Close a slaughter session | ABATTOIR_OPERATOR |
| POST | `/abattoirs/sessions/{id}/pre-slaughter-check` | Run eligibility check for an animal | ABATTOIR_OPERATOR |
| POST | `/abattoirs/sessions/{id}/slaughter-events` | Record a slaughter event | ABATTOIR_OPERATOR |
| GET | `/abattoirs/sessions/{id}/manifest` | Get slaughter session manifest | ABATTOIR_OPERATOR or INSPECTOR+ |
| POST | `/abattoirs/sessions/{id}/notify-lits` | Submit slaughter notification to LITS officer | ABATTOIR_OPERATOR |
| GET | `/abattoirs/slaughter-events/{id}` | Get slaughter event detail | INSPECTOR+ |
| GET | `/abattoirs/carcass/{labelId}` | Trace-back from carcass label to live animal | INSPECTOR+ |

### Events Published

| Event | Trigger |
|---|---|
| `Abattoir.Animal.Slaughtered` | Slaughter event recorded |
| `Abattoir.CarcassLabel.Applied` | Carcass label generated |

### Events Consumed

None directly; checks animal-registry-service and veterinary-health-service synchronously during pre-slaughter check.

### Dependencies

- **animal-registry-service** (pre-slaughter check; status update on slaughter)
- **veterinary-health-service** (health status for eligibility)
- **movement-service** (verify incoming movement permit)
- **premises-service** (abattoir must be a registered facility)

### Scaling Needs

Extreme Eid spike (up to 10× normal volume over 3 days). Pre-slaughter check response time must be < 1 second. Scale 2–15 replicas; auto-scale aggressively before Eid.

### Security Considerations

- Slaughter records are immutable once created; only a SYSTEM_ADMIN correction workflow (with full audit trail) can amend obvious errors
- Halal compliance field is mandatory for export abattoir sessions; system blocks session close without all slaughter events having Halal flag set

---

## Service 11 — Certification Service

**Service name:** `certification-service`
**Database:** `somlits_certification`
**APIM prefix:** `/api/v1/certificates/`

### Responsibility

Generates, manages, and revokes all certificates issued by SOMLITS: Animal Health Certificates (AHC), premises registration certificates, compliance inspection certificates, and vaccination certificates. Stores certificate PDFs in Azure Blob Storage. Produces QR-coded certificates for digital verification.

### Owned Data

| Entity | Description |
|---|---|
| `certificate` | UUID, certificate_type (AHC/PREMISES_REGISTRATION/COMPLIANCE/VACCINATION), serial_number, issued_to_uuid, issued_by_uuid, issued_at, valid_until, status (VALID/REVOKED/EXPIRED), blob_reference, qr_code_payload |
| `ahc_detail` | UUID, certificate_uuid, consignment_uuid, destination_country, destination_market, species, animal_count, animal_tag_numbers (JSONB), health_declaration (JSONB), vaccination_summary (JSONB), quarantine_record (JSONB), halal_declaration, country_specific_fields (JSONB) |
| `certificate_revocation` | UUID, certificate_uuid, revoked_by_uuid, revoked_at, reason |

### API Endpoints

| Method | Path | Description | Min. Role |
|---|---|---|---|
| POST | `/certificates/ahc` | Issue an AHC for a consignment | DISTRICT_VET+ |
| POST | `/certificates/premises-registration` | Generate premises registration certificate | SYSTEM (from premises-service) |
| POST | `/certificates/compliance` | Generate compliance certificate after inspection | INSPECTOR |
| POST | `/certificates/vaccination` | Generate vaccination certificate | DISTRICT_VET or CAHW |
| GET | `/certificates/{id}` | Get certificate metadata | OWNER (self) or INSPECTOR+ |
| GET | `/certificates/{id}/download` | Download PDF (returns SAS URL) | OWNER (self) or INSPECTOR+ |
| PUT | `/certificates/{id}/revoke` | Revoke a certificate | DISTRICT_VET+ |
| GET | `/certificates/verify/{serial}` | Public verification (QR scan) — returns valid/invalid only | Public (no auth) |

### Events Published

| Event | Trigger |
|---|---|
| `Certification.AHC.Issued` | AHC issued |
| `Certification.Certificate.Issued` | Any certificate issued |
| `Certification.Certificate.Revoked` | Certificate revoked |

### Events Consumed

| Event | From | Action |
|---|---|---|
| `Premises.Premises.Approved` | premises-service | Auto-generate premises registration certificate |

### Dependencies

- **quarantine-export-service** (AHC linked to consignment)
- **veterinary-health-service** (vaccination data for AHC)
- **Azure Blob Storage** (store and retrieve PDF certificates)
- **premises-service** (premises details for registration certificate)

### Scaling Needs

Low baseline; export season spikes. 2–4 replicas. PDF generation is CPU-intensive; keep PDF generation async.

### Security Considerations

- AHC can only be issued by DISTRICT_VET or higher — the signing veterinary officer's name and registration number appear on the certificate
- The public verification endpoint (`/certificates/verify/{serial}`) returns only valid/invalid; it never returns certificate content, preventing data scraping
- Certificate PDFs stored with customer-managed encryption keys in Key Vault

---

## Service 12 — Notification Service

**Service name:** `notification-service`
**Database:** `somlits_notification`
**APIM prefix:** None (event-driven only; no public API)

### Responsibility

Dispatches SMS, in-app push, and email notifications to relevant actors based on domain events consumed from Azure Service Bus. Manages notification templates in Somali and English. Handles retry with exponential back-off. Records every notification attempt and outcome for the Ministry Platform operations screen.

### Owned Data

| Entity | Description |
|---|---|
| `notification_template` | UUID, event_type, channel (SMS/PUSH/EMAIL), language (SO/EN), subject (email only), body_template (Handlebars), is_active |
| `notification_preference` | UUID, user_uuid, channel_preferences (JSONB), language_preference, opted_out_types (JSONB array) |
| `notification_log` | UUID, event_type, recipient_uuid, channel, status (SENT/FAILED/RETRYING), sent_at, failure_reason, retry_count, message_id (gateway reference) |

### Events Consumed

All events from all services via dedicated subscriptions on each topic. Template matching is by event_type.

### Dependencies

- **SMS gateway** (Africa's Talking or equivalent; configured via Key Vault secret)
- **Firebase Cloud Messaging** or **Azure Notification Hubs** for push
- **SMTP relay** (Azure Communication Services) for email
- **owner-org-service** (look up recipient phone and email for owner-targeted events)

### Scaling Needs

Burst-driven; matches event bus volume. Disease alert broadcasts to thousands of owners simultaneously. Scale 1–20 replicas. SMS delivery is external-bound; implement circuit breaker for gateway failures.

### Security Considerations

- Service has no inbound public API; it only consumes events
- Phone numbers and emails in notification logs are masked after 30 days (retain last 4 digits only)
- SMS content never includes sensitive animal data; uses references ("your animal [last 4 of tag] has been...") only

---

## Service 13 — Reporting and Traceability Service

**Service name:** `reporting-traceability-service`
**Database:** `somlits_reporting`
**APIM prefix:** `/api/v1/reports/` and `/api/v1/trace/`

### Responsibility

Provides a read-optimised CQRS projection of all animal events, enabling instant trace-back and trace-forward queries without hitting the transactional databases of other services. Also generates all Ministry and operational reports. This service is eventually consistent — it receives events via Service Bus and builds its read model asynchronously.

### Owned Data

| Entity | Description |
|---|---|
| `animal_trace_event` | UUID, animal_uuid, event_type, event_source_service, occurred_at, actor_uuid, entity_snapshot (JSONB — full event payload) |
| `animal_trace_summary` | UUID, animal_uuid, current_status, current_owner_uuid, current_premises_uuid, primary_tag_number, species, last_event_at |
| `report_definition` | UUID, name, type (CENSUS/MOVEMENT/VACCINATION/DISEASE/EXPORT/SLAUGHTER/MORTALITY), parameters (JSONB), schedule (cron expression or null), created_by |
| `report_result` | UUID, definition_uuid, generated_at, generated_by_uuid, status (IN_PROGRESS/COMPLETE/FAILED), blob_reference |

### API Endpoints

| Method | Path | Description | Min. Role |
|---|---|---|---|
| GET | `/trace/animals/{id}/trace-back` | Full trace-back for one animal | INSPECTOR+ |
| POST | `/trace/animals/{id}/trace-forward` | Trace-forward from animal (body: disease, time_window_days) | DISTRICT_VET+ |
| GET | `/trace/animals/{id}/summary` | Quick current snapshot | OWNER (self) or FIELD_OFFICER+ |
| GET | `/trace/tag/{tagNumber}` | Look up animal by tag in trace model | Any authenticated |
| POST | `/reports` | Create a report definition | REGIONAL_COORD+ |
| POST | `/reports/{id}/run` | Run a report | REGIONAL_COORD+ |
| GET | `/reports/{id}/results` | List results for a report | REGIONAL_COORD+ |
| GET | `/reports/{id}/results/{resultId}/download` | Download report (SAS URL to blob) | REGIONAL_COORD+ |
| GET | `/reports/national-dashboard` | Key metrics for Ministry dashboard | CVO+ |

### Events Consumed

All events from all topics. The service builds and updates `animal_trace_event` and `animal_trace_summary` from every event that contains an `animal_uuid`.

### Dependencies

- **Azure Blob Storage** (store generated report files)
- All other services (read model built from their events; no synchronous calls)

### Scaling Needs

Read-heavy. Trace-back and trace-forward can be expensive for animals with long histories. Read replicas on `somlits_reporting`. Scale 2–8 replicas; report generation is async and can be queued.

### Security Considerations

- Trace-forward query results must not be visible to owners (reveals disease investigation intelligence); DISTRICT_VET+ minimum
- Owners can only see their own animals' trace summaries
- Reports containing national statistics must be reviewed by CVO before external sharing; system flags reports as "pending CVO review" before download is enabled

---

## Service 14 — Audit Service

**Service name:** `audit-service`
**Database:** `somlits_audit`
**APIM prefix:** `/api/v1/audit/`

### Responsibility

Maintains the immutable, tamper-evident audit log of every data change across SOMLITS. Every write operation in every service publishes an audit event to the Service Bus; this service appends it to the audit log. No record in `somlits_audit` is ever updated or deleted. The log is retained for 10 years minimum.

### Owned Data

| Entity | Description |
|---|---|
| `audit_event` | UUID, event_id (from message envelope), source_service, event_type, actor_uuid, actor_role, entity_type, entity_uuid, occurred_at (UTC), received_at (UTC), previous_state (JSONB), new_state (JSONB), correlation_id, ip_address |

### API Endpoints

| Method | Path | Description | Min. Role |
|---|---|---|---|
| GET | `/audit/events` | Search audit log by entity, actor, event type, date range | INSPECTOR+ |
| GET | `/audit/events/{id}` | Get a single audit event | INSPECTOR+ |
| GET | `/audit/entities/{entityType}/{entityId}` | Full audit history for one entity | INSPECTOR+ |
| GET | `/audit/actors/{actorId}` | All actions by a specific user | SYSTEM_ADMIN |

### Events Consumed

All events from all topics (dedicated subscription per topic). Every message received is appended to `audit_event`. The service must never reject a valid message; on processing error it goes to DLQ for manual investigation.

### Dependencies

None. Audit service is a pure consumer; it has no outbound API calls.

### Scaling Needs

High write throughput; append-only. Partition `audit_event` table by `occurred_at` year-month. Use PostgreSQL BRIN indexes for time-range queries. Scale 2–6 replicas.

### Security Considerations

- No record in `somlits_audit` may be modified or deleted by any user or service
- The audit endpoint is restricted to INSPECTOR+ for general queries; SYSTEM_ADMIN for actor-specific queries
- Any attempt to update or delete an audit record triggers an immediate critical alert
- `somlits_audit` database has a dedicated read-only service account; no write account is used by the API layer (all writes are through the event consumer)

---

STEP COMPLETE — awaiting approval before continuing.
