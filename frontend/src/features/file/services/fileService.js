import { api } from '../../shared/services/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Upload-specific fetch — skips Content-Type so FormData boundary is set automatically.
 */
const apiUpload = async (endpoint, formData) => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Upload failed');
    }

    return response.json();
};

/**
 * File service for database operations.
 */
export const fileService = {
    /**
     * Get files and folders by path, optionally filtered by category.
     */
    async getFiles(path = '/', skip = 0, limit = 100, category = null) {
        const params = { path, skip, limit };
        if (category) params.category = category;
        const queryParams = new URLSearchParams(params);
        return api(`/files/?${queryParams.toString()}`);
    },

    /**
     * Search files using different modes, scoped to a base path.
     */
    async searchFiles(q, mode = 'name', top_k = 10, path = '/') {
        const queryParams = new URLSearchParams({ q, mode, top_k, path });
        return api(`/files/search?${queryParams.toString()}`);
    },

    /**
     * Upload a file with an explicit path (manual mode).
     */
    async uploadFile(file, name, path = '/', description = '') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', name);
        formData.append('path', path);
        formData.append('file_type', 'file');
        if (description) formData.append('description', description);
        return apiUpload('/files/', formData);
    },

    /**
     * Smart upload — AI decides the best folder automatically.
     */
    async smartUpload(file, name, description = '') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', name);
        if (description) formData.append('description', description);
        return apiUpload('/files/smart-upload', formData);
    },

    /**
     * Get an AI suggestion for the path before uploading.
     */
    async suggestPath(filename, mimeType) {
        return api(`/files/suggest-path`, {
            method: 'POST',
            body: JSON.stringify({ filename, mime_type: mimeType })
        });
    },

    /**
     * Create a folder.
     */
    async createFolder(name, path = '/', description = '') {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('path', path);
        formData.append('file_type', 'dir');
        if (description) formData.append('description', description);
        return apiUpload('/files/', formData);
    },

    /**
     * Get file content for download.
     */
    async downloadFile(fileId) {
        return api(`/files/${fileId}/download`);
    },

    /**
     * Update file metadata.
     */
    async updateFile(fileId, data) {
        return api(`/files/${fileId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    /**
     * Delete a file or folder.
     */
    async deleteFile(fileId) {
        return api(`/files/${fileId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Get the most recently created files.
     */
    async getRecentFiles(limit = 10) {
        return api(`/files/recent?limit=${limit}`);
    },

    /**
     * Get metadata for a specific folder or file by its path.
     */
    async getFolderMetadata(path) {
        const queryParams = new URLSearchParams({ path });
        return api(`/files/info?${queryParams.toString()}`);
    },
};

