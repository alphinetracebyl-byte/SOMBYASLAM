targetScope = 'resourceGroup'

@description('Environment name: dev | test | prod')
param environmentName string

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('GHCR image tag (git SHA) for all backend services')
param imageTag string = 'latest'

@description('GHCR organisation prefix, e.g. ghcr.io/molfrsom/somlits')
param containerRegistryBase string

@secure()
@description('PostgreSQL admin password (stored in Key Vault after creation)')
param postgresAdminPassword string

@secure()
@description('Keycloak admin password')
param keycloakAdminPassword string

@description('JWT issuer URI used by all services')
param keycloakIssuerUri string

// ── Naming prefix ─────────────────────────────────────────────────────────────
var prefix = 'somlits-${environmentName}'

// ── Service bus topic name ────────────────────────────────────────────────────
var serviceBusTopic = 'somlits-domain-events'

// ── All 14 microservices ──────────────────────────────────────────────────────
var services = [
  { name: 'identity-access-service',   port: 8081, db: 'identity_db' }
  { name: 'owner-org-service',          port: 8082, db: 'owner_org_db' }
  { name: 'premises-service',           port: 8083, db: 'premises_db' }
  { name: 'tag-inventory-service',      port: 8084, db: 'tag_inventory_db' }
  { name: 'animal-registry-service',    port: 8081, db: 'animal_registry_db' }
  { name: 'vet-health-service',         port: 8085, db: 'vet_health_db' }
  { name: 'movement-tracking-service',  port: 8081, db: 'movement_db' }
  { name: 'market-trade-service',       port: 8086, db: 'market_trade_db' }
  { name: 'quarantine-export-service',  port: 8087, db: 'quarantine_export_db' }
  { name: 'abattoir-service',           port: 8088, db: 'abattoir_db' }
  { name: 'certification-service',      port: 8089, db: 'certification_db' }
  { name: 'notification-service',       port: 8090, db: 'notification_db' }
  { name: 'reporting-service',          port: 8091, db: 'reporting_db' }
  { name: 'traceability-service',       port: 8092, db: 'audit_db' }
]

// ── Frontend platforms ────────────────────────────────────────────────────────
var frontendPlatforms = ['farmer', 'field', 'ministry']

// ── Log Analytics workspace ───────────────────────────────────────────────────
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${prefix}-logs'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

// ── Application Insights ──────────────────────────────────────────────────────
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${prefix}-ai'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// ── Key Vault ─────────────────────────────────────────────────────────────────
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${prefix}-kv'
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: tenant().tenantId
    enableRbacAuthorization: true
    softDeleteRetentionInDays: 7
    enableSoftDelete: true
  }
}

resource kvSecretPostgres 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'postgres-admin-password'
  properties: { value: postgresAdminPassword }
}

resource kvSecretKeycloak 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'keycloak-admin-password'
  properties: { value: keycloakAdminPassword }
}

resource kvSecretAppInsights 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'applicationinsights-connection-string'
  properties: { value: appInsights.properties.ConnectionString }
}

// ── Service Bus ───────────────────────────────────────────────────────────────
resource serviceBusNamespace 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: '${prefix}-sb'
  location: location
  sku: { name: 'Standard', tier: 'Standard' }
}

resource serviceBusTopic_ 'Microsoft.ServiceBus/namespaces/topics@2022-10-01-preview' = {
  parent: serviceBusNamespace
  name: serviceBusTopic
  properties: {
    defaultMessageTimeToLive: 'P7D'
    enablePartitioning: false
    requiresDuplicateDetection: false
  }
}

resource serviceBusAuthRule 'Microsoft.ServiceBus/namespaces/AuthorizationRules@2022-10-01-preview' = {
  parent: serviceBusNamespace
  name: 'somlits-services-rule'
  properties: { rights: ['Send', 'Listen'] }
}

// ── Blob Storage (photos, exports, reports) ───────────────────────────────────
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: replace('${prefix}stor', '-', '')
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

resource photosContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'animal-photos'
  properties: { publicAccess: 'None' }
}

resource exportsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'certificate-exports'
  properties: { publicAccess: 'None' }
}

// ── PostgreSQL Flexible Server (shared; one database per service) ───────────
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: '${prefix}-pg'
  location: location
  sku: {
    name: 'Standard_B2s'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: 'somlits_admin'
    administratorLoginPassword: postgresAdminPassword
    storage: { storageSizeGB: 32 }
    backup: { backupRetentionDays: 7, geoRedundantBackup: 'Disabled' }
    highAvailability: { mode: 'Disabled' }
    availabilityZone: '1'
  }
}

resource postgresFirewallAllowACA 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = {
  parent: postgres
  name: 'allow-azure-services'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// One database per service
resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = [for svc in services: {
  parent: postgres
  name: 'somlits_${svc.db}'
  properties: { charset: 'UTF8', collation: 'en_US.utf8' }
}]

// ── Container Apps Environment ────────────────────────────────────────────────
resource containerAppsEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${prefix}-cae'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ── Container Apps — one per service ─────────────────────────────────────────
var serviceBusConnStr = listKeys(serviceBusAuthRule.id, serviceBusAuthRule.apiVersion).primaryConnectionString
var pgHost = postgres.properties.fullyQualifiedDomainName

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = [for svc in services: {
  name: '${prefix}-${svc.name}'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: false
        targetPort: svc.port
        transport: 'http'
      }
      secrets: [
        { name: 'db-password', value: postgresAdminPassword }
        { name: 'servicebus-connection', value: serviceBusConnStr }
        { name: 'ai-connection', value: appInsights.properties.ConnectionString }
      ]
    }
    template: {
      containers: [
        {
          name: svc.name
          image: '${containerRegistryBase}/${svc.name}:${imageTag}'
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'SERVER_PORT', value: string(svc.port) }
            { name: 'DB_URL', value: 'jdbc:postgresql://${pgHost}:5432/somlits_${svc.db}' }
            { name: 'DB_USERNAME', value: 'somlits_admin' }
            { name: 'DB_PASSWORD', secretRef: 'db-password' }
            { name: 'KEYCLOAK_ISSUER', value: keycloakIssuerUri }
            { name: 'AZURE_SERVICEBUS_CONNECTION_STRING', secretRef: 'servicebus-connection' }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', secretRef: 'ai-connection' }
            { name: 'SOMLITS_ENV', value: environmentName }
          ]
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 3 }
    }
  }
}]

// ── Static Web Apps — one per frontend platform ───────────────────────────────
resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = [for platform in frontendPlatforms: {
  name: '${prefix}-${platform}'
  location: location
  sku: { name: 'Free', tier: 'Free' }
  properties: {}
}]

// ── Outputs ───────────────────────────────────────────────────────────────────
output containerAppsEnvId string = containerAppsEnv.id
output postgresHost string = postgres.properties.fullyQualifiedDomainName
output keyVaultName string = keyVault.name
output serviceBusNamespace string = serviceBusNamespace.name
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output storageAccountName string = storageAccount.name
