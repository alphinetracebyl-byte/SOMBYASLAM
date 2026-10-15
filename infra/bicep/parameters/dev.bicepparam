using '../main.bicep'

param environmentName = 'dev'
param location = 'eastus'
param imageTag = 'latest'
param containerRegistryBase = 'ghcr.io/molfrsom/somlits'
param postgresAdminPassword = readEnvironmentVariable('POSTGRES_ADMIN_PASSWORD')
param keycloakAdminPassword = readEnvironmentVariable('KEYCLOAK_ADMIN_PASSWORD')
param keycloakIssuerUri = 'https://auth-dev.somlits.gov.so/realms/somlits'
