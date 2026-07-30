export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Atrixia AI Shopping API',
    version: '1.0.0',
    description:
      'AI-powered shopping agent that searches Jumia, Konga, Jiji, and eBay, ' +
      'ranks products with multi-criteria scoring, and returns recommendations via SSE streaming.',
  },
  servers: [{ url: '/api', description: 'Local dev' }],

  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token returned from /auth/login or /auth/verify-email',
      },
    },
    schemas: {
      // ── Auth ──────────────────────────────────────────────────────────────
      SignupRequest: {
        type: 'object',
        required: ['fullName', 'email', 'password'],
        properties: {
          fullName: { type: 'string', example: 'John Doe' },
          email:    { type: 'string', format: 'email', example: 'john@example.com' },
          password: { type: 'string', minLength: 8, example: 'SecurePass123' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email:    { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      VerifyRequest: {
        type: 'object',
        required: ['email', 'code'],
        properties: {
          email: { type: 'string', format: 'email' },
          code:  { type: 'string', example: '482910' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              token: { type: 'string', description: 'JWT — include as Bearer token on all protected routes' },
              user: {
                type: 'object',
                properties: {
                  id:       { type: 'string', format: 'uuid' },
                  fullName: { type: 'string' },
                  email:    { type: 'string' },
                },
              },
            },
          },
        },
      },

      // ── Search ────────────────────────────────────────────────────────────
      SearchRequest: {
        type: 'object',
        required: ['query'],
        properties: {
          query: {
            type: 'string',
            example: 'HP laptop under $500',
            description: 'Natural language shopping query. Can include price constraints, brand, or descriptive intent.',
          },
          marketplaces: {
            type: 'array',
            items: { type: 'string', enum: ['jumia', 'konga', 'jiji', 'ebay'] },
            description: 'Optional — filter to specific marketplaces. Omit to use all active ones (or user saved preference).',
            example: ['jumia', 'konga'],
          },
          context: {
            type: 'object',
            description: 'Optional — for multi-turn conversations',
            properties: {
              conversationId: {
                type: 'string',
                example: 'conv_a1b2c3d4',
                description: 'Pass the conversationId from a previous search to continue the conversation.',
              },
              messages: {
                type: 'array',
                items: { type: 'object' },
                description: 'Pass [] for a new conversation.',
              },
            },
          },
        },
      },

      Product: {
        type: 'object',
        properties: {
          id:               { type: 'string' },
          marketplace:      { type: 'string', enum: ['jumia', 'konga', 'jiji', 'ebay'] },
          title:            { type: 'string' },
          brand:            { type: 'string', nullable: true },
          price:            { type: 'number', description: 'Converted to user\'s preferred currency (USD default)' },
          currency:         { type: 'string', example: 'USD' },
          image:            { type: 'string', nullable: true },
          productUrl:       { type: 'string' },
          seller:           { type: 'string', nullable: true },
          sellerRating:     { type: 'number', nullable: true, description: '0-100 scale' },
          reviewCount:      { type: 'number' },
          shippingCost:     { type: 'number', nullable: true },
          shippingEstimate: { type: 'string', nullable: true },
          condition:        { type: 'string', enum: ['new', 'refurbished', 'used'], nullable: true },
          description:      { type: 'string', nullable: true, description: 'AI-generated 1-2 sentence description' },
          pros:             { type: 'array', items: { type: 'string' } },
          cons:             { type: 'array', items: { type: 'string' } },
          scoreBreakdown: {
            type: 'object',
            properties: {
              priceScore:    { type: 'number' },
              qualityScore:  { type: 'number' },
              sellerScore:   { type: 'number' },
              shippingScore: { type: 'number' },
              overallScore:  { type: 'number', description: '0-100 overall MCDA score' },
            },
          },
        },
      },

      RecommendationReport: {
        type: 'object',
        properties: {
          id:                  { type: 'string', format: 'uuid', description: 'Save this as searchId to retrieve later' },
          executiveSummary:    { type: 'string', description: 'AI-generated 2-3 sentence summary' },
          bestOverall:         { $ref: '#/components/schemas/Product', nullable: true },
          bestBudget:          { $ref: '#/components/schemas/Product', nullable: true },
          bestPerformance:     { $ref: '#/components/schemas/Product', nullable: true },
          bestValue:           { $ref: '#/components/schemas/Product', nullable: true },
          rankedProducts:      { type: 'array', items: { $ref: '#/components/schemas/Product' } },
          alternatives:        { type: 'array', items: { $ref: '#/components/schemas/Product' } },
          pros:                { type: 'array', items: { type: 'string' } },
          cons:                { type: 'array', items: { type: 'string' } },
          warnings:            { type: 'array', items: { type: 'string' } },
          shoppingTips:        { type: 'array', items: { type: 'string' } },
          confidenceScore:     { type: 'number', description: '0-100' },
          confidenceLevel:     { type: 'string', enum: ['High', 'Medium', 'Low'] },
          marketplacesSearched:{ type: 'array', items: { type: 'string' } },
          totalProductsFound:  { type: 'number' },
        },
      },

      // ── Preferences ───────────────────────────────────────────────────────
      Preferences: {
        type: 'object',
        properties: {
          currency: {
            type: 'string',
            example: 'USD',
            description: 'Currency for price display. Prices are converted before ranking.',
          },
          prioritizePrice: {
            type: 'boolean',
            description: 'If true, price scoring gets a higher weight. Mutually exclusive with prioritizeQuality.',
          },
          prioritizeQuality: {
            type: 'boolean',
            description: 'If true, quality/seller scoring gets a higher weight. Default.',
          },
          preferredMarketplaces: {
            type: 'array',
            items: { type: 'string', enum: ['jumia', 'konga', 'jiji', 'ebay'] },
            description: 'Which marketplaces to search by default. Empty array means search all.',
            example: ['jumia', 'konga', 'jiji'],
          },
        },
      },

      // ── History ───────────────────────────────────────────────────────────
      HistoryItem: {
        type: 'object',
        properties: {
          id:           { type: 'string', format: 'uuid', description: 'Pass to GET /search/:id to get full results' },
          title:        { type: 'string', description: 'The original search query' },
          preview:      { type: 'string', nullable: true, description: 'First 120 chars of AI summary' },
          bestOverall: {
            type: 'object',
            nullable: true,
            properties: {
              title:       { type: 'string' },
              price:       { type: 'number' },
              currency:    { type: 'string' },
              image:       { type: 'string', nullable: true },
              marketplace: { type: 'string' },
            },
          },
          resultsCount: { type: 'number' },
          createdAt:    { type: 'string', format: 'date-time' },
        },
      },

      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          status:  { type: 'number' },
        },
      },
    },
  },

  security: [{ bearerAuth: [] }],

  paths: {
    // ── Auth ────────────────────────────────────────────────────────────────
    '/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Create a new account',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SignupRequest' } } } },
        responses: {
          201: { description: 'Account created. A 6-digit code is sent to email.' },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: 'Verify email with 6-digit code — returns JWT token',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyRequest' } } } },
        responses: {
          200: { description: 'Verified — returns token', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          400: { description: 'Invalid or expired code' },
        },
      },
    },
    '/auth/resend-code': {
      post: {
        tags: ['Auth'],
        summary: 'Resend the 6-digit verification code',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' } } } } } },
        responses: { 200: { description: 'Code sent' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login — returns JWT token',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: {
          200: { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          401: { description: 'Invalid credentials' },
        },
      },
    },

    // ── Search ───────────────────────────────────────────────────────────────
    '/search': {
      post: {
        tags: ['Search'],
        summary: 'Search products — streaming (SSE) or one-shot JSON',
        description: `
**Streaming (recommended):** Add \`?stream=true\` and set \`Accept: text/event-stream\`.
The server sends SSE events as the pipeline progresses:

| Event type | progress | What it means |
|---|---|---|
| \`thinking\` | 5 | Pipeline initialised |
| \`retrieving_memory\` | 15 | Loading conversation context |
| \`loading_preferences\` | 25 | Preferences applied |
| \`searching_marketplaces\` | 30 | All adapters searching in parallel |
| \`ranking_products\` | 62 | MCDA scoring |
| \`analyzing_tradeoffs\` | 70 | Prompt building |
| \`generating_explanation\` | 78 | Gemma writing recommendation |
| \`validating_response\` | 92 | Parsing AI output |
| \`saving_results\` | 96 | Writing to DB |
| \`recommendation\` | 99 | Full report in metadata.report |
| \`complete\` | 100 | metadata.report + conversationId + searchId |
| \`error\` | 100 | metadata.message + metadata.code |

**Non-streaming:** Omit \`?stream=true\`. Returns full JSON report in one response.

**Query rejection codes (error event):**
- \`QUERY_REJECTED\` — NSFW, illegal, or non-shopping query
- \`NO_PRODUCTS\` — no marketplace returned results
        `,
        parameters: [
          {
            name: 'stream',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Set to true to use SSE streaming',
          },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SearchRequest' } } },
        },
        responses: {
          200: {
            description: 'SSE stream (stream=true) or JSON report',
            content: {
              'text/event-stream': { schema: { type: 'string', description: 'SSE events' } },
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/RecommendationReport' },
                  },
                },
              },
            },
          },
          400: { description: 'Query rejected (NSFW, invalid, etc.)' },
          401: { description: 'Unauthorized' },
        },
      },
    },

    '/search/marketplaces': {
      get: {
        tags: ['Search'],
        summary: 'List available marketplaces — no auth needed',
        security: [],
        description: 'Returns the marketplaces that can be searched. Use for the marketplace picker UI.',
        responses: {
          200: {
            description: 'Marketplace list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id:          { type: 'string', example: 'jumia' },
                          label:       { type: 'string', example: 'Jumia' },
                          region:      { type: 'string', example: 'Nigeria / Africa' },
                          description: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/search/history': {
      get: {
        tags: ['Search'],
        summary: 'Get search history (ChatGPT-style sidebar)',
        description: 'Returns the last 20 searches for the logged-in user with preview and top pick.',
        responses: {
          200: {
            description: 'History list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { data: { type: 'array', items: { $ref: '#/components/schemas/HistoryItem' } } },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
    },

    '/search/{searchId}': {
      get: {
        tags: ['Search'],
        summary: 'Get full results for a past search',
        parameters: [{ name: 'searchId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: {
            description: 'Full saved report',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        id:           { type: 'string' },
                        query:        { type: 'string' },
                        timestamp:    { type: 'string', format: 'date-time' },
                        resultsCount: { type: 'number' },
                        results:      { $ref: '#/components/schemas/RecommendationReport' },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { description: 'Search not found' },
        },
      },
    },

    '/search/conversations': {
      get: {
        tags: ['Search'],
        summary: 'List all conversation threads for the user',
        responses: {
          200: {
            description: 'Conversation list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          conversationId: { type: 'string' },
                          messageCount:   { type: 'number' },
                          lastMessage:    { type: 'string' },
                          summary:        { type: 'string', nullable: true },
                          updatedAt:      { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
    },

    '/search/conversations/{conversationId}': {
      get: {
        tags: ['Search'],
        summary: 'Get full message thread for a conversation',
        parameters: [{ name: 'conversationId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Full thread with messages array' },
          404: { description: 'Conversation not found' },
        },
      },
    },

    // ── User ─────────────────────────────────────────────────────────────────
    '/user/profile': {
      get: {
        tags: ['User'],
        summary: 'Get logged-in user profile',
        responses: {
          200: { description: 'User profile' },
          401: { description: 'Unauthorized' },
        },
      },
    },

    '/user/preferences': {
      get: {
        tags: ['User'],
        summary: 'Get saved preferences',
        description: 'Returns defaults if no preferences saved yet.',
        responses: {
          200: {
            description: 'Preferences',
            content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Preferences' } } } } },
          },
          401: { description: 'Unauthorized' },
        },
      },
      put: {
        tags: ['User'],
        summary: 'Save preferences',
        description: `
All fields optional — only send what you want to change.

**Notes:**
- \`prioritizePrice\` and \`prioritizeQuality\` are mutually exclusive. If both sent as true, quality wins.
- \`preferredMarketplaces: []\` means search all marketplaces (default).
- Preferences are automatically applied to every search — no need to pass them per-request.
- The frontend can still override per-search by passing \`context.preferences\` in the search body.
        `,
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Preferences' } } },
        },
        responses: {
          200: {
            description: 'Preferences saved',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Preferences' } } } } },
          },
          400: { description: 'Invalid marketplace name' },
          401: { description: 'Unauthorized' },
        },
      },
    },

    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check — verifies server + DB connection',
        security: [],
        responses: { 200: { description: 'OK' } },
      },
    },
  },
};
