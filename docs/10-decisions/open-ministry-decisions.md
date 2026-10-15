# Open Ministry Decisions

**Version:** 0.1 — Draft for Review
**Date:** 2026-07-18
**Status:** Pending Ministry Response

All items in this document are **Class [C] — Requires Somalia Ministry confirmation** before any implementation work begins for the affected feature.

---

## Purpose

This register captures decisions that cannot be made by the SOMLITS development team. They require formal determination by the Ministry responsible for livestock, the Competent Authority (CVO/DVS), Somalia's legislative process, or inter-governmental negotiation. Each item is numbered so it can be referenced in approval requests and tracked to closure.

---

## D-001 — Designation of the Competent Authority

**Question:** Which specific office or body in Somalia's government will be formally designated as the national LITS Competent Authority?

**IGAD Reference:** Art. 6(1) — The office of the DVS/CVO is designated as Competent Authority.

**Options:**
1. The existing CVO within the Ministry of Livestock, Forestry and Range acts as Competent Authority directly.
2. A dedicated autonomous LITS Authority is established within the Ministry.
3. Another government body is designated.

**Impact on SOMLITS:** Determines the top-level administrator account structure, organisational hierarchy in the system, and which official's credentials are used to sign AHCs and movement permits.

**Decision required from:** Minister / Cabinet

**Status:** Pending

---

## D-002 — Species Formally Covered

**Question:** Which species does the Somalia LITS Act formally cover?

**IGAD Reference:** Art. 2 — Livestock includes cattle, sheep, goats, pigs, and camels; the Minister may add further species by Gazette notice.

**Context:** Pigs are not applicable in Somalia. Camels are economically critical. Donkeys and equines are not covered by the IGAD framework.

**Proposed SOMLITS default:** Cattle, camels, sheep, goats — in scope. Pigs, donkeys, poultry — out of scope.

**Decision required from:** Minister (by Gazette notice)

**Status:** Pending

---

## D-003 — Approved Animal Identification Device Types

**Question:** Which AID type(s) will the Minister approve for Somalia?

**IGAD Reference:** Art. 27(2), First Schedule — Options include: hot iron branding, visual tamperproof ear tag, bar-coded tamperproof tag, RFID tamperproof ear tag, RFID bolus, subcutaneous RFID microchip, traditional markings.

**Context:** Given Somalia's pastoralist context and variable mobile infrastructure:
- Visual tamperproof ear tags are low-cost and field-practical.
- RFID ear tags enable electronic scanning but carry higher unit cost.
- Traditional markings may supplement formal tags during transition.

**Impact on SOMLITS:** Determines tag data structure, scanner integration requirements, and national coding scheme design.

**Decision required from:** Minister (published in official Gazette)

**Status:** Pending

---

## D-004 — National Animal Numbering and Coding Scheme

**Question:** What is the structure of the national animal identification code?

**IGAD Reference:** Art. 26(1) — The Minister determines the identification system and code.

**Proposed starting structure [B — for Ministry review]:**
```
[Country][Species][Region][Premises][Sequence]
  SO      C       MG      012345    00000001

Example: SO-C-MG-012345-00000001
  SO = Somalia
  C  = Cattle (S = Sheep, G = Goat, K = Camel)
  MG = Mogadishu region
  012345 = Premises code
  00000001 = sequential animal number within premises
```

**Impact on SOMLITS:** Core to tag manufacturing, database schema, and interoperability with the IGAD regional database.

**Decision required from:** Minister / Competent Authority (published in Gazette)

**Status:** Pending

---

## D-005 — Premises Code Structure

**Question:** What is the structure of the Premises Code assigned to each registered facility?

**IGAD Reference:** Art. 26(1) — Part of the national numbering scheme.

**Proposed structure [B — for Ministry review]:**
```
[Region][District][Sequence]
  MG      HD       000123

Example: MG-HD-000123
  MG = Mogadishu region, HD = Hodan district
```

**Decision required from:** Competent Authority, in consultation with sub-national governments.

**Status:** Pending

---

## D-006 — Owner Registration Renewal Interval

**Question:** How frequently must owner registrations be renewed?

**IGAD Reference:** Art. 11(3) — Registration renewal at intervals required by the Act.

**Proposed SOMLITS default [B]:** Every 2 years.

**Decision required from:** Minister (by Regulations)

**Status:** Pending

---

## D-007 — Movement Permit Validity Period

**Question:** What is the maximum validity period for a movement permit?

**IGAD Reference:** Art. 21(6)(b) — Movement must occur within the period specified in the permit. Art. 23(6) — Unused permits returned within 7 days of expiry.

**Proposed SOMLITS default [B]:** 14 days for domestic movement; 30 days for export movement.

**Decision required from:** Competent Authority (by Regulations)

**Status:** Pending

---

## D-008 — Premises Registration Renewal Interval

**Question:** How frequently must a premises registration be renewed?

**IGAD Reference:** Art. 11(3) — Renewal at intervals specified by the Act.

**Proposed SOMLITS default [B]:** Annual renewal, with an inspection prior to renewal.

**Decision required from:** Minister (by Regulations)

**Status:** Pending

---

## D-009 — Record Retention Period After Animal Exit

**Question:** How long must an animal record be retained on the central database after the animal has died, been slaughtered, or been exported?

**IGAD Reference:** Art. 14(6) — Data held as long as reasonably necessary. Art. 18(1)(d), Art. 19(2)(c) — Animal register kept 10 years after last entry. Art. 25(5) — Slaughter records: 3 years minimum.

**Proposed SOMLITS default [B]:** Full animal record retained for 10 years after the final status event (death / slaughter / export), consistent with the animal register requirement.

**Decision required from:** Minister / Competent Authority

**Status:** Pending

---

## D-010 — AHC Template and Certification Authority

**Question:** What is the approved format of the Animal Health Certificate for Somalia, and which officers are authorised to issue it?

**IGAD Reference:** Art. 2 (AHC definition), Art. 21(7)(d).

**Context:** Export markets (Gulf states, Egypt, Libya) each have specific AHC requirements. The Somalia AHC template must meet OIE standards and bilateral requirements with receiving countries.

**Decision required from:** Minister; CVO in coordination with receiving-country veterinary authorities.

**Status:** Pending

---

## D-011 — Approved Export Markets and Requirements

**Question:** Which countries are Somalia's approved live animal export markets, and what species, health testing, quarantine, and residency requirements does each impose?

**IGAD Reference:** Art. 3(e), Art. 13.

**Context:** Major export destinations include Saudi Arabia, UAE, Oman, Egypt, and Libya. Each has different requirements.

**Impact on SOMLITS:** Drives the export consignment eligibility checks and AHC content fields in the Export & Certification context.

**Decision required from:** Ministry of Livestock, in coordination with Ministry of Foreign Affairs and receiving-country authorities.

**Status:** Pending

---

## D-012 — Cross-border LITS Harmonisation Agreements

**Question:** What bilateral or multilateral LITS data-sharing or movement-recognition agreements exist or are planned between Somalia and Ethiopia, Kenya, and Djibouti?

**IGAD Reference:** Art. 43, Art. 44 — Cooperation and harmonisation required.

**Context:** Cross-border livestock movement is significant. Harmonised LITS data sharing would allow trace-back across borders for disease control.

**Impact on SOMLITS:** Determines the design of the Traceability context's regional data-sharing API and the data elements required for cross-border movement permits.

**Decision required from:** Ministry of Livestock and Ministry of Foreign Affairs; bilateral negotiation with neighbouring states.

**Status:** Pending

---

## D-013 — Pilot Region for Phase 0 Rollout

**Question:** Which region of Somalia will serve as the pilot for Phase 0 (Owner and Premises Registration)?

**IGAD Reference:** Art. 7(d)(ii), Art. 9(3)(c) — Advisory Board advises on pilot schemes.

**Context:** The pilot region should have willing livestock owners, accessible infrastructure, sub-national government cooperation, and a manageable livestock population. Possible candidates: Benadir/Mogadishu, Somaliland, or a single district.

**Impact on SOMLITS:** Affects Phase 0 deployment configuration, regional office setup, and initial LITS officer appointments.

**Decision required from:** Minister, in consultation with the Advisory Board and relevant regional authorities.

**Status:** Pending

---

## D-014 — Camel Ear Tag Placement

**Question:** For camels, on which ear should the primary tag be placed, and on which the secondary?

**IGAD Reference:** Art. 30(2) specifies left/right for cattle. No camel-specific article exists in the IGAD framework.

**Proposed SOMLITS default [B]:** Primary tag on the left ear; secondary tag on the right ear — consistent with the cattle rule.

**Decision required from:** CVO, with input from camel-keeping communities.

**Status:** Pending

---

## D-015 — Quarantine Zone Definition Mechanism

**Question:** How is a quarantine zone defined — by premises list, GPS radius, or administrative boundary?

**IGAD Reference:** Art. 21(7)(c), Art. 21(12)(a).

**Proposed SOMLITS approach [B]:** Quarantine zone defined by the issuing officer as one of: (a) a named list of premises, (b) a radius in kilometres from a GPS centrepoint, or (c) an administrative boundary (district or region). System enforces the zone boundary when checking movement permit eligibility.

**Decision required from:** Competent Authority (by Regulations).

**Status:** Pending

---

## D-016 — Somalia LITS Act Enactment Timeline

**Question:** When will Somalia enact national legislation equivalent to the IGAD Model LITS Legal Framework?

**IGAD Reference:** Art. 49 — Transitional arrangements. Second Schedule — "comply or explain" principle.

**Context:** SOMLITS can be built and piloted under a Ministry directive pending formal legislation. However, full regulatory enforcement powers (offences, inspector powers, penalties, mandatory registration) require an enacted Somalia LITS Act.

**Impact on SOMLITS:** Enforcement capabilities cannot be fully activated until legislation is in force. System design should be legislation-ready from the start.

**Decision required from:** Ministry of Livestock in coordination with the Attorney General and Parliament.

**Status:** Pending

---

## D-017 — Fees and Service Charges

**Question:** Which SOMLITS services, if any, will carry fees? What are the fee amounts?

**IGAD Reference:** Art. 5(1)(l), Art. 7(p), Art. 14(7)(c), Art. 15(6)(b).

**Options:**
1. All services free at point of use (government-funded).
2. Cost recovery fees for commercial actors; free for smallholder pastoralists.
3. Full fee schedule for all services including owner registration, animal registration, movement permits, AHC issuance.

**Impact on SOMLITS:** Determines whether payment integration is required in scope and affects the accessibility strategy for remote pastoralists.

**Decision required from:** Minister, approved in accordance with government procedures.

**Status:** Pending

---

---

## D-018 — Federal Member State Participation Mechanism

**Question:** How do the five FMS veterinary authorities interface with the national SOMLITS? Do FMS officers register premises and owners directly into the national database, or does each FMS maintain its own database node that replicates to the national level?

**Context:** Somalia's federal structure means FMS have authority over livestock in their territories. A poorly designed data architecture could result in fragmented, inconsistent national records.

**Decision required from:** Minister / FMS negotiations

**Status:** Pending

---

## D-019 — Somaliland Participation

**Question:** Does Somaliland (a self-declared independent state in northwest Somalia) participate in SOMLITS, and if so, under what arrangement?

**Context:** Somaliland administers its own veterinary services. It is a significant livestock exporter (Berbera port). Without Somaliland's participation, traceability for north Somalia livestock is incomplete.

**Decision required from:** Minister / Ministry of Foreign Affairs / Somaliland authorities

**Status:** Pending

---

## D-020 — Community Animal Health Worker (CAHW) Legal Authority

**Question:** Can CAHWs officially record LITS data events (birth registrations, vaccinations, tag applications) in SOMLITS? What is their legal liability for errors?

**Context:** CAHWs are the primary field actors in Somalia's pastoral areas. Without legal recognition of their LITS role, field data capture is severely limited.

**Decision required from:** Minister / Attorney General

**Status:** Pending

---

## D-021 — Traditional Clan Markings — Formal Recognition

**Question:** Are traditional Somali clan markings (astaamo) formally recognised as supplementary identifiers under the Somalia LITS Act?

**Context:** Clan markings are culturally important and widely used. Recording them in SOMLITS alongside formal tags supports community acceptance and cross-referencing with traditional ownership records.

**Decision required from:** Minister (by Regulations)

**Status:** Pending

---

## D-022 — Pastoral Grazing Area Registration

**Question:** How is a seasonal, mobile pastoral grazing area formally registered as a LITS premises? Can a premises be a geographic zone rather than a fixed location?

**Context:** Somalia's nomadic pastoralists do not have fixed farms. Registration of fixed GPS coordinates as a premises does not reflect pastoral reality. A framework for seasonal or zone-based premises registration is required.

**Decision required from:** Minister / CVO

**Status:** Pending

---

## D-023 — Laboratory Accreditation Body and Accredited Lab List

**Question:** Which body accredits veterinary laboratories in Somalia for LITS purposes? What is the initial list of accredited labs?

**Context:** All LITS samples must be analysed at a laboratory accredited by the Authority. The National Veterinary Laboratory (Mogadishu) must be confirmed as accredited. Regional and international reference labs must be listed.

**Decision required from:** CVO

**Status:** Pending

---

## D-024 — Confiscation Legal Authority and Process

**Question:** Which government officials can order confiscation of livestock under LITS? What are the legal procedures, and how is ownership formally transferred in SOMLITS?

**Context:** Livestock may be confiscated under court order or by authority order (e.g., disease control, evidence of rustling, debt recovery). SOMLITS needs a defined confiscation workflow.

**Decision required from:** Attorney General / CVO / Minister

**Status:** Pending

---

## D-025 — Halal Certification Authority

**Question:** Which body in Somalia issues Halal certificates? Is it MoLFR, the Ministry of Endowments and Religious Affairs, or a separate body? How does Halal certification integrate with AHC issuance?

**Context:** All livestock exports to Gulf markets require Halal certification. The certifying authority and certificate format must be confirmed before the Export & Certification module is designed.

**Decision required from:** Minister / Ministry of Endowments and Religious Affairs

**Status:** Pending

---

## D-026 — Pre-export Quarantine Requirements per Market

**Question:** For each approved export market, what is the required pre-export quarantine period, and where must quarantine be conducted (approved quarantine stations)?

**Context:** Saudi Arabia, UAE, Oman, Egypt, and Libya each have different quarantine requirements. These must be confirmed and encoded in SOMLITS export consignment eligibility rules.

**Decision required from:** CVO in coordination with receiving-country veterinary authorities

**Status:** Pending

---

## D-027 — OIE Disease Notification List for Somalia

**Question:** Which diseases trigger mandatory international notification from Somalia to OIE/WOAH? What is the current OIE notification status of Somalia?

**Context:** Positive detection of OIE-listed diseases in SOMLITS must automatically trigger a CVO notification workflow. The specific list of triggering diseases needs to be confirmed.

**Decision required from:** CVO / OIE liaison

**Status:** Pending

---

## D-028 — Emergency and Field Slaughter Authorisation

**Question:** Who authorises emergency or field slaughter (outside a registered abattoir) and under what conditions? How is this recorded in SOMLITS?

**Context:** Animals may need to be slaughtered in the field for welfare reasons (severe injury) or disease control. The authority and process for this must be defined and recorded in SOMLITS.

**Decision required from:** CVO / Minister

**Status:** Pending

---

## D-029 — Disease Depopulation — Compensation and Authority

**Question:** In the event of mandatory depopulation (culling) for disease control, is compensation payable to livestock owners? Who authorises depopulation and who funds compensation?

**Context:** Without a compensation scheme, owners are unlikely to report disease outbreaks honestly. The absence of a compensation framework is a major disease reporting barrier in pastoral settings.

**Decision required from:** Minister / MoF / Attorney General

**Status:** Pending

---

## Decision Tracking Summary

| ID | Topic | Decision Required From | Status |
|---|---|---|---|
| D-001 | Competent Authority designation | Minister / Cabinet | Pending |
| D-002 | Species formally covered | Minister | Pending |
| D-003 | Approved AID types | Minister | Pending |
| D-004 | National animal numbering scheme | Minister / CVO | Pending |
| D-005 | Premises code structure | Competent Authority | Pending |
| D-006 | Owner registration renewal interval | Minister | Pending |
| D-007 | Movement permit validity period | Competent Authority | Pending |
| D-008 | Premises registration renewal interval | Minister | Pending |
| D-009 | Record retention after exit | Minister / CVO | Pending |
| D-010 | AHC template and certifying officers | Minister / CVO | Pending |
| D-011 | Approved export markets and requirements | Ministry of Livestock | Pending |
| D-012 | Cross-border harmonisation agreements | Ministry of Livestock / Foreign Affairs | Pending |
| D-013 | Pilot region for Phase 0 | Minister / Advisory Board | Pending |
| D-014 | Camel ear tag placement | CVO | Pending |
| D-015 | Quarantine zone definition mechanism | Competent Authority | Pending |
| D-016 | Somalia LITS Act enactment timeline | Ministry / Parliament | Pending |
| D-017 | Fees and service charges | Minister | Pending |
| D-018 | FMS participation mechanism | Minister / FMS | Pending |
| D-019 | Somaliland participation | Minister / Foreign Affairs | Pending |
| D-020 | CAHW legal authority in SOMLITS | Minister / Attorney General | Pending |
| D-021 | Traditional clan markings — formal recognition | Minister | Pending |
| D-022 | Pastoral grazing area registration | Minister / CVO | Pending |
| D-023 | Laboratory accreditation body and list | CVO | Pending |
| D-024 | Confiscation legal authority and process | Attorney General / CVO | Pending |
| D-025 | Halal certification authority | Minister / Religious Affairs | Pending |
| D-026 | Pre-export quarantine requirements per market | CVO | Pending |
| D-027 | OIE disease notification list for Somalia | CVO / OIE | Pending |
| D-028 | Emergency and field slaughter authorisation | CVO / Minister | Pending |
| D-029 | Disease depopulation — compensation and authority | Minister / MoF | Pending |

---

STEP COMPLETE — awaiting approval before continuing.
