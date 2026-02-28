/**
 * Shared API utility for making authenticated fetch requests.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'API request failed');
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
};
