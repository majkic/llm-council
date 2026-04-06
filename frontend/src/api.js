/**
 * API client for the LLM Council backend.
 */

const API_BASE = 'http://localhost:8001';

export const api = {
  /**
   * List all conversations.
   */
  async listConversations() {
    const response = await fetch(`${API_BASE}/api/conversations`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Failed to list conversations');
    }
    return response.json();
  },

  /**
   * List available models for a provider.
   */
  async listModels(provider) {
    const url = provider
      ? `${API_BASE}/api/models?provider=${provider}`
      : `${API_BASE}/api/models`;
    const response = await fetch(url, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Failed to list models');
    }
    return response.json();
  },

  /**
   * Get account usage stats (OpenRouter credits, Abacus quota).
   */
  async getUsageStats() {
    const response = await fetch(`${API_BASE}/api/usage/stats`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Failed to fetch usage stats');
    }
    return response.json();
  },

  /**
   * Get current user (check auth status).
   */
  async getCurrentUser() {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        'Accept': 'application/json',
      },
      // Ensure cookies are actually sent
      credentials: 'include'
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return null;
      }
      throw new Error('Failed to fetch user');
    }
    return response.json();
  },

  /**
   * Start Google Login flow.
   */
  login() {
    window.location.href = `${API_BASE}/api/auth/login`;
  },

  /**
   * Logout.
   */
  async logout() {
    const response = await fetch(`${API_BASE}/api/auth/logout`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Logout failed');
    }
    return response.json();
  },
  async createConversation() {
    const response = await fetch(`${API_BASE}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }
    return response.json();
  },

  /**
   * Get a specific conversation.
   */
  async getConversation(conversationId) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`,
      {
        credentials: 'include'
      }
    );
    if (!response.ok) {
      throw new Error('Failed to get conversation');
    }
    return response.json();
  },

  /**
   * Send a message in a conversation.
   */
  async sendMessage(conversationId, content) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
        credentials: 'include'
      }
    );
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    return response.json();
  },

  /**
   * Send a message and receive streaming updates.
   * @param {string} conversationId - The conversation ID
   * @param {string} content - The message content
   * @param {object} options - Optional parameters: { provider, models, chairman_model }
   * @param {function} onEvent - Callback function for each event: (eventType, data) => void
   * @returns {Promise<void>}
   */
  async sendMessageStream(conversationId, content, options, onEvent) {
    const { provider, models, chairman_model } = options || {};
    
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content,
          provider,
          models,
          chairman_model
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const rawData = line.slice(6).trim();
          if (!rawData) continue;
          
          try {
            const event = JSON.parse(rawData);
            onEvent(event.type, event);
          } catch (e) {
            console.error('Failed to parse SSE event:', e, 'Raw data:', rawData);
          }
        }
      }
    }
  },
};
