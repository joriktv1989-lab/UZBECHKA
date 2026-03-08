// API configuration
const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return '';

  // If we are in a Capacitor environment (mobile app)
  if (window.location.protocol === 'capacitor:') {
    return 'https://ais-dev-cu5xt2gwtzi4ezh5kdhta5-384858912045.asia-southeast1.run.app';
  }
  
  // For web, relative paths are most reliable and avoid origin issues
  return '';
};

export const API_BASE_URL = getApiBaseUrl();
console.log('API_BASE_URL initialized as:', API_BASE_URL || '(relative)');

export const apiFetch = (endpoint: string, options: RequestInit = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  console.log(`[apiFetch] Requesting: ${url}`, options);
  return fetch(url, options).then(response => {
    console.log(`[apiFetch] Response from ${url}: ${response.status} ${response.statusText}`);
    if (!response.ok) {
      console.warn(`[apiFetch] Non-OK response from ${url}:`, response.status);
    }
    return response;
  }).catch(error => {
    console.error(`[apiFetch] Error fetching ${url}:`, error);
    // Log more details if possible
    if (error instanceof Error) {
      console.error(`[apiFetch] Error details: ${error.name} - ${error.message}`);
    }
    throw error;
  });
};
