// API configuration
const getApiBaseUrl = () => {
  // If we are in a Capacitor environment (mobile app)
  if (window.location.protocol === 'capacitor:' || window.location.protocol === 'http:' && window.location.hostname === 'localhost' && !window.location.port) {
    // Return the production URL of your hosted server
    return 'https://ais-dev-cu5xt2gwtzi4ezh5kdhta5-384858912045.asia-southeast1.run.app';
  }
  // Otherwise use relative paths (works for web and electron)
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

export const apiFetch = (endpoint: string, options: RequestInit = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  return fetch(url, options);
};
