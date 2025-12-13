CREATE TABLE "due_diligence_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_id" integer NOT NULL,
	"phase" text NOT NULL,
	"category" text NOT NULL,
	"criterion" text NOT NULL,
	"score" integer DEFAULT 0,
	"comments" text
);
--> statement-breakpoint
CREATE TABLE "due_diligence_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"phase1_score" integer DEFAULT 0,
	"phase1_status" text DEFAULT 'pending',
	"phase1_notes" text,
	"phase2_score" integer DEFAULT 0,
	"phase2_status" text DEFAULT 'pending',
	"phase2_notes" text,
	"reviewer_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "due_diligence_items" ADD CONSTRAINT "due_diligence_items_record_id_due_diligence_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."due_diligence_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "due_diligence_records" ADD CONSTRAINT "due_diligence_records_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;