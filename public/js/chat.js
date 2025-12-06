const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const messagesContainer = document.getElementById("messagesContainer");
const messagesInner = document.getElementById("messagesInner");

let isGenerating = false;

console.log('Chat.js loaded successfully');

function scrollToBottom() {
    if (messagesContainer) {
        requestAnimationFrame(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
    }
}

// Initialize send button state
function updateSendButton() {
    const hasText = userInput.value.trim().length > 0;
    const shouldEnable = hasText && !isGenerating;
    sendBtn.disabled = !shouldEnable;
    console.log('Button state:', { hasText, isGenerating, disabled: sendBtn.disabled });
}

// Auto-resize textarea
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    const newHeight = Math.min(this.scrollHeight, 200);
    this.style.height = newHeight + 'px';
    updateSendButton();
});

// Also check on paste
userInput.addEventListener('paste', function() {
    setTimeout(() => {
        updateSendButton();
    }, 10);
});

// Keyboard shortcuts - Enter sends, Shift+Enter adds new line
userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        console.log('Enter pressed');
        const canSend = !isGenerating && userInput.value.trim();
        console.log('Can send?', canSend);
        if (canSend) {
            sendMessage();
        }
    }
});

// Click event for send button
sendBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('Send button clicked');
    const canSend = !isGenerating && userInput.value.trim();
    console.log('Can send?', canSend);
    if (canSend) {
        sendMessage();
    }
});

async function sendMessage() {
    console.log('sendMessage called');
    const text = userInput.value.trim();
    
    if (!text || isGenerating) {
        console.log('Cannot send:', { text, isGenerating });
        return;
    }

    console.log('Sending message:', text);

    // Remove empty state if exists
    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
        emptyState.remove();
    }

    isGenerating = true;
    
    // Append user message immediately
    appendMessage("user", text);
    
    // Clear and reset input
    userInput.value = "";
    userInput.style.height = '56px';
    userInput.disabled = true;
    updateSendButton();

    // Show typing indicator
    const typingId = showTypingIndicator();

    try {
        console.log('Fetching API...');
        const response = await fetch(`/api/chat/${chatId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text })
        });

        console.log('Response received:', response.status);
        removeTypingIndicator(typingId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('AI response:', data.response.substring(0, 50) + '...');
        
        // Append AI response immediately
        appendMessage("model", data.response);
        
        // Update sidebar preview in real-time
        updateSidebarPreview(text);

    } catch (error) {
        console.error('Error sending message:', error);
        removeTypingIndicator(typingId);
        appendMessage("model", "⚠️ Sorry, there was an error. Please try again.");
    } finally {
        isGenerating = false;
        userInput.disabled = false;
        userInput.focus();
        updateSendButton();
        console.log('Message sending complete');
    }
}

function showTypingIndicator() {
    const typingId = 'typing-' + Date.now();
    
    const typingDiv = document.createElement('div');
    typingDiv.id = typingId;
    typingDiv.className = 'mb-8 message-animate';
    typingDiv.innerHTML = `
        <div class="flex gap-4">
            <div class="w-8 h-8 rounded-full bg-black flex-shrink-0 flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
            </div>
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    messagesInner.appendChild(typingDiv);
    scrollToBottom();
    return typingId;
}

function removeTypingIndicator(typingId) {
    const indicator = document.getElementById(typingId);
    if (indicator) {
        indicator.style.animation = 'fadeOut 0.2s ease-out';
        setTimeout(() => indicator.remove(), 200);
    }
}

function appendMessage(role, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'mb-8 message-animate';

    if (role === 'user') {
        const safeText = escapeHtml(text);
        messageDiv.innerHTML = `
            <div class="flex gap-4 justify-end">
                <div class="bg-black text-white px-4 py-3 rounded-2xl rounded-tr-md max-w-[85%]">
                    <p class="text-sm whitespace-pre-wrap m-0">${safeText}</p>
                </div>
                <div class="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center">
                    <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                </div>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="flex gap-4">
                <div class="w-8 h-8 rounded-full bg-black flex-shrink-0 flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                </div>
                <div class="prose max-w-none flex-1 w-[95%]">
                    <div class="markdown-content text-sm w-[95%]">${marked.parse(text)}</div>
                </div>
            </div>
        `;
    }

    messagesInner.appendChild(messageDiv);
    
    // Enhance code blocks for AI messages
    if (role === 'model' && typeof enhanceCodeBlocks === 'function') {
        enhanceCodeBlocks();
    }
    
    scrollToBottom();
}

function updateSidebarPreview(text) {
    const currentChatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
    if (currentChatItem) {
        const previewText = text.substring(0, 30) + (text.length > 30 ? '...' : '');
        const previewSpan = currentChatItem.querySelector('span');
        if (previewSpan) {
            previewSpan.textContent = previewText;
        }
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Auto-focus input on load and check initial state
window.addEventListener('load', () => {
    console.log('Page loaded');
    setTimeout(() => {
        if (userInput) {
            userInput.focus();
            updateSendButton();
            console.log('Input focused, button state updated');
        }
    }, 100);
});

// Check button state when page becomes visible
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        updateSendButton();
    }
});

// Add fadeOut animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.95); }
    }
`;
document.head.appendChild(style);

console.log('All event listeners attached');