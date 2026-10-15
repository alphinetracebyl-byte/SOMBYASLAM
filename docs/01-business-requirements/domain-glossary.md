# SOMLITS Domain Glossary

**Version:** 0.1 — Draft for Review
**Date:** 2026-07-18
**Status:** Awaiting Ministry Approval

Classification key:
- **[A]** Supported by the IGAD Model Legal Framework for LITS (2016)
- **[B]** Proposed SOMLITS business rule
- **[C]** Requires Somalia Ministry confirmation

Terms are listed alphabetically. Where a term originates from the IGAD LITS framework, the source Article is cited.

---

| Term | Definition | Source | Class |
|---|---|---|---|
| **AHC** | Animal Health Certificate. A certificate issued by an authorised veterinary officer certifying the health status of an animal or consignment for trade or export purposes. | Art. 2 | A |
| **AID** | Animal Identification Device. Any device — ear tag, RFID transponder, bolus, subcutaneous chip, or brand — approved by the Minister for identifying animals under the LITS Act. | Art. 2 | A |
| **Animal** | Any motile multicellular organism kept for agriculture, commercial, or private use, and any animal declared as such by the Minister by Gazette notice. For SOMLITS, the confirmed in-scope species are cattle, camels, sheep, and goats (pending Ministry confirmation for any additions). | Art. 2 | A/C |
| **Animal Exit Declaration** | A mandatory notification made by an owner at a transitional facility when an animal dies, is lost while at that facility, or is to be exported from Somalia. | Art. 13 | A |
| **Animal Gathering** | A formally organised event or registered location where livestock congregate for trading, showing, or other purposes. Equivalent to a livestock market. Must be registered as a LITS facility. | Art. 23(5) | A |
| **Animal Movement Notice** | A document accompanying a movement permit that lists the individual identification numbers or codes of each animal being moved. | Art. 21(1)(c) | A |
| **Animal Register** | A record maintained by an owner at each facility listing all animals held there, kept up to date and available to inspectors, and retained for at least 10 years after the last entry. | Art. 18 | A |
| **Animal Termination Notice** | A prescribed form submitted to the nearest LITS officer to formally record the death, theft, or stray of an individually registered animal. | Art. 24(1) | A |
| **Annual Stock Count** | A return submitted by an owner to the central database within 30 days of the calendar year end, showing the count of each species held at each facility. | Art. 18(4) | A |
| **Approved Device** | An AID that has been approved by the Minister under Art. 27 for use in identifying animals. Only approved devices may be applied to animals or traded. | Art. 2, Art. 27 | A |
| **AU-IBAR** | African Union Inter-African Bureau for Animal Resources. A regional body providing technical support for LITS implementation. | Art. 2 | A |
| **Audit Log** | An immutable, time-stamped record in SOMLITS of every data change, capturing the actor, action type, timestamp (UTC), and before/after values. Retained for a minimum of 10 years. | — | B |
| **Bounded Context** | A software architecture boundary (from Domain-Driven Design) within which a particular domain model applies and within which a SOMLITS microservice operates. Each bounded context owns its own database. | — | B |
| **Central Database** | The national LITS database established and maintained by the Competent Authority, containing all registrations, notifications, and records required by the Act. | Art. 14 | A |
| **Certificate of Compliance** | A certificate issued by an inspector to a facility owner following a satisfactory inspection finding no contraventions of the Act. | Art. 41(2)(a)(i) | A |
| **Competent Authority** | The office of the DVS/CVO, designated as the national agency responsible for implementing the LITS. May be granted autonomous juristic status. | Art. 6 | A |
| **CVO** | Chief Veterinary Officer, or a person duly acting in that capacity. The head of the Competent Authority. | Art. 2 | A |
| **Custody Event** | A recorded transfer of a tag bag from one party to another in SOMLITS, capturing sender, receiver, bag serial number, date, and transfer method. | — | B |
| **Delegate** | A person (employee or agent) to whom an owner has granted scoped access to perform SOMLITS functions on their behalf. Delegation is always revocable and generates an audit trail. A delegate cannot further delegate. | — | B |
| **DVS** | Director of Veterinary Services, or a person duly acting in that capacity. | Art. 2 | A |
| **Exported Animal** | An animal that has been lawfully exported from Somalia under a valid movement permit and AHC. Status in SOMLITS set to `Exported`. The animal's active Somalia registration is closed; no further live-animal movement permit may be issued. | — | B |
| **Facility** | Any place, land, building, establishment, premises, conveyance, or structure where animals are kept or a livestock activity is conducted, and which has been registered under the Act. Also called Premises in SOMLITS. Types include farm, pastoral area, transit facility, market, abattoir, quarantine station, border inspection post, and export holding facility. | Art. 2 | A |
| **Field Officer** | A LITS officer appointed by the Competent Authority at district or regional level. First point of contact for owners for registration, permit processing, tag bag distribution, and termination notices. | Art. 12 | A |
| **Health Restriction** | A flag applied to an animal, premises, or geographic area by an authorised veterinary officer that blocks the issuance of movement permits until the restriction is formally lifted. | Art. 21(4)(c) | A |
| **Herd** | A group of livestock kept together under the ownership and charge of one owner. A herd may share common batch identification for vaccination or movement purposes. | Art. 26(3)(b) | A |
| **ICAR** | International Committee for Animal Recording. Issues guidelines for RFID transponder standards (ISO 11784/11785) referenced in the IGAD framework for AID selection. | Art. 48(e) | A |
| **ICPALD** | IGAD Centre for Pastoral Areas and Livestock Development. Hosts the regional LITS initiative, coordinates regional programmes, and supports member states in implementing national LITS. | Art. 2 | A |
| **IGAD** | Inter-Governmental Authority on Development. The regional body whose Model LITS Legal Framework (2016) provides the legal basis for SOMLITS. Member states include Somalia, Ethiopia, Kenya, Uganda, Sudan, South Sudan, and Djibouti. | Art. 2 | A |
| **Inspector** | A duly appointed or designated person (usually a qualified veterinarian) with powers under the Act to enter, inspect, and enforce compliance with the LITS. Carries a serialised photo identity card issued by the Authority. | Art. 39, Art. 40 | A |
| **Livestock** | Cattle, sheep, goats, pigs, and camels; and any other animal declared as livestock by the Minister by Gazette notice. For SOMLITS, the operative species are cattle, camels, sheep, and goats. | Art. 2 | A |
| **LITS** | Livestock Identification and Traceability System. The national system for registering, identifying, and tracing livestock from birth to death, slaughter, or export. | Art. 2 | A |
| **Minister** | The Minister responsible for livestock development, animal health, public health, and food safety matters. | Art. 2 | A |
| **Movement Permit** | A document (paper or electronic) issued by the Authority or an authorised officer, authorising the movement of specified animals from a registered origin facility to a destination within a defined period. | Art. 21 | A |
| **OIE / WOAH** | World Organisation for Animal Health. Sets international standards for animal disease reporting, Animal Health Certification, and biosecurity. | Art. 2 | A |
| **Outbox Pattern** | A microservices reliability pattern used in SOMLITS: each service writes a domain event to a transactional outbox table within the same database transaction, before a separate process dispatches the event to Azure Service Bus. Ensures no event is lost if the service crashes between writing and dispatching. | — | B |
| **Owner** | Any natural person or organisation that owns and/or keeps animals, including an agent of the owner. | Art. 2 | A |
| **Owner Code** | A unique alphanumeric code assigned to a registered owner in SOMLITS. Forms part of the animal identification number under the national numbering scheme. | Art. 28(2)(a) | A |
| **Premises** | See Facility. In SOMLITS documentation and code, "premises" is the preferred term for a registered livestock location. | Art. 2 | A |
| **Premises Code** | A unique alphanumeric code assigned to a registered premises upon approval. Forms part of the animal identification number under the national numbering scheme. | Art. 26(1) | A |
| **Primary Tag** | The first ear tag applied to an animal; for cattle this is the left ear. An animal may have only one active primary tag at a time. A replacement primary tag does not create a new animal record. | Art. 30(2)(a) | A |
| **Quarantine** | A restriction applied to an animal, premises, or geographic zone by an authorised officer, preventing inward or outward movement while the quarantine order is active. | Art. 21(7)(c) | A |
| **Quarantine Order** | A formal record raised in SOMLITS by an authorised officer placing specified animals, premises, or a zone into quarantine. Records: reason, issuing officer, date raised, expected duration, and scope. | — | B |
| **RFID** | Radio Frequency Identification Device. An electronic AID (ear tag, bolus, or implant) that can be read by electronic scanner without line-of-sight contact. Listed in the IGAD First Schedule of approved AID types. | Art. 2, First Schedule | A |
| **Secondary Tag** | A second ear tag applied to an animal for redundancy; for cattle this is the right ear. Enables identification if the primary tag is lost. | Art. 30(2)(b) | A |
| **Slaughtered Animal** | An animal lawfully slaughtered at a registered abattoir whose slaughter has been notified to the Authority. Status in SOMLITS set to `Slaughtered`. No further movement permit may be issued. | Art. 25 | A |
| **SOMLITS** | Somalia Livestock Identification and Traceability System. The national digital platform being developed to fulfil Somalia's obligations under the IGAD LITS framework. | — | B |
| **Stakeholder** | A person other than the owner to whom the LITS Act applies by reason of being part of the livestock value chain: agent, transporter, dealer, exporter, importer, meat processor, AID manufacturer or distributor, or any person declared a stakeholder by the Minister. | Art. 2 | A |
| **Stolen Animal** | An animal reported stolen via an Animal Termination Notice. Status set to `Stolen`. All tag numbers associated with the animal are flagged; any subsequent attempt to register them in a different context triggers an alert. | Art. 24(1) | A |
| **Tag Bag** | A SOMLITS-defined unit of tag distribution: a sealed bag containing exactly 25 sequentially numbered approved ear tags with a unique bag serial number. Every bag is tracked from manufacturer through distribution chain to owner. | — | B |
| **Tag Bag Serial Number** | A unique identifier printed on each tag bag, used to track custody and transfer of bags from manufacture through the distribution chain to the owner. | — | B |
| **Trace-back** | A SOMLITS query that, given a tag number or animal UUID, returns the complete chain of events: birth registration, all ownership transfers, all premises locations, all health events, and all movements from birth to the present. | Art. 3(f), Art. 14(5)(i) | A |
| **Trace-forward** | A SOMLITS query that, given an animal, premises, or health event, returns all animals that may have been exposed through co-location at the same premises or co-movement under the same permit within a configurable time window. Used in disease outbreak response. | Art. 14(5)(f) | A |
| **Transit Facility** | A registered premises used as a temporary holding point during animal movement between origin and destination (e.g., roadside holding pen, border inspection post). | Art. 13 | A |
| **UUID** | Universally Unique Identifier. Used as the internal primary key for all aggregates in SOMLITS (animals, owners, premises, tags, permits, events). Human-readable business codes are maintained separately. | — | B |
| **Vaccination Campaign** | A coordinated mass vaccination event conducted by government or authorised veterinary officers, covering a named target species in a target region during a defined date range. Each campaign is named and tracked in SOMLITS. | — | B |
| **Veterinary Officer** | A duly qualified government veterinary officer appointed in accordance with government procedures. Has authority to record health events, impose and lift health restrictions, issue AHCs, and authorise quarantine orders. | Art. 2 | A |
| **Walking Permit** | A permit issued by a LITS officer authorising an owner to graze animals outside the boundary of the registered facility. The person in charge of the animals must carry a copy at all times during grazing. | Art. 21(10) | A |
| **WTO** | World Trade Organization. Referenced in the IGAD framework in the context of international trade requirements for livestock traceability. | Art. 2 | A |

---

STEP COMPLETE — awaiting approval before continuing.
