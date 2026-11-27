import axios from 'axios';

export const BACKEND_URL = '';
export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';

const api = axios.create({
    baseURL: `${BACKEND_URL}/api`,
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const requestUrl = error.config?.url;
        if (
            error.response?.status === 401 &&
            !requestUrl?.endsWith('/auth/login')
        ) {
            window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
        }
        return Promise.reject(error);
    }
);

export default api;