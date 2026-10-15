# SOMLITS Risk Register

**Version:** 0.1 — Draft for Review
**Date:** 2026-07-18
**Status:** Awaiting Ministry Approval

**Classification key:**
- **Probability:** High (likely to occur), Medium (possible), Low (unlikely)
- **Impact:** High (threatens project success or national LITS objectives), Medium (significant delay or gap), Low (manageable)
- **Priority:** Critical = High × High; High = High × Medium or Medium × High; Medium = all other combinations

---

## Risk Matrix

| ID | Risk Description | Probability | Impact | Priority | Owner | Mitigation | Contingency |
|---|---|---|---|---|---|---|---|
| R-001 | **Connectivity gaps in rural and pastoral areas.** Mobile internet is unavailable or unreliable in much of rural Somalia. Owners and CAHWs cannot submit real-time registrations, movement permits, or health events. | High | High | Critical | MoLFR / IT Admin | Offline-first mobile app that queues transactions locally and syncs when connectivity is restored. Paper forms accepted at LITS offices with batch upload. SMS-based interaction for basic notifications and simple registrations. | Manual paper records maintained by district officers as fallback; retrospective upload when connectivity is available. |
| R-002 | **Owner and pastoralist resistance to registration.** Somali pastoralists may view formal registration as a government surveillance tool, a taxation risk, or a threat to traditional customs. Low trust in government registration systems. | High | High | Critical | MoLFR / Regional Coordinators | Community engagement through clan elders and religious leaders. Free tag distribution and free vaccinations as incentives. Emphasise proof-of-ownership benefit (anti-rustling). Work through trusted CAHWs rather than government officials where possible. Design for low-literacy users (voice guidance, pictographic UI). | Phased voluntary rollout; avoid mandatory enforcement in early phases. Provide clear benefit messaging. |
| R-003 | **Tag loss in harsh terrain.** Camels, goats, and sheep in desert conditions frequently lose ear tags due to vegetation snagging, fighting, or rough handling. High tag replacement workload. | High | Medium | High | MoLFR / Tag Manufacturer | Mandatory secondary tag for cattle. Durable tag material specifications in AID approval process. Robust 30-day replacement process. Tag replacement fee waiver for smallholders during pilot phase. | RFID bolus as a supplementary tamper-resistant device for camels (high-value animals) if Minister approves. |
| R-004 | **Security — inaccessible conflict zones.** Active conflict in parts of southern and central Somalia makes some areas inaccessible to government officials and LITS officers. Al-Shabaab-controlled areas cannot be enrolled in Phase 0. | High | High | Critical | MoLFR / Ministry of Interior | Begin rollout in accessible, government-controlled areas. Do not require coverage of inaccessible areas in KPIs. Design system to allow data to be entered retrospectively when access is restored. | Accept partial national coverage as a long-term reality; build geographic scope tracking into the rollout dashboard. |
| R-005 | **No enacted Somalia LITS Act at launch.** SOMLITS will likely go live before a formal Somalia LITS Act is enacted. Without legislation, enforcement powers (penalties, inspector powers, mandatory registration) cannot be fully activated. | High | High | Critical | Minister / Attorney General | Operate under a Ministry directive and institutional mandate while legislation is developed. Design all modules to be legislation-ready (the system will enforce rules that become legally backed once the Act is passed). Engage legal drafting in parallel with SOMLITS development. | Prioritise voluntary compliance and incentive-based adoption in pre-legislation period. |
| R-006 | **Federal Member State or Somaliland non-participation.** FMS administrations or Somaliland may decline to participate in the national SOMLITS, fragmenting the national livestock database and undermining traceability for inter-state movements. | Medium | High | High | Minister / FMS negotiations | Engage FMS CVOs and regional authorities early. Design system to support federated data entry with regional autonomy within the national framework. Frame participation as a market-access benefit (export eligibility). | Bilateral data-sharing agreements with non-participating states; accept regional gaps in traceability data. |
| R-007 | **Insufficient field officer and CAHW capacity.** Somalia has a limited number of trained veterinary and LITS officers. The number of animals and premises to be registered will overwhelm field staff without substantial capacity building. | High | High | High | MoLFR / Development Partners | Leverage existing CAHW networks (FAO, FGS-trained). Train CAHWs to use the SOMLITS mobile app. Batch registration events at community level. Prioritise mobile tools that minimise administrative burden. | Development partner support (FAO, EU) for CAHW stipends and training during pilot phase. |
| R-008 | **Tag counterfeiting and tampering.** Fake tags or tampered tags could be used to conceal rustled animals or fraudulently register illegitimate animals, undermining the traceability system. | Medium | High | High | MoLFR / Tag Manufacturer | Require holographic security features on approved tags. Tamper-evident design (one-way locking mechanism). Maintain the manufacturer notification chain (48h supply notification). Flag numbers from lost bags. Inspector checks at markets and abattoirs. | RFID option in later phases makes counterfeiting harder; electronic reader instantly validates against the central database. |
| R-009 | **Informal market dominance.** The majority of Somalia's livestock trade occurs through informal, unregistered markets. Requiring movement permits for all transactions may drive trade further underground if not incentivised. | High | Medium | High | MoLFR / Market Operators | Outreach to informal market operators and livestock traders. Make formal market registration easy and beneficial (market operator gets official status, access to export certification). Gradual enforcement — register first, require permits later. | Accept that informal trade will continue in early phases; focus on high-value export-linked transactions first. |
| R-010 | **Data quality errors from offline and batch registrations.** Offline data entry by CAHWs or paper-form batch uploads may contain errors (wrong tag numbers, wrong species, wrong owner). Data quality issues undermine traceability. | Medium | Medium | Medium | MoLFR / IT Admin | Server-side validation rules at every API endpoint. Mobile app validation before submission. Supervisor review workflow for batch uploads before DB commit. Duplicate detection (tag number already active on another animal). Clear error messaging in Somali. | Retrospective correction workflow: owner or officer can submit a correction with reason; correction is recorded as a new audit event (original record preserved). |
| R-011 | **Financial sustainability after donor funding.** SOMLITS is being implemented through MoF procurement, likely with development partner co-financing. When donor funding ends, the government must sustain the platform. | Medium | High | High | MoF / MoLFR | Design a fee model that recovers operating costs for commercial actors while keeping the system free for smallholder pastoralists. Build government LITS capacity so the platform does not depend on external technical support. Use cloud-native (Azure) to avoid capital expenditure on servers. | Budget line negotiation during next government budget cycle. Explore regional cost sharing with IGAD/ICPALD. |
| R-012 | **Cross-border entry of unregistered animals.** Porous borders with Ethiopia, Kenya, and Djibouti mean large volumes of livestock enter Somalia without formal identification, diluting the integrity of the national LITS database. | High | High | High | MoLFR / IGAD | Prioritise border inspection post enrolment. Work with IGAD to harmonise cross-border identification. Imported animal registration obligation (14-day tagging, 7-day DB registration). Mobile border scanning at key crossing points. | Accept that cross-border flows will not be fully captured at launch; record what is possible and improve coverage over time. |
| R-013 | **Insufficient lab capacity for disease investigation.** The National Veterinary Laboratory in Mogadishu may not have the capacity or the accreditation to test for all priority diseases within a clinically useful timeframe. | High | Medium | High | CVO / NVL | Map current NVL capacity and identify gaps. Establish referral agreements with regional and international reference labs (Kenya, Ethiopia, FAO partner labs). Define clear SLAs for sample turnaround in SOMLITS. | Mobile field testing kits for rapid initial screening at district level; confirmatory testing at NVL or international lab. |
| R-014 | **Receiving country AHC format changes.** Gulf state and other export market import requirements change periodically. AHC templates that are hardcoded may require system changes each time. | Low | High | Medium | MoLFR / CVO | Design AHC templates as configurable per market, not hardcoded. Changes to templates managed through configuration, not code changes. Ministry liaison maintains contact with receiving country veterinary authorities. | Fast-track change process for AHC template updates; separate from normal release cycle. |
| R-015 | **Azure service availability and latency in Mogadishu.** Azure's nearest regions may not provide acceptable latency for field officers using the SOMLITS app in Mogadishu or regional cities. Internet outages at Azure data centres could affect system availability. | Medium | High | High | IT Admin / MoLFR | Select the appropriate Azure region (South Africa North or UAE North, pending SLA review). Use Azure CDN for frontend assets. Offline-first mobile app so transient Azure outages do not block field data entry. Health monitoring via Azure Application Insights. | Redundant Azure region for disaster recovery. Agreed RTO and RPO targets. |
| R-016 | **Conflict between traditional practices and formal LITS requirements.** Requiring ear tags and formal registration may conflict with Xeer customary law, clan marking traditions, or religious sensitivities around animal handling. | Medium | Medium | Medium | MoLFR / Community Engagement | Consult clan elders, religious scholars, and pastoral communities in the design phase. Allow traditional marks to be recorded as supplementary identifiers. Frame SOMLITS as complementary to Xeer, not replacing it. Ensure Halal slaughter recording is built in from the start. | Advisory Board engagement with pastoral community representatives (IGAD Art. 8(2)(f)). |

---

## Risk Tracking Summary

| ID | Risk | Priority | Status |
|---|---|---|---|
| R-001 | Connectivity gaps in rural/pastoral areas | Critical | Open |
| R-002 | Owner/pastoralist resistance | Critical | Open |
| R-003 | Tag loss in harsh terrain | High | Open |
| R-004 | Conflict zone inaccessibility | Critical | Open |
| R-005 | No enacted Somalia LITS Act | Critical | Open |
| R-006 | FMS/Somaliland non-participation | High | Open |
| R-007 | Field officer/CAHW capacity | High | Open |
| R-008 | Tag counterfeiting and tampering | High | Open |
| R-009 | Informal market dominance | High | Open |
| R-010 | Offline data quality errors | Medium | Open |
| R-011 | Financial sustainability post-donor | High | Open |
| R-012 | Cross-border unregistered animals | High | Open |
| R-013 | Lab capacity for disease investigation | High | Open |
| R-014 | Receiving country AHC format changes | Medium | Open |
| R-015 | Azure availability and latency | High | Open |
| R-016 | Traditional practice conflict | Medium | Open |

---

STEP COMPLETE — awaiting approval before continuing.
