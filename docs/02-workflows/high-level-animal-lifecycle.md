# High-Level Animal Lifecycle

**Version:** 0.1 — Draft for Review
**Date:** 2026-07-18
**Status:** Awaiting Ministry Approval

Classification key:
- **[A]** Supported by the IGAD Model Legal Framework for LITS (2016)
- **[B]** Proposed SOMLITS business rule
- **[C]** Requires Somalia Ministry confirmation

---

## 1. Animal Status Lifecycle

### Status Definitions

| Status | Description | Class |
|---|---|---|
| `PendingTag` | Birth reported but AID not yet applied. | B |
| `Active` | Animal is tagged, registered on the central database, no restrictions active. | A |
| `HealthRestricted` | A health restriction imposed by a veterinary officer. Movement permits blocked. | A |
| `Quarantined` | The animal or its premises is under a quarantine order. Movement permits blocked. | A |
| `Dead` | Death reported via Animal Termination Notice. | A |
| `Slaughtered` | Slaughter at a registered abattoir notified to the Authority. | A |
| `Exported` | Lawfully exported from Somalia. Active registration closed. | A |
| `Lost` | Reported stray or missing via Animal Termination Notice. | A |
| `Stolen` | Reported stolen via Animal Termination Notice; tag numbers flagged. | A |

### Animal Status Transitions

```mermaid
stateDiagram-v2
    [*] --> PendingTag : Birth reported by owner
    PendingTag --> Active : AID applied and registered in central database

    Active --> HealthRestricted : Health restriction imposed by vet officer
    HealthRestricted --> Active : Health restriction lifted

    Active --> Quarantined : Quarantine order applied
    HealthRestricted --> Quarantined : Quarantine order applied
    Quarantined --> Active : Quarantine order lifted
    Quarantined --> HealthRestricted : Quarantine lifted — restriction remains

    Active --> Dead : Death reported on-farm or in transit
    HealthRestricted --> Dead : Death reported
    Active --> Slaughtered : Slaughter notified by abattoir
    HealthRestricted --> Slaughtered : Slaughter of health-restricted animal permitted
    Active --> Exported : Exit declaration confirmed at border

    Active --> Lost : Stray or missing reported
    Active --> Stolen : Theft reported
    Lost --> Active : Animal recovered and re-registered
    Stolen --> Active : Animal recovered and re-registered

    Dead --> [*]
    Slaughtered --> [*]
    Exported --> [*]
```

**Key rules:**
- Only `Active` animals may receive a movement permit. [A — Art. 21(4)]
- `Dead`, `Slaughtered`, and `Exported` animals cannot receive a new live-animal movement permit. [B]
- A health restriction prevents movement to another live premises but does not prevent slaughter. [A — Art. 21(4)(c)]
- A quarantine applies to the animal regardless of which premises it is currently on. [B]

---

## 2. Animal Lifecycle — End-to-End Event Flow

```mermaid
flowchart TD
    A([Animal Born]) --> B["Owner reports birth\nwithin 7 days\n[A — Art. 30–31]"]
    B --> C["AID applied to animal\nCattle: primary left ear,\nsecondary right ear\n[A — Art. 30(2)]"]
    C --> D["Animal registered on\nCentral Database\n[A — Art. 16]"]
    D --> E{Active — life events}

    E --> F["Owner applies for\nMovement Permit\n[A — Art. 21]"]
    F --> G{All conditions\nmet?}
    G -- No --> H["Permit rejected\nOwner notified\n[A — Art. 21(4)]"]
    G -- Yes --> I["Permit issued\n(paper or electronic)\n[A — Art. 22]"]
    I --> J["Animals moved\nPermit accompanies animals\n[A — Art. 21(5)]"]
    J --> K["Receiver endorses permit\nNotifies nearest LITS officer\n[A — Art. 23(3)]"]
    K --> L["Animal's current premises\nupdated in central database"]
    L --> E

    E --> M["Health event recorded\nby vet officer\n[A — Art. 14(5)(b)]"]
    M --> N{Health\nrestriction\nimposed?}
    N -- Yes --> O["Movement permits blocked\n[A — Art. 21(4)(c)]"]
    O --> P["Restriction lifted\nby vet officer"]
    P --> E
    N -- No --> E

    E --> Q["Vaccination event\nrecorded against campaign\n[B]"]
    Q --> E

    E --> R["Animal arrives at\nregistered market\n[A — Art. 23(5)]"]
    R --> S["Tag scanned\nCheck-in recorded\n[B]"]
    S --> T["Animal sold or returned\nCheck-out recorded\n[B]"]
    T --> F

    E --> U{End of life?}

    U -- On-farm death --> V["Animal Termination Notice\nsubmitted within 21 days\n[A — Art. 24(1)]"]
    V --> W["Status → Dead\n[B]"]

    U -- Death in transit --> X["Animal Termination Notice\nsubmitted within 48 hours\n[A — Art. 24(3)]"]
    X --> W

    U -- Slaughter --> Y["Abattoir checks central\ndatabase for eligibility\n[A — Art. 25(3)]"]
    Y --> Z["Animal slaughtered\nAID removed\nCarcass marked\n[A — Art. 36(2)(c), Art. 38]"]
    Z --> AA["Slaughter notification\nto LITS officer\n[A — Art. 25(1)]"]
    AA --> AB["Status → Slaughtered\n[B]"]

    U -- Live export --> AC["Vet officer issues AHC\n[A — Art. 2]"]
    AC --> AD["Exit declaration at\ntransitional facility\n[A — Art. 13(1)(b)]"]
    AD --> AE["Border scan; animal\nexits Somalia"]
    AE --> AF["Status → Exported\n[B]"]

    W --> AG([End])
    AB --> AG
    AF --> AG
```

---

## 3. Tag (AID) Lifecycle

```mermaid
flowchart TD
    A([Tag Manufactured]) --> B["Manufacturer applies for\nAID type approval\n[A — Art. 27(4)]"]
    B --> C{Minister\napproves?}
    C -- No --> D["Application rejected\n[A — Art. 27(9)]"]
    C -- Yes --> E["Tags manufactured with\nAuthority-allocated numbers\n[A — Art. 29(1)(b)]"]
    E --> F["Tags assembled into\nbags of 25 sequential numbers\nwith bag serial number\n[B]"]
    F --> G["Manufacturer notifies\nAuthority within 48h:\ntag codes + recipient details\n[A — Art. 29(2)]"]
    G --> H["Authority notifies\nDB Administrator\n[A — Art. 29(4)]"]
    H --> I["Bags held in\nNational Store\n[B]"]
    I --> J["Transfer to Regional Office\nCustody event recorded\n[B]"]
    J --> K["Transfer to Field Officer\nCustody event recorded\n[B]"]
    K --> L["Allocation to Owner\nCustody event recorded\n[B]"]

    L --> M{Tag used?}
    M -- Applied to animal --> N["Tag applied to animal\nAnimal registered in DB\nTag status: Active\n[A — Art. 16]"]
    M -- Unused --> O["Owner safeguards unused tags\nReports any loss immediately\n[A — Art. 37]"]

    O -- Bag lost --> P["All 25 tag numbers\nflagged as compromised\n[B]"]
    P --> Q([Investigation / recall])

    N --> R{During animal's life}
    R -- Tag intact --> R
    R -- Tag lost/damaged --> S["Replacement required within\n30 days or before animal\nleaves facility\n[A — Art. 34(1)]"]
    S --> T{Same number\navailable?}
    T -- Yes --> U["Replacement with same number\nDB updated\n[A — Art. 34(1)]"]
    T -- No --> V["New number assigned\nAuthority notified within 21 days\nBoth numbers linked in DB\n[A — Art. 35(1)]"]
    U --> N
    V --> N

    R -- Animal slaughtered --> W["Tag removed at slaughter\n[A — Art. 36(2)(c)]"]
    R -- Animal dies --> X["Tag removed by owner\nupon death\n[A — Art. 36(2)(d)]"]
    W --> Y([Tag End of Life])
    X --> Y
```

---

## 4. Movement Permit Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PendingApplication : Owner or authorised agent applies
    PendingApplication --> UnderReview : LITS officer reviews application
    UnderReview --> Issued : All conditions met [A — Art. 21(4)]
    UnderReview --> Rejected : One or more conditions fail [A — Art. 21(4)]
    Issued --> InTransit : Animals depart origin premises
    InTransit --> Confirmed : Receiver endorses permit at destination [A — Art. 23(3)]
    Issued --> Expired : Permit not used within validity period
    Expired --> Returned : Unused permit returned within 7 days of expiry [A — Art. 23(6)]
    Confirmed --> [*]
    Returned --> [*]
    Rejected --> [*]
```

**Movement permit issuance conditions [A — Art. 21(4)]:**

| Condition | Verified by |
|---|---|
| Animal bears an approved AID | System check |
| Origin premises is registered and Active | System check |
| Destination premises is registered and Active (or is outside Somalia for export) | System check |
| Neither premises is under a movement restriction or quarantine | System check |
| Animal health status does not pose a risk to either facility | Veterinary officer / system |
| If applicant is not the owner: written authorisation on record | Officer review |
| All previous permits for destination have been accounted for | System check |
| Animal is not in Dead, Slaughtered, or Exported status | System check |

---

## 5. Premises Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PendingApproval : Registration submitted by owner or field officer
    PendingApproval --> Active : Approved by Authority
    PendingApproval --> Rejected : Application rejected
    Active --> Suspended : Movement restriction imposed or compliance failure
    Suspended --> Active : Restriction lifted by Authority
    Active --> Closed : Owner voluntarily closes or Authority closes
    Suspended --> Closed : Authority closes suspended premises
    Closed --> [*]
    Rejected --> [*]
```

---

## 6. Tag Bag Custody Chain

```mermaid
sequenceDiagram
    participant MFR as Manufacturer
    participant AUTH as Authority / DB Admin
    participant NS as National Store
    participant RO as Regional Office
    participant FO as Field Officer
    participant OWN as Owner

    MFR->>AUTH: Notify within 48h of supply — tag codes, recipient, quantity [A — Art. 29(2)]
    AUTH->>AUTH: Record bags in DB; notify DB Administrator [A — Art. 29(4)]
    MFR->>NS: Physical delivery of sealed tag bags [B]
    NS->>AUTH: Confirm receipt; custody event recorded [B]
    NS->>RO: Transfer bags; custody event recorded [B]
    RO->>FO: Issue bags to field officer; custody event recorded [B]
    FO->>OWN: Allocate bag(s) to owner; custody event recorded [B]
    OWN->>OWN: Apply tags to animals; activate each tag in DB [A — Art. 16]
    OWN->>AUTH: Lost bag reported immediately; 25 numbers flagged [A — Art. 37 / B]
```

---

## 7. Key Business Rules Summary

| Rule | Class |
|---|---|
| An animal has only one current owner at a time | B |
| An animal has only one current premises at a time | B |
| An animal has only one active primary tag at a time | A |
| Tag replacement does not create a new animal record | B |
| Completed movements cannot be deleted | B |
| Dead, Slaughtered, or Exported animals cannot make another live-animal movement | B |
| Health events and animal movements are separate records | B |
| A vaccination does not automatically create a movement | B |
| A health restriction may block a movement | A |
| An approved Active premises is required for normal movement origin and destination | A |
| All timestamps are recorded in UTC | B |
| Traceability records are never physically deleted | B |

---

STEP COMPLETE — awaiting approval before continuing.
