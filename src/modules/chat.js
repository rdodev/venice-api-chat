import { addMessage } from "./messages.js";

export async function sendChatMessage({ chatContainer, messageInput, conversationId, lastMessage }) {
  const content = messageInput.value.trim();
  if (!content) return;

  const userMessageElement = addMessage(chatContainer, { role: 'user', content }, true);
  messageInput.value = '';
  userMessageElement.classList.add('active');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: btoa(encodeURIComponent(content)),
        conversationId: conversationId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      // Create a message element for streaming
      const streamMessage = addMessage(chatContainer, { role: 'assistant', content: '' }, false);
      const textElement = streamMessage.querySelector('.message-text');
      let accumulatedContent = '';

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const chunk = line.slice(6);
            if (chunk === '[DONE]') {
              break;
            }
            accumulatedContent += chunk;
            textElement.innerHTML = typeof marked !== 'undefined' ? marked.parse(accumulatedContent) : accumulatedContent;
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
        }
      }
    } else {
      const data = await response.json();
      addMessage(chatContainer, { role: 'assistant', content: data.chat }, false);
    }

    // Return the last sent message for potential future use
    return content;
  } catch (error) {
    addMessage(chatContainer, { role: 'assistant', content: 'Error: Could not reach the server.' }, false);
    console.error('Error:', error);
    return null;
  } finally {
    userMessageElement.remove();
  }
}
