import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import Stage1 from './Stage1';
import Stage2 from './Stage2';
import Stage3 from './Stage3';
import { api } from '../api';
import './ChatInterface.css';

const PROVIDER_MODELS = {
  openrouter: [
    'openai/gpt-4o',
    'anthropic/claude-3.5-sonnet',
    'google/gemini-pro-1.5',
    'meta-llama/llama-3-70b-instruct',
    'mistralai/mistral-large-2',
  ],
  abacus: [
    'gpt-5.1',
    'gemini-3.1-pro-preview',
    'claude-sonnet-4-20250514',
    'grok-4-0709',
    'route-llm',
  ],
};

export default function ChatInterface({
  conversation,
  onSendMessage,
  isLoading,
  user,
  onLogout
}) {
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState('openrouter');
  const [selectedModels, setSelectedModels] = useState(PROVIDER_MODELS.openrouter);
  const [availableModels, setAvailableModels] = useState([]);
  const [customModel, setCustomModel] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  // Update selected models and fetch available models when provider changes
  useEffect(() => {
    setSelectedModels(PROVIDER_MODELS[provider] || []);
    fetchAvailableModels();
  }, [provider]);

  const fetchAvailableModels = async () => {
    try {
      const models = await api.listModels(provider);
      setAvailableModels(models);
    } catch (error) {
      console.error('Failed to fetch available models:', error);
      setAvailableModels([]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input, {
        provider,
        models: selectedModels.length > 0 ? selectedModels : null,
      });
      setInput('');
    }
  };

  const handleToggleModel = (model) => {
    setSelectedModels((prev) =>
      prev.includes(model)
        ? prev.filter((m) => m !== model)
        : [...prev, model]
    );
  };

  const handleAddCustomModel = (e) => {
    e.preventDefault();
    if (customModel.trim() && !selectedModels.includes(customModel.trim())) {
      setSelectedModels((prev) => [...prev, customModel.trim()]);
      setCustomModel('');
    }
  };

  const handleKeyDown = (e) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isNewConversation = conversation && conversation.messages.length === 0;

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div className="user-profile">
          <div className="user-avatar">
            {user.picture ? (
              <img src={user.picture} alt={user.name} />
            ) : (
              <div className="avatar-initial">{user.name.charAt(0)}</div>
            )}
          </div>
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-email">{user.email}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout}>Sign Out</button>
      </div>

      <div className="messages-container">
        {!conversation ? (
          <div className="empty-state">
            <h2>Welcome to LLM Council</h2>
            <p>Create or select a conversation to get started</p>
          </div>
        ) : isNewConversation ? (
          <div className="empty-state">
            <h2>Start a conversation</h2>
            <p>Choose your council members and ask a question</p>

            <div className="config-container">
              <div className="config-section">
                <label>LLM Provider</label>
                <div className="provider-selector">
                  <button
                    className={`provider-btn ${provider === 'openrouter' ? 'active' : ''}`}
                    onClick={() => setProvider('openrouter')}
                  >
                    OpenRouter
                  </button>
                  <button
                    className={`provider-btn ${provider === 'abacus' ? 'active' : ''}`}
                    onClick={() => setProvider('abacus')}
                  >
                    Abacus
                  </button>
                </div>
              </div>

              <div className="config-section">
                <label>Council Models ({selectedModels.length} selected)</label>
                <div className="model-grid">
                  {(PROVIDER_MODELS[provider] || []).map((model) => (
                    <div
                      key={model}
                      className={`model-chip ${selectedModels.includes(model) ? 'active' : ''}`}
                      onClick={() => handleToggleModel(model)}
                    >
                      {model.split('/').pop()}
                    </div>
                  ))}
                  {selectedModels
                    .filter((m) => !PROVIDER_MODELS[provider]?.includes(m))
                    .map((model) => (
                      <div
                        key={model}
                        className="model-chip active custom"
                        onClick={() => handleToggleModel(model)}
                      >
                        {model}
                      </div>
                    ))}
                </div>
                <form className="custom-model-form" onSubmit={handleAddCustomModel}>
                  <input
                    type="text"
                    list="available-models"
                    placeholder="Add custom model ID..."
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                  />
                  <datalist id="available-models">
                    {availableModels.map((modelId) => (
                      <option key={modelId} value={modelId} />
                    ))}
                  </datalist>
                  <button type="submit" disabled={!customModel.trim()}>+</button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          conversation.messages.map((msg, index) => (
            <div key={index} className="message-group">
              {msg.role === 'user' ? (
                <div className="user-message">
                  <div className="message-label">You</div>
                  <div className="message-content">
                    <div className="markdown-content">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="assistant-message">
                  <div className="message-label">LLM Council</div>

                  {/* Stage 1 */}
                  {msg.loading?.stage1 && (
                    <div className="stage-loading">
                      <div className="spinner"></div>
                      <span>Running Stage 1: Collecting individual responses...</span>
                    </div>
                  )}
                  {msg.stage1 && <Stage1 responses={msg.stage1} />}

                  {/* Stage 2 */}
                  {msg.loading?.stage2 && (
                    <div className="stage-loading">
                      <div className="spinner"></div>
                      <span>Running Stage 2: Peer rankings...</span>
                    </div>
                  )}
                  {msg.stage2 && (
                    <Stage2
                      rankings={msg.stage2}
                      labelToModel={msg.metadata?.label_to_model}
                      aggregateRankings={msg.metadata?.aggregate_rankings}
                    />
                  )}

                  {/* Stage 3 */}
                  {msg.loading?.stage3 && (
                    <div className="stage-loading">
                      <div className="spinner"></div>
                      <span>Running Stage 3: Final synthesis...</span>
                    </div>
                  )}
                  {msg.stage3 && <Stage3 finalResponse={msg.stage3} />}

                  {/* Token Usage Summary */}
                  {msg.metadata?.usage && (
                    <div className="usage-summary">
                      <div className="total-tokens">
                        Total Tokens: <strong>{msg.metadata.usage.total.total_tokens.toLocaleString()}</strong>
                      </div>
                      <div className="usage-breakdown">
                        <span>Stage 1: {msg.metadata.usage.stage1.total_tokens.toLocaleString()}</span>
                        <span className="separator">•</span>
                        <span>Stage 2: {msg.metadata.usage.stage2.total_tokens.toLocaleString()}</span>
                        <span className="separator">•</span>
                        <span>Stage 3: {msg.metadata.usage.stage3.total_tokens.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>Consulting the council...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {!isNewConversation && (
        <form className="input-form" onSubmit={handleSubmit}>
          <textarea
            className="message-input"
            placeholder="Ask your question... (Shift+Enter for new line, Enter to send)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={3}
          />
          <button
            type="submit"
            className="send-button"
            disabled={!input.trim() || isLoading || selectedModels.length === 0}
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
