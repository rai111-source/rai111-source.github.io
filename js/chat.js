// js/chat.js - LittleLayers Customer Chat Widget
(function () {
  let supabase = null;
  let sessionId = localStorage.getItem('littleLayersChatSessionId');
  let channel = null;

  // Wait for Supabase to be initialized
  const initInterval = setInterval(() => {
    if (window.supabaseClient) {
      clearInterval(initInterval);
      supabase = window.supabaseClient;
      initChat();
    }
  }, 100);
  
  function initChat() {
    // Inject HTML elements into document body
    const widget = document.createElement('div');
    widget.className = 'chat-widget-container';
    widget.innerHTML = `
      <button class="chat-toggle-btn" id="chatToggleBtn" aria-label="Open Chat">
        <i class="ph ph-chat-centered-dots"></i>
        <div class="unread-dot" id="chatUnreadDot"></div>
      </button>
      <div class="chat-window" id="chatWindow">
        <div class="chat-header">
          <h4>Enquire About Products</h4>
          <button class="chat-close-btn" id="chatCloseBtn" aria-label="Close Chat">✕</button>
        </div>
        <div class="chat-body" id="chatBody">
          <!-- Dynamically populated -->
        </div>
        <div class="chat-footer" id="chatFooter" style="display: none;">
          <textarea class="chat-input" id="chatInput" placeholder="Type a message..." rows="1"></textarea>
          <button class="chat-send-btn" id="chatSendBtn"><i class="ph ph-paper-plane-right"></i></button>
        </div>
      </div>
    `;
    document.body.appendChild(widget);

    const toggleBtn = document.getElementById('chatToggleBtn');
    const closeBtn = document.getElementById('chatCloseBtn');
    const chatWindow = document.getElementById('chatWindow');
    const chatBody = document.getElementById('chatBody');
    const chatFooter = document.getElementById('chatFooter');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    const unreadDot = document.getElementById('chatUnreadDot');

    // Toggle Chat Window
    toggleBtn.addEventListener('click', () => {
      const isOpen = chatWindow.classList.contains('open');
      if (isOpen) {
        chatWindow.classList.remove('open');
      } else {
        chatWindow.classList.add('open');
        unreadDot.style.display = 'none'; // Clear notification dot when opened
        scrollToBottom();
        chatInput.focus();
      }
    });

    closeBtn.addEventListener('click', () => {
      chatWindow.classList.remove('open');
    });

    // Enter key to send
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    sendBtn.addEventListener('click', sendMessage);

    // Initial load
    renderChatState();

    function renderChatState() {
      if (sessionId) {
        // Active session
        chatFooter.style.display = 'flex';
        loadMessages();
        subscribeRealtime();
      } else {
        // Registration screen
        chatFooter.style.display = 'none';
        chatBody.innerHTML = `
          <div class="chat-welcome">
            <div class="chat-welcome-icon">💬</div>
            <h5>Start a Conversation</h5>
            <p>We print custom 3D products, figurines, prototypes, and gifts. Ask us anything!</p>
            <form class="chat-form" id="chatRegForm">
              <div class="fg">
                <label>Your Name *</label>
                <input type="text" id="chatRegName" required placeholder="E.g. Priya Sharma">
              </div>
              <div class="fg">
                <label>Phone Number *</label>
                <input type="tel" id="chatRegPhone" required placeholder="E.g. 9876543210">
              </div>
              <button type="submit" class="btn btn-white" style="margin-top: 8px; width: 100%; justify-content: center; font-size: 14px; border-radius: 8px; padding: 10px;">Start Chat</button>
            </form>
          </div>
        `;
        document.getElementById('chatRegForm').addEventListener('submit', handleRegistration);
      }
    }

    async function handleRegistration(e) {
      e.preventDefault();
      const name = document.getElementById('chatRegName').value.trim();
      const phone = document.getElementById('chatRegPhone').value.trim();
      if (!name || !phone) return;

      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Connecting...';

      try {
        const { data, error } = await supabase
          .from('chat_sessions')
          .insert([{ customer_name: name, customer_phone: phone }])
          .select()
          .single();

        if (error) throw error;

        sessionId = data.id;
        localStorage.setItem('littleLayersChatSessionId', sessionId);
        
        // Show active chat state
        renderChatState();

        // Send a first automated system greeting
        await supabase
          .from('chat_messages')
          .insert([{
            session_id: sessionId,
            sender: 'admin',
            message: `Hello ${name}! Welcome to LittleLayers.Co. How can we help you with your 3D printing choices or custom projects today?`
          }]);
      } catch (err) {
        console.error('Error starting chat session:', err);
        alert('Failed to connect to chat support. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Start Chat';
      }
    }

    async function loadMessages() {
      chatBody.innerHTML = '<div style="text-align: center; color: var(--gray4); font-size: 13px; margin-top: 20px;">Loading message history...</div>';
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        chatBody.innerHTML = '<div class="chat-messages" id="chatMessagesList"></div>';
        const list = document.getElementById('chatMessagesList');
        
        if (data && data.length) {
          data.forEach(msg => appendMessageUI(msg));
        } else {
          list.innerHTML = '<div style="text-align: center; color: var(--gray4); font-size: 13px; margin-top: 20px;">No messages yet. Send a message to start.</div>';
        }
        scrollToBottom();
      } catch (err) {
        console.error('Error loading chat messages:', err);
        chatBody.innerHTML = '<div style="text-align: center; color: #ff6b6b; font-size: 13px; margin-top: 20px;">Failed to load chat history.</div>';
      }
    }

    function subscribeRealtime() {
      if (channel) return; // Already subscribed

      channel = supabase
        .channel(`chat_messages:${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `session_id=eq.${sessionId}`
          },
          (payload) => {
            const list = document.getElementById('chatMessagesList');
            if (list) {
              // Clear empty/loading state if any
              const emptyState = list.querySelector('div[style*="text-align"]');
              if (emptyState) {
                list.removeChild(emptyState);
              }
              appendMessageUI(payload.new);
              scrollToBottom();
            }
            // If chat window is closed, show unread badge
            if (!chatWindow.classList.contains('open')) {
              unreadDot.style.display = 'block';
            }
          }
        )
        .subscribe();
    }

    function appendMessageUI(msg) {
      const list = document.getElementById('chatMessagesList');
      if (!list) return;

      // Check if message is already rendered (to prevent duplicates)
      if (document.getElementById(`msg-${msg.id}`)) return;

      const bubble = document.createElement('div');
      bubble.id = `msg-${msg.id}`;
      bubble.className = `msg-bubble ${msg.sender}`;
      
      const time = new Date(msg.created_at).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      // Escape HTML
      const escapedMsg = window.escHtml ? window.escHtml(msg.message) : msg.message;

      bubble.innerHTML = `
        ${escapedMsg}
        <span class="msg-time">${time}</span>
      `;
      list.appendChild(bubble);
    }

    async function sendMessage() {
      const text = chatInput.value.trim();
      if (!text || !sessionId) return;

      chatInput.value = '';
      sendBtn.disabled = true;

      try {
        const { error } = await supabase
          .from('chat_messages')
          .insert([{
            session_id: sessionId,
            sender: 'customer',
            message: text
          }]);

        if (error) throw error;
      } catch (err) {
        console.error('Error sending message:', err);
        alert('Failed to send message. Please try again.');
        chatInput.value = text; // Restore text
      } finally {
        sendBtn.disabled = false;
        chatInput.focus();
      }
    }

    function scrollToBottom() {
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  }
})();
