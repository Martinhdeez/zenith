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
}
