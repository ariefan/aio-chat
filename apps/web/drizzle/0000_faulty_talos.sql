CREATE TYPE "public"."automation_action_type" AS ENUM('send_message', 'assign_to_operator', 'change_user_status', 'change_conversation_status', 'add_tag', 'send_email', 'create_task', 'escalate', 'webhook', 'ai_response', 'delay');--> statement-breakpoint
CREATE TYPE "public"."automation_status" AS ENUM('draft', 'active', 'paused', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."automation_trigger_type" AS ENUM('keyword', 'time_based', 'message_count', 'user_status', 'conversation_inactive', 'escalation', 'custom_event');--> statement-breakpoint
CREATE TYPE "public"."conversation_status" AS ENUM('active', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('faq', 'policy', 'manual', 'procedure', 'general');--> statement-breakpoint
CREATE TYPE "public"."embedding_model" AS ENUM('text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('sent', 'delivered', 'read', 'failed');--> statement-breakpoint
CREATE TYPE "public"."operator_role" AS ENUM('admin', 'operator');--> statement-breakpoint
CREATE TYPE "public"."platform_type" AS ENUM('whatsapp', 'telegram');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('pending', 'verified', 'active', 'inactive');--> statement-breakpoint
CREATE TABLE "aio_chat_accounts" (
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(50),
	"scope" varchar(255),
	"id_token" text,
	"session_state" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "aio_chat_ai_chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform_type" "platform_type" NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"title" varchar(500),
	"context" jsonb,
	"metadata" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"last_message_at" timestamp DEFAULT now(),
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "aio_chat_ai_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"token_count" integer,
	"model_used" varchar(100),
	"metadata" jsonb,
	"retrieved_documents" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aio_chat_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100),
	"entity_id" uuid,
	"old_values" jsonb,
	"new_values" jsonb,
	"metadata" jsonb,
	"ip" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aio_chat_automation_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid NOT NULL,
	"trigger_type" "automation_trigger_type" NOT NULL,
	"trigger_data" jsonb NOT NULL,
	"executed_actions" jsonb NOT NULL,
	"results" jsonb,
	"status" varchar(50) NOT NULL,
	"error_message" text,
	"execution_time" integer,
	"user_id" uuid,
	"conversation_id" uuid,
	"message_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aio_chat_automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" "automation_status" DEFAULT 'draft',
	"trigger_type" "automation_trigger_type" NOT NULL,
	"trigger_config" jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"conditions" jsonb,
	"priority" integer DEFAULT 0,
	"max_executions" integer,
	"execution_count" integer DEFAULT 0,
	"last_executed_at" timestamp,
	"cooldown_minutes" integer DEFAULT 0,
	"tags" varchar(500),
	"metadata" jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "aio_chat_automation_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid NOT NULL,
	"schedule_type" varchar(50) NOT NULL,
	"schedule_expression" varchar(255) NOT NULL,
	"timezone" varchar(50) DEFAULT 'UTC',
	"next_run_at" timestamp,
	"last_run_at" timestamp,
	"is_active" boolean DEFAULT true,
	"run_count" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "aio_chat_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"assigned_operator_id" uuid,
	"status" "conversation_status" DEFAULT 'active',
	"metadata" jsonb,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "aio_chat_document_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"chunk_text" text NOT NULL,
	"embedding_model" "embedding_model" DEFAULT 'text-embedding-3-small',
	"embedding" jsonb NOT NULL,
	"token_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aio_chat_knowledge_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"document_type" "document_type" DEFAULT 'general',
	"document_status" "document_status" DEFAULT 'draft',
	"category" varchar(100),
	"tags" varchar(1000),
	"metadata" jsonb,
	"created_by" uuid,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "aio_chat_message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"content" text NOT NULL,
	"variables" jsonb,
	"category" varchar(100),
	"language" varchar(10) DEFAULT 'en',
	"is_active" boolean DEFAULT true,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "aio_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"platform_id" varchar(255),
	"direction" "message_direction" NOT NULL,
	"content" text NOT NULL,
	"message_type" varchar(50) DEFAULT 'text',
	"status" "message_status" DEFAULT 'sent',
	"metadata" jsonb,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aio_chat_operators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "operator_role" DEFAULT 'operator',
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "aio_chat_operators_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "aio_chat_rag_search_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"query" text NOT NULL,
	"search_results" jsonb NOT NULL,
	"retrieved_document_ids" jsonb,
	"relevance_score" jsonb,
	"response_generated" boolean DEFAULT false,
	"user_feedback" integer,
	"processing_time" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aio_chat_scheduled_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"content" text NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "aio_chat_sessions" (
	"session_token" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aio_chat_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform_id" varchar(255) NOT NULL,
	"platform_type" "platform_type" NOT NULL,
	"user_status" "user_status" DEFAULT 'pending',
	"phone" varchar(20),
	"email" varchar(255),
	"name" varchar(255),
	"metadata" jsonb,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "aio_chat_verification_tokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) PRIMARY KEY NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aio_chat_accounts" ADD CONSTRAINT "aio_chat_accounts_user_id_aio_chat_operators_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aio_chat_operators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_ai_chat_sessions" ADD CONSTRAINT "aio_chat_ai_chat_sessions_user_id_aio_chat_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aio_chat_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_ai_messages" ADD CONSTRAINT "aio_chat_ai_messages_session_id_aio_chat_ai_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."aio_chat_ai_chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_audit_logs" ADD CONSTRAINT "aio_chat_audit_logs_operator_id_aio_chat_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."aio_chat_operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_automation_executions" ADD CONSTRAINT "aio_chat_automation_executions_rule_id_aio_chat_automation_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."aio_chat_automation_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_automation_executions" ADD CONSTRAINT "aio_chat_automation_executions_user_id_aio_chat_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aio_chat_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_automation_executions" ADD CONSTRAINT "aio_chat_automation_executions_conversation_id_aio_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."aio_chat_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_automation_executions" ADD CONSTRAINT "aio_chat_automation_executions_message_id_aio_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."aio_chat_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_automation_rules" ADD CONSTRAINT "aio_chat_automation_rules_created_by_aio_chat_operators_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."aio_chat_operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_automation_schedules" ADD CONSTRAINT "aio_chat_automation_schedules_rule_id_aio_chat_automation_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."aio_chat_automation_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_conversations" ADD CONSTRAINT "aio_chat_conversations_user_id_aio_chat_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aio_chat_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_conversations" ADD CONSTRAINT "aio_chat_conversations_assigned_operator_id_aio_chat_operators_id_fk" FOREIGN KEY ("assigned_operator_id") REFERENCES "public"."aio_chat_operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_document_embeddings" ADD CONSTRAINT "aio_chat_document_embeddings_document_id_aio_chat_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."aio_chat_knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_knowledge_documents" ADD CONSTRAINT "aio_chat_knowledge_documents_created_by_aio_chat_operators_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."aio_chat_operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_message_templates" ADD CONSTRAINT "aio_chat_message_templates_created_by_aio_chat_operators_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."aio_chat_operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_messages" ADD CONSTRAINT "aio_chat_messages_conversation_id_aio_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."aio_chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_rag_search_logs" ADD CONSTRAINT "aio_chat_rag_search_logs_session_id_aio_chat_ai_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."aio_chat_ai_chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_scheduled_messages" ADD CONSTRAINT "aio_chat_scheduled_messages_conversation_id_aio_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."aio_chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_sessions" ADD CONSTRAINT "aio_chat_sessions_user_id_aio_chat_operators_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aio_chat_operators"("id") ON DELETE cascade ON UPDATE no action;