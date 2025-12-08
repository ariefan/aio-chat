import {
  sqliteTable,
  text,
  integer,
  real,
  blob,
} from 'drizzle-orm/sqlite-core'

// Create a base table function for consistent table creation
const createTable = (name: string) => sqliteTable(`aio_chat_${name}`, {})

// SQLite equivalent of enums (using text with check constraints)
// We'll use text fields with validation at the application level

// Users table
export const users = sqliteTable('aio_chat_users', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  platformId: text('platform_id').notNull(),
  platform: text('platform').notNull(), // 'whatsapp', 'telegram'
  platformUsername: text('platform_username'),
  platformFullName: text('platform_full_name'),
  platformProfilePicture: text('platform_profile_picture'),
  platformVerificationCode: text('platform_verification_code'),
  isPlatformVerified: integer('is_platform_verified', { mode: 'boolean' }).default(false),
  status: text('status').notNull().default('pending'), // 'pending', 'verified', 'active', 'inactive'
  metadata: text('metadata'), // JSON string for flexibility
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  updatedAt: text('updated_at').notNull().default(new Date().toISOString()),
})

// Operators table
export const operators = sqliteTable('aio_chat_operators', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('operator'), // 'admin', 'operator'
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  updatedAt: text('updated_at').notNull().default(new Date().toISOString()),
})

// Conversations table
export const conversations = sqliteTable('aio_chat_conversations', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  platform: text('platform').notNull(),
  status: text('status').notNull().default('active'), // 'active', 'closed', 'archived'
  assignedOperatorId: integer('assigned_operator_id').references(() => operators.id),
  metadata: text('metadata'), // JSON string
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  updatedAt: text('updated_at').notNull().default(new Date().toISOString()),
})

// Messages table
export const messages = sqliteTable('aio_chat_messages', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  conversationId: integer('conversation_id').references(() => conversations.id).notNull(),
  platform: text('platform').notNull(),
  platformMessageId: text('platform_message_id').unique(),
  direction: text('direction').notNull(), // 'inbound', 'outbound'
  content: text('content').notNull(),
  messageType: text('message_type').notNull().default('text'), // 'text', 'image', 'audio', 'video', 'document'
  status: text('status').notNull().default('sent'), // 'sent', 'delivered', 'read', 'failed'
  metadata: text('metadata'), // JSON string for media info, reactions, etc.
  sentAt: text('sent_at').notNull().default(new Date().toISOString()),
  deliveredAt: text('delivered_at'),
  readAt: text('read_at'),
  failedAt: text('failed_at'),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  updatedAt: text('updated_at').notNull().default(new Date().toISOString()),
})

// Automation Rules table
export const automationRules = sqliteTable('aio_chat_automation_rules', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  triggerType: text('trigger_type').notNull(), // 'keyword', 'time_based', 'message_count', etc.
  triggerConditions: text('trigger_conditions').notNull(), // JSON string
  actions: text('actions').notNull(), // JSON array of actions
  priority: integer('priority').default(0),
  cooldownMinutes: integer('cooldown_minutes').default(0),
  maxExecutions: integer('max_executions'),
  executionCount: integer('execution_count').default(0),
  lastExecutedAt: text('last_executed_at'),
  createdBy: integer('created_by').references(() => operators.id).notNull(),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  updatedAt: text('updated_at').notNull().default(new Date().toISOString()),
})

// Knowledge Documents table
export const knowledgeDocuments = sqliteTable('aio_chat_knowledge_documents', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  type: text('type').notNull().default('general'), // 'faq', 'policy', 'manual', 'procedure', 'general'
  status: text('status').notNull().default('draft'), // 'draft', 'published', 'archived'
  category: text('category'),
  tags: text('tags'), // JSON array
  metadata: text('metadata'), // JSON string for additional info
  version: integer('version').default(1),
  embeddingModel: text('embedding_model'),
  isIndexed: integer('is_indexed', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  updatedAt: text('updated_at').notNull().default(new Date().toISOString()),
})

// Document Embeddings table
export const documentEmbeddings = sqliteTable('aio_chat_document_embeddings', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  documentId: integer('document_id').references(() => knowledgeDocuments.id).notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  chunkText: text('chunk_text').notNull(),
  embedding: blob('embedding').notNull(), // Float32Array as blob
  embeddingModel: text('embedding_model').notNull(),
  tokenCount: integer('token_count'),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
})

// AI Chat Sessions table
export const aiChatSessions = sqliteTable('aio_chat_ai_chat_sessions', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  sessionId: text('session_id').notNull().unique(),
  context: text('context'), // JSON string for conversation context
  summary: text('summary'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  metadata: text('metadata'), // JSON string
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  updatedAt: text('updated_at').notNull().default(new Date().toISOString()),
})

// AI Messages table
export const aiMessages = sqliteTable('aio_chat_ai_messages', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id').references(() => aiChatSessions.id).notNull(),
  messageIndex: integer('message_index').notNull(),
  role: text('role').notNull(), // 'user', 'assistant', 'system'
  content: text('content').notNull(),
  model: text('model'),
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  totalTokens: integer('total_tokens'),
  contextDocuments: text('context_documents'), // JSON array of document IDs used
  feedbackRating: integer('feedback_rating'), // 1-5 rating
  feedbackComment: text('feedback_comment'),
  metadata: text('metadata'), // JSON string
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
})

// RAG Search Logs table
export const ragSearchLogs = sqliteTable('aio_chat_rag_search_logs', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  query: text('query').notNull(),
  embedding: blob('embedding'),
  results: text('results').notNull(), // JSON array of search results
  responseTime: integer('response_time'), // milliseconds
  embeddingModel: text('embedding_model'),
  searchThreshold: real('search_threshold'),
  maxResults: integer('max_results'),
  contextUsed: integer('context_used', { mode: 'boolean' }).default(false),
  feedbackRating: integer('feedback_rating'), // 1-5 rating
  metadata: text('metadata'), // JSON string
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
})

// Automation Executions table
export const automationExecutions = sqliteTable('aio_chat_automation_executions', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  ruleId: integer('rule_id').references(() => automationRules.id).notNull(),
  triggerType: text('trigger_type').notNull(),
  triggerData: text('trigger_data'), // JSON string
  actions: text('actions').notNull(), // JSON array of executed actions
  status: text('status').notNull().default('pending'), // 'pending', 'executing', 'completed', 'failed'
  errorMessage: text('error_message'),
  executionTime: integer('execution_time'), // milliseconds
  result: text('result'), // JSON string of execution results
  metadata: text('metadata'), // JSON string
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  updatedAt: text('updated_at').notNull().default(new Date().toISOString()),
})

// Automation Schedules table
export const automationSchedules = sqliteTable('aio_chat_automation_schedules', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  ruleId: integer('rule_id').references(() => automationRules.id).notNull(),
  cronExpression: text('cron_expression').notNull(),
  timezone: text('timezone').default('UTC'),
  lastRunAt: text('last_run_at'),
  nextRunAt: text('next_run_at').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  runCount: integer('run_count').default(0),
  metadata: text('metadata'), // JSON string
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  updatedAt: text('updated_at').notNull().default(new Date().toISOString()),
})

// Export types for TypeScript
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Operator = typeof operators.$inferSelect
export type NewOperator = typeof operators.$inferInsert
export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
export type AutomationRule = typeof automationRules.$inferSelect
export type NewAutomationRule = typeof automationRules.$inferInsert
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
export type AutomationExecution = typeof automationExecutions.$inferSelect
export type NewAutomationExecution = typeof automationExecutions.$inferInsert
export type AutomationSchedule = typeof automationSchedules.$inferSelect
export type NewAutomationSchedule = typeof automationSchedules.$inferInsert