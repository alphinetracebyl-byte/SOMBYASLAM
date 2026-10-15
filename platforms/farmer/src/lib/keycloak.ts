import Keycloak from 'keycloak-js';

export const keycloak = new Keycloak({
  url: (import.meta.env['VITE_KEYCLOAK_URL'] as string) ?? 'http://localhost:8180',
  realm: (import.meta.env['VITE_KEYCLOAK_REALM'] as string) ?? 'qxlits',
  clientId: (import.meta.env['VITE_KEYCLOAK_CLIENT_ID'] as string) ?? 'qxlits-farmer-local',
});
