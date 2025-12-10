CREATE TABLE "scoring_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_scores" ADD COLUMN "config_id" integer;--> statement-breakpoint
ALTER TABLE "scoring_criteria" ADD COLUMN "config_id" integer;--> statement-breakpoint
ALTER TABLE "application_scores" ADD CONSTRAINT "application_scores_config_id_scoring_configurations_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."scoring_configurations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scoring_criteria" ADD CONSTRAINT "scoring_criteria_config_id_scoring_configurations_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."scoring_configurations"("id") ON DELETE cascade ON UPDATE no action;