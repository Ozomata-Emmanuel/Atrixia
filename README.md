# Atrixia 

**Autonomous AI Shopping Agent**

Gemma 4 Hackathon Entry  
License: MIT

Shop Smarter. Decide Faster. Get personalized product recommendations backed by intelligent reasoning instead of endless browsing across fragmented marketplaces.

---

##  Executive Summary

### Elevator Pitch

Atrixia is an autonomous AI shopping agent that understands natural language queries, searches across multiple online marketplaces, analyzes products intelligently, and delivers a single, personalized recommendation backed by transparent reasoning. Rather than overwhelming users with dozens of similar products, Atrixia acts as a trusted shopping advisor that weighs price, quality, seller trust, and shipping speed to find the perfect match.

### The Problem

Online shopping has become fragmented and exhausting. Consumers jump between Amazon, eBay, Jumia, Aliexpress, and countless other platforms trying to find the best value. They must manually:

- Compare prices across 10+ marketplaces
- Evaluate seller credibility and review authenticity
- Weigh shipping costs against delivery speed
- Determine if a lower price justifies a 30-day wait
- Filter through hundreds of similar listings

Traditional search tools offer keyword matching—not intelligence. Price comparison sites only show cost—not context. This leads to decision fatigue and often poor purchasing decisions.

### The Solution

Atrixia transforms shopping from keyword search to **decision intelligence**. By combining:

1. **Multi-marketplace scraping** (Amazon, eBay, Jumia, etc.)
2. **AI-powered analysis** (Gemma/Gemini LLM)
3. **Multi-criteria ranking** (price, quality, trust, speed)
4. **Transparent reasoning** (why this product?)

Atrixia returns a single, personalized recommendation with alternatives—eliminating decision fatigue and ensuring smarter purchases.

---

##  Table of Contents

- [Executive Summary](#executive-summary)
- [Technology Stack](#technology-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Features](#features)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Development & Build Workflows](#development--build-workflows)
- [Team Roles & Integration](#team-roles--integration)
- [Development Timeline](#development-timeline)
- [Future Roadmap](#future-roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

---

## 💻 Technology Stack

### Frontend
- **React 18** + **Vite** (rapid dev server, optimized HMR)
- **TypeScript** (strict type safety)
- **Tailwind CSS** (utility-first styling with custom color scheme: teal, cyan, lavender, deep blue)
- **Lucide React** (lightweight SVG icons)
- **Socket.io** (real-time search progress updates - optional)

### Backend
- **Node.js 18+** + **Express.js** (lightweight, battle-tested)
- **TypeScript** (type-safe backend)
- **PostgreSQL** + **Drizzle ORM** (type-safe DB queries, zero-runtime overhead)
- **Bcryptjs** (password hashing)
- **jsonwebtoken (JWT)** (stateless authentication)
- **dotenv** (environment configuration)
- **cors** (cross-origin requests)
- **nodemon** (dev server auto-reload)

### AI & Integration
- **Gemma 4** (via Google AI Studio )
- **HTTP Client** ( axios for Gemma API calls)

### DevOps & Utilities
- **Postman** (API testing during development)
- **Docker** (containerization - optional for production)

---

## 📐 Architecture Overview

Atrixia is designed as a modular, provider-agnostic platform. Business logic is isolated from UI presentation and third-party AI/marketplace dependencies:

```
┌────────────────────────────────────────────────────────┐
│              React + Vite Frontend                     │
│     (Responsive Grid, Hero Search, Filter Modal)      │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP
                           ▼
┌────────────────────────────────────────────────────────┐
│           Express.js API Routes (Node.js)              │
│   POST /api/search → Async search processing          │
│   POST /api/auth/login → JWT token generation         │
│   GET /api/search/history → Saved searches            │
└──────────────────────────┬─────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         │ Sync Request                      │ 
         ▼                                   ▼
┌──────────────────┐               ┌──────────────────┐
│  AI Engine       │               │  Marketplace     │
│  (Gemma/Gemini)  │               │  Layer           │
│  • Parse query   │               │  (Amazon/eBay)   │
│  • Rank results  │               │  • Web scraping  │
│  • Reason trade- │               │  • Price fetch   │
│    offs          │               │  • Reviews       │
└────────┬─────────┘               └────────┬─────────┘
         │                                   │
         └─────────────────┬─────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│           PostgreSQL + Drizzle ORM                     │
│  • users (auth, profiles)                             │
│  • searches (query history, results cache)            │
│  • preferences (user settings)                        │
└────────────────────────────────────────────────────────┘
```

### Request Flow (Synchronous, Blocking)

```
1. User → Types "gaming laptops under $1500" + clicks Search
2. Frontend → POST /api/search { query, filters } + JWT token
3. Backend → Validates JWT, sanitizes inputs
4. AI Layer → Calls Gemma: "Find gaming laptops, budget ≤ $1500, sort by value"
5. Marketplace → Gemma scrapes Amazon, eBay, Jumia... extracts listings
6. AI Analysis → Gemma ranks by: price, rating, seller trust, shipping
7. Database → Save search to PostgreSQL (history)
8. Response → Backend returns { success, data: products[] }
9. Frontend → Renders responsive product grid (4 cols desktop, 2 tablet, 1 mobile)
10. User → Sees curated recommendation + alternatives
```

##  Project Structure

```
Atrixia/
├── atrixia-frontend/              # React + Vite frontend
│   ├── src/
│   │   ├── components/            # UI components
│   │   │   ├── ui/                # Shadcn-style primitives
│   │   │   ├── search/            # Search input & filters
│   │   │   └── recommendation/    # Product grid & cards
│   │   ├── pages/                 # Full-page routes
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── services/              # API client (fetch wrapper)
│   │   ├── styles/                # Global CSS + Tailwind
│   │   ├── types/                 # TypeScript interfaces
│   │   ├── App.tsx                # Root component
│   │   └── main.tsx               # Entry point
│   ├── public/                    # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── atrixia-backend/               # Express + Node.js backend
│   ├── src/
│   │   ├── config/                # Environment & DB setup
│   │   │   ├── database.ts        # Drizzle ORM config
│   │   │   └── env.ts             # Env validation
│   │   ├── middleware/            # Express middleware
│   │   │   ├── auth.ts            # JWT verification
│   │   │   ├── errorHandler.ts    # Global error handler
│   │   │   └── cors.ts            # CORS policy
│   │   ├── routes/                # API route definitions
│   │   │   ├── auth.routes.ts
│   │   │   ├── search.routes.ts
│   │   │   └── user.routes.ts
│   │   ├── controllers/           # Request handlers
│   │   │   ├── authController.ts
│   │   │   ├── searchController.ts
│   │   │   └── userController.ts
│   │   ├── services/              # Business logic
│   │   │   ├── aiService.ts       # Gemma integration
│   │   │   ├── authService.ts     # JWT + password logic
│   │   │   └── dbService.ts       # DB queries
│   │   ├── db/                    # Database
│   │   │   ├── schema.ts          # Drizzle schema (tables)
│   │   │   └── migrations/        # SQL migrations
│   │   ├── types/                 # TypeScript interfaces
│   │   │   └── index.ts
│   │   ├── utils/                 # Utilities
│   │   │   ├── jwt.ts             # Token generation
│   │   │   ├── hash.ts            # Password hashing
│   │   │   └── validators.ts      # Input validation
│   │   └── index.ts               # Express app entry
│   ├── .env                       # Secrets (not in git)
│   ├── .env.example               # Template
│   ├── package.json
│   ├── tsconfig.json
│   └── nodemon.json
│
├── docs/                          # Project documentation
│   ├── API_SPECIFICATION.md       # All endpoint specs
│   ├── DATABASE_SCHEMA.md         # Database design
│   ├── ARCHITECTURE.md            # System design
│   └── DEVELOPMENT.md             # Dev guidelines
│
└── README.md                      # This file
```

---

##  Features

### Core Features (MVP)

#### 1. **Email Authentication**
- **Signup**: Email + password registration
- **Login**: Email + password with JWT token generation
- **Session**: 7-day token expiry, refresh optional
- **Security**: Bcryptjs password hashing (10 rounds), JWT secrets
- **Protected Routes**: All search/user endpoints require valid token

#### 2. **Natural Language Search**
- **Input**: User types natural language query (e.g., "gaming laptops under $1500")
- **AI Processing**: Gemma LLM parses intent, extracts constraints (budget, category, specs)
- **Multi-marketplace Search**: Scrape Amazon, eBay, Jumia, etc. simultaneously
- **Intelligent Ranking**: Rank by price, seller trust, rating, shipping speed
- **Synchronous Response**: Results returned immediately (no async delays for MVP)

#### 3. **Custom Filters** (Optional Enhancement)
- **Add Filters**: Click "+" button to open modal
- **Examples**: Brand, Color, RAM, Storage, Seller Rating, In Stock
- **Apply Filters**: Filter tags show below search input (removable with X)
- **Persistent**: Filters apply to current search only
- **Universal**: Work with any product category

#### 4. **Responsive Product Grid**
- **Desktop**: 4 columns
- **Tablet**: 2-3 columns
- **Mobile**: 1 column
- **Card Content**: Image, title, price, rating (stars), review count, source, "View" link
- **Interactions**: Hover scale-up, border highlight, smooth transitions
- **Loading State**: Skeleton cards with pulse animation

#### 5. **Search History & Persistence**
- **Save**: Every search auto-saved to PostgreSQL
- **Retrieve**: Users can view past 10 searches (GET /api/search/history)
- **Revisit**: Click previous search to re-run or view results
- **Database**: Stores query, filters, results, timestamp

#### 6. **User Profile**
- **Account**: View email, join date
- **Preferences** (future): Budget range, preferred currencies, shipping preferences
- **Saved Items** (future): Bookmark products for later

### Design & UX Highlights

**Color Scheme (Brand Identity):**
- **Primary**: Teal (#14B8A6) + Cyan (#06B6D4) - Trust, tech-forward
- **Secondary**: Lavender (#C4B5FD) - Playful, approachable
- **Text**: Deep Blue (#1E3A8A) - Professional, readable
- **Background**: Light Blue gradients (#DBEAFE) - Clean, modern

**UX Patterns:**
- **Hero Search**: Center-focused input as main interaction
- **Filter Modal**: Clean modal dialog (not cluttered sidebar)
- **Tag-based Filters**: Visual, removable filter chips
- **Skeleton Loading**: Product card placeholders during search
- **Empty States**: Friendly messaging + emoji before first search
- **No Pagination**: All results shown (grid auto-flows)

---

##  Getting Started

### 1. Prerequisites

Ensure you have the following installed:

- **Node.js 18+** and **npm 9+** (verify with `node -v` and `npm -v`)
- **PostgreSQL 14+** (local or Supabase)
- **Git** (for version control)
- **Postman** (recommended, for API testing)

### 2. Clone Repository

```bash
git clone https://github.com/raymondstudio/Atrixia.git
cd Atrixia
```

### 3. Backend Setup

```bash
cd atrixia-backend

# Install dependencies
npm install

# Create .env file (see Environment Configuration below)
cp .env.example .env

# Edit .env with your values:
# - PostgreSQL connection string
# - JWT secret (min 32 chars)
# - AI service URL (Gemma endpoint from teammate)
# - Frontend CORS origin

# Initialize database tables
npm run db:push  # or npm run db:migrate

# Start dev server
npm run dev
# Server runs on http://localhost:5000
```

### 4. Frontend Setup

```bash
cd ../atrixia-frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# App runs on http://localhost:5173
```

### 5. AI Service Setup (Your AI Teammate)

Coordinate with your AI integration teammate. They should:

```bash
# Instructions for AI teammate:
# - Setup Gemma 2/4 or Gemini 2.5
# - Expose HTTP endpoint (e.g., http://localhost:5001/analyze)
# - Accept input: { query: string, filters: Array }
# - Return output: { products: Array<Product> }
# - Document the endpoint for backend integration
```

### 6. Run Everything Locally

Open 3+ terminal windows:

```bash
# Terminal 1: Backend
cd atrixia-backend && npm run dev
# Listens on http://localhost:5000

# Terminal 2: Frontend
cd atrixia-frontend && npm run dev
# Listens on http://localhost:5173

# Terminal 3: AI Service (run with your AI teammate)
cd atrixia-ai && npm start  # or python app.py
# Listens on http://localhost:5001 (or configured URL)
```

Then open your browser to **http://localhost:5173** and start testing!

---

##  Environment Configuration

### Backend (.env)

Create `atrixia-backend/.env` with the following:

```env
# Server
PORT=5000
NODE_ENV=development

# Database (PostgreSQL)
DATABASE_URL=postgresql://username:password@localhost:5432/atrixia
# Or use Supabase:
# DATABASE_URL=postgresql://user:password@db.supabase.co:5432/postgres

# Authentication
JWT_SECRET=your_super_secret_key_at_least_32_characters_long_here
JWT_EXPIRES_IN=7d

# AI Service
AI_SERVICE_URL=http://localhost:5001
AI_SERVICE_TIMEOUT=30000  # 30 seconds

# Frontend
CORS_ORIGIN=http://localhost:5173

# Logging (optional)
LOG_LEVEL=debug
```

**⚠️ Never commit .env to Git!** Use `.env.example` as template.

### Frontend (.env.local)

Create `atrixia-frontend/.env.local` (optional for dev):

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=Atrixia
```

---

## 🧪 Development & Build Workflows

### Running Linting

Verify code quality and TypeScript compilation:

```bash
cd atrixia-backend
npm run lint

cd ../atrixia-frontend
npm run lint
```

### Production Build

Test the production build locally:

```bash
# Backend
cd atrixia-backend
npm run build
npm start  # Runs from dist/

# Frontend
cd ../atrixia-frontend
npm run build
npm run preview  # Preview built app
```

### API Testing

Use Postman or cURL to test endpoints:

```bash
# Signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123"}'

# Search (use token from login)
curl -X POST http://localhost:5000/api/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"gaming laptops under 1000","filters":[]}'
```

### Database Migrations

```bash
cd atrixia-backend

# Create new migration
npm run db:generate

# Apply migrations
npm run db:push

# Reset database (dev only!)
npm run db:reset
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### **POST** `/auth/signup`
Register a new user

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "userId": "uuid",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:**
- 400: Invalid email/password format
- 409: Email already exists

---

#### **POST** `/auth/login`
Login with email & password

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "userId": "uuid",
  "email": "user@example.com"
}
```

**Errors:**
- 401: Invalid credentials
- 404: User not found

---

### Search Endpoints

#### **POST** `/search`
Execute a search query

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "query": "gaming laptops under 1500",
  "filters": [
    { "label": "Brand", "value": "Dell" },
    { "label": "RAM", "value": "16GB" }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "searchId": "search-uuid",
  "data": [
    {
      "id": "product-1",
      "title": "Dell XPS 15 Gaming Laptop",
      "price": 1299,
      "rating": 4.8,
      "reviews": 324,
      "image": "https://...",
      "source": "Amazon",
      "link": "https://amazon.com/..."
    },
    ...
  ]
}
```

**Errors:**
- 400: Invalid query/filters
- 401: Unauthorized (invalid token)
- 500: AI service failed

---

#### **GET** `/search/:searchId`
Retrieve a previous search

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "search-uuid",
    "query": "gaming laptops under 1500",
    "filters": [...],
    "results": [...],
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

#### **GET** `/search/history`
Get user's search history

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "search-uuid-1",
      "query": "gaming laptops under 1500",
      "created_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": "search-uuid-2",
      "query": "affordable running shoes",
      "created_at": "2024-01-14T15:45:00Z"
    }
  ]
}
```

---

### User Endpoints

#### **GET** `/user/profile`
Get current user profile

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "created_at": "2024-01-10T08:00:00Z"
  }
}
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:5000/api
```

All responses follow this format:
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

### Authentication Endpoints

#### **POST** `/auth/signup`
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Errors:**
- `400`: Invalid email format or password too weak
- `409`: Email already exists

---

#### **POST** `/auth/login`
Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Errors:**
- `401`: Invalid credentials
- `404`: User not found

---

### Search Endpoints

#### **POST** `/search`
Execute a product search query (requires authentication).

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "query": "gaming laptops under $1500",
  "filters": [
    { "label": "Brand", "value": "Dell" },
    { "label": "RAM", "value": "16GB+" }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "searchId": "uuid",
    "query": "gaming laptops under $1500",
    "results": [
      {
        "id": "product-1",
        "title": "Dell XPS 15",
        "price": 1299,
        "currency": "USD",
        "rating": 4.8,
        "reviewCount": 324,
        "image": "https://...",
        "source": "Amazon",
        "link": "https://amazon.com/...",
        "seller": "Amazon",
        "shippingDays": 2,
        "inStock": true
      }
    ]
  }
}
```

**Errors:**
- `400`: Invalid query or filters
- `401`: Unauthorized (no/invalid token)
- `503`: AI service unavailable

---

#### **GET** `/search/:searchId`
Retrieve a previously executed search.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "query": "gaming laptops under $1500",
    "filters": [...],
    "results": [...],
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

#### **GET** `/search/history`
Get user's search history (last 10).

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "query": "gaming laptops under $1500",
      "created_at": "2024-01-15T10:30:00Z",
      "resultCount": 12
    },
    {
      "id": "uuid-2",
      "query": "affordable running shoes",
      "created_at": "2024-01-14T15:45:00Z",
      "resultCount": 28
    }
  ]
}
```

---

### User Endpoints

#### **GET** `/user/profile`
Get current user's profile information.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "createdAt": "2024-01-10T08:00:00Z"
  }
}
```

---

## 👥 Team Roles & Responsibilities

### Team Structure

| Role | Person | Responsibility | Integration Point |
|------|--------|-----------------|------------------|
| **Backend** | King JOker | auth, API routes, AI integration | Calls `aiService.analyze()` |
| **AI Integration** | Raymond | Gemma setup, marketplace scraping, ranking | Exposes `POST /analyze` endpoint |
| **Frontend** | Ozomata | Web & Mobile design, UI & UX, API client | Calls `POST /api/search` |

### Key Integration Points

#### Backend ↔ AI Service
**When**: User submits search query  
**How**: Backend calls AI service synchronously

```
POST /analyze
{
  "query": "gaming laptops under $1500",
  "filters": [{ "label": "Brand", "value": "Dell" }]
}

Response:
{
  "products": [
    { "title": "...", "price": 1299, "rating": 4.8, ... },
    ...
  ]
}
```

#### Frontend ↔ Backend API
**When**: User interacts with search form  
**How**: Frontend authenticates with JWT token

```
POST /api/search
Authorization: Bearer {token}
{
  "query": "gaming laptops under $1500",
  "filters": [{ "label": "Brand", "value": "Dell" }]
}

Response:
{
  "success": true,
  "data": { products: [...] },
  "searchId": "uuid"
}
```

#### Communication Protocol
- **Format**: JSON over HTTP
- **Encoding**: UTF-8
- **Timeout**: 30 seconds
- **Retries**: No retries (sync flow)
- **Error Handling**: Descriptive error messages with status codes

---

##  Database Schema

### Users Table
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON public.users(email);
```

### Searches Table
```sql
CREATE TABLE public.searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  filters JSONB DEFAULT '[]'::jsonb,
  results JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_searches_user_id ON public.searches(user_id);
CREATE INDEX idx_searches_created_at ON public.searches(created_at DESC);
```

### Preferences Table (Future)
```sql
CREATE TABLE public.preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  budget_min NUMERIC DEFAULT 0,
  budget_max NUMERIC DEFAULT 10000,
  preferred_currency VARCHAR(3) DEFAULT 'USD',
  prioritize_price BOOLEAN DEFAULT TRUE,
  prioritize_quality BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🗺 Future Roadmap

### Phase 2: Enhanced Features
- **Price Drop Alerts**: Email notifications when saved products drop below target price
- **Saved Items**: Bookmark products for comparison & later purchase
- **User Preferences**: Budget range, shipping speed priority, currency preferences
- **Advanced Filters**: Material, weight, warranty, return policy

### Phase 3: Advanced Intelligence
- **Category Detection**: Automatic product category suggestion
- **Seasonal Trends**: Suggest best time to buy based on historical data
- **Reviews Analysis**: AI sentiment analysis on reviews (honest vs. fake reviews)
- **Comparative Analysis**: Side-by-side product comparison with scoring

### Phase 4: Monetization & Scale
- **Affiliate Integration**: Amazon Associates, eBay Partners commission links
- **Browser Extension**: Inline shopping assistant (Amazon, eBay overlay)
- **Mobile App**: iOS/Android native apps
- **API for Retailers**: White-label solution for online stores

---

##  Contributing

We welcome contributions! Here's how:

1. **Fork** the repository on GitHub
2. **Create** a feature branch:
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit** your changes:
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push** to the branch:
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open** a Pull Request with detailed description

### Code Standards
- Use **TypeScript** (strict mode)
- Follow **ESLint** configuration
- Write **tests** for new features (unit + integration)
- Keep commits **atomic** and descriptive
- Reference **issues** in PR descriptions

---

##  License

Distributed under the **MIT License**. See the `LICENSE` file for more information.

---

## Acknowledgements

- **Google DeepMind** for the Gemma 4 Hackathon opportunity
- **Express.js** team for the lightweight framework
- **Vercel** for modern web infrastructure inspiration
- **Neon** PostgreSQL Serverless
- **Our teammates** for collaboration and dedication

---

##  Screenshots & Demo

*Demo video and screenshots coming upon completion of core features.*

---


---

**Team:** Optimus Prime  
**Status:** Active Development  
**Last Updated:** 2026  
**Version:** 0.1.0-MVP