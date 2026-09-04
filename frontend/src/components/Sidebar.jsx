import { useState } from 'react';
import './Sidebar.css';

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  usageStats,
  user,
  onLogout,
  onOpenAdmin
}) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
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

  const startRename = (event, conversation) => {
    event.stopPropagation();
    setRenamingId(conversation.id);
    setRenameValue(conversation.title || 'New Conversation');
  };

  const saveRename = async (event, conversationId) => {
    event.preventDefault();
    try {
      await onRenameConversation(conversationId, renameValue);
      setRenamingId(null);
    } catch (error) {
      alert(error.message);
    }
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
            <div className="stat-item" title="Abacus">
              <span className="stat-label">Abacus:</span>
              <span className="stat-value">N/A</span>
            </div>
          </div>
        )}

        <button className="new-conversation-btn" onClick={onNewConversation}>
          + New Conversation
        </button>
        <button className="admin-settings-btn" onClick={onOpenAdmin}>
          Admin Settings
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
                {renamingId === conv.id ? (
                  <form className="rename-form" onSubmit={(event) => saveRename(event, conv.id)} onClick={(event) => event.stopPropagation()}>
                    <input autoFocus value={renameValue} onChange={(event) => setRenameValue(event.target.value)} onBlur={() => setRenamingId(null)} aria-label="Conversation name" />
                  </form>
                ) : (
                  <div className="conversation-title">{conv.title || 'New Conversation'}</div>
                )}
                <div className="conversation-meta">
                  {conv.message_count} messages
                </div>
              </div>
              <button className="rename-conv-btn" title="Rename conversation" aria-label="Rename conversation" onClick={(event) => startRename(event, conv)}>
                ✎
              </button>
              <button
                  className="delete-conv-btn" 
                  title="Delete conversation"
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
