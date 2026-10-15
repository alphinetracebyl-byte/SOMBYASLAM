# SOMLITS — Claude Code Guide

## Project Overview
SOMLITS is a livestock identification and traceability system. See `README.md` for the full project description.

## Repository Layout
```
somlits/
├── backend/          # Server-side application code
├── frontend/         # Client-side application code
├── infrastructure/   # IaC, CI/CD, deployment configs
├── docs/             # Structured project documentation
│   ├── 01-business-requirements/
│   ├── 02-workflows/
│   ├── 03-architecture/
│   ├── 04-data-model/
│   ├── 05-api/
│   ├── 06-security/
│   ├── 07-testing/
│   ├── 08-deployment/
│   ├── 09-user-guides/
│   └── 10-decisions/
└── references/       # Source documents, standards, PDFs
```

## Key References
- `references/Livestock-Identification-and-Traceability.pdf` — primary domain standard document

## Documentation Conventions
- Each `docs/` subdirectory is numbered for reading order.
- Architecture Decision Records (ADRs) go in `docs/10-decisions/` using filename pattern `ADR-NNNN-title.md`.
- API specs go in `docs/05-api/` as OpenAPI YAML files.
# SOMLITS Project Instructions

SOMLITS means Somalia Livestock Identification and Traceability System.

This is a government-grade national platform for livestock identification,
registration, health, movement, markets, quarantine, slaughter, certification,
export, trace-back and trace-forward.

Use the following document as the primary domain reference:

@references/Livestock-Identification-and-Traceability.pdf

## Technology stack

Backend:
- Java 21
- Spring Boot
- Spring Security
- Spring Data JPA
- REST APIs
- Maven
- Microservices

Frontend:
- React
- TypeScript

Database:
- PostgreSQL
- Flyway migrations

Azure:
- Azure Container Apps initially
- Azure Database for PostgreSQL
- Azure Service Bus
- Azure Blob Storage
- Azure Key Vault
- Azure API Management
- Azure Monitor and Application Insights
- Infrastructure as Code

## Mandatory working method

Do not build the entire SOMLITS system at once.

Work on only one approved module and one approved phase at a time.

Every module must pass through these phases:

1. Business requirements and workflow documentation
2. Review and approval
3. Database and API design
4. Review and approval
5. Backend implementation and automated tests
6. Review and approval
7. Frontend implementation and tests
8. Review and approval
9. Deployment configuration and final documentation

Stop after every phase and wait for explicit approval.

Do not proceed merely because the next step appears obvious.

Do not create code when the request asks only for documentation or planning.

## Architecture rules

- Use UUID primary keys internally.
- Use readable business codes separately.
- Do not use names as primary keys.
- Each microservice owns its own data.
- Services must not directly access another service's database.
- Use APIs or domain events for cross-service communication.
- All important changes require audit history.
- Do not physically delete traceability records.
- Use status transitions such as Active, Suspended, Cancelled, Retired or Closed.
- All APIs must enforce authorization.
- Use optimistic locking where concurrent updates are possible.
- Use idempotency keys for important commands.
- Use an outbox pattern for reliable domain events.
- Record timestamps in UTC.
- Never expose database entities directly from REST controllers.
- Use DTOs, validation and standardized error responses.
- Do not silently change an approved workflow, schema or API.

## LITS domain rules

- An animal has only one current owner at a time.
- An animal has only one current premises at a time.
- An animal has only one active primary tag at a time.
- Tag replacement does not create a new animal.
- Preserve complete tag, ownership, premises, movement and health history.
- A completed movement cannot be deleted.
- Dead, slaughtered or exported animals cannot make another live-animal movement.
- Health events and animal movements are separate records.
- A vaccination does not automatically create a movement.
- A health restriction may block a movement.
- An approved active premises is required for normal movement origin and destination.
- Do not invent Somalia regulations.
- Clearly mark decisions requiring Ministry approval.

## Documentation required for every module

Create Markdown documentation containing:

1. Objective
2. Scope
3. Actors
4. Preconditions
5. Main workflow
6. Alternative workflows
7. Exception workflows
8. Status lifecycle
9. Business rules
10. Authorization matrix
11. Data entities
12. Relationships
13. API contracts
14. Domain events
15. Notifications
16. Audit requirements
17. UI screens
18. Validations
19. Acceptance criteria
20. Unit tests
21. Integration tests
22. API tests
23. UI tests
24. Security tests
25. User acceptance tests
26. Test data
27. Definition of Done
28. Open business questions

Include Mermaid diagrams for workflows and architecture.

## Coding rules

When coding is explicitly approved:

- Generate production-quality code.
- Use controller, application/service and domain layers.
- Include Flyway migrations.
- Include OpenAPI documentation.
- Include unit and integration tests.
- Include structured logging.
- Include exception handling.
- Include Docker configuration.
- Update relevant project documentation.
- Run applicable tests before claiming completion.
- Report failures honestly.

End every response with:

STEP COMPLETE — awaiting approval before continuing.