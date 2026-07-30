# Atrixia Backend

AI-powered shopping agent API. Searches multiple Nigerian and global marketplaces in parallel, ranks results using multi-criteria scoring, and streams a structured recommendation report back to the client via Server-Sent Events.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ with TypeScript |
| Framework | Express 5 |
| AI | Google Gemma-4 (`@google/genai`) |
| NLP | compromise.js (intent extraction, zero-latency) |
| Database | PostgreSQL via Drizzle ORM |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Migrations | Drizzle Kit |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file and fill in your keys
cp .env.example .env

# 3. Push schema to database
npx drizzle-kit push

# 4. Start development server
npm run dev
```

Server starts on `http://localhost:5000`.

---

## Environment Variables

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/atrixia

JWT_SECRET=your_jwt_secret_here

# Google AI Studio key for Gemma-4
GEMMA_API_KEY=your_gemma_api_key

# eBay Developer credentials (Browse API)
EBAY_APP_ID=your_ebay_app_id
EBAY_CERT_ID=your_ebay_cert_id

# ScraperAPI key (used for eBay HTML fallback)
SCRAPER_API_KEY=your_scraper_api_key

# Frontend origin for CORS
CORS_ORIGIN=http://localhost:5173
```

---

## Active Marketplaces

| Marketplace | Method | Status |
|---|---|---|
| Jumia | Direct HTML scrape (cheerio) | ✅ Active |
| Konga | Next.js `__next_f` JSON extraction | ✅ Active |
| Jiji | Nuxt SSR state extraction | ✅ Active |
| eBay | Official Browse API (OAuth cached) | ✅ Active |
| AliExpress | ScraperAPI (JS render required) | ⏸ Disabled — needs paid ScraperAPI tier |
| Temu | ScraperAPI (JS render required) | ⏸ Disabled — needs paid ScraperAPI tier |

All active adapters search **in parallel** using `Promise.allSettled` — total search time equals the slowest adapter, not the sum.

---

## API Reference

Base URL: `http://localhost:5000/api`

All routes except auth and `GET /search/marketplaces` require:
```
Authorization: Bearer <token>
```

---

### Authentication

#### `POST /auth/signup`
Create a new account. Sends a 6-digit verification code to the email.

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "min8chars"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created. A 6-digit code has been sent to your email.",
  "data": { "userId": "uuid", "email": "john@example.com" }
}
```

---

#### `POST /auth/verify-email`
Verify the 6-digit code sent to the user's email.

```json
{ "email": "john@example.com", "code": "123456" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "user": { "id": "uuid", "fullName": "John Doe", "email": "john@example.com" }
  }
}
```

---

#### `POST /auth/login`
```json
{ "email": "john@example.com", "password": "yourpassword" }
```

**Response:** Same as verify-email — returns `token` and `user`.

---

#### `POST /auth/resend-code`
```json
{ "email": "john@example.com" }
```

---

### Search

#### `POST /search?stream=true` ⭐ Primary endpoint
**Auth required.** Streams a real-time recommendation report via SSE.

**Request body:**
```json
{
  "query": "HP laptop under $500",

  "marketplaces": ["jumia", "konga", "jiji", "ebay"],

  "context": {
    "conversationId": "conv_abc123",
    "messages": []
  }
}
```

- `marketplaces` — optional, filters which adapters to search. Omit to use all active adapters (or the user's saved `preferredMarketplaces`).
- `context.conversationId` — optional, include to continue a previous conversation thread.

**SSE event stream:**

The response is a stream of `text/event-stream` events. Each event has the shape:
```
event: <type>
data: {"type":"<type>","progress":<0-100>,"timestamp":"...","metadata":{...}}
```

| Event type | Progress | What it means |
|---|---|---|
| `thinking` | 5 | Pipeline initialised |
| `retrieving_memory` | 15 | Loading conversation history |
| `loading_preferences` | 25 | User preferences loaded |
| `searching_marketplaces` | 30 | All adapters firing in parallel |
| `ranking_products` | 62 | Products scored by quality/value/seller/shipping |
| `analyzing_tradeoffs` | 70 | Building AI prompt |
| `generating_explanation` | 78 | Gemma generating recommendation |
| `validating_response` | 92 | Parsing and merging AI output |
| `saving_results` | 96 | Persisting to DB |
| `recommendation` | 99 | `metadata.report` contains the full report |
| `complete` | 100 | `metadata.report`, `metadata.conversationId`, `metadata.searchId` |
| `error` | 100 | `metadata.message`, `metadata.code` |

**Parsing SSE in JavaScript:**
```js
const res = await fetch('/api/search?stream=true', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  },
  body: JSON.stringify({ query: 'wireless headphones' }),
});

const reader = res.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value);
  for (const chunk of text.split('\n\n')) {
    const line = chunk.split('\n').find(l => l.startsWith('data:'));
    if (!line) continue;
    const event = JSON.parse(line.replace('data: ', ''));

    if (event.type === 'complete') {
      const { report, conversationId, searchId } = event.metadata;
      // store conversationId for follow-up queries
      // store searchId to fetch this result again later
    }

    if (event.type === 'error') {
      console.error(event.metadata.message);
    }
  }
}
```

---

**Report shape** (`event.metadata.report`):
```json
{
  "id": "uuid",
  "executiveSummary": "2-3 sentence summary written by Gemma",
  "totalProductsFound": 11,
  "bestOverall": { ...product },
  "bestBudget":  { ...product },
  "bestPerformance": { ...product },
  "bestValue":   { ...product },
  "rankedProducts": [ ...products ],
  "alternatives": [ ...products ],
  "pros": ["..."],
  "cons": ["..."],
  "warnings": ["..."],
  "shoppingTips": ["..."],
  "confidenceScore": 82,
  "confidenceLevel": "High",
  "marketplacesSearched": ["jumia", "konga", "jiji", "ebay"],
  "rankingCriteria": {
    "priceWeight": 0.25,
    "qualityWeight": 0.25,
    "sellerWeight": 0.25,
    "shippingWeight": 0.25
  }
}
```

**Product shape:**
```json
{
  "id": "jumia_abc123",
  "marketplace": "jumia",
  "title": "HP 250 G8 Laptop 15.6\" Intel Core i5",
  "brand": "HP",
  "price": 149.50,
  "currency": "USD",
  "image": "https://img.jumia.com/...",
  "productUrl": "https://www.jumia.com.ng/...",
  "seller": "Jumia Seller",
  "sellerRating": 85,
  "reviewCount": 120,
  "shippingCost": 0,
  "shippingEstimate": "Standard Delivery (3-7 days)",
  "condition": "new",
  "description": "AI-written description of this specific product",
  "pros": ["Fast processor", "Ample RAM"],
  "cons": ["No dedicated GPU"],
  "attributes": { "ram": "8GB", "storage": "256GB SSD", "screen": "15.6\"" },
  "scoreBreakdown": {
    "priceScore": 78,
    "qualityScore": 82,
    "sellerScore": 75,
    "shippingScore": 100,
    "overallScore": 84
  },
  "confidence": 84
}
```

---

#### `POST /search` (non-streaming)
Same request body as the stream endpoint, without `?stream=true`. Returns the full report in a single JSON response. Use for server-to-server integrations or testing.

**Response:**
```json
{
  "success": true,
  "data": {
    "...full report...",
    "conversationId": "conv_abc123",
    "searchId": "uuid"
  }
}
```

---

#### `GET /search/history`
Returns the user's last 20 searches — formatted for a ChatGPT-style sidebar.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "HP laptop under $500",
      "preview": "Found 11 products across jumia, konga, jiji, ebay...",
      "bestOverall": {
        "title": "HP 250 G8 Laptop",
        "price": 149.50,
        "currency": "USD",
        "image": "https://...",
        "marketplace": "jumia"
      },
      "resultsCount": 11,
      "createdAt": "2026-07-30T12:00:00Z"
    }
  ]
}
```

---

#### `DELETE /search/history/:searchId`
Deletes a single search from the user's history (like ChatGPT's per-chat delete button).

```
DELETE /api/search/history/uuid
Response: { "success": true, "message": "Search deleted." }
```

---

#### `DELETE /search/history`
Clears the user's entire search history.

```
DELETE /api/search/history
Response: { "success": true, "message": "Search history cleared." }
```

---

#### `GET /search/:searchId`
Returns the full saved report for a specific search. Use the `searchId` from the `complete` SSE event or history list.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "query": "HP laptop under $500",
    "timestamp": "2026-07-30T12:00:00Z",
    "resultsCount": 11,
    "results": { "...full report..." }
  }
}
```

---

#### `GET /search/marketplaces` — Public (no auth)
Returns the list of active marketplaces with display metadata. Use to populate the marketplace picker in the frontend.

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "jumia",  "label": "Jumia",  "region": "Nigeria / Africa", "description": "Leading African e-commerce marketplace" },
    { "id": "konga",  "label": "Konga",  "region": "Nigeria",          "description": "Nigerian online shopping platform" },
    { "id": "jiji",   "label": "Jiji",   "region": "Nigeria / Africa", "description": "Top classifieds marketplace for new & used items" },
    { "id": "ebay",   "label": "eBay",   "region": "US / Global",      "description": "Global marketplace with new & used items" }
  ]
}
```

---

#### `GET /search/conversations`
Returns all conversation threads for the user (newest first).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "conversationId": "conv_abc123",
      "messageCount": 4,
      "lastMessage": "What about the one with better battery life?",
      "summary": null,
      "updatedAt": "2026-07-30T12:30:00Z",
      "createdAt": "2026-07-30T12:00:00Z"
    }
  ]
}
```

---

#### `GET /search/conversations/:conversationId`
Returns the full message thread for a conversation.

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv_abc123",
    "messages": [
      { "role": "user", "content": "HP laptop under $500" },
      { "role": "assistant", "content": "Found 11 products. Best overall: HP 250 G8..." }
    ],
    "summary": null,
    "createdAt": "2026-07-30T12:00:00Z",
    "updatedAt": "2026-07-30T12:30:00Z"
  }
}
```

**To continue a conversation**, pass `conversationId` in the next search:
```json
{
  "query": "what about the one with better battery life?",
  "context": { "conversationId": "conv_abc123", "messages": [] }
}
```

#### `DELETE /search/conversations/:conversationId`
Deletes a specific conversation thread (same pattern as ChatGPT's per-chat delete).

```
DELETE /api/search/conversations/conv_abc123
Response: { "success": true, "message": "Conversation deleted." }
```

---

#### `GET /user/profile`
```json
{
  "success": true,
  "data": { "id": "uuid", "fullName": "John Doe", "email": "john@example.com", "emailVerified": true }
}
```

---

#### `GET /user/preferences`
```json
{
  "success": true,
  "data": {
    "currency": "USD",
    "prioritizePrice": false,
    "prioritizeQuality": true,
    "preferredMarketplaces": []
  }
}
```

- `preferredMarketplaces: []` means search all active marketplaces.
- Preferences are **automatically applied** to every search — no need to send them in each request.

---

#### `PUT /user/preferences`
All fields are optional — only send what you want to change.

```json
{
  "currency": "NGN",
  "prioritizePrice": false,
  "prioritizeQuality": true,
  "preferredMarketplaces": ["jumia", "konga"]
}
```

Rules:
- `prioritizePrice` and `prioritizeQuality` are **mutually exclusive**. If both `true`, `prioritizeQuality` wins.
- `preferredMarketplaces` must only contain valid IDs: `jumia`, `konga`, `jiji`, `ebay`.
- Send `preferredMarketplaces: []` to reset to all marketplaces.

**Response:**
```json
{
  "success": true,
  "data": {
    "currency": "NGN",
    "prioritizePrice": false,
    "prioritizeQuality": true,
    "preferredMarketplaces": ["jumia", "konga"]
  },
  "message": "Preferences saved."
}
```

---

### Health

#### `GET /health` — Public
```json
{ "status": "ok" }
```

---

## Query Validation

Queries are validated before any marketplace search or AI call. Rejected queries get a 400 response (non-stream) or an SSE `error` event (stream) with a user-friendly message:

| Category | Example | Message |
|---|---|---|
| Too short | `"a"` | "That's too short to search..." |
| NSFW | `"sex toy"` | "Atrixia is a shopping assistant..." |
| Illegal | `"buy cocaine"` | "We can't help with that..." |
| Non-shopping | `"what's the weather"` | "I'm a shopping assistant..." |

---

## Multi-Turn Conversations

The system maintains conversation memory per `conversationId`:

1. First search → server generates a `conversationId`, returns it in `complete` event
2. Frontend stores the `conversationId`
3. Follow-up search → pass `conversationId` in `context`
4. Server loads previous messages, gives Gemma full context
5. After 10 messages, older ones are auto-summarised to stay within the token window

---

## Ranking System

Every product is scored across 4 dimensions (default equal weights):

| Dimension | Weight | How it's scored |
|---|---|---|
| Price | 25% | Budget-aware: 100 = well under budget, 50 = at limit, 25 = over budget |
| Quality | 25% | Based on condition, brand presence, review count |
| Seller | 25% | 100 = 4.8★ + 100 reviews, 75 = 4.0★ + 20 reviews, 25 = no data |
| Shipping | 25% | 100 = free 1-2 days, 75 = free 3-5 days, 50 = paid, 25 = 7+ days |

User setting `prioritizeQuality: true` shifts quality weight up by 10%, others down proportionally. The final 4 picks — `bestOverall`, `bestBudget`, `bestPerformance`, `bestValue` — are always distinct products.

---

## Project Structure

```
src/
├── controllers/        # Route handlers
│   ├── authController.ts
│   ├── searchController.ts
│   ├── chatController.ts
│   └── userController.ts
├── routes/             # Express routers
├── middleware/         # Auth, CORS, error handling
├── repositories/       # DB access layer
│   ├── searchHistoryRepository.ts
│   ├── conversationRepository.ts
│   ├── preferenceRepository.ts
│   └── databaseMemoryRepository.ts
├── services/           # Business logic (auth, user)
├── db/
│   ├── schema.ts       # Drizzle table definitions
│   ├── index.ts        # DB connection
│   └── migrations/     # SQL migration files
├── lib/ai/
│   ├── orchestrator/   # Main pipeline (processQuery, processQueryStream)
│   ├── adapters/       # Marketplace scrapers + query sanitizer
│   │   ├── jumia.ts
│   │   ├── konga.ts
│   │   ├── jiji.ts
│   │   ├── ebay.ts
│   │   ├── aliexpress.ts    # disabled
│   │   ├── temu.ts          # disabled
│   │   └── querySanitizer.ts
│   ├── marketplace/    # Manager, registry, normalizer, cache
│   ├── ranking/        # MCDA scoring engine
│   ├── intent/         # NLP intent extractor (compromise.js)
│   ├── memory/         # Conversation context management
│   ├── prompt-builder/ # System prompt construction
│   ├── providers/      # Gemma provider with retry logic
│   ├── report/         # Report generation + AI merge
│   ├── streaming/      # SSE writer and coordinator
│   └── schemas/        # Zod request validation
└── __tests__/          # Vitest test suite
```

---

## Running Tests

```bash
npm test          # run once
npm run test:watch  # watch mode
```

45 tests across intent extraction, ranking engine, normalizer, report generator, and search history repository.

---

## Database Schema

```sql
users          -- accounts (id, email, passwordHash, emailVerified)
searches       -- saved search results (id, userId, query, results jsonb)
conversations  -- chat threads (id, userId, messages jsonb, summary)
preferences    -- user settings (userId, currency, prioritizePrice,
               --   prioritizeQuality, preferredMarketplaces jsonb)
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (hot reload) |
| `npm start` | Start without nodemon |
| `npm test` | Run test suite |
| `npx drizzle-kit push` | Push schema changes to DB |
| `npx drizzle-kit generate` | Generate SQL migration files |
