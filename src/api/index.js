const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs').promises;
const config = require('../../config.json');
const dotenv = require('dotenv').config();

const systemPromptManager = require('../handlers/handler.system_prompt');
const conversationManager = require('../handlers/handler.conversation');
const { requestModelResponse, countWords } = require('../handlers/handler.request');

const app = express();
const { port, host } = config.server;

//static content
app.use(express.static(path.join(__dirname, '..')));
app.use(express.static(path.join(__dirname, '../app')));

app.use(cors({
  origin: '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(bodyParser.json());

app.get('/api/system-prompts', async (req, res) => {
  try {
    const prompts = await systemPromptManager.getSystemPrompts();
    res.json(prompts);
  } catch (error) {
    console.error('Error reading system prompts:', error);
    res.status(500).json({ error: 'Failed to read system prompts' });
  }
});

app.post('/api/system-prompts/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { content } = req.body;
    
    await systemPromptManager.saveSystemPrompt(filename, content);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving system prompt:', error);
    res.status(500).json({ error: 'Failed to save system prompt' });
  }
});

app.post('/api/active-prompt', async (req, res) => {
  try {
    const { filename } = req.body;
    const content = await systemPromptManager.setActivePrompt(filename);
    await conversationManager.updateSystemPromptsInAllConversations(content);
    
    res.json({ success: true, content });
  } catch (error) {
    console.error('Error setting active prompt:', error);
    res.status(500).json({ error: 'Failed to set active prompt' });
  }
});

app.delete('/api/chat/:conversationId/messages/:index', (req, res) => {
  try {
    const { conversationId, index } = req.params;
    const conversation = conversationManager.deleteMessage(conversationId, parseInt(index));
    
    res.json({ success: true, conversation });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chat/:conversationId', (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = conversationManager.getConversation(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json(conversation);
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const decodedContent = decodeURIComponent(Buffer.from(req.body.message, 'base64').toString());
    
    if (countWords(decodedContent) > 10000) {
      return res.status(400).json({ error: 'Message exceeds word limit' });
    }
    
    const response = await requestModelResponse(decodedContent, req.body.conversationId);

    if (config.api.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullContent = '';
      let buffer = '';
      
      response.data.on('data', chunk => {
        // Add the new chunk to our buffer
        buffer += chunk.toString();
        
        // Split on newlines, keeping any partial line in the buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
          
          // Remove the "data: " prefix
          const jsonStr = trimmedLine.slice(6);
          
          // Skip "[DONE]" message
          if (jsonStr === '[DONE]') continue;
          
          try {
            const data = JSON.parse(jsonStr);
            if (data.choices?.[0]?.delta?.content) {
              const content = data.choices[0].delta.content;
              fullContent += content;
              res.write(`data: ${content}\n\n`);
            }
          } catch (e) {
            // Log the error and the problematic line for debugging
            console.error('Error parsing JSON:', e.message);
            console.error('Problematic line:', jsonStr);
            // Continue processing other chunks
            continue;
          }
        }
      });

      response.data.on('end', () => {
        // Add the complete message to conversation history
        conversationManager.addAssistantMessage(req.body.conversationId, fullContent);
        res.write('data: [DONE]\n\n');
        res.end();
      });

      response.data.on('error', error => {
        console.error('Stream error:', error);
        res.end();
      });
    } else {
      res.json({ chat: response });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/config', async (req, res) => {
  try {
    const configPath = path.join(__dirname, '..', '..', 'config.json');
    const configContent = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configContent);
    res.json(config);
  } catch (error) {
    console.error('Error reading config:', error);
    res.status(500).json({ error: 'Failed to read configuration' });
  }
});

app.get('/api/models', async (req, res) => {
  try {
    const response = await fetch('https://api.venice.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.VENICE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }

    const rawModels = await response.json();
    
    // Normalize the models format
    const normalizedModels = (Array.isArray(rawModels) ? rawModels : rawModels.data || [])
      .filter(model => model && (model.type === 'text' || model.type === 'TEXT'))
      .map(model => ({
        id: model.id || model.identifier || model.name,
        type: model.type,
        name: model.name || model.id,
        context_length: model.context_length || null,
        traits: model.traits || []
      }));
    
    res.json(normalizedModels);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models', details: error.message });
  }
});

app.post('/api/update-config', async (req, res) => {
  try {
    const { model } = req.body;
    
    // Read current config
    const configPath = path.join(__dirname, '..', '..', 'config.json');
    const configContent = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    // Update model
    config.api.model = model;
    
    // Write updated config
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
    
    res.json({ success: true, model });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

app.post('/api/update-model', async (req, res) => {
  try {
    const { model } = req.body;

    if (!model) {
      return res.status(400).json({ error: 'Model is required' });
    }

    // Read the current config
    const configPath = path.join(__dirname, '..', '..', 'config.json');
    const configContent = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configContent);

    // Update the model
    config.api.model = model;

    // Write the updated config back to the file
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');

    res.json({ 
      success: true, 
      message: `Model updated to ${model}` 
    });
  } catch (error) {
    console.error('Error updating model:', error);
    res.status(500).json({ 
      error: 'Failed to update model', 
      details: error.message 
    });
  }
});

const createServer = () => {
  return app.listen({ port, host }, (err, address) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    console.log(`Server listening on http://${host}:${port}`);
  });
}

if (require.main === module) {
  createServer();
}

// Named exports (for testing and local development)
app.requestModelResponse = requestModelResponse;

module.exports = app;