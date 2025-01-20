document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const chatMessages = document.getElementById('chatMessages');
    const chatArea = document.getElementById('chatArea');
    const themeToggle = document.getElementById('themeToggle');
    const clearChat = document.getElementById('clearChat');
    const messageTemplate = document.getElementById('messageTemplate');
    
    let isProcessing = false;

    // Validate required elements
    if (!messageInput || !sendButton || !chatMessages || !chatArea || !themeToggle || !clearChat || !messageTemplate) {
        console.error('Required DOM elements not found');
        return;
    }

    // Theme Management
    function initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.dataset.theme = savedTheme;
        updateThemeIcon();
    }

    function toggleTheme() {
        const newTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
        document.body.dataset.theme = newTheme;
        localStorage.setItem('theme', newTheme);
        updateThemeIcon();
    }

    function updateThemeIcon() {
        const icon = themeToggle.querySelector('i');
        if (icon) {
            icon.className = document.body.dataset.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    // Message Management
    function createMessage(content, isUser = false) {
        try {
            if (!messageTemplate) {
                throw new Error('Message template not found');
            }

            const messageElement = messageTemplate.content.cloneNode(true);
            const message = messageElement.querySelector('.message');
            
            if (!message) {
                throw new Error('Message element not found in template');
            }
            
            message.classList.add(isUser ? 'user-message' : 'assistant-message');
            
            const messageContent = message.querySelector('.message-content');
            if (messageContent) {
                if (isUser) {
                    messageContent.textContent = content;
                } else {
                    // Format AI response with bold headings and code blocks
                    const formattedContent = formatAIResponse(content);
                    messageContent.innerHTML = formattedContent;
                }
            }
            
            const timestamp = message.querySelector('.message-timestamp');
            if (timestamp) {
                timestamp.textContent = new Date().toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit'
                });
            }
            
            const copyBtn = message.querySelector('.copy-btn');
            if (copyBtn) {
                copyBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(content);
                    const icon = copyBtn.querySelector('i');
                    if (icon) {
                        icon.className = 'fas fa-check';
                        setTimeout(() => {
                            icon.className = 'fas fa-copy';
                        }, 2000);
                    }
                });
            }
            
            return message;
        } catch (error) {
            console.error('Error creating message:', error);
            return null;
        }
    }

    // Add this new function to format AI responses
    function formatAIResponse(content) {
        return content
            .replace(/(?:\r\n|\r|\n)/g, '<br>') // Convert newlines to <br>
            .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>') // Convert code blocks
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Convert bold text
            .replace(/^\* (.*?)(?=<br>|$)/gm, '<li>$1</li>') // Convert bullet points
            .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>'); // Wrap list items in <ul>
    }

    function addMessage(content, isUser = false) {
        try {
            const message = createMessage(content, isUser);
            if (message) {
                chatMessages.appendChild(message);
                scrollToBottom();
                saveToHistory(content, isUser);
            }
        } catch (error) {
            console.error('Error adding message:', error);
        }
    }

    // Scroll Management
    function scrollToBottom() {
        const lastMessage = chatMessages.lastElementChild;
        if (lastMessage) {
            lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }

    function isNearBottom() {
        const tolerance = 100; // pixels
        return (chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight) <= tolerance;
    }

    // History Management
    function saveToHistory(content, isUser) {
        try {
            const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
            history.push({
                content,
                isUser,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('chatHistory', JSON.stringify(history));
        } catch (error) {
            console.error('Error saving to history:', error);
        }
    }

    function loadHistory() {
        try {
            // Clear existing messages but keep the template
            while (chatMessages.firstChild) {
                chatMessages.removeChild(chatMessages.firstChild);
            }
            
            const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
            if (history.length === 0) {
                addMessage('Hello! I am your database assistant. How can I help you today?', false);
            } else {
                history.forEach(msg => {
                    addMessage(msg.content, msg.isUser);
                });
            }
        } catch (error) {
            console.error('Error loading history:', error);
            addMessage('Error loading chat history. Starting fresh.', false);
        }
    }

    function clearHistory() {
        try {
            if (confirm('Are you sure you want to clear the chat history?')) {
                localStorage.removeItem('chatHistory');
                // Clear all messages
                while (chatMessages.firstChild) {
                    chatMessages.removeChild(chatMessages.firstChild);
                }
                // Add initial greeting
                addMessage('Hello! I am your database assistant. How can I help you today?', false);
            }
        } catch (error) {
            console.error('Error clearing history:', error);
            addMessage('Error clearing chat history.', false);
        }
    }

    // Input Management
    function adjustTextareaHeight() {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
    }

    function resetTextarea() {
        messageInput.value = '';
        messageInput.style.height = 'auto';
    }

    function setProcessingState(processing) {
        isProcessing = processing;
        sendButton.disabled = processing;
        messageInput.disabled = processing;
        const spinner = sendButton.querySelector('.loading-spinner');
        const icon = sendButton.querySelector('.fa-paper-plane');
        
        if (processing) {
            spinner?.classList.remove('hidden');
            icon?.classList.add('hidden');
        } else {
            spinner?.classList.add('hidden');
            icon?.classList.remove('hidden');
            messageInput.focus();
        }
    }

    // Server Communication
    async function sendMessage() {
        if (isProcessing) return;

        const message = messageInput.value.trim();
        if (!message) return;

        try {
            setProcessingState(true);
            
            // Use relative URL that will work in both development and production
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Add assistant's response to chat
            if (data.response) {
                // Add small delay for natural feel
                await new Promise(resolve => setTimeout(resolve, 300));
                addMessage(data.response, false);
            } else {
                addMessage('Sorry, I encountered an error processing your request.', false);
            }

        } catch (error) {
            console.error('Error:', error);
            addMessage('Sorry, I encountered a network error. Please try again.', false);
        } finally {
            setProcessingState(false);
        }
    }

    async function checkConnection() {
        try {
            const response = await fetch('/health');
            if (!response.ok) {
                addMessage('Warning: Connection to server seems unstable.', false);
            }
        } catch (error) {
            console.error('Server connection error:', error);
            addMessage('Error: Unable to connect to server. Please ensure the server is running.', false);
        }
    }

    // Event Listeners
    messageInput.addEventListener('input', adjustTextareaHeight);
    
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendButton.addEventListener('click', sendMessage);
    themeToggle.addEventListener('click', toggleTheme);
    clearChat.addEventListener('click', clearHistory);

    // Scroll event listener
    chatArea.addEventListener('scroll', () => {
        localStorage.setItem('scrollPosition', chatArea.scrollTop.toString());
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + / to toggle theme
        if (e.key === '/' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            toggleTheme();
        }
        // Ctrl/Cmd + L to clear chat
        if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            clearChat.click();
        }
    });

    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (isNearBottom()) {
                scrollToBottom();
            }
        }, 100);
    });

    // Initialize
    initializeTheme();
    loadHistory();

    // Restore scroll position or scroll to bottom on load
    const savedScrollPosition = localStorage.getItem('scrollPosition');
    if (savedScrollPosition) {
        chatArea.scrollTop = parseInt(savedScrollPosition);
    } else {
        scrollToBottom();
    }

    // Check server connection on startup
    checkConnection();
});