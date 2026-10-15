# SOMLITS Domain Scope

**Version:** 0.1 — Draft for Review
**Date:** 2026-07-18
**Status:** Awaiting Ministry Approval

Classification key used throughout this document:
- **[A]** Supported by the IGAD Model Legal Framework for LITS (2016)
- **[B]** Proposed SOMLITS business rule
- **[C]** Requires Somalia Ministry confirmation before implementation

---

## 1. Purpose

Somalia Livestock Identification and Traceability System (SOMLITS) is the national government platform for managing the identification, registration, movement, health, and traceability of livestock in Somalia. It implements Somalia's obligations under the IGAD Model Legal Framework for Livestock Identification and Traceability System (IGAD LITS, 2016).

| Objective | IGAD Art. | Class |
|---|---|---|
| Proof of animal ownership | Art. 3(a) | A |
| Animal health and disease surveillance | Art. 3(b) | A |
| Anti-cattle-rustling and human security | Art. 3(c) | A |
| Food safety through traceability | Art. 3(d) | A |
| Livestock market assurance and export certification | Art. 3(e) | A |
| Birth-to-death / farm-to-table traceability | Art. 3(f) | A |
| Compliance with regional LITS harmonisation | Art. 3(g) | A |

---

## 2. Geographic and Legal Scope

| Item | Value | Class |
|---|---|---|
| Country | Federal Republic of Somalia | A |
| Administering authority | Ministry of Livestock, Forestry and Range (or designated CVO/DVS) | C |
| Legal basis | Somalia LITS Act (to be enacted, based on IGAD LITS framework) | C |
| Regional framework | IGAD Model Legal Framework for LITS (2016) | A |
| Regional coordinator | ICPALD (IGAD Centre for Pastoral Areas and Livestock Development) | A |
| Rollout approach | Phased national rollout; pilot region first | C |

---

## 3. Species in Scope

| Species | IGAD Coverage | SOMLITS Scope | Class |
|---|---|---|---|
| Cattle (bovine) | Art. 30 | In scope | A |
| Sheep | Art. 31 | In scope | A |
| Goats | Art. 31 | In scope | A |
| Camels | Art. 2 (definition of livestock) | In scope | A |
| Pigs | Art. 32 | Not applicable in Somalia context | C |
| Donkeys / equines | Not covered in IGAD framework | To be confirmed | C |
| Poultry | Not covered in IGAD framework | Out of scope initially | C |

> **[C]** The Minister must formally confirm which species are covered under the Somalia LITS Act by Gazette notice.

---

## 4. Functional Modules

### 4.1 Owner Registration

Every person or organisation that owns livestock must be registered in SOMLITS before registering animals, requesting tags, or submitting movement permits.

| Requirement | IGAD Art. | Class |
|---|---|---|
| Every owner must register personal identity particulars on the central database | Art. 10(3)(a) | A |
| Owner categories must be captured: farmer (private/commercial), agent, importer/exporter, transporter, cross-border dealer, meat processor | Art. 10(3)(a) | A |
| Owner assigned a unique owner code that appears in animal identification numbers | Art. 28(2)(a) | A |
| Owner can register via mobile phone or digital channel | Art. 14(2)(c) | A |
| Owner registration must be renewed at intervals specified by the Minister | Art. 11(3) | A |
| Owner registration renewal interval: every 2 years | — | C |
| Biometric identity verification of owner at registration | — | B |
| Owner profile includes: phone, address, GPS location of primary premises | — | B |

---

### 4.2 Owner Employees and Delegated Access

An owner may authorise employees (herdsmen, farm managers) or agents (veterinary officers, transporters) to act on their behalf in SOMLITS.

| Requirement | IGAD Art. | Class |
|---|---|---|
| Owner definition includes "agent of the owner" | Art. 2 | A |
| An agent may apply for movement permits on behalf of the owner | Art. 21(2) | A |
| Agent must be duly authorised by the owner in writing | Art. 21(4)(d) | A |
| Owner can grant and revoke delegated access through the system | — | B |
| Delegated access is role-scoped: read-only, operator, or full-access | — | B |
| Every action taken by a delegate is recorded in the audit trail, attributed to the delegate and the owner | — | B |
| No sub-delegation: a delegate cannot grant further delegation | — | B |

---

### 4.3 Premises Registration

Every location where livestock is kept must be registered as a facility (premises) in SOMLITS. No movement permit may be issued from or to an unregistered or suspended premises.

| Requirement | IGAD Art. | Class |
|---|---|---|
| Every facility where animals are kept must be registered | Art. 10(2), Art. 21(4)(a) | A |
| A certificate of LITS registered facility is issued upon approval | Art. 2 (Facility definition) | A |
| Facility types: farm, pastoral grazing area, transit facility, market, abattoir, quarantine station, border inspection post, export holding facility | Art. 2, Art. 21 | A |
| Premises assigned a unique Premises Code under the national numbering scheme | Art. 26(1) | A |
| GPS coordinates recorded for each premises | — | B |
| Premises status lifecycle: Pending, Active, Suspended, Closed | Art. 21(4)(b) | A |
| A movement permit cannot be issued if origin or destination premises is Suspended or Closed | Art. 21(4)(b) | A |
| Multiple premises may be registered under one owner | Art. 18(5) | A |
| Sub-national LITS offices are authorised to register premises | Art. 12(2)(b) | A |
| Premises renewal interval | — | C |

---

### 4.4 Tag Management — Bags, Custody, and Distribution

Animal Identification Devices (AIDs) — primarily ear tags — are manufactured, approved, distributed in numbered bags, and allocated to owners. Every tag is tracked from manufacture to application or loss.

| Requirement | IGAD Art. | Class |
|---|---|---|
| The Minister approves the identification system and device type | Art. 26(1), Art. 27(1) | A |
| Approved ear tags must be durable, two-part (male and female), indelible, and certified | Art. 28(1) | A |
| Each tag bears a unique identification number or code allocated by the Authority | Art. 29(1)(b) | A |
| Manufacturer/distributor must notify the Authority within 48 hours of supplying tags, listing tag codes and recipient details | Art. 29(2) | A |
| Authority notifies the DB Administrator of all supplied tags | Art. 29(4) | A |
| Unused tags must be kept secure; loss must be reported immediately | Art. 37 | A |
| Tags grouped into bags of 25 sequential tag numbers for distribution and tracking | — | B |
| Each tag bag issued a unique bag serial number | — | B |
| Bag custody chain tracked: Manufacturer → National Store → Regional Office → Field Officer → Owner | — | B |
| Every bag transfer is a recorded custody event: timestamp, sender, receiver, bag serial | — | B |
| A lost bag triggers flagging of all 25 tag numbers as compromised | — | B |
| Approved device type(s) for Somalia | Art. 27(2), First Schedule | C |
| National coding scheme design | Art. 26(1) | C |

---

### 4.5 Animal Registration

Every livestock animal must be individually identified with an approved AID and registered on the central database.

| Requirement | IGAD Art. | Class |
|---|---|---|
| Every animal born must be tagged within 7 days of birth or before leaving the facility, whichever is sooner | Art. 30(3), Art. 31(2) | A |
| Animal registered on central database after tagging | Art. 16(1) | A |
| Imported animals tagged within 14 days of entry; registered within 7 days of tagging | Art. 17(1) | A |
| Cattle: primary ear tag on left ear; secondary ear tag on right ear | Art. 30(2) | A |
| Sheep and goats: at least one approved device | Art. 31(1) | A |
| Camel ear tag placement | — | C |
| Registration data: species, breed, sex, date of birth, colour, distinguishing marks, dam ID (if known), sire ID (if known), owner, premises, tag code(s) | Art. 14(5) | A |
| Animal assigned a UUID as internal system key; tag code is the business identifier | — | B |
| Birth registration via mobile phone (SMS / app) for pastoralists in remote areas | Art. 14(2)(c), Art. 14(4)(b) | A |
| Offline registration (paper form) allowed with delayed database upload | Art. 14(4)(b) | A |
| Annual stock count return submitted within 30 days of calendar year end | Art. 18(4) | A |
| Animal status lifecycle: PendingTag, Active, HealthRestricted, Quarantined, Dead, Slaughtered, Exported, Lost, Stolen | — | B |
| Record retention period after death / slaughter / export | — | C |

---

### 4.6 Lost and Damaged Tag Replacement

When a tag is lost or becomes illegible, a replacement must be applied and the central database updated. Tag replacement does not create a new animal record; the animal UUID is unchanged.

| Requirement | IGAD Art. | Class |
|---|---|---|
| A lost or illegible tag must be replaced within 30 days or before the animal leaves the facility | Art. 34(1) | A |
| Replacement tag carries the same identification number as the original where possible | Art. 34(1) | A |
| If the original number cannot be reused, a new number is assigned; the Authority is notified within 21 days | Art. 35(1) | A |
| The link between original and replacement tag numbers is recorded on the central database | Art. 35(2) | A |
| Tag replacement does not create a new animal record; animal UUID is unchanged | — | B |
| An animal in transit to an abattoir that loses its tag does not require replacement if origin traceability data is furnished | Art. 34(2)(b) | A |
| Tag removal at slaughter is the only authorised removal without replacement | Art. 36(2)(c) | A |
| Unauthorised tag removal, tampering, or re-use is an offence | Art. 36, Art. 46(k) | A |

---

### 4.7 Veterinary Health Events

Health events (disease diagnosis, treatment, test results, on-farm death) are recorded against individual animals or herds. Health status drives movement eligibility.

| Requirement | IGAD Art. | Class |
|---|---|---|
| Central database records treatment, health status, and feeding records | Art. 14(5)(b) | A |
| Movement permit cannot be issued if animal health status poses a risk | Art. 21(4)(c) | A |
| On-farm animal death must be notified to the nearest LITS officer within 21 days | Art. 24(1) | A |
| Death in transit must be notified within 48 hours | Art. 24(3) | A |
| Animal termination notice submitted for death, theft, or stray | Art. 24(1), Art. 24(2) | A |
| Health restriction status blocks movement permit issuance | Art. 21(4)(c) | A |
| Health restriction can be applied at animal, premises, or geographic area level | Art. 21(9)(c) | A |
| Health events and animal movements are separate records; a vaccination does not automatically create a movement | — | B |
| Zoonotic disease events trigger notification to public health authorities | Art. 14(5)(d) | A |

---

### 4.8 Vaccination Campaigns

Government or authorised veterinary officers conduct mass vaccination campaigns. Vaccination history is retained permanently.

| Requirement | IGAD Art. | Class |
|---|---|---|
| Health records include vaccination history | Art. 14(5)(b) | A |
| Authority may provide free vaccinations as a LITS adoption incentive | Art. 7(h)(iv) | A |
| Vaccination campaign: named campaign with vaccine type, batch number, date range, target species, target region | — | B |
| Each vaccination event linked to a campaign and to an individual animal (if identified) or to a premises batch | — | B |
| Vaccination certificates can be generated per animal or per premises for market or export purposes | — | B |
| A vaccination does not create a movement record | — | B |
| Campaign completion report generated for Ministry review | — | B |

---

### 4.9 Animal Movement

Any movement of a live animal between facilities requires a movement permit issued by the Authority.

| Requirement | IGAD Art. | Class |
|---|---|---|
| No animal may be moved without a movement permit and an approved AID | Art. 21(1) | A |
| Movement permit issued by Authority or authorised officer | Art. 21(2) | A |
| Movement permit may be issued electronically | Art. 22(1) | A |
| Both origin and destination premises must be registered and Active | Art. 21(4)(a) | A |
| Neither premises may be under movement restriction | Art. 21(4)(b) | A |
| Animal health status must not pose a risk at either facility | Art. 21(4)(c) | A |
| Individual animal movement notice accompanies the permit for individually identified animals | Art. 21(1)(c) | A |
| Receiving owner endorses the permit and notifies the nearest LITS officer | Art. 23(3)(b) | A |
| Unused permits must be returned within 7 days of expiry | Art. 23(6) | A |
| Dead, Slaughtered, or Exported animals cannot receive a new live-animal movement permit | — | B |
| Walking permit required for grazing outside facility boundary | Art. 21(10) | A |
| Emergency movement for veterinary treatment exempt from permit but must be retrospectively reported | Art. 21(13) | A |
| Movement permit validity period | — | C |

---

### 4.10 Markets (Animal Gatherings)

Livestock markets are registered facilities. Movement to and from a market follows standard movement permit rules.

| Requirement | IGAD Art. | Class |
|---|---|---|
| Markets registered as facilities of type animal gathering | Art. 2, Art. 23(5) | A |
| Market operator notifies movements electronically by the second working day after the event | Art. 23(5) | A |
| An animal arriving at a market without a tag may be issued a return permit to its facility of origin | Art. 21(14) | A |
| Market session is a dated event; each session produces an arrival manifest and a departure manifest | — | B |
| Market operator can scan or enter tags for animal check-in and check-out | — | B |
| Animals that fail health checks at the market may be detained pending Authority decision | Art. 21(4)(c), Art. 41 | A |

---

### 4.11 Quarantine

Animals or premises under quarantine are subject to movement restrictions. A quarantine order is raised by an authorised officer and recorded in SOMLITS.

| Requirement | IGAD Art. | Class |
|---|---|---|
| Movement permit conditions may include quarantine before or after movement | Art. 21(7)(c) | A |
| Movement through an infected area is prohibited | Art. 21(12)(a) | A |
| Quarantine is a status applied to a premises, geographic zone, or individual animals | — | B |
| Quarantine order records: reason, issuing officer, date raised, expected duration, scope (animals/premises) | — | B |
| Quarantine order lifted by an authorised officer; lifting recorded as an event | — | B |
| No movement permits may be issued from or to a quarantine zone while the order is active | — | B |
| Quarantine zone definition mechanism (premises list vs. GPS boundary vs. administrative boundary) | — | C |

---

### 4.12 Live Export

Animals approved for export receive an exit declaration and, where required, an Animal Health Certificate (AHC). Export closes the animal's active Somalia registration.

| Requirement | IGAD Art. | Class |
|---|---|---|
| Owner must make an exit declaration at the transitional facility | Art. 13(1)(b) | A |
| Export permit conditions include certification of health, origin, and identity | Art. 21(7)(d) | A |
| AHC issued per consignment by an authorised veterinary officer | Art. 2 (AHC definition) | A |
| Animal status set to Exported; no further live-animal movement permit may be issued | — | B |
| Border inspection post records the exit of every animal by tag scan and batch record | — | B |
| Export notification sent to receiving country LITS authority where a bilateral agreement exists | Art. 43(1) | A |
| Approved export markets and their specific certification requirements | — | C |
| AHC template format for Somalia | — | C |

---

### 4.13 Abattoirs and Slaughter

Abattoirs are registered facilities. Every animal slaughtered must be notified to the Authority. Carcass marking links slaughtered meat back to the live animal.

| Requirement | IGAD Art. | Class |
|---|---|---|
| Abattoir is a registered facility | Art. 2 | A |
| Abattoir operator notifies the nearest LITS officer of every animal slaughtered | Art. 25(1) | A |
| Slaughter notification includes movement permit, animal movement notice, and slaughter information form | Art. 25(2) | A |
| Export abattoirs must notify electronically in an Authority-approved format | Art. 25(4) | A |
| Before slaughter, abattoir operator must check the central database for health status, origin, history, and eligibility | Art. 25(3) | A |
| AID removed at slaughter — the only authorised tag removal without replacement | Art. 36(2)(c) | A |
| Carcass or meat marked or labelled to enable trace-back to the live animal or group | Art. 38 | A |
| Animal status set to Slaughtered; no further movement permit may be issued | — | B |
| Slaughter records retained for minimum 3 years | Art. 25(5) | A |

---

### 4.14 Certification

SOMLITS generates and verifies certificates of registration, compliance, health, and slaughter eligibility.

| Requirement | IGAD Art. | Class |
|---|---|---|
| Certificate of LITS registered facility issued to premises upon approval | Art. 2 | A |
| Certificate of compliance issued after a successful inspection | Art. 41(2)(a)(i) | A |
| AHC issued for export consignments | Art. 2 | A |
| Vaccination certificate per animal or premises for market or export | — | B |
| Digital certificates with QR code for verification at markets and borders | — | B |
| Certificate revocation recorded when conditions are no longer met | — | B |
| Certificate templates and authority to issue each type | — | C |

---

### 4.15 Trace-back and Trace-forward

SOMLITS provides authorised users with complete animal history (trace-back) and contact-tracing of exposed animals (trace-forward).

| Requirement | IGAD Art. | Class |
|---|---|---|
| System provides the full history of an animal from birth to current location | Art. 3(f), Art. 14(5)(i) | A |
| System supports rapid response in disease outbreak via trace-forward | Art. 14(5)(f) | A |
| Trace-back: given a tag or animal ID, return the complete chain of ownership, premises, health events, and movements | — | B |
| Trace-forward: given an animal, premises, or health event, return all animals that were co-located or co-moved | — | B |
| Traceability data is immutable; no record may be physically deleted | — | B |
| Traceability queries available to: Authority, inspectors, veterinary officers, export certifiers, purchasers (limited view) | Art. 15 | A |
| Data sharing with IGAD/ICPALD regional LITS database | Art. 43, Art. 44 | C |

---

### 4.16 Notifications and Audit

SOMLITS sends automated notifications to owners and officers at defined trigger events. Every data change is recorded in an immutable audit log.

| Requirement | IGAD Art. | Class |
|---|---|---|
| Administrator must record notifications on the central database within 10 days of receipt | Art. 14(8) | A |
| System provides audit capability to officers overseeing LITS | Art. 14(2)(f) | A |
| All data modifications recorded with: actor, timestamp (UTC), action type, previous value, new value | — | B |
| Notification triggers: animal registered, movement permit issued/confirmed, tag replacement, health event, slaughter, quarantine raised/lifted | — | B |
| Notification channels: SMS, email, in-app push | — | B |
| Notification language: Somali and English | — | B |
| Audit log is immutable (append-only); no record can be deleted or overwritten | — | B |
| Audit log retained for minimum 10 years | Art. 18(1)(d), Art. 19(2)(c) | A |
| Audit log accessible to inspectors and the Authority; not to general public | Art. 15 | A |

---

## 5. Out of Scope

| Item | Reason |
|---|---|
| Livestock insurance management | Separate sector; future API integration possible |
| Animal breeding / pedigree / genetics | Separate domain; out of scope initially |
| Feed and nutrition management | Out of scope |
| Meat processing and cold chain beyond carcass marking | Separate food safety system |
| Financial transactions between buyers and sellers | SOMLITS is regulatory, not a market platform |
| Poultry and aquaculture | Not covered under IGAD LITS framework |

---

## 6. Phased Rollout

| Phase | Modules | Notes |
|---|---|---|
| Phase 0 — Foundation | Owner Registration, Premises Registration | No animals yet |
| Phase 1 — Identification | Tag Management, Animal Registration, Tag Replacement | Core LITS |
| Phase 2 — Movement | Animal Movement, Markets | Requires Phase 1 |
| Phase 3 — Health | Veterinary Health Events, Vaccination Campaigns, Quarantine | Requires Phase 1 |
| Phase 4 — Exit | Live Export, Abattoirs/Slaughter, Certification | Requires Phases 2 and 3 |
| Phase 5 — Intelligence | Trace-back/Trace-forward, Notifications, Audit | Cross-cutting |

---

## 7. Regulatory References

| Reference | Publication |
|---|---|
| IGAD Model Legal Framework for LITS | ICPALD, 2016 |
| OIE Terrestrial Animal Health Code | OIE/WOAH, current edition |
| ISO 11784/11785 | RFID transponders for animal identification |
| ICAR Guidelines | International Committee for Animal Recording |
| AU-IBAR LITS Guidelines | African Union Inter-African Bureau for Animal Resources |

---

STEP COMPLETE — awaiting approval before continuing.
