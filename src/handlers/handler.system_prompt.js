const path = require('path');
const fs = require('fs').promises;
const conversationManager = require('./handler.conversation');

class SystemPromptManager {
  constructor() {
    this.activePromptFile = null;
    this.promptsDir = path.join(__dirname, '..', 'system_prompts');
    this.activePromptContent = null;
  }

  async loadSystemPrompt(promptFile = null) {
    try {
      // If no specific prompt file is provided, use the active one or find the first .md file
      if (!promptFile) {
        if (!this.activePromptFile) {
          const files = await fs.readdir(this.promptsDir);
          const mdFiles = files.filter(file => file.endsWith('.md'));
          if (mdFiles.length === 0) {
            throw new Error('No system prompt files found');
          }
          this.activePromptFile = mdFiles[0];
        }
        promptFile = this.activePromptFile;
      }
      
      const systemPromptPath = path.join(this.promptsDir, promptFile);
      const content = await fs.readFile(systemPromptPath, 'utf8');
      this.activePromptFile = promptFile;
      this.activePromptContent = content;
      return content;
    } catch (error) {
      console.error('Error loading system prompt:', error);
      return "You are a helpful AI assistant."; // Fallback prompt
    }
  }

  async getSystemPrompts() {
    try {
      const files = await fs.readdir(this.promptsDir);
      const mdFiles = files.filter(file => file.endsWith('.md'));
      const prompts = await Promise.all(mdFiles.map(async file => {
        const content = await fs.readFile(path.join(this.promptsDir, file), 'utf8');
        return {
          name: file.replace('.md', ''),
          filename: file,
          content
        };
      }));
      return prompts;
    } catch (error) {
      console.error('Error reading system prompts:', error);
      throw new Error('Failed to read system prompts');
    }
  }

  async saveSystemPrompt(filename, content) {
    if (!filename.endsWith('.md')) {
      throw new Error('Invalid file type');
    }
    
    const promptPath = path.join(this.promptsDir, filename);
    await fs.writeFile(promptPath, content, 'utf8');
    
    // If this is the current active prompt, reload it
    if (filename === this.activePromptFile) {
      await this.loadSystemPrompt();
    }
    
    return true;
  }

  async setActivePrompt(filename) {
    if (!filename || !filename.endsWith('.md')) {
      throw new Error('Invalid filename');
    }
    
    const content = await this.loadSystemPrompt(filename);
    
    // Update system message in all existing conversations
    const allConversations = conversationManager.getAllConversations();
    
    for (const [conversationId, conversation] of Object.entries(allConversations)) {
      if (conversation.length > 0 && conversation[0].role === 'system') {
        conversation[0].content = content;
      }
    }
    
    return content;
  }

  async getActiveConversations() {
    const allConversations = conversationManager.getAllConversations();
    const activeConversations = {};

    for (const [conversationId, conversation] of Object.entries(allConversations)) {
      if (conversation.length > 0) {
        activeConversations[conversationId] = conversation;
      }
    }

    return activeConversations;
  }

  async updateSystemPromptsInConversations() {
    const activeConversations = await this.getActiveConversations();
    const activePromptContent = this.getActivePromptContent();

    for (const [conversationId, conversation] of Object.entries(activeConversations)) {
      if (conversation.length > 0 && conversation[0].role === 'system') {
        conversation[0].content = activePromptContent;
      }
    }
  }

  getActivePromptContent() {
    return this.activePromptContent || "You are a helpful AI assistant.";
  }
}

module.exports = new SystemPromptManager();
