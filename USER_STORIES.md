# 🤖 **AIO-CHAT — User Stories (CATBOT-CRM POC)**

> **Last Updated**: December 6, 2025
> **Version**: 1.0 (POC)
> **Status**: Living Document - Proof of Concept
> **Related Document**: [`FEATURES.md`](./FEATURES.md)

## Table of Contents

1. [Introduction](#introduction)
2. [User Roles & POC Scope](#user-roles--poc-scope)
3. [User Stories by Implementation Priority](#user-stories-by-implementation-priority)
   - [Phase 1: Foundation & Verification (POC Core)](#phase-1-foundation--verification-poc-core)
   - [Phase 2: Basic Messaging (POC Core)](#phase-2-basic-messaging-poc-core)
   - [Phase 3: RAG Personalization (POC Advanced)](#phase-3-rag-personalization-poc-advanced)
   - [Phase 4: Automation (POC Advanced)](#phase-4-automation-poc-advanced)
   - [Phase 5: Operator Console (POC Support)](#phase-5-operator-console-poc-support)
4. [Technical Implementation Notes](#technical-implementation-notes)

---

## Introduction

This document contains all user stories for the **CATBOT-CRM** (Conversational AI To Bot - CRM) Proof of Concept. The system is designed as an all-in-one chatbot platform that:

- Integrates with **WhatsApp Business API** and **Telegram Bot API**
- Performs **platform identity verification** for secure user recognition
- Delivers **personalized responses** using Retrieval-Augmented Generation (RAG)
- Supports **automated outbound messaging** with focus on debt collection use case
- Provides **operator console** for human oversight and intervention

### POC vs MVP Scope

**POC (Current Sprint)**: Core functionality demonstration with single platform (Telegram first, then WhatsApp), basic RAG, and simple automation rules.

**MVP (Future)**: Full platform parity, advanced automation, production-grade security, and comprehensive analytics.

### User Story Format

```
🇮🇩 Sebagai [Role], saya ingin [Action] agar [Benefit]
🇺🇸 As a [Role], I want to [Action] so that [Benefit]

📋 [Technical Notes] Implementation considerations for POC
```

---

## User Roles & POC Scope

| Role | Indonesian | POC Responsibilities | Technical Access |
| ---- | --------- | ------------------- | ---------------- |
| **👤 End User** | Pengguna Akhir | - Verify platform identity<br>- Receive personalized responses<br>- Make payments via chat links<br>- View conversation history | - Chat interface (WA/TG)<br>- Basic profile view |
| **👨‍💼 Operator** | Operator | - Monitor active conversations<br>- Manual takeover when needed<br>- Send broadcast messages<br>- View user data and edit if needed | - Operator dashboard<br>- Conversation management<br>- User search & edit |
| **⚙️ System Admin** | Admin Sistem | - Configure WhatsApp/Telegram APIs<br>- Set up automation rules<br>- Manage user data imports<br>- Monitor system health & logs | - Admin panel<br>- API configurations<br>- System metrics |
| **🤖 Automation System** | Sistem Otomasi | - Send scheduled reminders<br>- Execute conditional rules<br>- Process bulk broadcasts<br>- Handle failed message retries | - Backend services<br>- Job scheduler<br>- Rule engine |

### POC Implementation Priority

1. **Phase 1 (Week 1-2)**: User verification + basic chat
2. **Phase 2 (Week 3-4)**: Single platform messaging + operator console
3. **Phase 3 (Week 5-6)**: RAG implementation + personalization
4. **Phase 4 (Week 7-8)**: Basic automation + debt collection flow

---

# User Stories by Implementation Priority

---

## **Phase 1: Foundation & Verification (POC Core)**

### 1.1 User Identity Verification

**US-P1.1** 👤 **Platform Linking**
🇮🇩 Sebagai **User**, saya ingin **menghubungkan akun saya dengan nomor WhatsApp atau Telegram ID** agar chatbot bisa mengenali identitas saya.
🇺🇸 As a **User**, I want to **link my account with WhatsApp number or Telegram ID** so the chatbot can recognize my identity.

📋 **Technical Notes (POC)**:
- Need `users` table with `platform_id` and `platform_type` fields
- Implement simple JWT-based verification flow
- Use Drizzle ORM schema: `users(id, name, email, phone, policy_id, created_at)`

---

**US-P1.2** 👤 **Verification Code**
🇮🇩 Sebagai **User**, saya ingin **menerima kode verifikasi melalui platform yang saya gunakan** agar saya dapat membuktikan bahwa platform ID tersebut milik saya.
🇺🇸 As a **User**, I want to **receive verification code through my platform** so I can prove ownership of the platform ID.

📋 **Technical Notes (POC)**:
- Generate 6-digit OTP with 5-minute expiry
- Store in Redis cache or temporary database table
- Implement rate limiting (3 attempts per 10 minutes)

---

**US-P1.3** 👤 **Verification Status**
🇮🇩 Sebagai **User**, saya ingin **melihat status verifikasi platform saya** agar saya tahu apakah akun saya sudah siap menggunakan fitur lengkap chatbot.
🇺🇸 As a **User**, I want to **check my verification status** so I know if my account is ready for full chatbot features.

📋 **Technical Notes (POC)**:
- Add `verified_at` timestamp to users table
- Create API endpoint: `/api/user/verification-status`
- Return status: `pending | verified | failed`

---

**US-P1.4** 👨‍💼 **User Import**
🇮🇩 Sebagai **Admin**, saya ingin **mengimport data user existing** agar sistem memiliki database pengguna awal untuk testing.
🇺🇸 As an **Admin**, I want to **import existing user data** so the system has an initial user database for testing.

📋 **Technical Notes (POC)**:
- Create CSV import functionality in admin panel
- Required fields: `name, email, phone, policy_id`
- Bulk insert using Drizzle ORM batch operations

---

## **Phase 2: Basic Messaging (POC Core)**

### 2.1 Single Platform Messaging (Telegram First)

**US-P2.1** 👤 **Send Message**
🇮🇩 Sebagai **User**, saya ingin **mengirim pesan ke chatbot melalui Telegram** agar saya bisa berinteraksi dengan platform.
🇺🇸 As a **User**, I want to **send messages to the chatbot via Telegram** so I can interact with the platform.

📋 **Technical Notes (POC)**:
- Implement Telegram Bot API webhook endpoint
- Create `messages` table: `id, user_id, content, platform, direction, created_at`
- Store messages with `direction: 'inbound' | 'outbound'`

---

**US-P2.2** 🤖 **Receive Response**
🇮🇩 Sebagai **User**, saya ingin **menerima balasan dari chatbot** agar saya mendapatkan jawaban untuk pertanyaan saya.
🇺🇸 As a **User**, I want to **receive responses from the chatbot** so I can get answers to my questions.

📋 **Technical Notes (POC)**:
- Basic rule-based responses for POC
- Intent recognition using simple keyword matching
- Response template system with shadcn/ui components

---

**US-P2.3** 👨‍💼 **Unified Dashboard**
🇮🇩 Sebagai **Operator**, saya ingin **melihat semua percakapan aktif** agar saya dapat memantau interaksi user.
🇺🇸 As an **Operator**, I want to **see all active conversations** so I can monitor user interactions.

📋 **Technical Notes (POC)**:
- Create real-time dashboard using WebSocket or Server-Sent Events
- Implement conversation list component with shadcn/ui
- Add search/filter by user name or status

---

**US-P2.4** 👨‍💼 **Manual Takeover**
🇮🇩 Sebagai **Operator**, saya ingin **mengambil alih percakapan dari chatbot** agar saya bisa menjawab secara manual.
🇺🇸 As an **Operator**, I want to **take over conversations from the chatbot** so I can respond manually when needed.

📋 **Technical Notes (POC)**:
- Add `status` field to conversations: `bot | human | takeover`
- Implement operator message injection system
- Real-time message updates in dashboard

---

## **Phase 3: RAG Personalization (POC Advanced)**

### 3.1 Context-Aware Responses

**US-P3.1** 👤 **Personalized Context**
🇮🇩 Sebagai **User**, saya ingin **chatbot memahami konteks data saya (nama, polis, status tagihan)** agar percakapan lebih relevan.
🇺🇸 As a **User**, I want to **the chatbot to understand my context (name, policy, billing status)** so conversations are more relevant.

📋 **Technical Notes (POC)**:
- Implement user profile lookup in conversation handler
- Create context variables: `{{user.name}}`, `{{user.policy_id}}`, `{{user.status}}`
- Store user documents in separate `documents` table with user_id

---

**US-P3.2** 👤 **Document-Based Answers**
🇮🇩 Sebagai **User**, saya ingin **chatbot menjawab pertanyaan saya berdasarkan dokumen saya** agar informasi yang diberikan akurat.
🇺🇸 As a **User**, I want to **the chatbot to answer questions based on my documents** so provided information is accurate.

📋 **Technical Notes (POC)**:
- Setup Pinecone vector database for document embeddings
- Use OpenAI text-embedding-ada-002 for document chunks
- RAG flow: Query → Vector Search → Context → LLM Generation
- Limit to user-specific documents using ACLs

---

**US-P3.3** 👤 **Conversation History**
🇮🇩 Sebagai **User**, saya ingin **melihat riwayat percakapan saya** agar saya dapat meninjau kembali informasi sebelumnya.
🇺🇸 As a **User**, I want to **view my conversation history** so I can review previous information.

📋 **Technical Notes (POC)**:
- Paginated message history endpoint: `/api/user/messages`
- Implement conversation threading with message_id relationships
- Add message search functionality for users

---

**US-P3.4** ⚙️ **Privacy Controls**
🇮🇩 Sebagai **Admin**, saya ingin **memastikan chatbot hanya mengakses data user yang terverifikasi** agar privasi terjaga.
🇺🇸 As an **Admin**, I want to **ensure the chatbot only accesses verified user data** so privacy is maintained.

📋 **Technical Notes (POC)**:
- Check user.verified_at before any RAG query
- Implement document-level ACLs in vector search
- Log all data access for audit trails

---

## **Phase 4: Automation (POC Advanced)**

### 4.1 Scheduled Reminders

**US-P4.1** 🤖 **Payment Reminders**
🇮🇩 Sebagai **Automation System**, saya ingin **mengirim pengingat tagihan otomatis** agar user diberitahu tentang kewajiban pembayaran.
🇺🇸 As an **Automation System**, I want to **send automatic payment reminders** so users are notified about payment obligations.

📋 **Technical Notes (POC)**:
- Use node-cron for scheduling tasks
- Create `reminders` table: `id, user_id, type, scheduled_at, sent_at, status`
- Check for unpaid bills daily and send reminders
- Add rate limiting: max 1 reminder per day per user

---

**US-P4.2** 👤 **Relevant Notifications**
🇮🇩 Sebagai **User**, saya ingin **menerima notifikasi penting** agar saya tidak ketinggalan informasi.
🇺🇸 As a **User**, I want to **receive important notifications** so I don't miss critical information.

📋 **Technical Notes (POC)**:
- Implement notification templates with personalization
- Support notification types: `payment_due | document_required | appointment_reminder`
- User notification preferences in settings

---

**US-P4.3** 👨‍💼 **Broadcast Campaigns**
🇮🇩 Sebagai **Operator**, saya ingin **mengirim broadcast ke segmen user** agar kampanye dapat dilakukan efisien.
🇺🇸 As an **Operator**, I want to **send broadcasts to user segments** so campaigns can be executed efficiently.

📋 **Technical Notes (POC)**:
- Create broadcast job queue with Bull Queue
- Simple segmentation: `all_users | verified_users | overdue_users`
- Add throttling: max 100 messages per hour per platform

---

**US-P4.4** 👨‍💼 **Debt Collection Flow**
🇮🇩 Sebagai **User**, saya ingin **mengikuti alur penagihan yang sopan** agar saya dapat menyelesaikan kewajiban dengan nyaman.
🇺🇸 As a **User**, I want to **follow a polite collection flow** so I can settle obligations comfortably.

📋 **Technical Notes (POC)**:
- Multi-stage reminders: Day 3, Day 7, Day 14 after due date
- Escalation tone: friendly → urgent → final notice
- Include payment link generation for each reminder

---

## **Phase 5: Operator Console (POC Support)**

### 5.1 Conversation Management

**US-P5.1** 👨‍💼 **Active Conversations View**
🇮🇩 Sebagai **Operator**, saya ingin **melihat semua percakapan aktif** agar saya dapat memantau user yang memerlukan bantuan.
🇺🇸 As an **Operator**, I want to **view all active conversations** so I can monitor users needing assistance.

📋 **Technical Notes (POC)**:
- Real-time conversation list with WebSocket updates
- Filter by status: `active | idle | human_handled`
- Show unread message count and last activity time

---

**US-P5.2** 👨‍💼 **User Data Management**
🇮🇩 Sebagai **Admin**, saya ingin **melihat dan mengedit data user** agar saya dapat memvalidasi informasi.
🇺🇸 As an **Admin**, I want to **view and edit user data** so I can validate information.

📋 **Technical Notes (POC)**:
- User search by name, phone, policy_id
- Inline editing with audit trail
- Export user data to CSV for backup

---

**US-P5.3** ⚙️ **System Monitoring**
🇮🇩 Sebagai **Admin**, saya ingin **melihat metrik sistem dasar** agar saya dapat memantau kesehatan platform.
🇺🇸 As an **Admin**, I want to **view basic system metrics** so I can monitor platform health.

📋 **Technical Notes (POC)**:
- Metrics: messages sent/delivered, active users, error rate
- Simple charts using Chart.js or Recharts
- Daily email summaries for admins

---

**US-P5.4** ⚙️ **Message Logs**
🇮🇩 Sebagai **Admin**, saya ingin **melihat log pesan** agar saya dapat men-debug masalah pengiriman.
🇺🇸 As an **Admin**, I want to **view message logs** so I can debug delivery issues.

📋 **Technical Notes (POC)**:
- Log all incoming/outgoing messages
- Include delivery status and error codes
- Search/filter by date, user, platform

---

## Technical Implementation Notes

### Database Schema (POC)

```sql
-- Core Tables
users (id, name, email, phone, policy_id, platform_id, platform_type, verified_at, created_at, updated_at)
conversations (id, user_id, status, platform, created_at, updated_at)
messages (id, conversation_id, content, direction, platform, metadata, created_at)

-- RAG & Documents
documents (id, user_id, title, content, type, vector_id, created_at)
document_chunks (id, document_id, content, embedding, metadata)

-- Automation
reminders (id, user_id, type, scheduled_at, sent_at, status, template_data)
automation_rules (id, name, conditions, actions, active, created_at)

-- System
message_logs (id, message_id, status, error_code, platform_response, created_at)
audit_logs (id, user_id, action, details, created_at)
```

### API Routes Structure

```
/api/auth/
  POST /login
  POST /logout
  GET /me

/api/users/
  GET /me
  POST /verify
  GET /messages

/api/admin/
  GET /users
  POST /users/import
  GET /conversations
  GET /metrics

/api/webhooks/
  POST /telegram
  POST /whatsapp
```

### Frontend Components (shadcn/ui)

```
/components/ui/     # Base shadcn components
/components/chat/
  - ConversationList.tsx
  - MessageBubble.tsx
  - MessageInput.tsx
/components/admin/
  - Dashboard.tsx
  - UserTable.tsx
  - MetricsChart.tsx
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Authentication
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...

# Messaging
TELEGRAM_BOT_TOKEN=...
WHATSAPP_PHONE_ID=...
WHATSAPP_ACCESS_TOKEN=...

# AI Services
OPENAI_API_KEY=...
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
```

### Development Workflow

1. **Week 1-2**: Setup database, authentication, basic chat UI
2. **Week 3-4**: Telegram integration, message storage
3. **Week 5-6**: RAG pipeline with OpenAI + Pinecone
4. **Week 7-8**: Automation rules, operator dashboard

---

**Document Status**: ✅ POC Ready
**Next Review**: After Phase 1 completion
**Dependencies**: [`FEATURES.md`](./FEATURES.md), [`TODO.md`](./TODO.md)
