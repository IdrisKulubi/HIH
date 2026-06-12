CREATE TABLE "a2f_pre_screening_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"attempt_id" integer NOT NULL,
	"previous_outcome" varchar(20) NOT NULL,
	"new_outcome" varchar(20) NOT NULL,
	"reason" text NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "a2f_pre_screening_overrides" ADD CONSTRAINT "a2f_pre_screening_overrides_attempt_id_a2f_pre_screening_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."a2f_pre_screening_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "a2f_pre_screening_overrides" ADD CONSTRAINT "a2f_pre_screening_overrides_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "a2f_pre_screening_overrides_attempt_id_idx" ON "a2f_pre_screening_overrides" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "a2f_pre_screening_overrides_created_by_id_idx" ON "a2f_pre_screening_overrides" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "a2f_pre_screening_overrides_created_at_idx" ON "a2f_pre_screening_overrides" USING btree ("created_at");
