import { useState, useEffect } from 'react';
import './Sidebar.css';

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  usageStats,
}) {
  const formatMoney = (credits) => {
    if (!credits || credits.balance === undefined) return 'Loading...';
    if (credits.balance === null) return 'N/A';
    return `$${credits.balance.toFixed(2)}`;
  };

  const formatTokens = (quota) => {
    if (!quota || !quota.remaining_tokens) return 'Loading...';
    if (quota.remaining_tokens === 'Unknown') return 'Start chat...';
    
    // Check if it's already a number or a string that looks like one
    const val = quota.remaining_tokens;
    if (typeof val === 'number') return val.toLocaleString();
    if (!isNaN(val)) return parseInt(val).toLocaleString();
    
    return val; // It might be some other string format
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>LLM Council</h1>
        
        {usageStats && (
          <div className="usage-stats-header">
            <div className="stat-item" title="OpenRouter Balance">
              <span className="stat-label">OpenRouter:</span>
              <span className="stat-value">{formatMoney(usageStats.openrouter)}</span>
            </div>
            <div className="stat-item" title="Abacus Remaining Tokens">
              <span className="stat-label">Abacus:</span>
              <span className="stat-value">{formatTokens(usageStats.abacus)}</span>
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
              <div className="conversation-title">
                {conv.title || 'New Conversation'}
              </div>
              <div className="conversation-meta">
                {conv.message_count} messages
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
