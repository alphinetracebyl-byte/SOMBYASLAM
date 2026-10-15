---
title: Clinical Parameters for Pre-Movement Livestock Inspection
scope: InspectionWorkflowPage — ANIMALS step
standards: WOAH Terrestrial Code Ch 5.3, FAO Animal Welfare, Sprecher Locomotion Scale
researched: 2026-09-01
---

# Pre-Movement Clinical Inspection Parameters

## 1. Body Condition Score (BCS)
**Source:** FAO Cattle Body Condition Score Guidelines; AU-IBAR Livestock Assessment Manual  
**Scale:** 1 (emaciated) → 5 (very fat)  
**Transport threshold:** BCS < 3 = unfit for transport (WOAH Ch 5.3.6)

| Score | Label | Description | Fit for Transport |
|---|---|---|---|
| 1 | Emaciated | Bones prominently visible, no muscle or fat cover | ❌ No |
| 2 | Very Thin | Ribs, spine, hip bones clearly visible | ❌ No |
| 3 | Adequate | Ribs palpable, moderate cover — minimum acceptable | ⚠️ Borderline |
| 4 | Good | Ribs not visible, well-muscled, good fill | ✅ Yes |
| 5 | Very Good | Ribs impalpable, excess fat deposits | ✅ Yes |

**Database field:** `movement_inspection_animals.bcs_score SMALLINT CHECK (1–5)`

---

## 2. Locomotion Score (Sprecher Scale)
**Source:** Sprecher DJ, Hostetler DE, Kaneene JB (1997). WOAH Ch 5.3.7  
**Scale:** 0 (normal) → 3 (severely lame)  
**Transport threshold:** Score 3 = must not be transported

| Score | Label | Description | Fit for Transport |
|---|---|---|---|
| 0 | Normal | Walks freely, fully weight-bearing on all limbs | ✅ Yes |
| 1 | Slightly Lame | Minor stiffness, still weight-bearing — note required | ✅ Yes (with note) |
| 2 | Moderately Lame | Reluctant to move, uneven gait — reassess before departure | ⚠️ Conditional |
| 3 | Severely Lame | Cannot bear weight — must NOT be transported | ❌ No |

**Database field:** `movement_inspection_animals.locomotion_score SMALLINT CHECK (0–3)`

---

## 3. Body Temperature (Rectal)
**Source:** Merck Veterinary Manual; FAO Field Veterinary Manual  
**Method:** Digital rectal thermometer; reading taken after animal is calm (not immediately post-exercise)

| Species | Normal Range | Fever Threshold | Action |
|---|---|---|---|
| Cattle | 38.0 – 39.5 °C | ≥ 40.0 °C | Suspected systemic infection — isolate |
| Camel | 36.0 – 38.5 °C | ≥ 39.5 °C | Note: camels have wider diurnal variation |
| Sheep | 38.5 – 40.0 °C | ≥ 40.5 °C | |
| Goat | 38.5 – 40.0 °C | ≥ 40.5 °C | |

**Database field:** `movement_inspection_animals.body_temp_celsius NUMERIC`  
**UI:** Temperature input with auto-display of species-specific range and fever flag

---

## 4. General Clinical Health Checklist
**Source:** WOAH Ch 5.2 — Pre-movement fitness for transport criteria

| Parameter | Observed Options | Risk |
|---|---|---|
| General Appearance | Normal / Abnormal | Abnormal = isolate |
| Behaviour | Normal / Depressed / Aggressive | — |
| Visible Injuries | None / Minor / Serious | Serious = exclude |
| Respiratory Signs | None / Coughing / Nasal discharge / Breathing difficulty | Difficulty = fail |
| Digestive Signs | None / Diarrhoea / Bloating / Vomiting | Vomiting = danger |
| Skin / Coat | Normal / Lesions / Parasites / Suspected disease | Suspected = disease tab |
| Eyes & Mouth | Normal / Discharge / Lesions | Lesions = danger |
| Pregnancy Condition | Not applicable / Fit / Restricted | Restricted = conditions |
| Signs of Infectious Disease | No / Yes — see Disease tab | Yes = disease tab required |

**Database field:** `movement_inspection_animals.health_checks JSONB`

---

## 5. Notifiable Disease Checklist
**Source:** AU-IBAR Horn of Africa Disease Priority List; WOAH List A & B diseases; Somalia MoLFR notifiable disease regulations  
**Method:** Species-filtered — inspector only sees diseases applicable to the animal's species

| Key | Disease | Species | Key Clinical Signs | Zoonotic | Emergency |
|---|---|---|---|---|---|
| FMD | Foot & Mouth Disease | Cattle, Sheep, Goat, Camel | Vesicles on tongue, lips, interdigital space, coronary band | No | No |
| CBPP | Contagious Bovine Pleuropneumonia | Cattle | Painful respiration, pleural friction rub, bilateral nasal discharge | No | No |
| CCPP | Contagious Caprine Pleuropneumonia | Goat, Sheep | Respiratory distress, coughing, fever | No | No |
| LSD | Lumpy Skin Disease | Cattle | Multiple firm 2–5 cm skin nodules, lymphadenopathy | No | No |
| RVF | Rift Valley Fever | Cattle, Sheep, Goat, Camel | Fever >40°C, bloody nasal discharge, jaundice, abortions | Yes | No |
| BRUCELLOSIS | Brucellosis | Cattle, Sheep, Goat, Camel | Abortion history, retained placenta, orchitis | Yes | No |
| ANTHRAX | Anthrax | Cattle, Sheep, Goat, Camel | Sudden death — DO NOT open carcasses | Yes | **Yes** |
| MANGE | Sarcoptic Mange | Cattle, Sheep, Goat, Camel | Intense pruritus, hair loss, skin thickening | No | No |
| ORF | Contagious Ecthyma (Orf) | Sheep, Goat | Proliferative lesions on lips, nostrils, ears | Yes | No |

**Response options per disease:** No signs / Suspected / Positive — confirmed / Not applicable  
**Database field:** `movement_inspection_animals.disease_checks JSONB`  
**Auto-behaviour:** Any "Suspected" or "Positive" response triggers a red warning banner. Anthrax suspicion triggers an emergency alert and blocks movement.

---

## 6. Per-Disease Vaccination Records
**Source:** IGAD LITS Framework; Kenya KAMIS vaccination tracking; Ethiopia NLIMS  
**Diseases tracked for vaccination (7):** FMD, RVF, PPR, Brucellosis (B19/S19), LSD, Anthrax, CBPP

For each disease:
- Vaccinated: Yes / No
- If Yes: Date, Product name, Batch number, Next due date

**Database field:** `movement_inspection_animals.vaccination_records JSONB []`  
**Schema:**
```json
[
  {
    "disease": "FMD",
    "vaccinated": true,
    "date": "2026-03-15",
    "product": "Aftovaxpur DOE",
    "batch": "BT-20260301",
    "nextDue": "2026-09-15"
  }
]
```

---

## 7. Tag Verification (6-Point Check)
**Source:** IGAD LITS Art. 12 — Tag validation at inspection point  
**Updated:** Species match added per international standards (Kenya KAMIS practice)

| Check | Description |
|---|---|
| Tag Found | Physical tag is present on the animal |
| Tag Active | Tag is in active/valid state in SOMLITS database |
| Species Match | Registered species on tag matches the animal physically present |
| Owner Match | Registered owner matches the movement request owner |
| Premises Match | Animal's registered premises matches the origin premises |
| In Request | Animal's tag serial is listed in the movement request |
| Not Restricted | Animal has no active health restriction or embargo |

**Database field:** `movement_inspection_animals.species_match BOOLEAN`  
**Existing fields:** tag_found, tag_active, owner_match, premises_match, in_request, not_restricted

---

## 8. Overall Animal Result Classifications

| Code | Label | Description |
|---|---|---|
| FIT_FOR_MOVEMENT | Fit for Movement | All checks pass |
| CONDITIONALLY_FIT | Conditionally Fit | Passes with stated conditions (e.g. slower journey) |
| UNFIT_FOR_MOVEMENT | Unfit | BCS < 3 or locomotion = 3 or disease suspected |
| UNDER_OBSERVATION | Under Observation | Borderline — reassess at departure |
| REFERRED_TO_VET | Referred to Vet | Needs formal veterinary examination |
| NOT_PRESENTED | Not Presented | Animal was absent during inspection |
| IDENTIFICATION_MISMATCH | ID Mismatch | Tag/records do not match animal |
| EXCLUDED | Excluded | Removed from request by officer |

---

## Auto-Fail Rules (implemented in ResultPanel)
- BCS score = 1 or 2 → flag UNFIT_FOR_MOVEMENT
- Locomotion score = 3 → flag UNFIT_FOR_MOVEMENT
- Body temperature above species fever threshold → flag UNFIT_FOR_MOVEMENT
- Any disease_checks entry = "Suspected" or "Positive — confirmed" → flag UNFIT_FOR_MOVEMENT + warning
- Anthrax suspected → flag EMERGENCY + immediate movement block
