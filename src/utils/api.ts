// API configuration
const getApiBaseUrl = () => {
  // If we are in a Capacitor environment (mobile app)
  if (window.location.protocol === 'capacitor:') {
    return 'https://ais-dev-cu5xt2gwtzi4ezh5kdhta5-384858912045.asia-southeast1.run.app';
  }
  
  // For web, relative paths are most reliable
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

export const apiFetch = (endpoint: string, options: RequestInit = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  return fetch(url, options);
};
