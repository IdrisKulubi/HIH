CREATE TABLE "support_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"responder_id" text NOT NULL,
	"responder_name" text NOT NULL,
	"responder_role" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"attachment_url" varchar(500),
	"is_internal" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applicants" ADD COLUMN "dob" date NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "average_annual_revenue_growth" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "projected_inclusion" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "scalability_plan" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "market_scale_potential" text;--> statement-breakpoint
ALTER TABLE "support_responses" ADD CONSTRAINT "support_responses_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_responses" ADD CONSTRAINT "support_responses_responder_id_user_id_fk" FOREIGN KEY ("responder_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_responses_ticket_id_idx" ON "support_responses" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "support_responses_responder_id_idx" ON "support_responses" USING btree ("responder_id");--> statement-breakpoint
CREATE INDEX "support_responses_created_at_idx" ON "support_responses" USING btree ("created_at");