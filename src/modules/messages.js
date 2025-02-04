import icons from './icons.js';

export function formatTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function createMessageElement(message, index) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.role === 'user' ? 'user-message' : 'bot-message'}`;
    messageDiv.dataset.index = index;
    messageDiv.setAttribute('role', 'listitem');
    messageDiv.setAttribute('aria-label', `${message.role === 'user' ? 'User' : 'Assistant'} message`);

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = formatTimestamp();
    
    const username = document.createElement('span');
    username.className = 'username';
    username.textContent = message.role === 'user' ? 'User' : 'Assistant';
    
    const text = document.createElement('span');
    text.className = 'message-text';
    // Preserve line breaks and handle markdown for both user and assistant messages
    const processedContent = message.role === 'user' ? 
        message.content.replace(/\n/g, '<br>') : 
        DOMPurify.sanitize(marked.parse(message.content));
    text.innerHTML = processedContent;
    
    messageContent.appendChild(timestamp);
    messageContent.appendChild(username);
    messageContent.appendChild(text);
    messageDiv.appendChild(messageContent);

    // Add copy button for assistant messages
    if (message.role === 'assistant') {
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.innerHTML = icons.copy.default;
        copyButton.setAttribute('aria-label', 'Copy message');
        copyButton.title = 'Copy message';
        copyButton.onclick = () => {
            const textToCopy = (text.textContent || text.innerText || message.content)
                .trim()
                .replace(/\n+/g, '\n');

            navigator.clipboard.writeText(textToCopy).then(() => {
                copyButton.innerHTML = icons.copy.success;
                setTimeout(() => {
                    copyButton.innerHTML = icons.copy.default;
                }, 1000);
            }).catch(err => {
                console.error('Copy failed:', err);
            });
        };
        messageDiv.appendChild(copyButton);
    }

    // Add delete button (never for system messages)
    if (message.role !== 'system') {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.innerHTML = icons.delete;
        deleteBtn.title = 'Delete message';
        deleteBtn.onclick = async () => {
            await deleteMessage(index);
        };
        messageDiv.appendChild(deleteBtn);
    }

    return messageDiv;
}

export function addMessage(chatContainer, message, isUser = false) {
    const messageElement = createMessageElement(message, document.querySelectorAll('.message').length + 1);
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    if (isUser) {
        const spinner = document.createElement('div');
        spinner.className = 'message-spinner';
        spinner.innerHTML = `
            <div class="typing-indicator">
                <span></span>
            </div>
        `;
        chatContainer.appendChild(spinner);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return spinner;
    }
    return messageElement;
}

export async function deleteMessage(index) {
    const chatContainer = document.getElementById('chatContainer');
    const conversationId = window.conversationId;

    console.log('Attempting to delete message:', {
        index,
        conversationId,
        chatContainerExists: !!chatContainer
    });

    if (!conversationId) {
        console.error('No active conversation ID');
        return;
    }

    try {
        const response = await fetch(`/api/chat/${conversationId}/messages/${index}`, {
            method: 'DELETE'
        });

        console.log('Delete message response:', {
            status: response.status,
            ok: response.ok
        });

        if (response.ok) {
            // Remove only the specific message from the UI
            const messageToRemove = chatContainer.querySelector(`.message[data-index="${index}"]`);
            if (messageToRemove) {
                messageToRemove.remove();
            }
            
            // Fetch the updated conversation from backend
            const conversationResponse = await fetch(`/api/chat/${conversationId}`);
            console.log('Conversation fetch response:', {
                status: conversationResponse.status,
                ok: conversationResponse.ok
            });

            if (conversationResponse.ok) {
                const conversation = await conversationResponse.json();
                console.log('Fetched conversation:', conversation);
            }
        }
    } catch (error) {
        console.error('Error deleting message:', error);
    }
}
