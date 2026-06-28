const configuredServer =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_SERVER_URL;

const cleanUrl = (url) => (url || '').trim().replace(/\/$/, '');

const getServerUrl = () => {
  const explicitUrl = cleanUrl(configuredServer);
  if (explicitUrl) return explicitUrl;

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const host = window.location.hostname;
    return `${protocol}//${host}:8000`;
  }

  return 'http://localhost:8000';
};

const server = getServerUrl();

export default server;
