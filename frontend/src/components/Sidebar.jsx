import { useState, useEffect } from 'react';
import './Sidebar.css';

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  usageStats,
  user,
  onLogout
}) {
  const formatMoney = (val) => {
    if (val === null || val === undefined) return 'Loading...';
    if (val === 'N/A') return 'N/A';
    const num = parseFloat(val);
    if (isNaN(num)) return '$0.00';
    return `$${num.toFixed(2)}`;
  };

  const formatTokens = (val) => {
    if (val === 'Unknown') return 'Start chat...';
    if (val === 'N/A') return 'N/A';
    if (!val) return 'Loading...';
    return parseInt(val).toLocaleString();
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>LLM Council</h1>
        
        {usageStats && (
          <div className="usage-stats-header">
            <div className="stat-item" title="OpenRouter Balance">
              <span className="stat-label">OpenRouter:</span>
              <span className="stat-value">{formatMoney(usageStats.openrouter?.balance)}</span>
            </div>
            <div className="stat-item" title="Abacus Remaining Tokens">
              <span className="stat-label">Abacus:</span>
              <span className="stat-value">{formatTokens(usageStats.abacus?.remaining_tokens)}</span>
            </div>
          </div>
        )}

        <button className="new-conversation-btn" onClick={onNewConversation}>
          + New Conversation
        </button>
      </div>

      <div className="conversation-list">
        {conversations.length === 0 ? (
          <div className="no-conversations">No conversations yet</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${
                conv.id === currentConversationId ? 'active' : ''
              }`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <div className="conversation-content">
                <div className="conversation-title">
                  {conv.title || 'New Conversation'}
                </div>
                <div className="conversation-meta">
                  {conv.message_count} messages
                </div>
              </div>
              {conv.message_count === 0 && (
                <button 
                  className="delete-conv-btn" 
                  title="Delete empty conversation"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.id);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
