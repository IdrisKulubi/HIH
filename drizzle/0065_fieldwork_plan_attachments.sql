CREATE TABLE IF NOT EXISTS "fieldwork_plan_attachments" (
  "id" serial PRIMARY KEY NOT NULL,
  "plan_id" integer NOT NULL,
  "url" text NOT NULL,
  "file_key" varchar(255),
  "file_name" varchar(255) NOT NULL,
  "file_type" varchar(120),
  "file_size" integer,
  "uploaded_by_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "fieldwork_plan_attachments" ADD CONSTRAINT "fieldwork_plan_attachments_plan_id_fieldwork_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."fieldwork_plans"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "fieldwork_plan_attachments" ADD CONSTRAINT "fieldwork_plan_attachments_uploaded_by_id_user_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."user"("id") ON DELETE set null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fieldwork_plan_attachments_plan_idx" ON "fieldwork_plan_attachments" USING btree ("plan_id");
