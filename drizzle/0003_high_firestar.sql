ALTER TABLE "feedback_campaigns" ADD COLUMN "name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback_campaigns" ADD COLUMN "subject" varchar(255);--> statement-breakpoint
ALTER TABLE "feedback_campaigns" ADD COLUMN "email_body" text;--> statement-breakpoint
ALTER TABLE "feedback_campaigns" ADD COLUMN "feedback_form_url" varchar(500);--> statement-breakpoint
ALTER TABLE "feedback_campaigns" ADD COLUMN "link_display_text" varchar(255);--> statement-breakpoint
ALTER TABLE "feedback_campaigns" ADD COLUMN "batch_size" integer DEFAULT 50;--> statement-breakpoint
ALTER TABLE "feedback_campaigns" ADD COLUMN "total_recipients" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "feedback_campaigns" ADD COLUMN "sent_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "feedback_campaigns" ADD COLUMN "failed_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "feedback_campaigns" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
ALTER TABLE "feedback_campaigns" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "feedback_emails" ADD COLUMN "recipient_email" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback_emails" ADD COLUMN "recipient_name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback_emails" ADD COLUMN "batch_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback_emails" ADD COLUMN "failed_at" timestamp;--> statement-breakpoint
ALTER TABLE "feedback_emails" ADD COLUMN "retry_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "feedback_campaigns" DROP COLUMN "title";