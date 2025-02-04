const config = require('../../config.json');

class ConversationManager {
  constructor() {
    // In-memory conversation store
    this.conversations = new Map();
  }

  getConversation(conversationId) {
    return this.conversations.get(conversationId);
  }

  createConversation(conversationId, systemPrompt) {
    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, [{
        role: 'system',
        content: systemPrompt
      }]);
    }
    return this.conversations.get(conversationId);
  }

  addUserMessage(conversationId, content) {
    const conversationHistory = this.getConversation(conversationId);
    if (!conversationHistory) {
      throw new Error('Conversation not found');
    }

    conversationHistory.push({
      role: 'user',
      content: content
    });

    return conversationHistory;
  }

  addAssistantMessage(conversationId, content) {
    const conversationHistory = this.getConversation(conversationId);
    if (!conversationHistory) {
      throw new Error('Conversation not found');
    }

    conversationHistory.push({
      role: 'assistant',
      content: content
    });

    return conversationHistory;
  }

  deleteMessage(conversationId, index) {
    const conversation = this.getConversation(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    if (index < 1 || index >= conversation.length) {
      throw new Error('Invalid message index');
    }
    
    // Remove the message
    conversation.splice(index, 1);
    return conversation;
  }

  getAllConversations() {
    return Object.fromEntries(this.conversations);
  }

  updateSystemPromptsInAllConversations(newSystemPrompt) {
    for (const conversation of this.conversations.values()) {
      if (conversation.length > 0 && conversation[0].role === 'system') {
        conversation[0].content = newSystemPrompt;
      }
    }
  }
}

module.exports = new ConversationManager();
