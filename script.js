lucide.createIcons();

const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
let lastMessage = '';


function formatTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
}

function countWords(str) {
    return str.trim().split(/\s+/).length;
}

function addMessage(content, isUser) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = formatTimestamp();
    
    const username = document.createElement('span');
    username.className = 'username';
    username.textContent = isUser ? 'You' : 'LonzoBot';
    
    const text = document.createElement('span');
    text.className = 'message-text';
    text.innerHTML = isUser ? content : marked.parse(content);
    
    messageContent.appendChild(timestamp);
    messageContent.appendChild(username);
    messageContent.appendChild(text);
    messageDiv.appendChild(messageContent);

    if (isUser) {
        const spinner = document.createElement('div');
        spinner.className = 'message-spinner';
        spinner.innerHTML = `
            <span class="text-xs">Processing</span>
        `;
        messageDiv.appendChild(spinner);
    }

    if (!isUser) {
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.innerHTML = '<i data-lucide="copy"></i>';
        copyButton.onclick = () => navigator.clipboard.writeText(content);
        messageDiv.appendChild(copyButton);
    }
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    lucide.createIcons();

    return messageDiv;
    
}

async function sendMessage() {
    const content = messageInput.value.trim();
    if (!content) return;

    if (countWords(content) > 100) {
        addMessage('Error: Message exceeds 100 words limit', false);
        return;
    }

    lastMessage = content;
    const messageDiv = addMessage(content, true);
    messageInput.value = '';
    const spinner = messageDiv.querySelector('.message-spinner');
    
    spinner.classList.add('active');

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: btoa(encodeURIComponent(content)) })
        });

        const data = await response.json();
        // console.log(data);
        addMessage(data.chat, false);
    } catch (error) {
        addMessage('Error: Could not reach the server.', false);
    } finally {
        spinner.remove();
    }
}

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    } else if (e.key === 'ArrowUp') {
        messageInput.value = lastMessage;
    }
});

sendButton.addEventListener('click', sendMessage);