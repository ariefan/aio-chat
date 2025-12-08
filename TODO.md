# Jenny BPJS Chatbot POC - Task List

## Progress: ████████████████████ 100% (12/12)

> Last Updated: 2024-12-08

---

## Overview

Building a proof of concept for **Jenny**, a debt collection chatbot for BPJS Kesehatan Indonesia.

### Key Features:
- Chatbot named Jenny for debt collection
- Model: `google/gemma-3-4b-it` via OpenRouter (switchable to TogetherAI)
- Live conversation monitoring dashboard
- Editable user data and debt information
- Proactive chat when due date is near
- BPJS ID verification flow
- Simple RAG for verified users
- Telegram bot integration (WhatsApp ready)

---

## Task Checklist

### Phase 1: Database & Core Setup
- [x] Analyze existing codebase structure
- [x] Add BPJS member table with debt information
- [x] Add proactive messages queue table
- [x] Create database migrations
- [x] Seed sample BPJS member data for testing

### Phase 2: AI Integration
- [x] Create OpenRouter API client
- [x] Configure Gemma 3 4B model
- [x] Add environment variable support for TogetherAI fallback
- [x] Create Jenny persona system prompt (Bahasa Indonesia)
- [x] Integrate with existing chat flow

### Phase 3: Verification & RAG
- [x] Implement BPJS ID verification flow
- [x] Create BPJS knowledge base seed data
- [x] Configure RAG for verified users
- [x] Add debt information retrieval

### Phase 4: Proactive Messaging
- [x] Create due date reminder scheduler
- [x] Implement proactive message queue
- [x] Build proactive chat test page
- [x] Add scheduler management API

### Phase 5: Dashboard & Management
- [x] Create user/debt data management page (`/dashboard/bpjs`)
- [x] Build live conversation monitoring (`/dashboard/conversations`)
- [x] Create proactive test page (`/dashboard/proactive`)

### Phase 6: Deployment
- [x] Update Docker configuration
- [x] Configure for dokploy deployment
- [x] Setup environment variables
- [x] Create deployment documentation

---

## Quick Start

### 1. Setup Environment
```bash
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your credentials
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Setup Database
```bash
cd apps/web
pnpm db:push        # Push schema to database
pnpm db:seed        # Seed basic data
pnpm db:seed-bpjs   # Seed BPJS test data
```

### 4. Setup Telegram Bot
1. Create a bot with @BotFather on Telegram
2. Copy the bot token to `TELEGRAM_BOT_TOKEN`
3. Set webhook: `https://your-domain.com/api/webhooks/telegram`

### 5. Run Development Server
```bash
pnpm dev
```

---

## Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/aio_chat

# NextAuth
NEXTAUTH_SECRET=your-super-secret-key-32-chars-min
NEXTAUTH_URL=http://localhost:3000

# Telegram
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# OpenRouter API (Primary - for Gemma)
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key
OPENROUTER_MODEL=google/gemma-3-4b-it

# TogetherAI (Fallback)
TOGETHERAI_API_KEY=your-togetherai-key
TOGETHERAI_MODEL=google/gemma-2-9b-it

# OpenAI (for embeddings/RAG)
OPENAI_API_KEY=sk-your-openai-key
```

---

## API Endpoints

### BPJS Management
- `GET /api/bpjs/members` - List all BPJS members
- `POST /api/bpjs/members` - Create new member
- `GET /api/bpjs/members/:id` - Get member with debts
- `PUT /api/bpjs/members/:id` - Update member
- `DELETE /api/bpjs/members/:id` - Delete member

### Debt Management
- `GET /api/bpjs/debts` - List all debts
- `POST /api/bpjs/debts` - Create new debt
- `PUT /api/bpjs/debts/:id` - Update debt
- `POST /api/bpjs/debts/:id` - Record payment

### Proactive Messages
- `GET /api/bpjs/proactive` - List proactive messages
- `POST /api/bpjs/proactive` - Trigger actions:
  - `{ action: 'run_scheduler' }` - Generate reminders
  - `{ action: 'send_pending' }` - Send pending messages
  - `{ action: 'trigger', memberId, messageType }` - Manual trigger

### Telegram Webhook
- `POST /api/webhooks/telegram` - Receive Telegram messages
- `GET /api/webhooks/telegram?set_webhook=1` - Get setup instructions

---

## Dashboard Pages

- `/dashboard` - Main operator dashboard
- `/dashboard/bpjs` - BPJS member & debt management
- `/dashboard/conversations` - Live conversation monitoring
- `/dashboard/proactive` - Proactive message testing

---

## Deployment Target

- **Domain**: genai.technosmart.id
- **Server**: 18.140.254.61:5252
- **Platform**: Dokploy

### Deploy with Docker
```bash
# From project root
docker build -f apps/web/Dockerfile -t jenny-bpjs .
docker run -p 3000:3000 --env-file apps/web/.env.local jenny-bpjs
```

---

## Test BPJS IDs (Seeded Data)

| BPJS ID         | Name          | Class | Has Debt |
|-----------------|---------------|-------|----------|
| 0001234567890   | Budi Santoso  | 1     | Yes      |
| 0001234567891   | Siti Rahayu   | 2     | Yes      |
| 0001234567892   | Ahmad Wijaya  | 3     | Yes      |
| 0001234567893   | Dewi Lestari  | 2     | Yes      |
| 0001234567894   | Eko Prasetyo  | 1     | Overdue  |

---

## Notes

- This is a POC - keep it clean and simple
- Focus on core functionality over polish
- Telegram first, WhatsApp setup later
- All text in Bahasa Indonesia for user-facing content
- Jenny responds in Bahasa Indonesia by default
