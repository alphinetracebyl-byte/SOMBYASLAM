---
title: International LITS & Veterinary Standards — Source Frameworks
scope: Pre-movement inspection, livestock movement permitting, traceability
researched: 2026-09-01
---

# International Standards Consulted for SOMLITS Inspection & Permitting

## Primary Frameworks

### 1. IGAD Model Legal Framework for LITS (2016)
**Implementing body:** Intergovernmental Authority on Development  
**Relevance:** Primary design authority for SOMLITS. The entire system is built to this framework.

Key provisions applied to SOMLITS:
- Movement permit is the central regulatory instrument for all livestock movements
- Pre-movement inspection by an authorised veterinary officer is mandatory before any permit is issued
- Permit must accompany animals throughout transit; presented on demand to any authorised official
- Permit contains: permit number, species, count, origin, destination, owner, transport vehicle, inspection reference, validity period, issuing officer with licence number, conditions
- Permit validity is proportional to the distance and risk of the movement type (short transit = 1–5 days; seasonal pastoralism = up to 60 days)
- Traceability must be maintained from birth to slaughter/export via continuous chain of movement permits

### 2. WOAH (OIE) Terrestrial Animal Health Code — Chapters 5.1–5.10
**Full title:** World Organisation for Animal Health, Terrestrial Code  
**Relevance:** International benchmark for pre-movement inspection protocols.

Key chapters applied:
- **Chapter 5.1 — General obligations on certification:** Veterinary certificates must be issued by an official veterinarian; must include unique document number; must identify the issuing authority
- **Chapter 5.2 — General conditions:** Inspection must take place immediately before movement; animals unfit for transport must be excluded; certificate must be invalid if animals deviate from described route
- **Chapter 5.3 — Animal welfare in transport:** Loading density standards; vehicle cleanliness and disinfection; water/feed provision for journeys over 8 hours; ventilation requirements; fitness-for-transport criteria (BCS ≥ 3, locomotion score ≤ 2)
- **Chapter 5.4 — Zoning and compartmentalisation:** Disease-free zone certificates; movement restrictions from infected zones

### 3. FAO Animal Welfare Standards (2014)
**Full title:** FAO, "Cattle, Horses and other Large Animals" welfare guides  
**Relevance:** BCS scale and transport fitness criteria.

Key standards applied:
- **Body Condition Score (BCS):** 5-point scale (1 = emaciated → 5 = very fat). FAO minimum for transport: BCS ≥ 3. Animals at BCS 1–2 must not be transported.
- **Temperature recording:** Rectal temperature is a mandatory clinical parameter. Species-specific normal ranges (see Research 02)
- **Pre-transport inspection checklist:** General appearance, behaviour, injuries, respiratory, digestive, skin/coat, eyes & mouth, pregnancy status

### 4. AU-IBAR (African Union — Inter-African Bureau for Animal Resources)
**Relevance:** Regional adaptation of WOAH standards for African livestock production systems.

Key contributions:
- Horn of Africa disease priority list: FMD, CBPP, CCPP, LSD, RVF, Brucellosis, Anthrax, Mange, Orf
- Seasonal movement patterns (transhumance) recognised as a distinct movement type requiring longer-validity permits (TRH permit: up to 60 days)
- Zoonotic disease alerts (RVF, Brucellosis, Anthrax) must trigger human health notification chain in addition to animal movement suspension

---

## Country Systems Reviewed

### Kenya — KAMIS (Kenya Animal Movement Information System)
- Digital movement permits issued at district level
- Permit validity by movement type: local = 2 days, county-to-county = 5 days, cross-border = coordinated with destination authority
- Includes livestock market receipts as supporting document
- Inspector records species, count, tag numbers, origin/destination premises codes, and vehicle registration

### Australia — NLIS (National Livestock Identification System)
- All movements must be reported within 24 hours of arrival at destination
- Electronic database cross-references RFID tag to registered property of birth (PIB) and current property (PIC)
- Movement document (NVD — National Vendor Declaration) includes: vendor declaration of disease status, chemical residue status, feeding history (for market access)
- Ante-mortem inspection at abattoir linked back to NVD

### Ethiopia — NLIMS (National Livestock Identification and Movement System)
- 7-step movement permit process closely mirroring IGAD framework
- Pre-movement inspection by district veterinary officer
- Permit contains: inspection code, inspection date, inspector licence, species-specific disease risk declaration
- Permit validity: 3–7 days depending on movement type and distance

---

## Implementation Status in SOMLITS

| Standard | Feature | Status |
|---|---|---|
| IGAD LITS | Movement permit with unique number | ✅ Implemented |
| IGAD LITS | Permit validity by movement type | ✅ Implemented (InspectionWorkflowPage + MovementsPage) |
| IGAD LITS | Issuing officer licence number field | ✅ Column added + `licence_number` in `user_registrations` + form field + fetched at issuance |
| WOAH Ch 5.3 | Vehicle biosecurity inspection step | ✅ Implemented (VEHICLE step) |
| WOAH Ch 5.3 | BCS fitness-for-transport criterion | ✅ Implemented (BCS 1–5 grid) |
| WOAH Ch 5.3 | Locomotion fitness-for-transport | ✅ Implemented (Sprecher 0–3 grid) |
| FAO | Species-specific temperature ranges | ✅ Implemented |
| AU-IBAR | Horn of Africa disease checklist | ✅ Implemented (9 diseases) |
| AU-IBAR | Zoonotic disease flagging | ✅ Implemented (RVF, Brucellosis, Anthrax flagged) |
| Kenya KAMIS | Species match verification | ✅ Implemented (6-check tag verification) |
| Ethiopia NLIMS | Per-disease vaccination records | ✅ Implemented |
| WOAH Ch 5.1 | Printable official permit document | ✅ Implemented (PermitPrintPage) |
