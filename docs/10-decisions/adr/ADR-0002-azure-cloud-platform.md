# ADR-0002 — Azure as Cloud Platform

**Date:** 2026-07-18
**Status:** Accepted
**Deciders:** MoLFR IT Administration, Ministry of Finance Procurement, SOMLITS Technical Lead

---

## Context

SOMLITS requires a cloud hosting platform for its 14 microservices, 15 PostgreSQL databases, message bus, blob storage, API gateway, identity provider, CDN, monitoring, and backup infrastructure. The Federal Government of Somalia's Ministry of Finance is the contracting authority. Somalia has limited domestic data centre infrastructure suitable for a national government system of this scale.

The selection must account for:
- Proximity to Somalia (latency for Mogadishu-based users)
- Existing government technology agreements
- Availability of a managed Kubernetes alternative (Somalia's MoLFR IT team cannot operate Kubernetes)
- GDPR and data sovereignty considerations (MoF policy: data must not reside in East African competitor nations' jurisdictions)
- Long-term sustainability: the platform must not require Somalia-based DevOps engineers with specialised proprietary skills

---

## Decision

**SOMLITS is deployed on Microsoft Azure**, using UAE North as the primary region and South Africa North as the secondary (DR) region.

The specific Azure services selected are:

| Need | Azure Service |
|---|---|
| Container hosting | Azure Container Apps (Consumption plan) |
| Database | Azure Database for PostgreSQL Flexible Server |
| Message bus | Azure Service Bus Premium |
| Blob storage | Azure Blob Storage (RA-GRS) |
| API gateway | Azure API Management |
| Identity (hosted) | Keycloak on Container Apps (not Azure AD B2C) |
| CDN / WAF | Azure Front Door |
| Secrets | Azure Key Vault (Premium, HSM-backed in prod) |
| Monitoring | Azure Monitor + Application Insights |
| Container registry | Azure Container Registry |
| Frontend hosting | Azure Static Web Apps |
| IaC | Azure Bicep |

---

## Rationale

### Why Azure over AWS or GCP

1. **UAE North region**: Azure has a full-featured region in Dubai (UAE North), providing approximately 30–60ms latency to Mogadishu — competitive with AWS (no UAE region at the time of decision; closest: Bahrain) and GCP (no Gulf region).

2. **Microsoft government relationships**: Microsoft has existing relationships with several African Union member state governments and the IGAD regional body. MoF Somalia has prior exposure to Microsoft products (Office 365).

3. **Azure Container Apps**: AWS Fargate and GCP Cloud Run are equivalent, but Azure Container Apps is deeply integrated with Azure Service Bus, Key Vault, and Managed Identity, reducing integration complexity. This is important given MoLFR's limited DevOps capacity.

4. **Managed Identity**: Azure Managed Identity eliminates secrets-in-config for all Azure-to-Azure connections (Container App → Key Vault → PostgreSQL → Service Bus → Blob). AWS IAM roles and GCP service accounts offer similar capability, but Azure's Managed Identity integration with Key Vault is tighter.

5. **IGAD regional programme alignment**: The IGAD LITS regional database (referenced in IGAD Art. 43–44) is expected to be hosted on Azure infrastructure managed through a regional programme. SOMLITS on Azure reduces the integration surface for future regional data sharing.

### Why UAE North as primary region (not Europe)

- Lowest latency from Mogadishu and from Gulf state veterinary authorities (AHC receiving country verification).
- Data sovereignty: UAE North keeps data within the Gulf/Middle East jurisdiction, consistent with Somalia's existing diplomatic and trade relationships with Gulf states.
- South Africa North as secondary: Microsoft Azure's paired region for UAE North; acceptable latency for DR workloads.

### Why not host in Somalia

Somalia has no commercial carrier-neutral data centres meeting ISO 27001 or Tier 3 standards at the time of this decision. Power grid reliability, physical security, and flood risk make domestic hosting unsuitable for a national system.

---

## Consequences

**Accepted costs:**
- Data residency outside Somali territorial jurisdiction. Mitigated by: contractual data processing agreement with Microsoft, standard government cloud addendum (MCCA), data encrypted at rest with customer-managed keys in Key Vault.
- Dependency on Microsoft Azure availability. Mitigated by: dual-region deployment, offline-first client apps, agreed RTO/RPO targets.
- Ongoing Azure subscription cost. Mitigated by: Azure Container Apps Consumption plan (scale-to-zero for low-traffic services), reserved instances for predictable PostgreSQL workloads, Azure Hybrid Benefit where applicable.

**Not accepted:**
- Single-region deployment for production (UAE North must have South Africa North as active DR).
- Azure-managed Kubernetes Service (AKS) — Container Apps only; MoLFR team cannot operate Kubernetes.

---

## Alternatives Considered

### AWS (Amazon Web Services)
No Gulf region at decision time; Bahrain region (me-south-1) adds latency and is not paired with an African DR region. AWS Fargate equivalent to Container Apps but without the same Managed Identity integration depth.

### GCP (Google Cloud Platform)
No Gulf or Middle East region. Nearest region to Somalia is Johannesburg (africa-south1), which adds significant latency for Mogadishu users and for AHC verification by Gulf state authorities.

### On-premise at Ministry data centre
Unsuitable — no suitable Tier 3+ data centre in Somalia at this time.

### IGAD-operated regional infrastructure
Not available for national-level transactional workloads. IGAD infrastructure is suitable for the regional read replica (future ADR), not for Somalia's primary operational database.

---

## Review Trigger

Re-evaluate region strategy if: Azure opens an East Africa region (Kenya or Tanzania) with equivalent or better latency to Mogadishu than UAE North. Re-evaluate entire platform if: Somalia develops Tier 3 data centre infrastructure suitable for government workloads.
