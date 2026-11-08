-- Record one-time results from reports that were approved before every
-- questionnaire item had an ITT indicator mapping. Only results supported by
-- verified direct or reused evidence qualify as approved achievements.
WITH achieved_responses AS (
  SELECT
    submission."business_id",
    submission."id" AS "submission_id",
    submission."reporting_period_id",
    submission."approved_by_id",
    submission."approved_at",
    period."end_date" AS "period_end_date",
    question."question_code",
    question."indicator_code"
  FROM "mel_monitoring_submissions" submission
  INNER JOIN "mel_monitoring_responses" response
    ON response."submission_id" = submission."id"
  INNER JOIN "mel_reporting_periods" period
    ON period."id" = submission."reporting_period_id"
  CROSS JOIN LATERAL (
    VALUES
      ('business_plan_improved', 'OP1.2-IMPROVED-BUSINESS-PLANS', response."business_plan_improved"),
      ('market_research_completed', 'OP2.2-MARKET-RESEARCH', response."market_research_completed"),
      ('technology_adopted', 'OP1.2-TECHNOLOGY-ADOPTION', response."technology_adopted"),
      ('linked_to_finance_provider', 'OP2.1-FINANCIAL-LINKAGES', response."linked_to_finance_provider"),
      ('financial_plan_completed', 'OP2.1-FINANCIAL-PLANS', response."financial_plan_completed"),
      ('investor_readiness_completed', 'OP2.1-INVESTOR-READINESS', response."investor_readiness_completed"),
      ('life_cycle_assessment_completed', 'OP3.1-LIFE-CYCLE-ASSESSMENTS', response."life_cycle_assessment_completed"),
      ('eco_certification_active', 'OP3.1-ECO-CERTIFICATION', response."eco_certification_active"),
      ('esg_report_completed', 'OP3.1-ESG-REPORTS', response."esg_report_completed"),
      ('social_safeguarding_guidelines', 'OP3.2-SOCIAL-SAFEGUARDS', response."social_safeguarding_guidelines")
  ) AS question("question_code", "indicator_code", "achieved")
  WHERE submission."status" = 'approved'
    AND question."achieved" IS TRUE
), supported_achievements AS (
  SELECT
    achieved.*,
    COALESCE(
      (
        SELECT evidence."id"
        FROM "mel_monitoring_evidence" evidence
        WHERE evidence."submission_id" = achieved."submission_id"
          AND evidence."question_code" = achieved."question_code"
          AND evidence."status" = 'active'
          AND EXISTS (
            SELECT 1
            FROM "mel_evidence_reviews" review
            WHERE review."evidence_id" = evidence."id"
              AND review."status" = 'verified'
          )
        ORDER BY evidence."created_at", evidence."id"
        LIMIT 1
      ),
      (
        SELECT reference."source_evidence_id"
        FROM "mel_monitoring_evidence_references" reference
        WHERE reference."submission_id" = achieved."submission_id"
          AND reference."question_code" = achieved."question_code"
          AND EXISTS (
            SELECT 1
            FROM "mel_evidence_reviews" review
            WHERE review."evidence_id" = reference."source_evidence_id"
              AND review."status" = 'verified'
          )
        ORDER BY reference."created_at", reference."id"
        LIMIT 1
      )
    ) AS "evidence_id"
  FROM achieved_responses achieved
), earliest_supported_achievements AS (
  SELECT
    supported.*,
    ROW_NUMBER() OVER (
      PARTITION BY supported."business_id", supported."indicator_code"
      ORDER BY supported."period_end_date", supported."submission_id"
    ) AS "achievement_order"
  FROM supported_achievements supported
  WHERE supported."evidence_id" IS NOT NULL
)
INSERT INTO "mel_enterprise_achievements" (
  "business_id",
  "indicator_id",
  "first_submission_id",
  "evidence_id",
  "status",
  "approved_period_id",
  "approved_by_id",
  "approved_at",
  "created_at",
  "updated_at"
)
SELECT
  achieved."business_id",
  indicator."id",
  achieved."submission_id",
  achieved."evidence_id",
  'approved',
  achieved."reporting_period_id",
  achieved."approved_by_id",
  COALESCE(achieved."approved_at", NOW()),
  NOW(),
  NOW()
FROM earliest_supported_achievements achieved
INNER JOIN "mel_indicator_definitions" indicator
  ON indicator."code" = achieved."indicator_code"
WHERE achieved."achievement_order" = 1
ON CONFLICT ("business_id", "indicator_id") DO NOTHING;
