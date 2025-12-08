CREATE TYPE "public"."bpjs_debt_status" AS ENUM('active', 'partial', 'paid', 'overdue', 'written_off');--> statement-breakpoint
CREATE TYPE "public"."bpjs_member_status" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TABLE "aio_chat_bpjs_debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"period_month" integer NOT NULL,
	"period_year" integer NOT NULL,
	"amount" integer NOT NULL,
	"due_date" timestamp NOT NULL,
	"paid_amount" integer DEFAULT 0,
	"paid_at" timestamp,
	"status" "bpjs_debt_status" DEFAULT 'active',
	"late_fee" integer DEFAULT 0,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "aio_chat_bpjs_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bpjs_id" varchar(20) NOT NULL,
	"user_id" uuid,
	"name" varchar(255) NOT NULL,
	"nik" varchar(20) NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"address" text,
	"member_class" varchar(10) DEFAULT '3',
	"status" "bpjs_member_status" DEFAULT 'active',
	"registered_at" timestamp,
	"metadata" jsonb,
	"total_arrears" integer DEFAULT 0,
	"arrears_months" integer DEFAULT 0,
	"last_payment_date" timestamp,
	"last_payment_method" varchar(50),
	"last_claim_date" timestamp,
	"last_claim_type" varchar(50),
	"last_claim_diagnosis" varchar(255),
	"last_claim_hospital" varchar(255),
	"last_claim_amount" integer,
	"last_contact_agent" varchar(100),
	"last_contact_date" timestamp,
	"last_contact_channel" varchar(50),
	"last_contact_outcome" varchar(100),
	"arrears_reason" text,
	"credibility_score" real DEFAULT 0.5,
	"last_promise_date" timestamp,
	"last_promise_status" varchar(50),
	"last_promise_days_overdue" integer,
	"strategy_approach" varchar(255),
	"strategy_urgency" varchar(50),
	"strategy_tone" varchar(50),
	"occupation" varchar(100),
	"dependents" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "aio_chat_bpjs_members_bpjs_id_unique" UNIQUE("bpjs_id")
);
--> statement-breakpoint
CREATE TABLE "aio_chat_bpjs_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debt_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"payment_method" varchar(50),
	"payment_ref" varchar(100),
	"status" varchar(20) DEFAULT 'pending',
	"paid_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aio_chat_proactive_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"user_id" uuid,
	"message_type" varchar(50) NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"sent_at" timestamp,
	"content" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"retry_count" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aio_chat_bpjs_debts" ADD CONSTRAINT "aio_chat_bpjs_debts_member_id_aio_chat_bpjs_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."aio_chat_bpjs_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_bpjs_members" ADD CONSTRAINT "aio_chat_bpjs_members_user_id_aio_chat_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aio_chat_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_bpjs_payments" ADD CONSTRAINT "aio_chat_bpjs_payments_debt_id_aio_chat_bpjs_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."aio_chat_bpjs_debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_bpjs_payments" ADD CONSTRAINT "aio_chat_bpjs_payments_member_id_aio_chat_bpjs_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."aio_chat_bpjs_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_proactive_messages" ADD CONSTRAINT "aio_chat_proactive_messages_member_id_aio_chat_bpjs_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."aio_chat_bpjs_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aio_chat_proactive_messages" ADD CONSTRAINT "aio_chat_proactive_messages_user_id_aio_chat_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."aio_chat_users"("id") ON DELETE cascade ON UPDATE no action;