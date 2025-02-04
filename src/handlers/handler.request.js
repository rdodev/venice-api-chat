const axios = require('axios');
const config = require('../../config.json');
const systemPromptManager = require('./handler.system_prompt');
const conversationManager = require('./handler.conversation');

const HEADERS = {
  'Content-Type': 'application/json',
  "Authorization": "Bearer " + process.env.VENICE_API_KEY,
};

const countWords = (str) => {
  return str.trim().split(/\s+/).length;
}

const requestModelResponse = async (content, conversationId, requester = axios) => {
  try {
    // Get or create conversation history
    let conversationHistory = conversationManager.getConversation(conversationId);
    
    if (!conversationHistory) {
      const systemPrompt = await systemPromptManager.loadSystemPrompt();
      conversationHistory = conversationManager.createConversation(conversationId, systemPrompt);
    }
    
    // Add user message to history
    conversationManager.addUserMessage(conversationId, content);
    
    // Make a copy of the history to send
    const requestMessages = [...conversationHistory];
    
    console.log('Sending request with messages:', JSON.stringify(requestMessages, null, 2));
    
    const response = await requester.post(
      config.api.endpoint,
      {
        model: config.api.model,
        max_tokens: config.api.max_tokens,
        temperature: config.api.temperature,
        top_p: config.api.top_p,
        frequency_penalty: config.api.frequency_penalty,
        presence_penalty: config.api.presence_penalty,
        stream: config.api.stream,
        messages: requestMessages,
        venice_parameters: config.api.venice_parameters
      },
      { 
        headers: HEADERS,
        responseType: 'stream'
      }
    );

    if (config.api.stream) {
      return response;
    }

    const assistantMessage = {
      role: 'assistant',
      content: response.data.choices[0].message.content
    };
    
    // Add assistant response to history
    conversationManager.addAssistantMessage(conversationId, assistantMessage.content);
    
    return assistantMessage.content;
  } catch (error) {
    console.error('Error calling API:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      console.error('Response status:', error.response.status);
      console.error('Response headers:', JSON.stringify(error.response.headers, null, 2));
    }
    throw new Error(error.response?.data?.error || error.message || 'Failed to get content');
  }
}

module.exports = {
  requestModelResponse,
  countWords
};
