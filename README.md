# 🤖 AIO-CHAT - Conversational AI CRM POC

> **All-in-one chatbot system for WhatsApp & Telegram with RAG personalization and automated debt collection**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-3178c6?logo=drizzle-orm)](https://orm.drizzle.team/)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?logo=shadcnui)](https://ui.shadcn.com/)

## 📋 Overview

**AIO-CHAT** is a Proof of Concept (POC) for an intelligent chatbot CRM system that:

- 📱 **Multi-Platform Messaging**: WhatsApp Business API & Telegram Bot API integration
- 🔐 **Platform Identity Verification**: Secure user recognition across platforms
- 🧠 **RAG Personalization**: Context-aware responses using user data
- 🤖 **Automated Workflows**: Scheduled reminders and conditional messaging
- 📊 **Operator Console**: Human oversight and intervention capabilities
- 💳 **Debt Collection Focus**: Specialized for health insurance payment recovery

### Current Status: 🚧 Infrastructure Setup (5% Complete)

- ✅ Next.js 15 + shadcn/ui monorepo with Turborepo
- ❌ Database not configured (Drizzle ORM + PostgreSQL needed)
- ❌ Authentication not implemented
- ❌ Messaging platforms not connected

## 🏗️ Architecture

```mermaid
graph TB
    subgraph "Frontend (Next.js 16)"
        UI[Operator Dashboard]
        Chat[Chat Interface]
    end

    subgraph "Backend (API Routes)"
        API[Core API]
        Auth[NextAuth.js]
        Webhooks[Message Webhooks]
    end

    subgraph "AI & RAG"
        LLM[OpenAI GPT-4]
        VectorDB[Pinecone]
        Embeddings[Text Embeddings]
    end

    subgraph "Messaging Platforms"
        WA[WhatsApp API]
        TG[Telegram API]
    end

    subgraph "Database"
        PG[(PostgreSQL)]
        Redis[(Redis Cache)]
    end

    UI --> API
    Chat --> API
    API --> Auth
    API --> Webhooks
    Webhooks --> WA
    Webhooks --> TG
    API --> PG
    API --> Redis
    API --> LLM
    LLM --> VectorDB
    VectorDB --> Embeddings
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis (optional, for caching)
- pnpm package manager

### Installation

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd aio-chat
pnpm install
```

2. **Environment setup**:
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

3. **Database setup**:
```bash
# Install Drizzle CLI
pnpm add -g drizzle-kit

# Run database migrations
pnpm db:push
```

4. **Start development server**:
```bash
pnpm dev
```

Visit `http://localhost:3000` to see the application.

## 📁 Project Structure

```
aio-chat/
├── apps/
│   └── web/                    # Next.js 16 frontend application
├── packages/
│   ├── ui/                     # Shared shadcn/ui components
│   ├── eslint-config/          # ESLint configuration
│   └── typescript-config/      # TypeScript configuration
├── docs/
│   ├── FEATURES.md             # Detailed feature matrix
│   ├── USER_STORIES.md         # User requirements (bilingual)
│   └── TODO.md                 # POC roadmap & progress
└── README.md                   # This file
```

## 🛠️ Tech Stack

### Core Technologies

- **Frontend**: Next.js 16, React 19, TypeScript
- **UI Library**: shadcn/ui + Tailwind CSS
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: NextAuth.js
- **Real-time**: WebSocket / Server-Sent Events

### AI & Integrations

- **LLM**: OpenAI GPT-4
- **Vector Database**: Pinecone
- **Messaging**: WhatsApp Business API, Telegram Bot API
- **Job Queue**: Bull Queue
- **File Storage**: AWS S3

### Development Tools

- **Monorepo**: Turborepo
- **Package Manager**: pnpm
- **Linting**: ESLint + Prettier
- **Testing**: Jest + Playwright (planned)

## 📊 POC Roadmap

### Phase 1: Foundation (Week 1-2) - 0%
- [ ] Upgrade to Next.js 16
- [ ] Setup PostgreSQL + Drizzle ORM
- [ ] Implement NextAuth.js authentication
- [ ] Create basic database schema

### Phase 2: Basic Messaging (Week 3-4) - 0%
- [ ] Telegram Bot API integration
- [ ] Message storage and retrieval
- [ ] Basic operator dashboard
- [ ] Real-time conversation updates

### Phase 3: RAG Implementation (Week 5-6) - 0%
- [ ] OpenAI integration
- [ ] Pinecone vector database setup
- [ ] Document ingestion pipeline
- [ ] Personalized responses

### Phase 4: Automation (Week 7-8) - 0%
- [ ] Scheduled reminders
- [ ] Conditional rules engine
- [ ] Broadcast campaigns
- [ ] Debt collection flows

### Phase 5: Operator Console (Week 9-10) - 0%
- [ ] Dashboard overview
- [ ] Conversation management
- [ ] User management
- [ ] System monitoring

## 📖 Documentation

- **[`FEATURES.md`](./FEATURES.md)** - Comprehensive feature matrix with implementation status
- **[`USER_STORIES.md`](./USER_STORIES.md)** - Bilingual user stories with technical notes
- **[`TODO.md`](./TODO.md)** - Interactive POC roadmap with progress tracking
- **[`TECHNICAL_ARCHITECTURE.md`](./TECHNICAL_ARCHITECTURE.md)** - System architecture and technical details

## 🔧 Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/aio_chat
REDIS_URL=redis://localhost:6379

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# OpenAI
OPENAI_API_KEY=sk-...

# Pinecone
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...

# Messaging Platforms
TELEGRAM_BOT_TOKEN=...
WHATSAPP_PHONE_ID=...
WHATSAPP_ACCESS_TOKEN=...
```

## 🤝 Contributing

This is a POC project. Contributions are welcome but please follow the development roadmap defined in the documentation.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 📞 Contact

For questions about this POC:

- Create an issue in the repository
- Contact the development team

---

**Status**: 🚧 Active Development - POC Phase
**Last Updated**: December 6, 2025
**Version**: 0.1.0 (Proof of Concept)