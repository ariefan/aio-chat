# 🏥 Jenny - BPJS Kesehatan Debt Collection Chatbot

> **AI-powered chatbot for BPJS Kesehatan debt collection with proactive reminders via Telegram**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Gemma](https://img.shields.io/badge/Gemma_3-4B-4285F4?logo=google)](https://ai.google.dev/gemma)
[![Telegram](https://img.shields.io/badge/Telegram-Bot-26A5E4?logo=telegram)](https://telegram.org/)

## 📋 Overview

**Jenny** is a Proof of Concept chatbot for BPJS Kesehatan Indonesia that helps with:

- 💬 **Debt Collection**: Friendly reminders for overdue BPJS payments
- 🔐 **BPJS ID Verification**: Secure member verification via 13-digit BPJS number
- 📊 **Debt Information**: Real-time debt lookup and payment status
- ⏰ **Proactive Reminders**: Automated notifications before due dates
- 📱 **Live Dashboard**: Monitor conversations in real-time
- 🗣️ **Bahasa Indonesia**: Full Indonesian language support

### Status: ✅ POC Complete (100%)

All core features implemented and ready for testing.

## 🎯 Key Features

| Feature | Description |
|---------|-------------|
| **Jenny AI** | Chatbot powered by Google Gemma 3 4B via OpenRouter |
| **BPJS Verification** | Verify members by BPJS ID (13 digits) |
| **Debt Lookup** | Display debt amounts, due dates, and late fees |
| **Proactive Messages** | Auto-reminders at 7, 3, 1 days before due date |
| **Live Monitoring** | Real-time conversation dashboard |
| **Data Management** | CRUD interface for BPJS members and debts |

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- pnpm package manager
- Telegram Bot Token (from @BotFather)
- OpenRouter API Key

### Installation

```bash
# Clone repository
git clone <repository-url>
cd aio-chat

# Install dependencies
pnpm install

# Setup environment
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your credentials

# Setup database
cd apps/web
pnpm db:push        # Create tables
pnpm db:seed-bpjs   # Seed test data

# Start development server
pnpm dev
```

Visit `http://localhost:3000` to see the dashboard.

### Setup Telegram Webhook

```bash
# Get webhook setup instructions
curl http://localhost:3000/api/webhooks/telegram?set_webhook=1

# Or manually set webhook
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-domain.com/api/webhooks/telegram"
```

## 🔑 Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/aio_chat

# NextAuth
NEXTAUTH_SECRET=your-super-secret-key-32-chars-min
NEXTAUTH_URL=http://localhost:3000

# Telegram Bot
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# OpenRouter API (Primary)
OPENROUTER_API_KEY=sk-or-v1-your-key
OPENROUTER_MODEL=google/gemma-3-4b-it

# TogetherAI (Fallback)
TOGETHERAI_API_KEY=your-key
TOGETHERAI_MODEL=google/gemma-2-9b-it

# OpenAI (for RAG embeddings)
OPENAI_API_KEY=sk-your-key
```

## 📁 Project Structure

```
aio-chat/
├── apps/web/
│   ├── app/
│   │   ├── api/bpjs/           # BPJS API endpoints
│   │   ├── api/webhooks/       # Telegram webhook
│   │   └── dashboard/          # Dashboard pages
│   │       ├── bpjs/           # BPJS management
│   │       ├── conversations/  # Live chat monitoring
│   │       └── proactive/      # Proactive message testing
│   └── src/
│       ├── db/                 # Database schema & seeds
│       └── lib/
│           ├── ai/jenny-ai.ts  # Jenny AI client
│           ├── messaging/      # Telegram adapter
│           └── scheduler/      # Proactive scheduler
├── packages/
│   └── ui/                     # Shared UI components
└── TODO.md                     # Progress tracking
```

## 🌐 API Endpoints

### BPJS Members
```
GET    /api/bpjs/members          # List members
POST   /api/bpjs/members          # Create member
GET    /api/bpjs/members/:id      # Get member + debts
PUT    /api/bpjs/members/:id      # Update member
DELETE /api/bpjs/members/:id      # Delete member
```

### BPJS Debts
```
GET    /api/bpjs/debts            # List debts
POST   /api/bpjs/debts            # Create debt
PUT    /api/bpjs/debts/:id        # Update debt
POST   /api/bpjs/debts/:id        # Record payment
```

### Proactive Messages
```
GET    /api/bpjs/proactive        # List messages
POST   /api/bpjs/proactive        # Actions:
       { action: 'run_scheduler' }      # Generate reminders
       { action: 'send_pending' }       # Send pending messages
       { action: 'trigger', memberId, messageType }  # Manual trigger
```

## 📊 Dashboard Pages

| Page | URL | Description |
|------|-----|-------------|
| Main Dashboard | `/dashboard` | Overview metrics |
| BPJS Management | `/dashboard/bpjs` | Manage members & debts |
| Live Conversations | `/dashboard/conversations` | Monitor chats in real-time |
| Proactive Testing | `/dashboard/proactive` | Test reminder system |

## 🧪 Test Data

After running `pnpm db:seed-bpjs`, you can test with these BPJS IDs:

| BPJS ID | Name | Class | Status |
|---------|------|-------|--------|
| `0001234567890` | Budi Santoso | 1 | Has debt |
| `0001234567891` | Siti Rahayu | 2 | Has debt |
| `0001234567892` | Ahmad Wijaya | 3 | Has debt |
| `0001234567893` | Dewi Lestari | 2 | Has debt |
| `0001234567894` | Eko Prasetyo | 1 | Overdue |

**Try chatting with Jenny on Telegram:**
> "Halo, saya mau cek tunggakan BPJS"
>
> "Nomor BPJS saya 0001234567890"

## 🚀 Deployment

### Target
- **Domain**: genai.technosmart.id
- **Server**: 18.140.254.61:5252
- **Platform**: Dokploy

### Docker Build
```bash
# Build from project root
docker build -f apps/web/Dockerfile -t jenny-bpjs .

# Run with environment file
docker run -p 3000:3000 --env-file apps/web/.env.local jenny-bpjs
```

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16, React 19 |
| Language | TypeScript 5.7 |
| Database | PostgreSQL + Drizzle ORM |
| AI Model | Google Gemma 3 4B (via OpenRouter) |
| Messaging | Telegram Bot API |
| UI | shadcn/ui + Tailwind CSS |
| Auth | NextAuth.js |
| Monorepo | Turborepo + pnpm |

## 📖 Documentation

- **[`TODO.md`](./TODO.md)** - Complete task checklist and progress
- **[`FEATURES.md`](./FEATURES.md)** - Feature matrix
- **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** - System architecture

## 📄 License

MIT License

---

**Status**: ✅ POC Complete
**Last Updated**: December 8, 2024
**Version**: 1.0.0 (Proof of Concept)
