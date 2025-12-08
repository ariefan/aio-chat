import {
  pgTable,
  pgEnum,
  serial,
  text,
  timestamp,
  boolean,
  jsonb,
  varchar,
  integer,
  uuid,
  pgTableCreator,
  real,
} from 'drizzle-orm/pg-core'

// Create a base table function for consistent table creation
const createTable = pgTableCreator((name) => `aio_chat_${name}`)

// Enums
export const platformTypeEnum = pgEnum('platform_type', ['whatsapp', 'telegram'])
export const messageDirectionEnum = pgEnum('message_direction', ['inbound', 'outbound'])
export const messageStatusEnum = pgEnum('message_status', ['sent', 'delivered', 'read', 'failed'])
export const userStatusEnum = pgEnum('user_status', ['pending', 'verified', 'active', 'inactive'])
export const conversationStatusEnum = pgEnum('conversation_status', ['active', 'closed', 'archived'])
export const operatorRoleEnum = pgEnum('operator_role', ['admin', 'operator'])

// BPJS Debt Enums
export const bpjsDebtStatusEnum = pgEnum('bpjs_debt_status', ['active', 'partial', 'paid', 'overdue', 'written_off'])
export const bpjsMemberStatusEnum = pgEnum('bpjs_member_status', ['active', 'inactive', 'suspended'])

// RAG Knowledge Base Enums
export const documentTypeEnum = pgEnum('document_type', ['faq', 'policy', 'manual', 'procedure', 'general'])
export const documentStatusEnum = pgEnum('document_status', ['draft', 'published', 'archived'])
export const embeddingModelEnum = pgEnum('embedding_model', ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'])

// Automation Rules Enums
export const automationTriggerTypeEnum = pgEnum('automation_trigger_type', [
  'keyword',
  'time_based',
  'message_count',
  'user_status',
  'conversation_inactive',
  'escalation',
  'custom_event'
])

export const automationActionTypeEnum = pgEnum('automation_action_type', [
  'send_message',
  'assign_to_operator',
  'change_user_status',
  'change_conversation_status',
  'add_tag',
  'send_email',
  'create_task',
  'escalate',
  'webhook',
  'ai_response',
  'delay'
])

export const automationStatusEnum = pgEnum('automation_status', ['draft', 'active', 'paused', 'disabled'])

// Users table - End users of the chatbot
export const users = createTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  platformId: varchar('platform_id', { length: 255 }).notNull(),
  platformType: platformTypeEnum('platform_type').notNull(),
  status: userStatusEnum('user_status').default('pending'),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  name: varchar('name', { length: 255 }),
  metadata: jsonb('metadata'),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// BPJS Members table - BPJS Kesehatan member data
export const bpjsMembers = createTable('bpjs_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  bpjsId: varchar('bpjs_id', { length: 20 }).notNull().unique(), // BPJS member ID (NIK-based)
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // Link to chat user after verification
  name: varchar('name', { length: 255 }).notNull(),
  nik: varchar('nik', { length: 20 }).notNull(), // National ID
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  memberClass: varchar('member_class', { length: 10 }).default('3'), // Kelas 1, 2, 3
  status: bpjsMemberStatusEnum('status').default('active'),
  registeredAt: timestamp('registered_at'),
  metadata: jsonb('metadata'), // Additional member data

  // === SIMULATION FIELDS ===

  // Billing Summary (calculated from bpjsDebts)
  totalArrears: integer('total_arrears').default(0), // Total tunggakan in IDR
  arrearsMonths: integer('arrears_months').default(0), // Duration of arrears in months
  lastPaymentDate: timestamp('last_payment_date'),
  lastPaymentMethod: varchar('last_payment_method', { length: 50 }),

  // Claim History (for leverage strategy)
  lastClaimDate: timestamp('last_claim_date'),
  lastClaimType: varchar('last_claim_type', { length: 50 }), // rawat_inap, rawat_jalan, dll
  lastClaimDiagnosis: varchar('last_claim_diagnosis', { length: 255 }),
  lastClaimHospital: varchar('last_claim_hospital', { length: 255 }),
  lastClaimAmount: integer('last_claim_amount'), // Amount in IDR

  // Interaction History
  lastContactAgent: varchar('last_contact_agent', { length: 100 }),
  lastContactDate: timestamp('last_contact_date'),
  lastContactChannel: varchar('last_contact_channel', { length: 50 }), // whatsapp, call, sms
  lastContactOutcome: varchar('last_contact_outcome', { length: 100 }), // promise_to_pay, refused, no_answer
  arrearsReason: text('arrears_reason'), // Alasan tunggak

  // Payment Commitment History
  credibilityScore: real('credibility_score').default(0.5), // 0.0 - 1.0
  lastPromiseDate: timestamp('last_promise_date'),
  lastPromiseStatus: varchar('last_promise_status', { length: 50 }), // kept, broken, pending
  lastPromiseDaysOverdue: integer('last_promise_days_overdue'),

  // Strategy
  strategyApproach: varchar('strategy_approach', { length: 255 }), // Gentle Reminder, Claim Data Trigger, etc
  strategyUrgency: varchar('strategy_urgency', { length: 50 }), // low, medium, high, critical
  strategyTone: varchar('strategy_tone', { length: 50 }), // empathetic, firm, urgent

  // Additional profile data
  occupation: varchar('occupation', { length: 100 }), // Pekerjaan
  dependents: integer('dependents').default(0), // Jumlah tanggungan

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// BPJS Debt records - Debt/tunggakan information
export const bpjsDebts = createTable('bpjs_debts', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').references(() => bpjsMembers.id, { onDelete: 'cascade' }).notNull(),
  periodMonth: integer('period_month').notNull(), // 1-12
  periodYear: integer('period_year').notNull(),
  amount: integer('amount').notNull(), // Amount in IDR (use integer for currency)
  dueDate: timestamp('due_date').notNull(),
  paidAmount: integer('paid_amount').default(0),
  paidAt: timestamp('paid_at'),
  status: bpjsDebtStatusEnum('status').default('active'),
  lateFee: integer('late_fee').default(0), // Denda keterlambatan
  description: text('description'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// BPJS Payment history
export const bpjsPayments = createTable('bpjs_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  debtId: uuid('debt_id').references(() => bpjsDebts.id, { onDelete: 'cascade' }).notNull(),
  memberId: uuid('member_id').references(() => bpjsMembers.id, { onDelete: 'cascade' }).notNull(),
  amount: integer('amount').notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }), // bank_transfer, va, qris, etc.
  paymentRef: varchar('payment_ref', { length: 100 }), // Transaction reference
  status: varchar('status', { length: 20 }).default('pending'), // pending, success, failed
  paidAt: timestamp('paid_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Proactive message queue - For due date reminders
export const proactiveMessages = createTable('proactive_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').references(() => bpjsMembers.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  messageType: varchar('message_type', { length: 50 }).notNull(), // reminder_7d, reminder_3d, reminder_1d, overdue
  scheduledAt: timestamp('scheduled_at').notNull(),
  sentAt: timestamp('sent_at'),
  content: text('content').notNull(),
  status: varchar('status', { length: 20 }).default('pending'), // pending, sent, failed, cancelled
  retryCount: integer('retry_count').default(0),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Operators table - Internal users who manage the system
export const operators = createTable('operators', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: operatorRoleEnum('role').default('operator'),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Conversations table
export const conversations = createTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  assignedOperatorId: uuid('assigned_operator_id').references(() => operators.id),
  status: conversationStatusEnum('status').default('active'),
  metadata: jsonb('metadata'),
  lastMessageAt: timestamp('last_message_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Messages table
export const messages = createTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  platformId: varchar('platform_id', { length: 255 }), // ID from external platform
  direction: messageDirectionEnum('direction').notNull(),
  content: text('content').notNull(),
  messageType: varchar('message_type', { length: 50 }).default('text'),
  status: messageStatusEnum('status').default('sent'),
  metadata: jsonb('metadata'), // For media URLs, reactions, etc.
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Scheduled messages table
export const scheduledMessages = createTable('scheduled_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  status: varchar('status', { length: 20 }).default('pending'), // pending, sent, failed, cancelled
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Enhanced Automation rules table
export const automationRules = createTable('automation_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: automationStatusEnum('status').default('draft'),
  triggerType: automationTriggerTypeEnum('trigger_type').notNull(),
  triggerConfig: jsonb('trigger_config').notNull(), // Detailed trigger configuration
  actions: jsonb('actions').notNull(), // Array of actions to execute
  conditions: jsonb('conditions'), // Additional conditions (optional)
  priority: integer('priority').default(0),
  maxExecutions: integer('max_executions'), // Maximum times rule can be executed
  executionCount: integer('execution_count').default(0),
  lastExecutedAt: timestamp('last_executed_at'),
  cooldownMinutes: integer('cooldown_minutes').default(0), // Minimum time between executions
  tags: varchar('tags', { length: 500 }), // Comma-separated tags for organization
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by').references(() => operators.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Message templates table
export const messageTemplates = createTable('message_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  content: text('content').notNull(),
  variables: jsonb('variables'), // Array of variable names for template
  category: varchar('category', { length: 100 }),
  language: varchar('language', { length: 10 }).default('en'),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').references(() => operators.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Audit logs table
export const auditLogs = createTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  operatorId: uuid('operator_id').references(() => operators.id),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 100 }),
  entityId: uuid('entity_id'),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  metadata: jsonb('metadata'),
  ip: varchar('ip', { length: 45 }), // Supports IPv6
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// NextAuth.js tables for authentication
export const accounts = createTable('accounts', {
  userId: uuid('user_id')
    .references(() => operators.id, { onDelete: 'cascade' })
    .notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: varchar('token_type', { length: 50 }),
  scope: varchar('scope', { length: 255 }),
  id_token: text('id_token'),
  session_state: varchar('session_state', { length: 255 }),
})

export const sessions = createTable('sessions', {
  sessionToken: varchar('session_token', { length: 255 }).primaryKey(),
  userId: uuid('user_id')
    .references(() => operators.id, { onDelete: 'cascade' })
    .notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = createTable('verification_tokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).primaryKey(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

// Automation execution logs
export const automationExecutions = createTable('automation_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  ruleId: uuid('rule_id').references(() => automationRules.id, { onDelete: 'cascade' }).notNull(),
  triggerType: automationTriggerTypeEnum('trigger_type').notNull(),
  triggerData: jsonb('trigger_data').notNull(), // Data that triggered the rule
  executedActions: jsonb('executed_actions').notNull(), // Actions that were executed
  results: jsonb('results'), // Results of action execution
  status: varchar('status', { length: 50 }).notNull(), // 'success', 'failed', 'partial'
  errorMessage: text('error_message'),
  executionTime: integer('execution_time'), // Execution time in milliseconds
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
  messageId: uuid('message_id').references(() => messages.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Automation schedules (for time-based triggers)
export const automationSchedules = createTable('automation_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  ruleId: uuid('rule_id').references(() => automationRules.id, { onDelete: 'cascade' }).notNull(),
  scheduleType: varchar('schedule_type', { length: 50 }).notNull(), // 'cron', 'interval', 'once'
  scheduleExpression: varchar('schedule_expression', { length: 255 }).notNull(), // Cron expression or interval
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  nextRunAt: timestamp('next_run_at'),
  lastRunAt: timestamp('last_run_at'),
  isActive: boolean('is_active').default(true),
  runCount: integer('run_count').default(0),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Knowledge Base Documents
export const knowledgeDocuments = createTable('knowledge_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  type: documentTypeEnum('document_type').default('general'),
  status: documentStatusEnum('document_status').default('draft'),
  category: varchar('category', { length: 100 }),
  tags: varchar('tags', { length: 1000 }), // Comma-separated tags
  metadata: jsonb('metadata'),
  createdById: uuid('created_by').references(() => operators.id),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Document Embeddings for Vector Search
export const documentEmbeddings = createTable('document_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').references(() => knowledgeDocuments.id, { onDelete: 'cascade' }).notNull(),
  chunkIndex: integer('chunk_index').notNull(), // For long documents split into chunks
  chunkText: text('chunk_text').notNull(),
  embeddingModel: embeddingModelEnum('embedding_model').default('text-embedding-3-small'),
  embedding: jsonb('embedding').notNull(), // Vector array as JSON
  tokenCount: integer('token_count'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// AI Chat Sessions for tracking AI conversations
export const aiChatSessions = createTable('ai_chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  platformType: platformTypeEnum('platform_type').notNull(),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  title: varchar('title', { length: 500 }),
  context: jsonb('context'), // Conversation context/memory
  metadata: jsonb('metadata'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  lastMessageAt: timestamp('last_message_at').defaultNow(),
  endedAt: timestamp('ended_at'),
})

// AI Messages within AI Chat Sessions
export const aiMessages = createTable('ai_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => aiChatSessions.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 20 }).notNull(), // 'user', 'assistant', 'system'
  content: text('content').notNull(),
  tokenCount: integer('token_count'),
  modelUsed: varchar('model_used', { length: 100 }),
  metadata: jsonb('metadata'),
  retrievedDocuments: jsonb('retrieved_documents'), // Documents used for RAG
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// RAG Search Logs for analytics and improvement
export const ragSearchLogs = createTable('rag_search_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => aiChatSessions.id, { onDelete: 'cascade' }),
  query: text('query').notNull(),
  searchResults: jsonb('search_results').notNull(),
  retrievedDocumentIds: jsonb('retrieved_document_ids'), // Array of document IDs used
  relevanceScore: jsonb('relevance_score'), // Per-document relevance scores
  responseGenerated: boolean('response_generated').default(false),
  userFeedback: integer('user_feedback'), // 1-5 rating
  processingTime: integer('processing_time'), // Milliseconds
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Application Settings Table
export const appSettings = createTable('app_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).default('general'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by'),
})

// Export types for use in the application
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Operator = typeof operators.$inferSelect
export type NewOperator = typeof operators.$inferInsert
export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
export type ScheduledMessage = typeof scheduledMessages.$inferSelect
export type NewScheduledMessage = typeof scheduledMessages.$inferInsert
export type AutomationRule = typeof automationRules.$inferSelect
export type NewAutomationRule = typeof automationRules.$inferInsert
export type AutomationExecution = typeof automationExecutions.$inferSelect
export type NewAutomationExecution = typeof automationExecutions.$inferInsert
export type AutomationSchedule = typeof automationSchedules.$inferSelect
export type NewAutomationSchedule = typeof automationSchedules.$inferInsert
export type MessageTemplate = typeof messageTemplates.$inferSelect
export type NewMessageTemplate = typeof messageTemplates.$inferInsert
export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert

// RAG Knowledge Base Types
export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect
export type NewKnowledgeDocument = typeof knowledgeDocuments.$inferInsert
export type DocumentEmbedding = typeof documentEmbeddings.$inferSelect
export type NewDocumentEmbedding = typeof documentEmbeddings.$inferInsert
export type AiChatSession = typeof aiChatSessions.$inferSelect
export type NewAiChatSession = typeof aiChatSessions.$inferInsert
export type AiMessage = typeof aiMessages.$inferSelect
export type NewAiMessage = typeof aiMessages.$inferInsert
export type RagSearchLog = typeof ragSearchLogs.$inferSelect
export type NewRagSearchLog = typeof ragSearchLogs.$inferInsert

// BPJS Types
export type BpjsMember = typeof bpjsMembers.$inferSelect
export type NewBpjsMember = typeof bpjsMembers.$inferInsert
export type BpjsDebt = typeof bpjsDebts.$inferSelect
export type NewBpjsDebt = typeof bpjsDebts.$inferInsert
export type BpjsPayment = typeof bpjsPayments.$inferSelect
export type NewBpjsPayment = typeof bpjsPayments.$inferInsert
export type ProactiveMessage = typeof proactiveMessages.$inferSelect
export type NewProactiveMessage = typeof proactiveMessages.$inferInsert

// Settings Types
export type AppSetting = typeof appSettings.$inferSelect
export type NewAppSetting = typeof appSettings.$inferInsert