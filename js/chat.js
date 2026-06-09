// js/chat.js - LittleLayers Customer Chat Widget
(function () {
  let supabase = null;
  let sessionId = localStorage.getItem('littleLayersChatSessionId');
  let channel = null;
  let currentUser = null;

  // Wait for Supabase to be initialized
  const initInterval = setInterval(() => {
    if (window.supabaseClient) {
      clearInterval(initInterval);
      supabase = window.supabaseClient;
      initChat();
    }
  }, 100);
  
  async function initChat() {
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

    // Initial auth state check
    try {
      const { data: { session } } = await supabase.auth.getSession();
      currentUser = session ? session.user : null;
      await syncUserChatSession();
    } catch (e) {
      console.error('Error fetching initial auth session for chat:', e);
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      currentUser = session ? session.user : null;
      await syncUserChatSession();
    });

    async function syncUserChatSession() {
      if (currentUser) {
        try {
          // Check if there is an existing session in the database linked to this user's account
          const { data: sessions, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('updated_at', { ascending: false })
            .limit(1);

          if (!error && sessions && sessions.length > 0) {
            // Restore their account session
            sessionId = sessions[0].id;
            localStorage.setItem('littleLayersChatSessionId', sessionId);
          } else if (sessionId) {
            // Claim current guest session in the DB by linking it to their account
            const { error: claimErr } = await supabase
              .from('chat_sessions')
              .update({ user_id: currentUser.id })
              .eq('id', sessionId);

            if (claimErr) {
              // Clear local state on error
              sessionId = null;
              localStorage.removeItem('littleLayersChatSessionId');
            }
          }
        } catch (e) {
          console.error('Error syncing user session:', e);
        }
      } else {
        // Clear local storage session on logout to preserve privacy
        sessionId = null;
        localStorage.removeItem('littleLayersChatSessionId');
      }

      renderChatState();
    }

    function renderChatState() {
      if (sessionId) {
        // Active session
        chatFooter.style.display = 'flex';
        loadMessages();
        subscribeRealtime();
      } else {
        // Registration/Start screen
        chatFooter.style.display = 'none';
        if (currentUser) {
          // Logged in user greeting
          chatBody.innerHTML = `
            <div class="chat-welcome">
              <div class="chat-welcome-icon">💬</div>
              <h5>Start a Conversation</h5>
              <p>Hello! Ask us anything about custom 3D prints, figurines, prototypes, or gifts.</p>
              <button id="chatStartBtn" class="btn btn-white" style="margin-top: 20px; width: 100%; justify-content: center; font-size: 14px; border-radius: 8px; padding: 10px;">Chat Now</button>
            </div>
          `;
          document.getElementById('chatStartBtn').addEventListener('click', startLoggedInChat);
        } else {
          // Guest user: show secure login CTA
          chatBody.innerHTML = `
            <div class="chat-welcome">
              <div class="chat-welcome-icon" style="font-size: 40px; margin-bottom: 12px; filter: drop-shadow(0 2px 8px rgba(255,255,255,0.15));">🔒</div>
              <h5 style="font-size: 16px; font-weight: 700; color: var(--white); margin-bottom: 8px; letter-spacing: -0.01em;">Private Chat Support</h5>
              <p style="font-size: 13.5px; color: var(--gray3); line-height: 1.6; margin-bottom: 20px;">
                To keep your conversations secure and private, our chat system requires you to be logged into your account.
              </p>
              <a href="login.html" class="btn btn-white" style="display: flex; align-items: center; justify-content: center; font-size: 14px; border-radius: 8px; padding: 10px 16px; width: 100%; text-decoration: none; font-weight: 600;">Log In / Sign Up</a>
            </div>
          `;
        }
      }
    }

    async function startLoggedInChat() {
      const startBtn = document.getElementById('chatStartBtn');
      if (startBtn) {
        startBtn.disabled = true;
        startBtn.textContent = 'Connecting...';
      }

      try {
        let name = currentUser.email.split('@')[0];
        let phone = '';

        // Try to fetch custom profile details
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, phone')
          .eq('id', currentUser.id)
          .single();

        if (profile) {
          if (profile.name) name = profile.name;
          if (profile.phone) phone = profile.phone;
        }

        const { data, error } = await supabase
          .from('chat_sessions')
          .insert([{ customer_name: name, customer_phone: phone, user_id: currentUser.id }])
          .select()
          .single();

        if (error) throw error;

        sessionId = data.id;
        localStorage.setItem('littleLayersChatSessionId', sessionId);

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
        console.error('Error starting logged-in chat:', err);
        alert('Failed to start chat. Please try again.');
        if (startBtn) {
          startBtn.disabled = false;
          startBtn.textContent = 'Chat Now';
        }
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
              const emptyState = list.querySelector('div[style*="text-align"]');
              if (emptyState) {
                list.removeChild(emptyState);
              }
              appendMessageUI(payload.new);
              scrollToBottom();
            }
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

      if (document.getElementById(`msg-${msg.id}`)) return;

      const bubble = document.createElement('div');
      bubble.id = `msg-${msg.id}`;
      bubble.className = `msg-bubble ${msg.sender}`;
      
      const time = new Date(msg.created_at).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

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
        chatInput.value = text;
      } finally {
        sendBtn.disabled = false;
        chatInput.focus();
      }
    }

    async function startChatFromEnquiry(name, phone, email, service, message) {
      try {
        if (!chatWindow.classList.contains('open')) {
          chatWindow.classList.add('open');
          unreadDot.style.display = 'none';
        }

        if (!currentUser) {
          // If guest, do not create any guest chat session in the DB.
          // Just let the chat toggle open and show the authentication prompt.
          renderChatState();
          return;
        }

        let isNewSession = false;
        if (!sessionId) {
          isNewSession = true;
          const insertData = { customer_name: name, customer_phone: phone, user_id: currentUser.id };

          const { data, error } = await supabase
            .from('chat_sessions')
            .insert([insertData])
            .select()
            .single();

          if (error) throw error;
          
          sessionId = data.id;
          localStorage.setItem('littleLayersChatSessionId', sessionId);

          renderChatState();
        } else {
          const updateData = { customer_name: name, customer_phone: phone, user_id: currentUser.id };
          await supabase
            .from('chat_sessions')
            .update(updateData)
            .eq('id', sessionId);
            
          renderChatState();
        }

        const enquiryText = `[New Enquiry]\nService: ${service || 'Other'}\nMessage: ${message}`;
        const { error: msgErr } = await supabase
          .from('chat_messages')
          .insert([{
            session_id: sessionId,
            sender: 'customer',
            message: enquiryText
          }]);
          
        if (msgErr) throw msgErr;

        if (isNewSession) {
          await supabase
            .from('chat_messages')
            .insert([{
              session_id: sessionId,
              sender: 'admin',
              message: `Hello ${name}! We received your enquiry for the "${service || 'Custom'}" service. One of our designers will look at your message and reply here shortly.`
            }]);
        }

        scrollToBottom();

      } catch (err) {
        console.error('Error starting chat from enquiry:', err);
      }
    }

    window.startChatFromEnquiry = startChatFromEnquiry;

    function scrollToBottom() {
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  }
})();
