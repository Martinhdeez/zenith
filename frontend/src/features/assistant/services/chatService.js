// SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
// SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
// SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { api } from '../../shared/services/api'

/**
 * AI Chat service — communicates with the Zenith AI assistant.
 */
export const chatService = {
    /**
     * Send a message to the AI assistant.
     * @param {string} message - User's message
     * @param {Array<{role: string, content: string}>} history - Conversation history
     * @returns {Promise<{reply: string, files_used: number}>}
     */
    async sendMessage(message, history = []) {
        return api('/ai/chat', {
            method: 'POST',
            body: JSON.stringify({
                message,
                history: history.length > 0 ? history : undefined,
            }),
        })
    },

    /**
     * Get the chat history for the current user.
     * @returns {Promise<{history: Array<{role: string, content: string, created_at: string}>}>}
     */
    async getHistory() {
        return api('/ai/history', {
            method: 'GET',
        })
    },

    /**
     * Generate study material from a file.
     * @param {number} fileId - File ID
     * @param {string} mode - 'quiz' | 'outline' | 'flashcards' | 'custom'
     * @param {string} [customPrompt] - Custom prompt (required for 'custom' mode)
     * @returns {Promise<{content: string, mode: string, file_name: string}>}
     */
    async generateStudy(fileId, mode, customPrompt = null) {
        return api('/ai/study', {
            method: 'POST',
            body: JSON.stringify({
                file_id: fileId,
                mode,
                custom_prompt: customPrompt || undefined,
            }),
        })
    },

    /**
     * Generate a comprehensive study summary for an entire folder.
     * @param {number} folderId - Folder ID
     * @returns {Promise<Object>} - The newly created file record containing the summary
     */
    async generateFolderStudySummary(folderId) {
        return api(`/ai/folder/${folderId}/study-summary`, {
            method: 'POST',
        })
    },
}
