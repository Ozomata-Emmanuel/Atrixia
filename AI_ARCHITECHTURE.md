# ATRIXIA AI ARCHITECTURE SPECIFICATION v1.0

**Authoritative Technical Specification & AI System Design**

* **Project:** Atrixia (Autonomous AI Shopping Decision Agent)
* **Target Environment:** Next.js 15 (App Router) + Supabase PostgreSQL + Google AI Studio (Gemma 4 / Gemini 2.5)
* **Version:** 1.0
* **Status:** Approved for Implementation

---

## 1. AI Vision

Atrixia's core philosophy is to transform online shopping from **keyword search and manual comparison** into **automated decision intelligence**. 

Traditional e-commerce platforms return lists of search results ranked primarily by advertising dollars or simple price sorting. This leaves the consumer with the cognitive burden of navigating fragmented listings across Amazon, eBay, Jumia, and AliExpress, evaluating seller authenticity, reading contradictory reviews, and weighing delivery trade-offs.

Atrixia treats shopping as a **Multi-Criteria Decision-Making (MCDM)** problem solved through an autonomous AI agent:
- **AI as the Central Decision Engine:** The AI is not a chatbot addon; it is the core orchestrator that interprets user intent, formulates search tasks, selects marketplace tool adapters, normalizes candidate products, reasons over trade-offs, and outputs a single defensible recommendation backed by transparent rationale.
- **Division of Responsibilities (AI vs. Deterministic Logic):**
  - **AI Responsibility:** Natural language understanding, intent classification, visual attribute extraction from image uploads, prompt synthesis, trade-off reasoning, review sentiment analysis, seller trust evaluation, and personalized recommendation generation.
  - **Deterministic Logic Responsibility:** API request routing, authentication enforcement, database queries and RLS filters, marketplace adapter HTTP execution, price currency conversions, hard budget boundary filters, strict JSON schema validation, and SSE event dispatch.

---

## 2. High-Level AI Architecture

The agentic pipeline operates as an end-to-end execution loop:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USER INPUT                                 │
│                   (Text Prompt / Image File Upload)                     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        1. INTENT DETECTION                              │
│         (Classifies Intent: Search, Compare, Budget, Image)            │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      2. CONVERSATION MEMORY                             │
│       (Retrieves User Preferences, Recent Messages, Thread State)       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         3. TASK PLANNER                                 │
│        (Deconstructs Query into Structured Parameters & Filters)        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        4. TOOL SELECTION                                │
│       (Determines Tools: SearchMarketplace, ImageUnderstanding)         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      5. MARKETPLACE SEARCH                              │
│       (Executes Amazon, Jumia, AliExpress, eBay Adapters in Parallel)    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        6. NORMALIZATION                                 │
│       (Deduplicates Listings, Standardizes Currencies & Specs)          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         7. AI REASONING                                 │
│       (Calculates Weighted Multi-Criteria Scores & Review Sentiment)    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   8. RECOMMENDATION GENERATION                          │
│     (Synthesizes Top Pick, Alternatives, Trade-offs & Confidence)       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     9. STREAMING RESPONSE                               │
│       (Dispatches Server-Sent Events: thinking, searching, reasoning)    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        10. PERSISTENCE                                  │
│      (Saves Search Session, Recommendations & History to PostgreSQL)    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        11. ANALYTICS                                    │
│        (Logs Model Performance, Token Usage & Tool Execution Latency)   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Stage Details

1. **Intent Detection:** Analyzes raw query text or image upload to categorize intent (Product Search, Comparison, Budget Focus, Image Search, Clarification).
2. **Conversation Memory:** Loads active user preferences (`budget_min`, `budget_max`, `prioritize_price`, `prioritize_quality`, etc.) and the last 10 thread messages from Supabase.
3. **Task Planner:** Normalizes raw queries into canonical product search targets, extract specs, and bounds constraints.
4. **Tool Selection:** Emits function calls specifying which adapters or vision services to execute.
5. **Marketplace Search:** Concurrently queries marketplace adapters with timeouts and caching checks.
6. **Normalization:** Clusters identical products across stores, converting prices to preferred currencies and standardizing metrics.
7. **AI Reasoning:** Calculates composite weighted scores combining user preference weights, price rank, seller rating, and review sentiment.
8. **Recommendation Generation:** Synthesizes the final decision payload containing pros, cons, trade-offs, and alternative recommendations.
9. **Streaming Response:** Emits chunked Server-Sent Events (SSE) to the client UI to present thinking progress in real time.
10. **Persistence:** Writes search session, recommendation metrics, and message history to Supabase database tables (`search_sessions`, `recommendations`, `marketplace_results`).
11. **Analytics:** Emits structured JSON log events tracking model latency, token cost, and tool success rates.

---

## 3. AI Providers

To ensure zero vendor lock-in, Atrixia uses a **Provider Abstraction Layer** using the Strategy Pattern.

```typescript
export interface AICompletionOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  responseFormat?: "json" | "text";
  tools?: Record<string, unknown>[];
}

export interface AIProviderResponse {
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface IAIProvider {
  readonly providerName: string;
  readonly defaultModel: string;
  generateCompletion(prompt: string, options?: AICompletionOptions): Promise<AIProviderResponse>;
  generateStream(prompt: string, options?: AICompletionOptions): AsyncIterable<string>;
}
```

### Supported Providers
1. **Gemma 4 Provider (`GemmaProvider`):** Optimized for low-latency query intent detection, query normalization, and basic text formatting.
2. **Gemini 2.5 Flash Provider (`GeminiFlashProvider`):** Primary production driver for fast tool-calling, marketplace data deduplication, and streaming reasoning.
3. **Gemini 2.5 Pro Provider (`GeminiProProvider`):** High-reasoning model for complex multi-product comparison matrix generation, deep review sentiment analysis, and high-confidence decision reports.
4. **Mock Provider (`MockAIProvider`):** Zero-cost provider for automated unit test suites and offline local development.

Models can be swapped dynamically via environment configuration (`DEFAULT_AI_PROVIDER=gemini-flash`) without altering business orchestration logic.

---

## 4. AI Orchestrator

The `AIOrchestrator` service manages the execution lifecycle of every decision query:

```
[Request Arrives]
       │
       ▼
[1. Load State] ──► (Fetch Profile, Preferences, Conversation Context)
       │
       ▼
[2. Build Prompts] ──► (Assemble System + User + Preference Context)
       │
       ▼
[3. Intent Routing] ──► (Evaluate Intent & Select Tools)
       │
       ▼
[4. Tool Execution] ──► (Parallel Marketplace Adapters / Cache Lookup)
       │
       ▼
[5. AI Reasoning Engine] ──► (Evaluate Listings, Score & Generate Report)
       │
       ▼
[6. SSE Stream & Persist] ──► (Emit Realtime Events & Commit to PostgreSQL)
```

### Orchestrator Responsibilities
- **Context Construction:** Assembles user preferences, historical messages, and active constraints into a typed context frame.
- **Prompt Composing:** Merges modular system prompt fragments dynamically.
- **Tool Execution Loop:** Resolves tool calls returned by the model, executes corresponding backend adapters, and feeds tool outputs back to the reasoning context.
- **Response Streaming:** Wraps reasoning generation in readable SSE output streams.
- **Error Recovery:** Implements fallback model transitions if the primary provider returns 5xx errors or hits rate limits.

---

## 5. Prompt Architecture

Prompts are designed as modular, typed TS modules under `lib/ai/prompts/`:

```
lib/ai/prompts/
├── system.ts         # Core persona & constraints
├── intent.ts         # Intent classification & taxonomy
├── clarification.ts  # Ambiguous query resolution prompt
├── search.ts         # Marketplace search keyword & spec extraction
├── ranking.ts        # Multi-criteria scoring & trade-off rationale
├── comparison.ts     # Product vs. Product matrix synthesis
├── recommendation.ts # Final Decision Report layout & JSON schema
├── vision.ts         # Visual attribute extraction from image uploads
├── followup.ts       # Sequential thread conversation context
└── memory.ts         # Summary pruning & context compression
```

### Prompt Modular Composition Blueprint
```typescript
// Example composition in AIOrchestrator
const systemContext = composeSystemPrompt([
  SYSTEM_BASE_PROMPT,
  USER_PREFERENCES_PROMPT(preferences),
  INTENT_SPECIFIC_PROMPT(intent),
]);
```

---

## 6. Tool Calling Architecture

All tools inherit from a common `ITool` interface with Zod input/output schemas:

```typescript
export interface ITool<TInput, TOutput> {
  name: string;
  description: string;
  inputSchema: z.ZodSchema<TInput>;
  outputSchema: z.ZodSchema<TOutput>;
  execute(input: TInput, context: SystemContext): Promise<TOutput>;
}
```

### Tool Inventory

1. **`SearchMarketplace`**: Executes concurrent search queries across Amazon, Jumia, AliExpress, eBay, and Temu adapters.
2. **`NormalizeProducts`**: Groups candidate items by model similarity ($>85\%$ title match) and standardizes attributes.
3. **`CompareListings`**: Generates side-by-side specification matrices for user-nominated products.
4. **`AnalyzeReviews`**: Parses customer reviews to calculate sentiment ratio (Positive vs. Negative) and fake-review risk.
5. **`AnalyzeSeller`**: Evaluates seller feedback scores, return policies, and fulfillment history to output seller trust rating ($0-100$).
6. **`ExtractSpecifications`**: Parses raw HTML/text product descriptions into structured JSON key-value pairs.
7. **`GenerateRecommendation`**: Constructs the final Decision Report including confidence score, pros, cons, and alternatives.
8. **`SaveConversation`**: Commits thread state and recommendations to database tables.
9. **`LoadConversation`**: Fetches past message history and active search session states.
10. **`RankProducts`**: Applies multi-criteria weighting algorithms to candidate products.
11. **`ImageUnderstanding`**: Passes image assets to vision LLM to extract brand name, model number, category, and visual features.

---

## 7. Marketplace Adapter Layer

All marketplace integration adapters implement the `IMarketplaceAdapter` interface:

```typescript
export interface MarketplaceQuery {
  query: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

export interface NormalizedMarketplaceResult {
  marketplace: "amazon" | "ebay" | "jumia" | "aliexpress" | "temu" | "mock";
  externalId: string;
  title: string;
  price: number;
  currency: string;
  sellerName: string;
  sellerRating: number;
  productRating: number;
  reviewCount: number;
  shippingPrice: number;
  shippingDays: number;
  listingUrl: string;
  imageUrl: string;
  availability: boolean;
  condition: "new" | "refurbished" | "used";
}

export interface IMarketplaceAdapter {
  readonly marketplaceName: string;
  search(query: MarketplaceQuery): Promise<NormalizedMarketplaceResult[]>;
}
```

### Resilience Strategy
- **Timeout:** Strict 4,000ms timeout per adapter request.
- **Rate Limiting:** Token-bucket rate limiter per store domain.
- **Fallback Behavior:** If an adapter fails or times out, the search pipeline logs the error and continues reasoning over results from operational adapters without crashing.

---

## 8. Search Pipeline

```
[Raw User Query] 
       │
       ▼
[Stage 1: Preprocessing & Sanitization] (Strip special characters, lower-case, remove noise)
       │
       ▼
[Stage 2: Intent Extraction] (Identify target product category, attributes, budget bounds)
       │
       ▼
[Stage 3: Cache Lookup] (Check `marketplace_cache` table by query hash)
       │ 
       ├─► (Cache Hit)  ──► [Skip Marketplace Adapters]
       │
       └─► (Cache Miss) ──► [Stage 4: Parallel Marketplace Queries]
                                   │
                                   ▼
                            [Stage 5: Deduplication & Clustering]
                                   │
                                   ▼
                            [Stage 6: Specification Normalization]
                                   │
                                   ▼
                            [Stage 7: Weighted Ranking Engine]
                                   │
                                   ▼
                            [Stage 8: AI Rationale Synthesis]
                                   │
                                   ▼
                            [Stage 9: Confidence Score Computation]
```

---

## 9. Ranking Engine

Atrixia uses a **Weighted Multi-Criteria Decision Analysis (MCDA)** algorithm to rank products objectively.

### Composite Score Formula

$$S_{\text{total}} = (w_p \cdot S_p) + (w_q \cdot S_q) + (w_s \cdot S_s) + (w_t \cdot S_t) + (w_r \cdot S_r)$$

Where:
- $S_p$: Price Score (Normalized inverse relative price score)
- $S_q$: Product Quality & Specs Score (Rating $\times$ review volume weight)
- $S_s$: Shipping Speed Score ($100 - (\text{shipping\_days} \times 10)$)
- $S_t$: Seller Trust Score ($0-100$ based on feedback % and order history)
- $S_r$: Review Authenticity & Sentiment Score ($0-100$ based on NLP sentiment analysis)
- $w_p, w_q, w_s, w_t, w_r$: Dynamic weights derived from user preference settings ($\sum w = 1.0$).

### Confidence Score Calculation
The overall recommendation confidence score ($0-100\%$) is derived from:
1. **Data Completeness ($30\%$):** Availability of full specs, seller rating, and verified reviews.
2. **Score Margin ($40\%$):** The differential gap between the #1 product score and #2 product score.
3. **Marketplace Consensus ($30\%$):** Consistency of product ratings across multiple stores.

---

## 10. Conversation Memory

### Context Management Pipeline
- **Thread Storage:** Conversations and messages are persisted in PostgreSQL (`conversations` and `messages` tables).
- **Pruning Strategy:** The system retrieves the last 10 messages for active inference context. If message history exceeds 4,000 tokens, a background summarization routine compresses older messages into a `thread_summary` string injected into the system prompt.
- **Preference Inheritance:** Global preferences (`currency`, `budget_max`, `prioritize_price`) are automatically bound to every conversational inference.

---

## 11. Multimodal Pipeline

```
[User Uploads Image]
       │
       ▼
[Image Uploaded to Supabase Storage]
       │
       ▼
[Vision LLM Analysis (Gemini Flash / Gemma Vision)]
       │
       ▼
[Extract Vision Schema: Object, Brand, Model, Color, Specs]
       │
       ▼
[Generate Text Search Target Query]
       │
       ▼
[Execute Marketplace Search Pipeline]
       │
       ▼
[Render Decision Report + Visual Match Banner]
```

Subsequent text follow-up questions (e.g. *"Show me this exact chair but in black"*) inherit the visual feature extraction context from the conversation thread memory.

---

## 12. Streaming Architecture

Atrixia dispatches real-time pipeline status updates using **Server-Sent Events (SSE)** over `POST /api/search` and `POST /api/chat`.

### SSE Event Payload Contracts

#### Event: `thinking`
```json
event: thinking
data: {"step": "deconstructing_query", "message": "Analyzing query intent and user preference profile..."}
```

#### Event: `tool_call`
```json
event: tool_call
data: {"tool": "SearchMarketplace", "status": "executing", "query": "ergonomic desk chair"}
```

#### Event: `marketplace_progress`
```json
event: marketplace_progress
data: {"marketplace": "amazon", "status": "completed", "resultsFound": 14}
```

#### Event: `reasoning`
```json
event: reasoning
data: {"delta": "Comparing seller trust ratings and shipping speeds across candidates..."}
```

#### Event: `recommendation`
```json
event: recommendation
data: {"recommendationId": "rec_8f91a2", "productName": "Ergonomic Lumbar Chair", "confidenceScore": 94}
```

#### Event: `complete`
```json
event: complete
data: {"session_id": "sess_12345", "status": "finished"}
```

#### Event: `error`
```json
event: error
data: {"code": "MARKETPLACE_TIMEOUT", "message": "Search latency exceeded limit, displaying cached results."}
```

---

## 13. AI Response Schema

The internal JSON schema produced by the AI reasoning engine follows strict Zod definitions:

```typescript
export const DecisionReportSchema = z.object({
  id: z.string().uuid(),
  searchSessionId: z.string().uuid(),
  recommendedProductId: z.string().uuid(),
  confidenceScore: z.number().min(0).max(100),
  recommendationReason: z.string(),
  tradeoffs: z.string(),
  aiSummary: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  alternatives: z.array(
    z.object({
      type: z.enum(["budget", "speed", "quality"]),
      productName: z.string(),
      price: z.number(),
      reasoning: z.string(),
    })
  ),
  warnings: z.array(z.string()).optional(),
  nextActions: z.array(z.string()),
});
```

---

## 14. Error Handling

| Failure Scenario | Fallback & Mitigation Strategy |
| :--- | :--- |
| **Model Unavailable (5xx)** | Automatically switch from `GeminiFlashProvider` to `GemmaProvider` or `GeminiProProvider`. |
| **Model Timeout (>8s)** | Abort LLM stream and generate simplified deterministic fallback response based on top price score. |
| **Tool Execution Failure** | Catch adapter error, log exception, and exclude failed marketplace from final evaluation pool. |
| **Rate Limit (429)** | Exponential backoff retry (100ms, 400ms, 1600ms) followed by cache-only fallback. |
| **Invalid JSON Output** | Re-run parser with strict JSON repair function or request model re-generation. |

---

## 15. Logging & Observability

All AI actions emit structured JSON logs to standard output / log aggregators:

```json
{
  "timestamp": "2026-07-26T22:45:00.123Z",
  "level": "INFO",
  "requestId": "req_9921a",
  "conversationId": "conv_4410b",
  "event": "AI_INFERENCE_COMPLETE",
  "provider": "gemini-flash",
  "model": "gemini-2.5-flash",
  "latencyMs": 1240,
  "usage": {
    "promptTokens": 850,
    "completionTokens": 320,
    "totalTokens": 1170
  },
  "toolCalls": ["SearchMarketplace", "AnalyzeSeller"],
  "confidenceScore": 94,
  "errors": []
}
```

---

## 16. Security

1. **Prompt Injection Protection:** All user inputs are sanitized and wrapped in structural XML delimiters (`<user_query>...</user_query>`). System prompts explicitly instruct models to ignore embedded system instruction overrides inside user strings.
2. **Zod Input Validation:** API routes parse all incoming JSON payloads through Zod schemas before passing arguments to the AI orchestrator.
3. **Tool Call Scoping:** Tools are strictly read-only or scoped to authenticated user IDs. Tools cannot execute arbitrary database writes outside designated helper APIs.
4. **Secret Management:** API keys (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are kept on the server side and never exposed to browser bundles.
5. **User Isolation:** All memory retrieval operations enforce `auth_user_id` filtering matching Supabase RLS context.

---

## 17. Performance Strategy

- **Parallel Tool Execution:** Execute independent marketplace scrapers concurrently using `Promise.allSettled()`.
- **Query Hash Caching:** Hash incoming clean queries (MD5/SHA256) and check `marketplace_cache` for hits within a 6-hour TTL.
- **Incremental SSE Streaming:** Stream thinking tokens immediately to achieve $< 500\text{ms}$ Time-To-First-Token (TTFT).
- **Lazy Review Analysis:** Perform deep NLP sentiment analysis only on the top 5 candidate products rather than the entire raw result set.

---

## 18. Backend Folder Structure

```
lib/
└── ai/
    ├── providers/             # Provider implementations
    │   ├── interface.ts       # IAIProvider contract
    │   ├── gemma.ts           # Gemma 4 provider
    │   ├── gemini-flash.ts    # Gemini 2.5 Flash provider
    │   ├── gemini-pro.ts      # Gemini 2.5 Pro provider
    │   └── mock.ts            # Mock provider for testing
    ├── orchestrator/          # Central orchestrator logic
    │   ├── orchestrator.ts    # AIOrchestrator class
    │   └── context.ts         # Context builder
    ├── prompts/               # Typed prompt templates
    │   ├── system.ts          # Base system instructions
    │   ├── intent.ts          # Intent classification prompts
    │   ├── search.ts          # Keyword extraction prompts
    │   ├── ranking.ts         # Decision reasoning prompts
    │   └── vision.ts          # Multimodal visual prompts
    ├── tools/                 # Tool calling registry
    │   ├── interface.ts       # ITool contract
    │   ├── registry.ts        # Tool selection & execution engine
    │   ├── marketplace.ts     # SearchMarketplace tool
    │   ├── normalization.ts   # NormalizeProducts tool
    │   ├── ranking.ts         # RankProducts tool
    │   └── vision.ts          # ImageUnderstanding tool
    ├── adapters/              # Marketplace scraper integration layer
    │   ├── interface.ts       # IMarketplaceAdapter interface
    │   ├── amazon.ts          # Amazon adapter
    │   ├── ebay.ts            # eBay adapter
    │   ├── jumia.ts           # Jumia adapter
    │   ├── aliexpress.ts      # AliExpress adapter
    │   └── mock.ts            # Mock adapter
    ├── memory/                # Conversation memory management
    │   ├── manager.ts         # Memory retrieval & window pruning
    │   └── summary.ts         # Context compression service
    ├── ranking/               # MCDA scoring algorithm
    │   ├── engine.ts          # Composite weighted scoring engine
    │   └── confidence.ts      # Confidence score calculator
    ├── streaming/             # Real-time SSE dispatchers
    │   └── sse.ts             # Server-Sent Events stream generator
    └── schemas/               # Zod validation schemas
        ├── request.ts         # API request schemas
        └── response.ts        # Decision report response schemas
```

---

## 19. Implementation Roadmap

### Milestone 1: Core Provider & Marketplace Foundation (Week 1)
- **Deliverables:** `IAIProvider` interface, `GeminiFlashProvider`, `IMarketplaceAdapter` interface, `MockAdapter`, and basic `SearchMarketplace` tool.
- **Dependencies:** Google Gen AI SDK, Zod, Supabase client.
- **Complexity:** Medium.

### Milestone 2: Search Pipeline & Weighted Ranking Engine (Week 2)
- **Deliverables:** `RankProducts` MCDA algorithm, `NormalizeProducts` tool, `marketplace_cache` query hash lookup, and real-time SSE stream dispatcher (`/api/search`).
- **Dependencies:** Milestone 1, Supabase schema migrations.
- **Complexity:** High.

### Milestone 3: Conversation Memory & Orchestration (Week 3)
- **Deliverables:** `AIOrchestrator` central service, `MemoryManager` context retriever, thread summarizer, and live dynamic prompt composition.
- **Dependencies:** Milestone 2.
- **Complexity:** High.

### Milestone 4: Multimodal Vision & Enterprise Polish (Week 4)
- **Deliverables:** `ImageUnderstanding` vision pipeline, `/api/upload` integration, automated error recovery fallbacks, structured logging, and Vitest test suite.
- **Dependencies:** Milestone 3.
- **Complexity:** Medium.

---

## 20. Engineering Standards

1. **Strict TypeScript:** Set `noImplicitAny: true` and `strict: true` in `tsconfig.json`. Usage of `any` is strictly prohibited.
2. **Schema-First Validation:** Every API endpoint and tool function must validate inputs and outputs using Zod schemas.
3. **Pure Functions:** Business logic functions (e.g. MCDA composite score calculation) must be pure, deterministic, and free of side effects.
4. **Interface Isolation:** Depend on abstractions (`IAIProvider`, `IMarketplaceAdapter`), never concrete third-party SDK classes directly.
5. **Comprehensive Error Handling:** Async calls must be wrapped in structured try-catch blocks with explicit fallback paths and standard error codes (`VALIDATION_ERROR`, `MARKETPLACE_TIMEOUT`, `MODEL_UNAVAILABLE`).
