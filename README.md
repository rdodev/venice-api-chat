# LonzoChat: Context-less LLM Chat with Venice API

A web application that provides chat functionality with LLMs using the Llama 3.3 70B model.

## Features

- Chat interface with message history
- Markdown support in responses
- Copy-to-clipboard functionality
- Word count limits for messages

## Key Components

- `backend.js`: Express server handling API requests and LLM interactions
- `script.js`: Frontend chat interface logic
- `styles.css`: Discord-inspired styling

## Prerequisites

- Node.js >= 14
- Vercel account
- Venice.ai API key

## Environment Variables

```
VENICE_API_KEY=your_venice_api_key
```

## Local Development

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Create `.env` file with required environment variables
4. Start the development server:
```bash
node api/backend.js
```
5. Open `http://localhost:3000` in your browser

## Vercel Deployment

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables in Vercel dashboard:
   - Go to Project Settings > Environment Variables
   - Add VENICE_API_KEY

## Usage

- Send regular messages for chat interactions
- Messages are limited to 100 words
- Use arrow up to recall last message

## API Endpoints

- `/api/chat`: POST endpoint for chat messages
  - Accepts base64 encoded messages
  - Returns JSON response with chat or analysis content

## Dependencies

See `package.json` for complete list of dependencies including:
- express
- axios
- cors
