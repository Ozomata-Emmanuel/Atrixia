<div align="center">

# Atrixia

### Autonomous AI shopping agent

**Track: Autonomous AI Agents**

Atrixia researches product options across marketplaces, weighs price, quality, seller trust, shipping, and user preferences, then returns an explainable recommendation instead of another endless list of products.

[![Live Demo](https://img.shields.io/badge/Live_Demo-Open_Atrixia-14B8A6?style=for-the-badge)](https://atrixia.vercel.app)
[![Demo Video](https://img.shields.io/badge/Demo-Watch_on_YouTube-FF0000?style=for-the-badge\&logo=youtube\&logoColor=white)](https://youtu.be/ejbyHfxVpaM)
[![API](https://img.shields.io/badge/API-Live-06B6D4?style=for-the-badge)](https://atrixia.onrender.com/api/health)
[![Gemma 4](https://img.shields.io/badge/AI-Gemma_4-8B5CF6?style=for-the-badge)](https://ai.google.dev/gemma)
[![License](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](LICENSE)

**Shop smarter. Decide faster.**

</div>

---



<p align="center">
  <img src="docs/assets/atrixia_cover.png" alt="Atrixia product interface" width="100%" />
</p>

## Overview

Imagine having ₦500,000 to buy a laptop for software engineering.

You find one that looks good, then open another marketplace to compare the price. Another tab follows for reviews. Then you check the seller, shipping estimate, condition, warranty, and whether the cheaper option is cheap for a reason.

The product was easy to find. The decision was not.

Atrixia is built for that part of online shopping.

It accepts a natural language request, extracts the user's priorities, searches available marketplace sources, normalizes the results, and reasons through the trade-offs. The final response is a Decision Report that explains:

* which option best matches the request
* why it was selected
* what the user gains and gives up
* which alternatives deserve consideration
* how confident the system is in the available evidence

Atrixia does not try to replace existing marketplaces. It sits above them as an intelligence layer.

---

## Project links

| Resource             | Link                                                                               |
| -------------------- | ---------------------------------------------------------------------------------- |
| Live application     | [atrixia.vercel.app](https://atrixia.vercel.app)                                   |
| Backend API          | [atrixia.onrender.com](https://atrixia.onrender.com)                               |
| API health check     | [atrixia.onrender.com/api/health](https://atrixia.onrender.com/api/health)         |
| Interactive API docs | [atrixia.onrender.com/api/docs](https://atrixia.onrender.com/api/docs)             |
| Demo video           | [Watch on YouTube](https://youtu.be/ejbyHfxVpaM)                                   |
| AI architecture      | [AI_ARCHITECHTURE.md](AI_ARCHITECHTURE.md)                                         |
| Repository           | [github.com/Ozomata-Emmanuel/Atrixia](https://github.com/Ozomata-Emmanuel/Atrixia) |

---

## Table of contents

* [Why Atrixia exists](#why-atrixia-exists)
* [What Atrixia does](#what-atrixia-does)
* [How the agent works](#how-the-agent-works)
* [Decision model](#decision-model)
* [Features](#features)
* [Screenshots](#screenshots)
* [Architecture](#architecture)
* [Technology stack](#technology-stack)
* [Repository structure](#repository-structure)
* [Getting started](#getting-started)
* [Environment variables](#environment-variables)
* [Database setup](#database-setup)
* [API reference](#api-reference)
* [Streaming responses](#streaming-responses)
* [Testing and validation](#testing-and-validation)
* [Deployment](#deployment)
* [Security notes](#security-notes)
* [Current limitations](#current-limitations)
* [Roadmap](#roadmap)
* [Contributing](#contributing)
* [License](#license)

---

## Why Atrixia exists

Online shopping gives people access to more products, but it also pushes the research burden onto the buyer.

A shopper may need to compare:

* prices in different currencies
* seller reputation
* product ratings and review volume
* shipping fees and delivery time
* item condition
* warranty or return information
* whether a product actually matches the intended use

A traditional marketplace can rank products by popularity, price, or sponsored placement. A price comparison tool can tell you which listing costs less.

Neither necessarily answers:

> "Given my budget and priorities, which option should I choose?"

Atrixia treats shopping as a decision problem rather than a keyword matching problem.

This matters even more when a failed purchase is difficult to replace. For a student buying a laptop, a small business buying equipment, or a family ordering an expensive household item, the cheapest option can become the most expensive mistake.

---

## What Atrixia does

A user can write:

> "I need a laptop for software engineering under ₦500,000. I care more about performance and battery life than gaming."

Atrixia converts that sentence into a structured shopping request.

The system can identify:

* the intended product category
* budget boundaries
* use case
* preferred marketplaces
* quality and price priorities
* relevant product specifications
* missing information that may require a follow-up question

The agent then gathers available product data and creates a recommendation that is easier to act on than a raw result list.

### Example output

```text
Recommended option

Lenovo ThinkPad T14

Why it fits

- Strong balance of CPU performance and battery life
- Suitable for development workloads
- Within the stated budget
- Better seller and delivery signals than the cheapest alternative

Trade-off

The recommended listing costs more than the lowest-priced option,
but offers faster delivery and a more reliable seller profile.

Alternative

Choose the HP EliteBook option if minimizing cost matters more than
battery life.
```

The user remains in control. Atrixia's job is to do the research, make the reasoning visible, and reduce the work required to reach a decision.

---

## How the agent works

Atrixia uses a staged agent workflow rather than sending the user's message directly to a model and hoping for a useful answer.

```mermaid
flowchart TD
    A[User request] --> B[Intent detection]
    B --> C[Load conversation and preferences]
    C --> D[Task planning]
    D --> E[Select marketplace tools]
    E --> F[Search providers in parallel]
    F --> G[Normalize results]
    G --> H[Remove duplicates]
    H --> I[Evaluate products]
    I --> J[Generate recommendation]
    J --> K[Create Decision Report]
    K --> L[Persist search and conversation]
    L --> M[Stream result to the client]
```

### 1. Intent detection

The agent identifies whether the user is:

* searching for a product
* comparing options
* looking for a budget recommendation
* asking a follow-up question
* changing an earlier preference
* requesting a specific marketplace

### 2. Context retrieval

Atrixia loads the active conversation and the user's saved shopping preferences.

This allows a follow-up such as:

> "What if battery life matters more than price?"

to refine the previous request instead of starting from scratch.

### 3. Marketplace research

The marketplace manager queries available adapters. The current registry includes:

* Jumia
* Konga
* Jiji
* eBay
* AliExpress
* Temu

Each adapter returns data in a common format so the rest of the application does not need store-specific logic.

### 4. Normalization

Marketplace data is inconsistent. Atrixia converts listings into a shared product structure containing fields such as:

* title
* marketplace
* price
* currency
* seller
* seller rating
* product rating
* review count
* shipping cost
* delivery estimate
* condition
* image
* listing URL

### 5. Reasoning

The recommendation layer evaluates products against the user's stated constraints and preferences.

### 6. Response

The API can return a standard JSON response or stream progress through Server-Sent Events.

### 7. Persistence

Atrixia stores searches, conversation history, results, and preferences in PostgreSQL.

---

## Decision model

Atrixia treats product selection as a multi-criteria decision problem.

For a product (p) and user context (u), the conceptual score is:

$$
S(p \mid u) =
\sum_{i=1}^{n} w_i(u),\hat{x}_i(p)
----------------------------------

\lambda,\Phi(p,u)
$$

Where:

* (w_i(u)) is the importance of criterion (i) for the current user
* (\hat{x}_i(p)) is the normalized product score for that criterion
* (\Phi(p,u)) is a penalty for violating constraints such as budget or availability
* (\lambda) controls how heavily constraint violations reduce the score

Typical criteria include:

$$
X =
{
\text{price},
\text{quality},
\text{rating},
\text{seller trust},
\text{shipping},
\text{review strength}
}
$$

The weights satisfy:

$$
\sum_{i=1}^{n} w_i = 1
$$

A budget-focused user may assign more weight to price. Another user may care more about seller reliability, delivery time, or product quality.

The equation is only one part of the system. Gemma 4 is used to interpret the request, identify relevant trade-offs, and convert the structured evaluation into an explanation that a person can understand.

---

## Why Gemma 4

Atrixia uses Gemma 4 as its default AI provider.

The model helps with:

* natural language intent extraction
* query normalization
* preference-aware reasoning
* comparison summaries
* trade-off explanations
* recommendation generation
* conversational follow-up

The AI layer is provider-based rather than hardwired to a single deployment method. The current implementation supports configuration for:

* Google AI Studio
* Google Vertex AI
* Ollama
* OpenRouter
* Hugging Face

Gemma 4 supports multimodal input and native function calling, which fits Atrixia's planned image-search and tool-use workflow. The application, not the model, executes marketplace and database operations. Tool inputs and outputs must still be validated before execution.

Official references:

* [Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)
* [Function calling with Gemma 4](https://ai.google.dev/gemma/docs/capabilities/text/function-calling-gemma4)
* [Gemma 4 prompt formatting](https://ai.google.dev/gemma/docs/core/prompt-formatting-gemma4)

---

## Features

### Natural language shopping requests

Users can describe what they need in plain language instead of relying on rigid filters.

Example:

```text
Find me a durable programming laptop under ₦500,000.
Battery life matters more than gaming performance.
```

### Explainable recommendations

Atrixia returns a recommendation with reasoning, trade-offs, and alternatives.

### Marketplace adapter layer

Marketplace integrations are isolated behind a common interface. New providers can be added without rewriting the recommendation engine.

### Conversation memory

Atrixia stores conversation threads and can continue an earlier shopping discussion.

### Search history

Authenticated users can retrieve previous searches, reopen results, remove one search, or clear their history.

### User preferences

Users can save:

* preferred currency
* preferred marketplaces
* price priority
* quality priority

The preference model is designed to expand as the product grows.

### Streaming progress

Search and chat routes can stream status updates using Server-Sent Events.

This allows the interface to show progress such as:

```text
Understanding your request...
Checking your preferences...
Searching selected marketplaces...
Normalizing listings...
Preparing the recommendation...
```

### Authentication and email verification

The backend supports:

* account registration
* email verification
* verification-code resend
* login
* JWT-protected routes
* logout

### API documentation

Swagger UI is available at:

```text
https://atrixia.onrender.com/api/docs
```

### Responsive frontend

The React client includes:

* landing page
* authentication screens
* protected AI workspace
* product details
* wishlist interface
* responsive navigation
* loading and feedback states
* custom error and not-found pages

---

## Screenshots



### Landing page

<p align="center">
  <img src="docs/assets/Atrixia Landing Page.png" alt="Atrixia landing page" width="100%" />
</p>

### Agent search

<p align="center">
  <img src="docs/assets/atrixia_recommendation_samsung.png" alt="Atrixia autonomous shopping search" width="100%" />
</p>

### Decision Report

<p align="center">
  <img src="docs/assets/atrixia_keyboard_recommendation.png" alt="Atrixia Decision Report" width="100%" />
</p>

### Mobile experience

<p align="center">
  <img src="docs/assets/atrixia_mobile_recommendation" alt="Atrixia mobile interface" width="45%" />
</p>


### Suggested screenshot layout

| Screen          | What it should show                                     |
| --------------- | ------------------------------------------------------- |
| Landing page    | Brand, value proposition, and primary call to action    |
| Agent workspace | A complete natural language shopping request            |
| Search progress | The streamed agent workflow                             |
| Decision Report | Recommendation, reasoning, alternatives, and trade-offs |
| Product view    | Marketplace, seller, price, and product information     |
| Mobile view     | Responsive navigation and search experience             |

---

## Architecture

```mermaid
flowchart LR
    U[User] --> F[React + Vite frontend]

    F -->|HTTP + JWT| API[Express API]
    API -->|SSE stream| F

    API --> AUTH[Authentication service]
    API --> ORCH[AI orchestrator]
    API --> DB[(PostgreSQL)]

    ORCH --> MEMORY[Conversation memory]
    ORCH --> PROVIDER[Gemma provider]
    ORCH --> MARKET[Marketplace manager]

    MARKET --> JUMIA[Jumia adapter]
    MARKET --> KONGA[Konga adapter]
    MARKET --> JIJI[Jiji adapter]
    MARKET --> EBAY[eBay adapter]
    MARKET --> ALI[AliExpress adapter]
    MARKET --> TEMU[Temu adapter]

    MEMORY --> DB
    ORCH --> DB
```

### Architectural boundaries

Atrixia separates responsibilities into distinct layers:

| Layer               | Responsibility                                                       |
| ------------------- | -------------------------------------------------------------------- |
| Frontend            | User interface, navigation, authentication state, search experience  |
| API routes          | Request validation, authentication, response formatting              |
| Controllers         | HTTP-specific orchestration                                          |
| AI orchestrator     | Intent routing, context loading, provider calls, search coordination |
| Marketplace manager | Adapter selection and provider execution                             |
| AI provider         | Gemma inference and streaming                                        |
| Repositories        | Database reads and writes                                            |
| PostgreSQL          | Users, preferences, searches, and conversation state                 |

The model does not directly query the database or scrape marketplaces. The application executes those operations and passes validated results into the reasoning workflow.

---

## Technology stack

### Frontend

| Technology     | Use                                        |
| -------------- | ------------------------------------------ |
| React 19       | Component-based user interface             |
| Vite 8         | Development server and production bundling |
| React Router   | Client-side routing                        |
| Tailwind CSS 4 | Styling and responsive layouts             |
| Framer Motion  | Interface motion and transitions           |
| Axios          | API communication                          |
| React Toastify | User feedback and notifications            |
| React Select   | Select and filter controls                 |
| React Icons    | Interface icons                            |

### Backend

| Technology      | Use                           |
| --------------- | ----------------------------- |
| Node.js         | Server runtime                |
| Express 5       | REST API                      |
| TypeScript      | Static typing                 |
| PostgreSQL      | Persistent storage            |
| Drizzle ORM     | Schema and database queries   |
| Zod             | Request validation            |
| JSON Web Tokens | Authentication                |
| bcryptjs        | Password hashing              |
| Swagger UI      | Interactive API documentation |
| Vitest          | Automated tests               |
| Cheerio         | Marketplace HTML parsing      |
| Axios           | External HTTP requests        |

### AI and marketplace layer

| Technology           | Use                                               |
| -------------------- | ------------------------------------------------- |
| Gemma 4              | Intent understanding and recommendation reasoning |
| Google Gen AI SDK    | Google AI Studio and Vertex access                |
| Provider factory     | AI provider abstraction                           |
| Marketplace adapters | External product data retrieval                   |
| Server-Sent Events   | Progressive search and chat responses             |

### Hosting

| Service           | Workload                   |
| ----------------- | -------------------------- |
| Vercel            | Frontend                   |
| Render            | Backend API                |
| PostgreSQL / Neon | Hosted relational database |

---

## Repository structure

```text
Atrixia/
├── atrixia-frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   │   ├── ai/
│   │   │   ├── auth/
│   │   │   └── landing/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
│
├── atrixia-backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   └── schema.ts
│   │   ├── lib/
│   │   │   └── ai/
│   │   │       ├── adapters/
│   │   │       ├── marketplace/
│   │   │       ├── memory/
│   │   │       ├── orchestrator/
│   │   │       ├── providers/
│   │   │       ├── schemas/
│   │   │       └── types/
│   │   ├── middleware/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── swagger.ts
│   │   └── index.ts
│   ├── .env.example
│   ├── drizzle.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── AI_ARCHITECHTURE.md
├── LICENSE
└── README.md
```

---

## Getting started

### Prerequisites

Install:

* Node.js 20.19 or newer
* npm
* PostgreSQL or a hosted PostgreSQL provider
* Git

Vite 8 requires Node.js 20.19+ or 22.12+.

### Clone the repository

```bash
git clone https://github.com/Ozomata-Emmanuel/Atrixia.git
cd Atrixia
```

### Install backend dependencies

```bash
cd atrixia-backend
npm install
```

Create the environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Configure the required values, then start the backend:

```bash
npm run dev
```

The API runs at:

```text
http://localhost:5000
```

### Install frontend dependencies

Open another terminal:

```bash
cd atrixia-frontend
npm install
npm run dev
```

The frontend runs at:

```text
http://localhost:5173
```

### Confirm the API is running

```bash
curl http://localhost:5000/api/health
```

Expected response:

```json
{
  "status": "ok"
}
```

Open the interactive API documentation:

```text
http://localhost:5000/api/docs
```

---

## Environment variables

Create `atrixia-backend/.env`.

```env
# Server
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/atrixia

# Authentication
JWT_SECRET=replace_with_a_long_random_secret

# AI provider
# Supported values:
# google-studio, vertex, ollama, huggingface, openrouter
AI_PROVIDER=google-studio

# Google AI Studio
GEMMA_API_KEY=

# Google Vertex AI
GOOGLE_CLOUD_PROJECT=
VERTEX_LOCATION=

# Ollama
OLLAMA_BASE_URL=http://localhost:11434

# Hugging Face
HUGGINGFACE_API_KEY=

# OpenRouter
OPENROUTER_API_KEY=

# eBay Browse API
EBAY_APP_ID=
EBAY_CERT_ID=

# AliExpress Affiliate API
ALIEXPRESS_APP_KEY=
ALIEXPRESS_APP_SECRET=

# Optional scraping proxy
SCRAPER_API_KEY=
```

### Required values for the default setup

At minimum, configure:

```env
DATABASE_URL=
JWT_SECRET=
AI_PROVIDER=google-studio
GEMMA_API_KEY=
CORS_ORIGIN=http://localhost:5173
```

### Secret handling

Do not place private keys in frontend environment variables.

Any value exposed through a Vite variable prefixed with `VITE_` is included in the client bundle. Database credentials, JWT secrets, AI keys, and marketplace credentials belong in the backend environment only.

---

## Database setup

Atrixia uses PostgreSQL with Drizzle ORM.

The current schema includes:

### `users`

Stores account and email-verification data.

| Field                          | Purpose                  |
| ------------------------------ | ------------------------ |
| `id`                           | User identifier          |
| `full_name`                    | Display name             |
| `email`                        | Unique login email       |
| `password_hash`                | Hashed password          |
| `email_verified`               | Verification state       |
| `verification_code`            | Temporary six-digit code |
| `verification_code_expires_at` | Verification expiry      |
| `created_at`                   | Creation timestamp       |
| `updated_at`                   | Last update timestamp    |

### `preferences`

Stores one preference record per user.

| Field                    | Purpose                              |
| ------------------------ | ------------------------------------ |
| `prioritize_price`       | Gives more weight to price           |
| `prioritize_quality`     | Gives more weight to product quality |
| `preferred_currency`     | Currency used for display            |
| `preferred_marketplaces` | Selected marketplace sources         |

### `searches`

Stores the user's query, filters, returned results, and timestamp.

### `conversations`

Stores conversation messages and an optional summary for memory compression.

### Apply the schema

Generate a migration:

```bash
cd atrixia-backend
npx drizzle-kit generate
```

Push the schema to the configured database:

```bash
npx drizzle-kit push
```

Review generated migrations before applying them to a production database.

---

## API reference

### Base URLs

Local:

```text
http://localhost:5000/api
```

Hosted:

```text
https://atrixia.onrender.com/api
```

### Public routes

| Method | Route                  | Description                         |
| ------ | ---------------------- | ----------------------------------- |
| `GET`  | `/health`              | Database and API health check       |
| `GET`  | `/docs`                | Swagger documentation               |
| `POST` | `/auth/signup`         | Create an account                   |
| `POST` | `/auth/login`          | Log in                              |
| `POST` | `/auth/verify-email`   | Verify a six-digit code             |
| `POST` | `/auth/resend-code`    | Send a new verification code        |
| `POST` | `/auth/logout`         | End the client session              |
| `GET`  | `/search/marketplaces` | List available marketplace adapters |

### Protected routes

Protected routes require:

```http
Authorization: Bearer YOUR_JWT
```

| Method   | Route                                   | Description                 |
| -------- | --------------------------------------- | --------------------------- |
| `POST`   | `/search`                               | Run a product search        |
| `POST`   | `/search/chat`                          | Continue an AI conversation |
| `GET`    | `/search/history`                       | Retrieve search history     |
| `DELETE` | `/search/history`                       | Clear search history        |
| `DELETE` | `/search/history/:searchId`             | Delete one search           |
| `GET`    | `/search/conversations`                 | List conversations          |
| `GET`    | `/search/conversations/:conversationId` | Retrieve one conversation   |
| `DELETE` | `/search/conversations/:conversationId` | Delete one conversation     |
| `GET`    | `/search/:searchId`                     | Retrieve a saved search     |
| `GET`    | `/user/profile`                         | Get the current profile     |
| `GET`    | `/user/preferences`                     | Get shopping preferences    |
| `PUT`    | `/user/preferences`                     | Update shopping preferences |

---

## API examples

### Create an account

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Raymond Williams",
    "email": "raymond@example.com",
    "password": "StrongPassword123"
  }'
```

### Verify an email address

```bash
curl -X POST http://localhost:5000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "raymond@example.com",
    "code": "123456"
  }'
```

### Log in

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "raymond@example.com",
    "password": "StrongPassword123"
  }'
```

### Run a search

```bash
curl -X POST http://localhost:5000/api/search \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Find a programming laptop under 500000 naira",
    "marketplaces": ["jumia", "jiji", "ebay"],
    "context": {
      "messages": [],
      "preferences": {
        "currency": "NGN",
        "budgetMin": 250000,
        "budgetMax": 500000,
        "prioritizePrice": false,
        "prioritizeQuality": true,
        "prioritizeShipping": false,
        "prioritizeSeller": true
      }
    }
  }'
```

### Continue a conversation

```bash
curl -X POST http://localhost:5000/api/search/chat \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv_example",
    "message": "What if battery life matters more than price?"
  }'
```

---

## Streaming responses

Atrixia supports Server-Sent Events for progressive search output.

Use the query parameter:

```text
POST /api/search?stream=true
```

or send:

```http
Accept: text/event-stream
```

Example:

```bash
curl -N -X POST "http://localhost:5000/api/search?stream=true" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Accept: text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Find a durable laptop for software engineering",
    "marketplaces": ["jumia", "jiji"]
  }'
```

The client can use streamed events to show the agent's progress without leaving the user on a static loading screen.

---

## Development commands

### Frontend

```bash
cd atrixia-frontend
```

| Command           | Purpose                           |
| ----------------- | --------------------------------- |
| `npm run dev`     | Start the Vite development server |
| `npm run build`   | Create a production build         |
| `npm run lint`    | Run ESLint                        |
| `npm run preview` | Preview the production build      |

### Backend

```bash
cd atrixia-backend
```

| Command                    | Purpose                      |
| -------------------------- | ---------------------------- |
| `npm run dev`              | Run the API with Nodemon     |
| `npm start`                | Start the API with TSX       |
| `npm test`                 | Run Vitest once              |
| `npm run test:watch`       | Run Vitest in watch mode     |
| `npx tsc --noEmit`         | Type-check the backend       |
| `npx drizzle-kit generate` | Generate database migrations |
| `npx drizzle-kit push`     | Apply schema changes         |

---

## Testing and validation

Before opening a pull request, run:

```bash
# Frontend
cd atrixia-frontend
npm run lint
npm run build

# Backend
cd ../atrixia-backend
npx tsc --noEmit
npm test
```

A change is ready for review when:

* the frontend builds
* ESLint passes
* the backend type-checks
* tests pass
* no credentials appear in the diff
* authentication ownership checks still work
* search failure states remain usable

---

## Deployment

### Frontend on Vercel

Set the frontend root directory to:

```text
atrixia-frontend
```

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

Configure the frontend API base URL to point to the deployed backend.

### Backend on Render

Set the backend root directory to:

```text
atrixia-backend
```

Install command:

```bash
npm install
```

Start command:

```bash
npm start
```

Add all backend environment variables through the Render dashboard.

### Database

Use a PostgreSQL deployment such as Neon or another managed PostgreSQL service.

Set the hosted connection string as:

```env
DATABASE_URL=postgresql://...
```

Use SSL when required by the provider.

---

## Security notes

Atrixia currently includes:

* bcrypt password hashing
* JWT-protected API routes
* user ownership checks on saved data
* Zod validation for AI requests
* CORS configuration
* environment-based secret management
* short-lived email verification codes
* parameterized database access through Drizzle ORM

Before a large public release, the following should be added or strengthened:

* refresh-token rotation
* password-reset API completion
* authentication rate limiting
* account lockout protection
* stricter content security headers
* marketplace request quotas
* file-upload validation for multimodal search
* audit logging
* token revocation
* automated dependency scanning

Do not use the fallback JWT secret in production. Always provide a strong `JWT_SECRET`.

---

## Current limitations

Atrixia is a hackathon build and should be evaluated with that scope in mind.

### Marketplace reliability

Marketplace websites and APIs can block automated requests, change their HTML, require credentials, or return different content by region.

The adapter layer limits how much those changes affect the rest of the application, but an adapter may still return partial or unavailable data.

### Product information

A recommendation is only as good as the product information available at the time of the search.

Atrixia communicates reasoning, but it should not be treated as a guarantee of authenticity, seller behavior, final price, or delivery performance.

### Checkout

Atrixia redirects users to the original marketplace. It does not process payments, place orders, or manage delivery.

### Image search

The architecture is prepared for multimodal product discovery, but full image-to-marketplace search remains part of the next implementation phase.

### Authentication

The current JWT flow is suitable for the prototype. A production release would need refresh tokens, stronger revocation controls, and more complete account recovery.

---

## Roadmap

### Near term

* Complete multimodal image search with Gemma 4
* Add stronger product deduplication
* Expand user preference controls
* Improve recommendation confidence reporting
* Add persistent wishlists
* Add marketplace health monitoring
* Improve review and seller-risk analysis
* Add currency conversion
* Add price and delivery filters

### Later

* Price-drop alerts
* Browser extension
* Local marketplace support
* Country-specific shipping and tax estimates
* Shared shopping lists
* Gift recommendation mode
* Product-watch agents
* Local-language support
* Voice shopping
* Smaller Gemma deployments for local or edge use

---

## Contributing

Contributions are welcome.

### Workflow

1. Fork the repository.
2. Create a branch.

```bash
git checkout -b feature/your-feature
```

3. Make the change.
4. Run the frontend and backend checks.
5. Commit with a clear message.

```bash
git commit -m "feat: add marketplace health checks"
```

6. Push the branch.

```bash
git push origin feature/your-feature
```

7. Open a pull request.

### Contribution guidelines

A pull request should:

* explain the problem being solved
* keep UI, API, and data changes consistent
* avoid mixing unrelated changes
* include tests for backend logic where practical
* document new environment variables
* avoid committing generated secrets or local database files
* preserve the marketplace and AI provider abstractions

---

## Documentation

| Document                                                  | Purpose                            |
| --------------------------------------------------------- | ---------------------------------- |
| [README.md](README.md)                                    | Product overview and setup         |
| [AI_ARCHITECHTURE.md](AI_ARCHITECHTURE.md)                | AI orchestration and agent design  |
| [Swagger API](https://atrixia.onrender.com/api/docs)      | Interactive endpoint documentation |
| [Gemma 4 documentation](https://ai.google.dev/gemma/docs) | Model capabilities and setup       |

GitHub supports LaTeX expressions in Markdown through MathJax, which is why the decision formula in this README can render directly in the repository.

---

## License

Atrixia is available under the [MIT License](LICENSE).

You may use, modify, and distribute the software under the terms of that license.

---

## Acknowledgements

Atrixia was built for the Build with Gemma AI Hackathon.

The project uses work from:

* Google DeepMind and the Gemma team
* React and Vite
* Express
* PostgreSQL and Drizzle ORM
* Tailwind CSS
* Vercel
* Render
* Neon
* the open-source maintainers behind Atrixia's dependencies

---

<div align="center">

## Atrixia

Finding products is easy.

Choosing well is still hard.

**Atrixia handles the research in between.**

[Open the live app](https://atrixia.vercel.app) · [Watch the demo](https://youtu.be/ejbyHfxVpaM) · [Explore the API](https://atrixia.onrender.com/api/docs)

</div>
