const DEFAULT_API_PORT = '8443';

const resolveApiUrl = (): string => {
    if (typeof window === 'undefined') {
        return `http://localhost:${DEFAULT_API_PORT}/api`;
    }

    const globalApiUrl = (window as any).__API_URL__;
    if (globalApiUrl) {
        return String(globalApiUrl);
    }

    const { protocol, hostname, port } = window.location;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `http://localhost:${DEFAULT_API_PORT}/api`;
    }

    if (port && port !== '80' && port !== '443') {
        if (port === '4200') {
            return `${protocol}//${hostname}:${DEFAULT_API_PORT}/api`;
        }
        return `${protocol}//${hostname}:${port}/api`;
    }

    return `${protocol}//${hostname}/api`;
};

export const environment = {
    production: false,
    apiUrl: resolveApiUrl()
};