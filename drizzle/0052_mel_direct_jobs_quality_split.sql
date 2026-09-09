ALTER TYPE "mel_job_type" ADD VALUE IF NOT EXISTS 'direct_quality';
ALTER TYPE "mel_job_type" ADD VALUE IF NOT EXISTS 'direct_non_quality';
UPDATE "mel_monitoring_jobs" SET "job_type" = 'direct_quality' WHERE "job_type" = 'direct';
