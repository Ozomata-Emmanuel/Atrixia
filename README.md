# Atrixia 

**An AI-powered shopping agent built for the GDoC Hackathon**

Atrixia is an intelligent shopping assistant that understands natural language queries and finds the best products across multiple marketplaces. Simply tell Atrixia what you're looking for, and it delivers curated results tailored to your needs.

---

##  Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Team Roles](#team-roles)
- [Development Timeline](#development-timeline)

---

##  Overview

Atrixia solves the friction of online shopping by acting as an intelligent intermediary between users and marketplaces. Instead of manually browsing multiple sites or filtering through irrelevant results, users describe what they want in natural language, and Atrixia:

1. **Understands** the query using Gemma AI
2. **Searches** across multiple marketplaces
3. **Filters** results based on user preferences
4. **Presents** curated products in an intuitive UI

### Use Cases
- "Gaming laptops under $1500 with good battery life"
- "Affordable running shoes for marathon training"
- "Budget-friendly smart home cameras with night vision"

---

##  Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      ATRIXIA SYSTEM                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐        ┌──────────────┐  ┌──────────────┐ │
│  │   Frontend   │        │   Backend    │  │  AI Service  │ │
│  │  (React)     │◄──────►│  (Express)   │◄─┤  (Gemma)     │ │
│  │              │        │              │  │              │ │
│  └──────────────┘        └──────┬───────┘  └──────────────┘ │
│                                  │                            │
│                                  ▼                            │
│                        ┌──────────────────┐                  │
│                        │  PostgreSQL DB   │                  │
│                        │                  │                  │
│                        │ • Users          │                  │
│                        │ • Searches       │                  │
│                        │ • History        │                  │
│                        └──────────────────┘                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow (Synchronous)

1. **User initiates search** → Frontend sends query + filters to backend
2. **Backend validates** → Check auth token, validate inputs
3. **AI Integration** → Backend calls Gemma service with query + filters
4. **Marketplace Search** → Gemma searches multiple marketplaces (Amazon, eBay, etc.)
5. **Results Processing** → Gemma returns ranked, filtered products
6. **Database Storage** → Backend saves search history to PostgreSQL
7. **Response** → Backend sends products to frontend
8. **Display** → Frontend renders responsive grid

##  Tech Stack

### Frontend
- **React** + **Vite** (fast dev server, optimized builds)
- **JavaScript** (not TypeScript)
- **Tailwind CSS** (styling with custom color scheme)
- **React Router** (routing)
- **React Icons** (icons)
- **axios** (HTTP client)

### Backend
- **Node.js** + **Express** (lightweight, fast)
- **TypeScript** (type safety)
- **PostgreSQL** + **Drizzle ORM** (type-safe database queries)
- **Bcryptjs** (password hashing)
- **jsonwebtoken** (JWT auth)
- **Cors** (cross-origin requests)
- **Dotenv** (environment management)

### AI & Integration
- **Gemma** (AI model for understanding + searching)
- **Gemma 4** (API for Gemma)
- **Node.js HTTP Client** (for Gemma API calls)

### DevOps
- **Docker** (containerization)
- **nodemon** (dev auto-reload)

---

##  Features

### Core Features (MVP)

#### 1. **User Authentication**
- Email-based signup/login
- Password hashing (bcryptjs)
- JWT token authentication (7-day expiry)
- Protected endpoints

#### 2. **Natural Language Search**
- User types query: *"gaming laptops under $1500"*
- Gemma AI understands intent + extracts constraints
- Searches multiple marketplaces simultaneously
- Returns ranked results

#### 3. **Custom Filters** (Optional but powerful)
- Users can add custom filters if needed
- Examples: Brand, Color, Seller Rating, Stock Status
- Filters persist during session
- Visual tag-based UI

#### 4. **Responsive Grid**
- **Desktop**: 4 columns
- **Tablet**: 2-3 columns
- **Mobile**: 1 column
- Smooth hover effects, product cards with ratings

#### 5. **Search History**
- All searches saved to database
- Users can revisit previous searches
- Optional: Share searches (future feature)

#### 6. **Product Information**
- Product image
- Title & description
- Price (formatted)
- Star rating + review count
- Source marketplace (Amazon, eBay, etc.)
- Direct link to view full product

### Design Highlights

**Color Scheme:**
- Primary: Teal (#14B8A6) + Cyan (#06B6D4)
- Secondary: Lavender (#C4B5FD)
- Text: Deep Blue (#1E3A8A)
- Background: Light Blue gradients

**UX Patterns:**
- Hero search input (center focus)
- Modal filter dialog
- Removable filter tags
- Empty state guidance

---

##  Project Structure

### Frontend
```
atrixia-frontend/
├── src/
│   ├── components/      # React components
│   ├── pages/           # Full-page components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API client functions
│   ├── styles/          # Global styles
│   └── App.tsx          # Main app
├── public/
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

### Backend
```
atrixia-backend/
├── src/
│   ├── config/          # Database, Redis, env setup
│   ├── middleware/      # Auth, error handling, CORS
│   ├── routes/          # API route definitions
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic (AI, DB queries)
│   ├── db/              # Drizzle schema + migrations
│   ├── types/           # TypeScript interfaces
│   ├── utils/           # Helpers (JWT, hashing, validation)
│   └── index.ts         # Express app entry
├── .env                 # Secrets (not in git)
├── .env.example         # Template
├── package.json
├── tsconfig.json
└── README.md
```

---

##  Getting Started

### Prerequisites
- Node.js 16+ / npm 8+
- PostgreSQL 12+
- Git

### Installation

#### 1. Clone Repository
```bash
git clone https://github.com/Ozomata-Emmanuel/Atrixia.git
cd atrixia
```

#### 2. Setup Backend

```bash
cd atrixia-backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Update .env with:
# DATABASE_URL=...
# JWT_SECRET=your_secret_key_here_min_32_chars
# AI_SERVICE_URL=...
# CORS_ORIGIN=...

# Run migrations (if using Drizzle)
npm run db:migrate

# Start dev server
npm run dev
```

#### 3. Setup Frontend

```bash
cd ../atrixia-frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

#### 4. Setup AI Service (Your AI Teammate)

```bash
cd ../atrixia-ai

# Instructions from AI teammate
# Should expose endpoint: POST /analyze
# Input: { query, filters }
# Output: { products: [...] }
```

### Running Everything

```bash
# Terminal 1: Backend
cd atrixia-backend && npm run dev

# Terminal 2: Frontend
cd atrixia-frontend && npm run dev

# Terminal 3: AI Service (if separate)
cd atrixia-ai && npm run dev

# Open http://localhost:5173 in browser
```

---

##  API Documentation

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

##  Team Roles

| Role | Person | Responsibility |
|------|--------|-----------------|
| **Backend** | Samuel Lakamo (Kingjoker) | Database, authentication, API routes, AI integration |
| **AI Integration** | Raymond | Gemma setup, marketplace searching, result ranking |
| **Frontend** | Ozomata Emmanuel  | React components, responsive UI, API client |

### Key Integration Points

**Backend ↔ AI:**
- Backend calls: `POST http://localhost:5001/analyze` (or direct function call)
- Input: `{ query, filters }`
- Output: `{ products: [{...}, ...] }`

**Frontend ↔ Backend:**
- Frontend calls: `POST /api/search` (with JWT token)
- Backend returns: `{ success, data: products[] }`

---

##  ERailwaynvironment Variables

Create `.env` in backend root:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/atrixia

# Authentication
JWT_SECRET=your_super_secret_key_min_32_characters_long
JWT_EXPIRES_IN=2d

# AI Service
AI_SERVICE_URL=http://localhost:5001
AI_SERVICE_TIMEOUT=30000

# Frontend
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=debug
```

---

##  Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Searches Table
```sql
CREATE TABLE searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  filters JSONB DEFAULT '[]',
  results JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_searches_user_id ON searches(user_id);
CREATE INDEX idx_searches_created_at ON searches(created_at DESC);
```

---

##  Error Handling

All errors return consistent format:

```json
{
  "success": false,
  "error": "Error message here",
  "status": 400
}
```

**Common Errors:**
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing/invalid token
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Email already exists
- `500 Internal Server Error` - Server issue

---

##  Deployment (Future)

### Docker
```bash
docker build -t atrixia-backend .
docker run -p 5000:5000 atrixia-backend
```

### Platforms
- Backend: Render
- Database: Neon
- Frontend: Vercel

---

##  Resources

- [gemma](https://ai.google.dev/gemma)
- [Express.js Docs](https://expressjs.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [JWT Auth](https://jwt.io/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [React Docs](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)


---

##  License

MIT License - See LICENSE file for details

---

##  Hackathon Notes

- **Deadline:** 30th Jul 2026
- **Theme:** AI Agents
- **Team:** Atrixia Squad
- **Goal:** Build, demo, impress judges! 🚀

---

