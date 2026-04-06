import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import Login from './components/Login';
import Unauthorized from './components/Unauthorized';
import { api } from './api';
import './App.css';

function App() {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [usageStats, setUsageStats] = useState(null);
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [unauthorizedEmail, setUnauthorizedEmail] = useState('');

  // Check auth and load conversations on mount
  useEffect(() => {
    const initApp = async () => {
      try {
        // 1. Check for error parameters in URL (from OAuth redirect)
        const params = new URLSearchParams(window.location.search);
        if (params.get('error') === 'unauthorized') {
          const email = params.get('email');
          setIsUnauthorized(true);
          setUnauthorizedEmail(email || 'Unknown account');
          setIsCheckingAuth(false);
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        // 2. Check current session status
        const currentUser = await api.getCurrentUser();
        if (currentUser?.unauthorized) {
          setIsUnauthorized(true);
          setUnauthorizedEmail(currentUser.email);
          setUser(null);
        } else if (currentUser && currentUser.email) {
          setUser(currentUser);
          await loadConversations();
          await loadUsageStats();
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Initialization failed:', error);
        setUser(null);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    initApp();
  }, []);

  // Load conversation details when selected
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

  const loadUsageStats = async () => {
    try {
      const stats = await api.getUsageStats();
      setUsageStats(stats);
    } catch (error) {
      console.error('Failed to load usage stats:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const convs = await api.listConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadConversation = async (id) => {
    try {
      const conv = await api.getConversation(id);
      setCurrentConversation(conv);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleNewConversation = async () => {
    try {
      const newConv = await api.createConversation();
      setConversations([
        { id: newConv.id, created_at: newConv.created_at, message_count: 0 },
        ...conversations,
      ]);
      setCurrentConversationId(newConv.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
  };

  const handleSendMessage = async (content, options = {}) => {
    if (!currentConversationId) return;

    setIsLoading(true);
    try {
      // Refresh stats before starting
      loadUsageStats();

      // Optimistically add user message to UI
      const userMessage = { role: 'user', content };
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      // Create a partial assistant message that will be updated progressively
      const assistantMessage = {
        role: 'assistant',
        stage1: null,
        stage2: null,
        stage3: null,
        metadata: null,
        loading: {
          stage1: false,
          stage2: false,
          stage3: false,
        },
      };

      // Add the partial assistant message
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));

      // Send message with streaming
      await api.sendMessageStream(currentConversationId, content, options, (eventType, event) => {
        switch (eventType) {
          case 'stage1_start':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages || []];
              if (messages.length === 0) return prev;
              const lastMsg = { ...messages[messages.length - 1] };
              if (!lastMsg.loading) lastMsg.loading = {};
              lastMsg.loading.stage1 = true;
              messages[messages.length - 1] = lastMsg;
              return { ...prev, messages };
            });
            break;

          case 'stage1_complete':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages || []];
              if (messages.length === 0) return prev;
              const lastMsg = { ...messages[messages.length - 1] };
              lastMsg.stage1 = event.data;
              if (!lastMsg.loading) lastMsg.loading = {};
              lastMsg.loading.stage1 = false;
              messages[messages.length - 1] = lastMsg;
              return { ...prev, messages };
            });
            break;

          case 'stage2_start':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages || []];
              if (messages.length === 0) return prev;
              const lastMsg = { ...messages[messages.length - 1] };
              if (!lastMsg.loading) lastMsg.loading = {};
              lastMsg.loading.stage2 = true;
              messages[messages.length - 1] = lastMsg;
              return { ...prev, messages };
            });
            break;

          case 'stage2_complete':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages || []];
              if (messages.length === 0) return prev;
              const lastMsg = { ...messages[messages.length - 1] };
              lastMsg.stage2 = event.data;
              lastMsg.metadata = event.metadata;
              if (!lastMsg.loading) lastMsg.loading = {};
              lastMsg.loading.stage2 = false;
              messages[messages.length - 1] = lastMsg;
              return { ...prev, messages };
            });
            break;

          case 'stage3_start':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages || []];
              if (messages.length === 0) return prev;
              const lastMsg = { ...messages[messages.length - 1] };
              if (!lastMsg.loading) lastMsg.loading = {};
              lastMsg.loading.stage3 = true;
              messages[messages.length - 1] = lastMsg;
              return { ...prev, messages };
            });
            break;

          case 'stage3_complete':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages || []];
              if (messages.length === 0) return prev;
              const lastMsg = { ...messages[messages.length - 1] };
              lastMsg.stage3 = event.data;
              if (!lastMsg.loading) lastMsg.loading = {};
              lastMsg.loading.stage3 = false;
              messages[messages.length - 1] = lastMsg;
              return { ...prev, messages };
            });
            break;

          case 'title_complete':
            // Reload conversations to get updated title
            loadConversations();
            break;

          case 'complete':
            // Stream complete, reload conversations list and usage stats
            loadConversations();
            loadUsageStats();
            if (event.metadata) {
              setCurrentConversation((prev) => {
                const messages = [...prev.messages || []];
                if (messages.length === 0) return prev;
                const lastMsg = { ...messages[messages.length - 1] };
                lastMsg.metadata = event.metadata;
                messages[messages.length - 1] = lastMsg;
                return { ...prev, messages };
              });
            }
            setIsLoading(false);
            break;

          case 'error':
            console.error('Stream error:', event.message);
            setIsLoading(false);
            break;

          default:
            console.log('Unknown event type:', eventType);
        }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic messages on error
      setCurrentConversation((prev) => ({
        ...prev,
        messages: (prev.messages || []).slice(0, -2),
      }));
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
      setConversations([]);
      setCurrentConversation(null);
      setCurrentConversationId(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Identifying yourself to the Council...</p>
      </div>
    );
  }

  if (isUnauthorized) {
    return <Unauthorized email={unauthorizedEmail} onLogout={handleLogout} />;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={setCurrentConversationId}
        onNewConversation={handleNewConversation}
        usageStats={usageStats}
        user={user}
        onLogout={handleLogout}
      />
      <ChatInterface
        conversation={currentConversation}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
        user={user}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default App;
