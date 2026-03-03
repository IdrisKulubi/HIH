CREATE TYPE "public"."a2f_agreement_type" AS ENUM('matching', 'repayable', 'working_capital');--> statement-breakpoint
CREATE TYPE "public"."a2f_dd_stage" AS ENUM('initial', 'pre_ic', 'post_ta');--> statement-breakpoint
CREATE TYPE "public"."a2f_document_type" AS ENUM('gair', 'investment_memo');--> statement-breakpoint
CREATE TYPE "public"."a2f_instrument_type" AS ENUM('matching_grant', 'repayable_grant');--> statement-breakpoint
CREATE TYPE "public"."a2f_pipeline_status" AS ENUM('a2f_pipeline', 'due_diligence_initial', 'pre_ic_scoring', 'ic_appraisal_review', 'offer_issued', 'contracting', 'disbursement_active', 'post_ta_monitoring');--> statement-breakpoint
CREATE TYPE "public"."a2f_transaction_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."a2f_transaction_type" AS ENUM('disbursement', 'repayment');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'oversight';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'a2f_officer';--> statement-breakpoint
CREATE TABLE "a2f_due_diligence_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"a2f_id" integer NOT NULL,
	"stage" "a2f_dd_stage" NOT NULL,
	"submitted_by_id" text,
	"company_overview" jsonb,
	"financial_dd" jsonb,
	"hr_and_risk" jsonb,
	"impact_esg" jsonb,
	"exit_strategy" text,
	"management_team" jsonb,
	"legal_compliance" jsonb,
	"market_position" jsonb,
	"operational_capacity" jsonb,
	"technology_systems" jsonb,
	"customer_supplier_relations" jsonb,
	"is_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "a2f_pipeline" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"instrument_type" "a2f_instrument_type" NOT NULL,
	"requested_amount" numeric(14, 2) NOT NULL,
	"status" "a2f_pipeline_status" DEFAULT 'a2f_pipeline' NOT NULL,
	"a2f_officer_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "a2f_scoring" (
	"id" serial PRIMARY KEY NOT NULL,
	"a2f_id" integer NOT NULL,
	"scorer_id" text NOT NULL,
	"instrument_type" "a2f_instrument_type" NOT NULL,
	"scores" jsonb NOT NULL,
	"total_score" integer DEFAULT 0 NOT NULL,
	"bonus_points" integer DEFAULT 0 NOT NULL,
	"scorer_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disbursements_and_repayments" (
	"id" serial PRIMARY KEY NOT NULL,
	"agreement_id" integer NOT NULL,
	"transaction_type" "a2f_transaction_type" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"transaction_date" timestamp NOT NULL,
	"proof_document_url" text,
	"status" "a2f_transaction_status" DEFAULT 'pending' NOT NULL,
	"verified_by_id" text,
	"verified_at" timestamp,
	"rejection_reason" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grant_agreements" (
	"id" serial PRIMARY KEY NOT NULL,
	"a2f_id" integer NOT NULL,
	"agreement_type" "a2f_agreement_type" NOT NULL,
	"total_project_amount" numeric(14, 2) NOT NULL,
	"hih_contribution" numeric(14, 2) NOT NULL,
	"enterprise_contribution" numeric(14, 2) DEFAULT '0',
	"term_months" integer DEFAULT 24,
	"interest_rate" numeric(5, 2) DEFAULT '6.0',
	"grace_period_months" integer DEFAULT 3,
	"offer_letter_url" text,
	"signed_document_url" text,
	"offer_sent_at" timestamp,
	"signed_at" timestamp,
	"is_fully_executed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_appraisals" (
	"id" serial PRIMARY KEY NOT NULL,
	"a2f_id" integer NOT NULL,
	"document_type" "a2f_document_type" NOT NULL,
	"content" jsonb NOT NULL,
	"ic_approval_status" boolean DEFAULT false NOT NULL,
	"approved_by" jsonb DEFAULT '[]'::jsonb,
	"generated_document_url" text,
	"prepared_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviewer_assignment_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"reviewer_id" text NOT NULL,
	"reviewer_role" "user_role" NOT NULL,
	"assignment_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_assigned_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback_emails" DROP CONSTRAINT "feedback_emails_recipient_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "feedback_emails" ALTER COLUMN "recipient_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "marked_for_revisit" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "revisit_marked_at" timestamp;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "revisit_marked_by" text;--> statement-breakpoint
ALTER TABLE "due_diligence_records" ADD COLUMN "final_verdict" text;--> statement-breakpoint
ALTER TABLE "due_diligence_records" ADD COLUMN "final_reason" text;--> statement-breakpoint
ALTER TABLE "due_diligence_records" ADD COLUMN "primary_reviewer_id" text;--> statement-breakpoint
ALTER TABLE "due_diligence_records" ADD COLUMN "primary_reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "due_diligence_records" ADD COLUMN "validator_reviewer_id" text;--> statement-breakpoint
ALTER TABLE "due_diligence_records" ADD COLUMN "validator_action" text;--> statement-breakpoint
ALTER TABLE "due_diligence_records" ADD COLUMN "validator_comments" text;--> statement-breakpoint
ALTER TABLE "due_diligence_records" ADD COLUMN "validator_action_at" timestamp;--> statement-breakpoint
ALTER TABLE "due_diligence_records" ADD COLUMN "dd_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "due_diligence_records" ADD COLUMN "approval_deadline" timestamp;--> statement-breakpoint
ALTER TABLE "due_diligence_records" ADD COLUMN "is_oversight_initiated" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "due_diligence_records" ADD COLUMN "oversight_justification" text;--> statement-breakpoint
ALTER TABLE "due_diligence_records" ADD COLUMN "oversight_admin_id" text;--> statement-breakpoint
ALTER TABLE "due_diligence_records" ADD COLUMN "oversight_flagged_at" timestamp;--> statement-breakpoint
ALTER TABLE "due_diligence_records" ADD COLUMN "score_disparity" integer;--> statement-breakpoint
ALTER TABLE "due_diligence_records" ADD COLUMN "admin_override_score" integer;--> statement-breakpoint
ALTER TABLE "due_diligence_records" ADD COLUMN "original_score" integer;--> statement-breakpoint
ALTER TABLE "due_diligence_records" ADD COLUMN "admin_override_reason" text;--> statement-breakpoint
ALTER TABLE "due_diligence_records" ADD COLUMN "admin_override_by_id" text;--> statement-breakpoint
ALTER TABLE "due_diligence_records" ADD COLUMN "admin_override_at" timestamp;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD COLUMN "system_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD COLUMN "assigned_reviewer1_id" text;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD COLUMN "assigned_reviewer1_at" timestamp;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD COLUMN "assigned_reviewer2_id" text;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD COLUMN "assigned_reviewer2_at" timestamp;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD COLUMN "admin_oversight_comment" text;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD COLUMN "qualifies_for_due_diligence" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD COLUMN "dd_recommended_by_oversight" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD COLUMN "score_disparity" integer;--> statement-breakpoint
ALTER TABLE "a2f_due_diligence_reports" ADD CONSTRAINT "a2f_due_diligence_reports_a2f_id_a2f_pipeline_id_fk" FOREIGN KEY ("a2f_id") REFERENCES "public"."a2f_pipeline"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "a2f_due_diligence_reports" ADD CONSTRAINT "a2f_due_diligence_reports_submitted_by_id_user_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "a2f_pipeline" ADD CONSTRAINT "a2f_pipeline_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "a2f_pipeline" ADD CONSTRAINT "a2f_pipeline_a2f_officer_id_user_id_fk" FOREIGN KEY ("a2f_officer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "a2f_scoring" ADD CONSTRAINT "a2f_scoring_a2f_id_a2f_pipeline_id_fk" FOREIGN KEY ("a2f_id") REFERENCES "public"."a2f_pipeline"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "a2f_scoring" ADD CONSTRAINT "a2f_scoring_scorer_id_user_id_fk" FOREIGN KEY ("scorer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursements_and_repayments" ADD CONSTRAINT "disbursements_and_repayments_agreement_id_grant_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."grant_agreements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursements_and_repayments" ADD CONSTRAINT "disbursements_and_repayments_verified_by_id_user_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grant_agreements" ADD CONSTRAINT "grant_agreements_a2f_id_a2f_pipeline_id_fk" FOREIGN KEY ("a2f_id") REFERENCES "public"."a2f_pipeline"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_appraisals" ADD CONSTRAINT "investment_appraisals_a2f_id_a2f_pipeline_id_fk" FOREIGN KEY ("a2f_id") REFERENCES "public"."a2f_pipeline"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_appraisals" ADD CONSTRAINT "investment_appraisals_prepared_by_id_user_id_fk" FOREIGN KEY ("prepared_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviewer_assignment_queue" ADD CONSTRAINT "reviewer_assignment_queue_reviewer_id_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "a2f_dd_reports_a2f_id_idx" ON "a2f_due_diligence_reports" USING btree ("a2f_id");--> statement-breakpoint
CREATE INDEX "a2f_dd_reports_stage_idx" ON "a2f_due_diligence_reports" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "a2f_pipeline_application_id_idx" ON "a2f_pipeline" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "a2f_pipeline_status_idx" ON "a2f_pipeline" USING btree ("status");--> statement-breakpoint
CREATE INDEX "a2f_pipeline_officer_id_idx" ON "a2f_pipeline" USING btree ("a2f_officer_id");--> statement-breakpoint
CREATE INDEX "a2f_scoring_a2f_id_idx" ON "a2f_scoring" USING btree ("a2f_id");--> statement-breakpoint
CREATE INDEX "a2f_scoring_scorer_id_idx" ON "a2f_scoring" USING btree ("scorer_id");--> statement-breakpoint
CREATE INDEX "disbursements_agreement_id_idx" ON "disbursements_and_repayments" USING btree ("agreement_id");--> statement-breakpoint
CREATE INDEX "disbursements_transaction_type_idx" ON "disbursements_and_repayments" USING btree ("transaction_type");--> statement-breakpoint
CREATE INDEX "disbursements_status_idx" ON "disbursements_and_repayments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "disbursements_transaction_date_idx" ON "disbursements_and_repayments" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "grant_agreements_a2f_id_idx" ON "grant_agreements" USING btree ("a2f_id");--> statement-breakpoint
CREATE INDEX "grant_agreements_agreement_type_idx" ON "grant_agreements" USING btree ("agreement_type");--> statement-breakpoint
CREATE INDEX "investment_appraisals_a2f_id_idx" ON "investment_appraisals" USING btree ("a2f_id");--> statement-breakpoint
CREATE INDEX "investment_appraisals_doc_type_idx" ON "investment_appraisals" USING btree ("document_type");--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_revisit_marked_by_user_id_fk" FOREIGN KEY ("revisit_marked_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD CONSTRAINT "eligibility_results_assigned_reviewer1_id_user_id_fk" FOREIGN KEY ("assigned_reviewer1_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD CONSTRAINT "eligibility_results_assigned_reviewer2_id_user_id_fk" FOREIGN KEY ("assigned_reviewer2_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_emails" ADD CONSTRAINT "feedback_emails_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;