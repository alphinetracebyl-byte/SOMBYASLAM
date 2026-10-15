using '../main.bicep'

param environmentName = 'test'
param location = 'eastus'
param imageTag = 'latest'
param containerRegistryBase = 'ghcr.io/molfrsom/somlits'
param postgresAdminPassword = readEnvironmentVariable('POSTGRES_ADMIN_PASSWORD')
param keycloakAdminPassword = readEnvironmentVariable('KEYCLOAK_ADMIN_PASSWORD')
param keycloakIssuerUri = 'https://auth-test.somlits.gov.so/realms/somlits'
