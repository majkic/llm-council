/**
 * API client for the LLM Council backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

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

  async getAdminSettings() {
    const response = await fetch(`${API_BASE}/api/admin/settings`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to load admin settings');
    return response.json();
  },

  async updateAdminSettings(settings) {
    const response = await fetch(`${API_BASE}/api/admin/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || 'Failed to update admin settings');
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
      if (response.status === 401) {
        return null;
      }
      if (response.status === 403) {
        try {
          const data = await response.json();
          // Extract email from "Access denied: email@gmail.com is not authorized"
          const emailMatch = data.detail?.match(/Access denied: (.*) is not authorized/);
          return { 
            unauthorized: true, 
            email: emailMatch ? emailMatch[1] : 'Unknown account'
          };
        } catch (e) {
          return { unauthorized: true };
        }
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
   * Delete a conversation.
   */
  async deleteConversation(conversationId) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`,
      {
        method: 'DELETE',
        credentials: 'include'
      }
    );
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || 'Failed to delete conversation');
    }
    return response.json();
  },

  async renameConversation(conversationId, title) {
    const response = await fetch(`${API_BASE}/api/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || 'Failed to rename conversation');
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
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const events = buffer.split('\n\n');
      buffer = events.pop();

      for (const eventText of events) {
        const line = eventText.split('\n').find((entry) => entry.startsWith('data: '));
        if (!line) continue;
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

      if (done) break;
    }
  },
};
