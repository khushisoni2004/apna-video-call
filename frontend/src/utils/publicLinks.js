export const cleanBaseUrl = (url = '') => String(url || '').trim().replace(/\/+$/, '');

export const isLocalOrigin = (origin = '') => {
  const value = String(origin || '');
  return value.includes('localhost') || value.includes('127.0.0.1') || value.includes('0.0.0.0');
};

export const getPublicFrontendUrl = () => {
  const envUrl = cleanBaseUrl(process.env.REACT_APP_PUBLIC_FRONTEND_URL);
  const currentOrigin = typeof window !== 'undefined' ? cleanBaseUrl(window.location.origin) : '';
  const savedUrl = typeof window !== 'undefined' ? cleanBaseUrl(localStorage.getItem('PUBLIC_FRONTEND_URL')) : '';

  if (currentOrigin && !isLocalOrigin(currentOrigin)) {
    localStorage.setItem('PUBLIC_FRONTEND_URL', currentOrigin);
    return currentOrigin;
  }

  if (envUrl) {
    localStorage.setItem('PUBLIC_FRONTEND_URL', envUrl);
    return envUrl;
  }

  if (savedUrl && !isLocalOrigin(savedUrl)) return savedUrl;
  return currentOrigin;
};

export const getSavedPublicFrontendUrl = getPublicFrontendUrl;

export const savePublicFrontendUrl = (url) => {
  const clean = cleanBaseUrl(url);
  if (typeof window !== 'undefined') {
    if (clean) localStorage.setItem('PUBLIC_FRONTEND_URL', clean);
    else localStorage.removeItem('PUBLIC_FRONTEND_URL');
  }
  return clean;
};

export const makePublicMeetingLink = (meetingCode) => {
  const baseUrl = getPublicFrontendUrl();
  const code = String(meetingCode || '').trim().replace(/^\/+/, '');
  if (!baseUrl || !code) return '';
  return `${baseUrl}/${code}`;
};
