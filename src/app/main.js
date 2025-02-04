import { sendChatMessage } from "../modules/chat.js";
import { loadSystemPrompts, setActivePrompt } from "../modules/systemPrompts.js";
import { fetchAndPopulateModels } from "../modules/models.js";
import icons from "../modules/icons.js";

// State management
const state = {
    conversationId: Date.now().toString(36) + Math.random().toString(36).substr(2),
    lastMessage: '',
    currentPrompt: null,
    theme: localStorage.getItem('theme') || 'light'
};

// Set initial theme
document.documentElement.classList.toggle('light-theme', state.theme === 'light');

// Error handling utility
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.setAttribute('role', 'alert');
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

// Prompt editor handling
const modal = document.getElementById('promptEditorModal');
const editor = document.getElementById('promptEditor');
const editBtn = document.getElementById('editPromptBtn');
const closeBtn = document.getElementById('closePromptEditor');
const saveBtn = document.getElementById('savePrompt');

function showEditor() {
    const systemPromptSelect = document.getElementById('systemPromptSelect');
    if (!systemPromptSelect?.value) {
        showError('No system prompt selected');
        return;
    }

    const selectedOption = systemPromptSelect.options[systemPromptSelect.selectedIndex];
    state.currentPrompt = {
        filename: systemPromptSelect.value,
        name: selectedOption.text
    };

    modal.style.display = 'block';
    
    fetch(`/system_prompts/${state.currentPrompt.filename}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch prompt content');
            return response.text();
        })
        .then(content => {
            editor.value = content;
        })
        .catch(error => {
            showError('Error loading prompt: ' + error.message);
            editor.value = '';
        });
}

function hideEditor() {
    modal.style.display = 'none';
}

async function savePrompt() {
    if (!state.currentPrompt) return;
    
    try {
        const response = await fetch(`/api/system-prompts/${state.currentPrompt.filename}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: editor.value
            }),
        });
        
        if (!response.ok) {
            throw new Error('Failed to save prompt');
        }
        
        hideEditor();
        await loadSystemPrompts();
    } catch (error) {
        showError('Error saving prompt: ' + error.message);
    }
}

// Event listeners for prompt editor
editBtn.addEventListener('click', showEditor);
closeBtn.addEventListener('click', hideEditor);
saveBtn.addEventListener('click', savePrompt);

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        hideEditor();
    }
});

// Initialize when page loads
async function initializePage() {
    try {
        // Fetch config first
        const configResponse = await fetch('/api/config');
        if (!configResponse.ok) {
            throw new Error('Failed to fetch config');
        }
        const config = await configResponse.json();

        // Select DOM elements
        const chatContainer = document.getElementById('chatContainer');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const systemPromptSelect = document.getElementById('systemPromptSelect');

        // Explicit error handling for message input
        if (!messageInput) {
            showError('CRITICAL: Message input element is MISSING!');
            return; // Exit early if critical element is missing
        }

        // Add auto-grow functionality for message input
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            const maxHeight = parseFloat(getComputedStyle(this).lineHeight) * 6;
            const scrollHeight = this.scrollHeight;
            
            if (scrollHeight <= maxHeight) {
                this.style.height = `${scrollHeight}px`;
            } else {
                this.style.height = `${maxHeight}px`;
                this.style.overflowY = 'auto';
            }
        });

        // Modify keydown event to be more explicit
        messageInput.addEventListener('keydown', async function(e) {
            if (e.key === 'Enter') {
                if (!e.shiftKey) {
                    // Prevent default to stop new line
                    e.preventDefault();
                    
                    try {
                        if (chatContainer && messageInput) {
                            const lastSentMessage = await sendChatMessage({ 
                                chatContainer, 
                                messageInput, 
                                conversationId: state.conversationId, 
                                lastMessage: state.lastMessage 
                            });
                            
                            // Update last message if sent successfully
                            if (lastSentMessage) {
                                state.lastMessage = lastSentMessage;
                            }
                            
                            messageInput.value = '';
                        } else {
                            showError('Missing required elements for sending message');
                        }
                    } catch (error) {
                        showError('EXCEPTION in message sending: ' + error.message);
                    }
                }
            } else if (e.key === 'ArrowUp') {
                messageInput.value = state.lastMessage;
            }
        });

        // Similar explicit logging for send button
        if (sendButton) {
            sendButton.addEventListener('click', async () => {
                try {
                    if (chatContainer && messageInput) {
                        const lastSentMessage = await sendChatMessage({ 
                            chatContainer, 
                            messageInput, 
                            conversationId: state.conversationId, 
                            lastMessage: state.lastMessage 
                        });
                        
                        // Update last message if sent successfully
                        if (lastSentMessage) {
                            state.lastMessage = lastSentMessage;
                        }
                        
                        messageInput.value = '';
                    } else {
                        showError('Missing elements for send button click');
                    }
                } catch (error) {
                    showError('EXCEPTION in send button click: ' + error.message);
                }
            });
        } else {
            showError('Send button is MISSING');
        }

        // Set up send button icon if element exists
        const sendButtonIcon = document.querySelector('#sendButton svg');
        if (sendButtonIcon) {
            sendButtonIcon.classList.add('send-icon');
        }

        // Validate critical DOM elements
        const domElements = [
            { name: 'chatContainer', element: chatContainer },
            { name: 'messageInput', element: messageInput },
            { name: 'sendButton', element: sendButton },
            { name: 'systemPromptSelect', element: systemPromptSelect }
        ];

        domElements.forEach(({ name, element }) => {
            if (!element) {
                showError(`DOM element '${name}' not found!`);
            }
        });

        // System prompt handling
        const systemPromptSelectElement = document.getElementById('systemPromptSelect');
        if (systemPromptSelectElement) {
            systemPromptSelectElement.addEventListener('change', async (e) => {
                try {
                    await setActivePrompt(e.target.value);
                } catch (error) {
                    showError('Error setting active prompt: ' + error.message);
                }
            });
        } else {
            showError('System prompt select element not found');
        }

        // Load system prompts
        await loadSystemPrompts();

        // Fetch and populate models
        await fetchAndPopulateModels(config);

        // Load icons
        loadIcons();
     
    } catch (error) {
        showError('Initialization error: ' + error.message);
    }
}

function loadIcons() {
    const themeIcon = document.getElementById('themeIcon');
    const sendIcon = document.getElementById('sendIcon');

    if (themeIcon) {
        themeIcon.innerHTML = icons.theme;
    }

    if (sendIcon) {
        sendIcon.innerHTML = icons.send;
    }
}

// Initialize theme toggle
function initializeThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    
    if (themeToggle) {
        // In dark mode, show moon (white). In light mode, show sun (black)
        const moonIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
        const sunIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
        
        // Set initial icon based on theme
        themeToggle.innerHTML = state.theme === 'dark' ? moonIcon : sunIcon;
        document.documentElement.classList.toggle('light-theme', state.theme === 'light');
        
        themeToggle.addEventListener('click', () => {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            document.documentElement.classList.toggle('light-theme', state.theme === 'light');
            localStorage.setItem('theme', state.theme);
            themeToggle.innerHTML = state.theme === 'dark' ? moonIcon : sunIcon;
        });
    } else {
        showError('Theme toggle element not found');
    }
}

// Call initialization when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializePage();
    initializeThemeToggle();
});