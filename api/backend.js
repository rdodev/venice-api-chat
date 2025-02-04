const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv').config();



const app = express();
const port = 3000;


//static content
app.use(express.static(path.join(__dirname, '..')));

app.use(cors({
  origin: '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(bodyParser.json());

const COMMON_PARAMS = {
  modelName: 'llama-3.3-70b',
  maxTokens: 1000,
  modelEndpointUrl: 'https://api.venice.ai/api/v1/chat/completions'
};

const HEADERS = {
  'Content-Type': 'application/json',
  "Authorization": "Bearer " + process.env.VENICE_API_KEY,
};


const PROMPTS = {
  chat: "Briefly respond to the following: "
};

const countWords = (str) => {
  return str.trim().split(/\s+/).length;
}

const requestModelResponse = async (content, requestType, requester = axios) => {
  try {
    const response = await requester.post(
      COMMON_PARAMS.modelEndpointUrl,
      {
        model: COMMON_PARAMS.modelName,
        max_tokens: COMMON_PARAMS.maxTokens,
        messages: [
          {
            role: 'user',
            content: PROMPTS[requestType] + content
          }
        ],
      },
      { headers: HEADERS}
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling API:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw new Error('Failed to get content');
  }
}

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  let isModelRequest = true;
  
  if (!message) {
    console.log('No encodedContent found in request body');
    return res.status(400).json({ error: 'No encodedContent provided' });
  }
  
  try {    
    const decodedContent = Buffer.from(message, 'base64').toString('utf-8');
    const urlDecodedContent = decodeURIComponent(decodedContent);
    console.log('content loading success');
    
    if (countWords(urlDecodedContent) > 100) {
      res.status(406).json({ error: 'Content body too large'})
    }
  
    if(isModelRequest) {
      const chat = await requestModelResponse(urlDecodedContent, 'chat');
      res.json({ chat });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const createServer = () => {
  return app.listen(port, () => {
    console.log(`API server running at http://localhost:${port}`);
  });
}

if (require.main === module) {
  createServer();
}

// Named exports (for testing and local development)
app.requestModelResponse = requestModelResponse;

module.exports = app;