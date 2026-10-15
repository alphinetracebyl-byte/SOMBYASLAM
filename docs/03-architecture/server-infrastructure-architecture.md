# SOMLITS — Complete Server Infrastructure Architecture

**Version:** 1.0  
**Date:** 2026-09-04  
**Scope:** Hybrid on-premises + Azure deployment with high availability and redundancy

---

## 1. Architecture Overview

SOMLITS operates as a **hybrid infrastructure**: five physical servers in the Mogadishu national data centre handle all day-to-day operations and provide offline resilience. Azure (East Africa region) provides cloud-scale DR, global CDN delivery of portal apps, and seamless failover.

**Design principles:**
- No single point of failure on-premises (active/passive LB pair, dual app nodes, primary + standby DB)
- All four portals are hosted on **both** on-premises servers and Azure — traffic is routed intelligently
- Microservices run on both on-premises app servers (mirrored) and Azure Container Apps
- PostgreSQL primary lives on-premises; Azure PostgreSQL receives streaming replication for DR
- VPN Site-to-Site tunnel keeps on-prem and Azure in sync at all times

---

## 2. High-Level Architecture Diagram

```mermaid
graph TB
    classDef azure fill:#0078D4,color:#fff,stroke:#005A9E
    classDef onprem fill:#2E7D32,color:#fff,stroke:#1B5E20
    classDef portal fill:#6A1B9A,color:#fff,stroke:#4A148C
    classDef user fill:#E65100,color:#fff,stroke:#BF360C
    classDef infra fill:#37474F,color:#fff,stroke:#263238

    subgraph USERS["👤 End Users"]
        U1([Farmers\nMobile / Web]):::user
        U2([Field Officers\nTablet / Web]):::user
        U3([Ministry Staff\nDesktop / Web]):::user
        U4([Export Officers\nDesktop / Web]):::user
    end

    subgraph DNS_LAYER["🌐 Global Traffic Entry"]
        CF[Cloudflare\nDNS + DDoS\nProtection]:::infra
        TM[Azure Traffic\nManager\nHealth-based\nfailover routing]:::azure
    end

    subgraph AZURE_REGION["☁️  Microsoft Azure — East Africa (Primary Cloud)"]
        AFD[Azure Front Door\nGlobal CDN + WAF\nSSL Termination]:::azure

        subgraph AZURE_PORTALS["Portal Apps — Azure Static Web Apps"]
            FP_AZ[🌾 Farmer Portal\nSWA — farmer.somlits.gov.so]:::portal
            FF_AZ[🚜 Field Portal\nSWA — field.somlits.gov.so]:::portal
            MP_AZ[🏛️ Ministry Portal\nSWA — ministry.somlits.gov.so]:::portal
            EP_AZ[🚢 Export Portal\nSWA — export.somlits.gov.so]:::portal
        end

        APIM[Azure API Management\nAPI Gateway · OAuth2 · Rate Limiting\nVersioning · Developer Portal]:::azure

        subgraph ACA["Azure Container Apps — Microservices"]
            SVC1_AZ[identity-access-service]:::azure
            SVC2_AZ[owner-org-service]:::azure
            SVC3_AZ[animal-registry-service]:::azure
            SVC4_AZ[tag-inventory-service]:::azure
            SVC5_AZ[premises-service]:::azure
            SVC6_AZ[movement-tracking-service]:::azure
            SVC7_AZ[vet-health-service]:::azure
            SVC8_AZ[quarantine-export-service]:::azure
            SVC9_AZ[market-trade-service]:::azure
            SVC10_AZ[abattoir-service]:::azure
            SVC11_AZ[certification-service]:::azure
            SVC12_AZ[traceability-service]:::azure
            SVC13_AZ[reporting-service]:::azure
            SVC14_AZ[notification-service]:::azure
        end

        subgraph AZURE_DATA["Azure Data Layer"]
            PG_AZ[(Azure PostgreSQL\nFlexible Server\nZone-Redundant\nHA Standby)]:::azure
            SB[Azure Service Bus\nEvent Bus\nOutbox relay]:::azure
            BLOB[Azure Blob Storage\nGRS · Media · Exports]:::azure
            KV[Azure Key Vault\nSecrets · Certs\nRotation]:::azure
        end

        KC_AZ[Keycloak Cluster\n3 replicas\nContainer Apps]:::azure
        MON[Azure Monitor\nApp Insights\nLog Analytics]:::azure
    end

    subgraph VPN_LAYER["🔒 Secure Connectivity"]
        VPNGW[Azure VPN Gateway\nSite-to-Site IPSec\nDual redundant tunnels\n99.9% SLA]:::infra
    end

    subgraph ONPREM["🏢 On-Premises — Mogadishu National Data Centre"]
        subgraph SRV1["SERVER 1 · LB-1 — Active Load Balancer"]
            LB1[HAProxy + Nginx\nVirtual IP: 10.10.0.10\nSSL · WAF · Active]:::onprem
            KC1[Keycloak Node 1]:::onprem
        end

        subgraph SRV2["SERVER 2 · LB-2 — Passive Load Balancer HA"]
            LB2[HAProxy + Nginx\nVRRP Standby\nAuto-takeover if LB-1 fails]:::onprem
            KC2[Keycloak Node 2]:::onprem
        end

        subgraph SRV3["SERVER 3 · APP-1 — Primary Application Node"]
            APP1[Docker Engine\nidentity-access-service\nowner-org-service\nanimal-registry-service\ntag-inventory-service\npremises-service\nmovement-tracking-service\nvet-health-service]:::onprem
            FP_OP[🌾 Farmer Portal\nNginx static]:::portal
            FF_OP[🚜 Field Portal\nNginx static]:::portal
        end

        subgraph SRV4["SERVER 4 · APP-2 — Secondary Application Node"]
            APP2[Docker Engine\nquarantine-export-service\nmarket-trade-service\nabattoir-service\ncertification-service\ntraceability-service\nreporting-service\nnotification-service\n+ mirror of APP-1 services]:::onprem
            MP_OP[🏛️ Ministry Portal\nNginx static]:::portal
            EP_OP[🚢 Export Portal\nNginx static]:::portal
        end

        subgraph SRV5["SERVER 5 · DB-1 — Primary Database"]
            PG_PRI[(PostgreSQL 16\nPrimary\nAll service schemas\nRow-level security)]:::onprem
            PG_STB[(PostgreSQL\nWarm Standby\nStreaming replication\nfrom primary)]:::onprem
            NFS[Local NFS\nMedia · Backups\nAudit archives]:::onprem
        end
    end

    %% User to DNS
    U1 & U2 & U3 & U4 --> CF
    CF --> TM

    %% Traffic Manager routing
    TM -->|Primary: Cloud portals| AFD
    TM -->|Fallback: On-prem| LB1

    %% Azure Front Door to Portals
    AFD --> FP_AZ & FF_AZ & MP_AZ & EP_AZ
    AFD --> APIM

    %% APIM to Azure services
    APIM --> ACA
    APIM --> KC_AZ

    %% Azure services to data
    ACA --> PG_AZ
    ACA --> SB
    ACA --> BLOB
    ACA --> KV
    ACA --> MON

    %% On-prem internal
    LB1 <-->|VRRP heartbeat| LB2
    LB1 --> APP1 & APP2
    LB2 --> APP1 & APP2
    APP1 & APP2 --> PG_PRI
    PG_PRI -->|Streaming replication| PG_STB

    %% VPN bridge
    VPNGW <-->|IPSec tunnel| LB1
    VPNGW <-->|IPSec tunnel| LB2
    VPNGW <-->|DB sync| PG_PRI
    VPNGW --> APIM

    %% DB replication to Azure
    PG_PRI -->|Logical replication| PG_AZ
```

---

## 3. On-Premises Server Roles (5 Servers)

| Server | Role | Key Software | IP |
|--------|------|-------------|-----|
| **SRV-1 · LB-1** | Active Load Balancer + Auth Node | HAProxy, Nginx, Keycloak Node 1 | 10.10.0.11 (VIP: 10.10.0.10) |
| **SRV-2 · LB-2** | Passive Load Balancer (HA failover) | HAProxy, Nginx, Keycloak Node 2 | 10.10.0.12 |
| **SRV-3 · APP-1** | Primary Application Node | Docker Engine, 7 microservices + Farmer/Field portal static | 10.10.0.13 |
| **SRV-4 · APP-2** | Secondary Application Node | Docker Engine, 7 microservices + Ministry/Export portal static + mirror | 10.10.0.14 |
| **SRV-5 · DB-1** | Primary Database + Warm Standby | PostgreSQL 16 Primary, PostgreSQL Standby, NFS | 10.10.0.15 |

---

## 4. Portal Hosting Map

Each portal is deployed to **both on-premises and Azure**. Traffic Manager determines which path users hit.

```mermaid
graph LR
    classDef portal fill:#6A1B9A,color:#fff
    classDef azure fill:#0078D4,color:#fff
    classDef onprem fill:#2E7D32,color:#fff

    subgraph Portals["4 Portals"]
        FP[🌾 Farmer Portal\nfarmer.somlits.gov.so]:::portal
        FF[🚜 Field Portal\nfield.somlits.gov.so]:::portal
        MP[🏛️ Ministry Portal\nministry.somlits.gov.so]:::portal
        EP[🚢 Export Portal\nexport.somlits.gov.so]:::portal
    end

    subgraph AZ["Azure (Primary)"]
        FP_A[Azure Static Web App\n+ CDN edge caching]:::azure
        FF_A[Azure Static Web App\n+ CDN edge caching]:::azure
        MP_A[Azure Static Web App\n+ CDN edge caching]:::azure
        EP_A[Azure Static Web App\n+ CDN edge caching]:::azure
    end

    subgraph OP["On-Premises (Fallback / Offline)"]
        FP_O[SRV-3 · APP-1\nNginx static serve]:::onprem
        FF_O[SRV-3 · APP-1\nNginx static serve]:::onprem
        MP_O[SRV-4 · APP-2\nNginx static serve]:::onprem
        EP_O[SRV-4 · APP-2\nNginx static serve]:::onprem
    end

    FP -->|Primary| FP_A
    FP -->|Failover| FP_O
    FF -->|Primary| FF_A
    FF -->|Failover| FF_O
    MP -->|Primary| MP_A
    MP -->|Failover| MP_O
    EP -->|Primary| EP_A
    EP -->|Failover| EP_O
```

---

## 5. Microservice Hosting Map

All 14 microservices run in **both environments** simultaneously. Azure Container Apps are the active-scale path; on-premises handles local and offline scenarios.

```mermaid
graph TB
    classDef azure fill:#0078D4,color:#fff
    classDef onprem fill:#2E7D32,color:#fff

    subgraph SVCS["14 Microservices"]
        direction TB
        S1[identity-access-service]
        S2[owner-org-service]
        S3[animal-registry-service]
        S4[tag-inventory-service]
        S5[premises-service]
        S6[movement-tracking-service]
        S7[vet-health-service]
        S8[quarantine-export-service]
        S9[market-trade-service]
        S10[abattoir-service]
        S11[certification-service]
        S12[traceability-service]
        S13[reporting-service]
        S14[notification-service]
    end

    subgraph AZ_SVC["Azure Container Apps\n(auto-scale · zone-redundant)"]
        AZ_GRP_A[Group A — Core\nidentity · owner · animal · tag]:::azure
        AZ_GRP_B[Group B — Operations\npremises · movement · vet · quarantine]:::azure
        AZ_GRP_C[Group C — Trade & Reporting\nmarket · abattoir · cert · trace · report · notify]:::azure
    end

    subgraph OP_SVC["On-Premises Docker\nSRV-3 APP-1 + SRV-4 APP-2"]
        OP_APP1[APP-1 · SRV-3\nidentity · owner · animal\ntag · premises · movement · vet]:::onprem
        OP_APP2[APP-2 · SRV-4\nquarantine · market · abattoir\ncert · trace · report · notify\n+ mirror of APP-1]:::onprem
    end

    S1 & S2 & S3 & S4 --> AZ_GRP_A
    S5 & S6 & S7 & S8 --> AZ_GRP_B
    S9 & S10 & S11 & S12 & S13 & S14 --> AZ_GRP_C

    S1 & S2 & S3 & S4 & S5 & S6 & S7 --> OP_APP1
    S8 & S9 & S10 & S11 & S12 & S13 & S14 --> OP_APP2
```

---

## 6. High Availability & Redundancy Matrix

| Component | On-Prem HA | Azure HA | Failover Mechanism |
|-----------|-----------|---------|-------------------|
| **Load Balancer** | SRV-1 active + SRV-2 passive (VRRP, <1s failover) | Azure Front Door (global anycast) | VRRP auto-takeover |
| **Farmer Portal** | SRV-3 Nginx | Azure SWA + CDN | Traffic Manager health probe |
| **Field Portal** | SRV-3 Nginx | Azure SWA + CDN | Traffic Manager health probe |
| **Ministry Portal** | SRV-4 Nginx | Azure SWA + CDN | Traffic Manager health probe |
| **Export Portal** | SRV-4 Nginx | Azure SWA + CDN | Traffic Manager health probe |
| **Microservices** | SRV-3 + SRV-4 mirrored | Azure Container Apps (min 2 replicas, zone-spread) | LB removes failed instance |
| **Keycloak (Auth)** | SRV-1 + SRV-2 cluster | 3-replica Container App | Session replication |
| **PostgreSQL** | SRV-5 Primary + Warm Standby | Azure PostgreSQL Zone-Redundant | Logical replication + manual promote |
| **API Gateway** | HAProxy on SRV-1/SRV-2 | Azure APIM (zone-redundant) | Traffic Manager |
| **Connectivity** | — | VPN dual tunnels | Auto-BGP failover to secondary tunnel |

---

## 7. Database Replication Architecture

```mermaid
graph LR
    classDef primary fill:#B71C1C,color:#fff
    classDef standby fill:#E53935,color:#fff,stroke-dasharray:5 5
    classDef azure fill:#0078D4,color:#fff

    PG_PRI[(SRV-5\nPostgreSQL 16\nPrimary\n10.10.0.15:5432)]:::primary
    PG_STB[(SRV-5\nPostgreSQL\nWarm Standby\nSync replication)]:::standby
    PG_AZ[(Azure PostgreSQL\nFlexible Server\nZone-Redundant\nEast Africa)]:::azure
    PG_AZ_STB[(Azure PostgreSQL\nHA Standby\nSame region\ndifferent zone)]:::standby

    PG_PRI -->|Synchronous\nstreaming replication| PG_STB
    PG_PRI -->|Logical replication\nover VPN IPSec| PG_AZ
    PG_AZ -->|Automatic\nzone failover| PG_AZ_STB

    note1[RPO: ~0s on-prem\nRPO: <30s Azure\nRTO: <60s LB failover\nRTO: <5min Azure promote]
```

---

## 8. Network Topology

```mermaid
graph TB
    classDef dmz fill:#F57F17,color:#fff
    classDef internal fill:#1565C0,color:#fff
    classDef db fill:#4A148C,color:#fff
    classDef azure fill:#0078D4,color:#fff

    subgraph INTERNET["Internet"]
        ISP[Somalia ISP\nRedundant uplinks]
    end

    subgraph DMZ["DMZ — 10.10.1.0/24"]
        FW[Firewall\nPfSense cluster\nActive/Passive]:::dmz
        SRV1_NIC[SRV-1 LB-1\n10.10.1.11]:::dmz
        SRV2_NIC[SRV-2 LB-2\n10.10.1.12]:::dmz
    end

    subgraph APP_NET["App Network — 10.10.2.0/24"]
        SRV3_NIC[SRV-3 APP-1\n10.10.2.13]:::internal
        SRV4_NIC[SRV-4 APP-2\n10.10.2.14]:::internal
    end

    subgraph DB_NET["DB Network — 10.10.3.0/24"]
        SRV5_NIC[SRV-5 DB-1\n10.10.3.15]:::db
    end

    subgraph AZURE_NET["Azure VNet — 172.16.0.0/16"]
        VPNGW_AZ[VPN Gateway\n172.16.0.4]:::azure
        ACA_SUBNET[Container Apps Subnet\n172.16.1.0/24]:::azure
        DB_SUBNET[PostgreSQL Subnet\n172.16.2.0/24]:::azure
    end

    ISP --> FW
    FW --> SRV1_NIC & SRV2_NIC
    SRV1_NIC & SRV2_NIC --> SRV3_NIC & SRV4_NIC
    SRV3_NIC & SRV4_NIC --> SRV5_NIC
    SRV5_NIC -->|IPSec VPN| VPNGW_AZ
    VPNGW_AZ --> ACA_SUBNET & DB_SUBNET
```

---

## 9. CI/CD Deployment Flow

```mermaid
graph LR
    DEV[Developer\npush to GitHub] -->|PR + merge| GHA[GitHub Actions\nCI Pipeline]
    GHA -->|Build + test| DOCKER[Docker image\nGitHub Container Registry]
    DOCKER -->|Deploy| ACA_DEPLOY[Azure Container Apps\nBlue/Green deploy]
    DOCKER -->|Deploy on-prem| OP_DEPLOY[On-prem Docker\nRolling update via\nAnsible playbook]
    GHA -->|Build React| SWA_DEPLOY[Azure Static Web Apps\nCDN invalidation]
    GHA -->|Sync static| OP_STATIC[SRV-3 + SRV-4\nNginx static sync\nrsync over VPN]
```

---

## 10. Open Questions for Ministry Approval

| # | Question | Impact |
|---|----------|--------|
| 1 | Are 5 physical servers to be provisioned by the Ministry or procured under the project? | Timeline |
| 2 | Is a dedicated fibre link or MPLS available between the data centre and Azure? (affects VPN vs ExpressRoute choice) | Cost / latency |
| 3 | Should on-premises be the **primary** path for all traffic, or Azure primary with on-prem as DR? | Architecture direction |
| 4 | What is the acceptable RTO (Recovery Time Objective) for database failover? | DR strategy |
| 5 | Who manages Keycloak cluster administration on-premises? | Ops model |
| 6 | Is a separate management VLAN / bastion host required for server administration? | Security |
| 7 | Will field offices have local caching proxies or is all traffic routed via Mogadishu? | WAN sizing |

---

STEP COMPLETE — awaiting approval before continuing.
