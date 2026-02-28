import { api } from '../../shared/services/api';

/**
 * File service for database operations.
 */
export const fileService = {
    /**
     * Get files and folders by path.
     */
    async getFiles(path = '/', skip = 0, limit = 100) {
        const queryParams = new URLSearchParams({ path, skip, limit });
        return api(`/files/?${queryParams.toString()}`);
    },

    /**
     * Search files using different modes.
     */
    async searchFiles(q, mode = 'name', top_k = 10) {
        const queryParams = new URLSearchParams({ q, mode, top_k });
        return api(`/files/search?${queryParams.toString()}`);
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
};
