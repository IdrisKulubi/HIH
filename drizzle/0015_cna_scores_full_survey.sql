CREATE TABLE "cna_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"diagnostic_id" integer NOT NULL,
	"focus_code" "cdp_focus_code" NOT NULL,
	"score0to10" integer NOT NULL,
	"gap_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cna_scores_diagnostic_id_focus_code_unique" UNIQUE("diagnostic_id","focus_code")
);
--> statement-breakpoint
ALTER TABLE "cna_scores" ADD CONSTRAINT "cna_scores_diagnostic_id_cna_diagnostics_id_fk" FOREIGN KEY ("diagnostic_id") REFERENCES "public"."cna_diagnostics"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "cna_scores_diagnostic_id_idx" ON "cna_scores" USING btree ("diagnostic_id");
--> statement-breakpoint
ALTER TABLE "cna_diagnostics" ALTER COLUMN "financial_management_score" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "cna_diagnostics" ALTER COLUMN "market_reach_score" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "cna_diagnostics" ALTER COLUMN "operations_score" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "cna_diagnostics" ALTER COLUMN "compliance_score" DROP NOT NULL;
