# Atrixia Backend Setup Guide

This guide details the complete configuration, installation, and deployment procedures to run the Atrixia reasoning backend.

---

## 1. Required Accounts

To run the backend and execute queries, configure the following services:

### Google AI Studio (Recommended for Gemma 4)
- **What is it**: Rest API portal for Google's model catalog (Gemma, Gemini).
- **Setup**: Sign in to [Google AI Studio](https://aistudio.google.com/) using a Google account and generate an API key.

### Supabase / PostgreSQL
- **What is it**: Holds user accounts, preference logs, and history tables.
- **Setup**: Create an account on [Supabase](https://supabase.com/), create a project, and copy the PostgreSQL connection URL.

### Ollama (Optional for Local Execution)
- **What is it**: Local model running daemon.
- **Setup**: Install [Ollama](https://ollama.com/), run the execution command:
  ```bash
  ollama run gemma2:9b
  ```

---

## 2. API Keys and Environment Variables

Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

Define the variables in your `.env` file:

```ini
# AI Provider options: google-studio, vertex, ollama, huggingface, openrouter
AI_PROVIDER=google-studio

# Key for Google AI Studio
GEMMA_API_KEY=your_google_ai_studio_api_key

# Key for HuggingFace (if using huggingface provider)
HUGGINGFACE_API_KEY=your_huggingface_token

# Key for OpenRouter (if using openrouter provider)
OPENROUTER_API_KEY=your_openrouter_token

# Ollama local host URL (if using ollama provider)
OLLAMA_BASE_URL=http://localhost:11434

# PostgreSQL connection string
DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres

# JWT signing key
JWT_SECRET=your_jwt_signing_secret

# Server listening port
PORT=5000
```

---

## 3. Database Migration Setup

Initialize migrations to seed Drizzle schemas to your Supabase PostgreSQL database:

1. Validate credentials and connection URL in `.env`.
2. Run database schema seed:
   ```bash
   npx drizzle-kit push
   ```
3. Confirm tables (`users`, `searches`, `preferences`) are successfully created in the Supabase Table Editor.

---

## 4. Installing Dependencies

Install the backend package requirements:
```bash
npm install
```

---

## 5. Running the Backend

Execute the server scripts:

### Development Execution (Auto-rebuilds on changes)
```bash
npm run dev
```

### Production Build & Execution
```bash
npm run build
npm start
```

### Compile Type Safety Checks
```bash
npx tsc --noEmit
```

---

## 6. Testing AI Pipelines (No Frontend Required)

Verify that the reasoning execution runs cleanly using curl:

### Test REST Search (Standard JSON)
```bash
curl -X POST http://localhost:5000/api/search \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "find a high-quality laptop under $1000",
    "context": {
      "preferences": {
        "currency": "USD",
        "budgetMin": 0,
        "budgetMax": 1000,
        "prioritizePrice": false,
        "prioritizeQuality": true
      }
    }
  }'
```

### Test SSE Stream Search
```bash
curl -X POST "http://localhost:5000/api/search?stream=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Accept: text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "find a cheap phone"
  }'
```

### Test Conversational Chat Route
```bash
curl -X POST http://localhost:5000/api/search/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv_test_123",
    "message": "can you find one with faster shipping?"
  }'
```

---

## 7. Common Troubleshooting Errors

### `Gemma Migration Error: GEMMA_API_KEY is required`
- **Cause**: Active configuration has `AI_PROVIDER=google-studio` but the API key is not configured in `.env`.
- **Fix**: Add `GEMMA_API_KEY=your_key` to `.env` or set `AI_PROVIDER=ollama` to run locally.

### `Database connection failure`
- **Cause**: Invalid connection URL or host timeout.
- **Fix**: Verify your connection URL is correct and whitelist your IP address in the Supabase Network settings.
