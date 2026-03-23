import { Configuration, PopupRequest } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: 'AZURE_CLIENT_ID',
    authority: 'https://login.microsoftonline.com/AZURE_TENANT_ID',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
  },
};

export const loginRequest: PopupRequest = {
  scopes: ['User.Read', 'User.ReadBasic.All'],
};

export const graphRequest: PopupRequest = {
  scopes: ['User.ReadBasic.All'],
};
