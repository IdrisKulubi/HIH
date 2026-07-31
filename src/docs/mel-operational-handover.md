# MEL Operational and Training Handbook

## Collector guide

Use Quarterly Monitoring only when collection is enabled for the current rollout stage. Save drafts frequently, attach evidence to the matching question, resolve the on-screen validation summary, then submit. Returned reports remain editable and retain prior versions. Never share evidence links outside authorized programme channels.

## REDO reviewer guide

Work from the MEL Review Queue. Review DQA findings, evidence, financial consistency, job disaggregation, and prior-period comparisons. Return a report with specific affected sections and a correction reason. Advancing confirms REDO review only; it does not constitute final MEL approval.

## MEL approval and DQA guide

Resolve DQA errors before approval. Warnings require evidence or an accepted reason. Confirm evidence review status and lineage, then approve or return. Reopening an approved report immediately removes it from trusted ITT calculations until reapproval.

## Instrument administrator guide

Create a draft instrument, add ordered sections and questions, configure conditional visibility and validation, map compatible indicators, then use Validate and Publish. Published definitions are immutable. Create the next version for any change. Retire versions only with a recorded reason.

## Import troubleshooting

Connections use a one-time high-entropy webhook secret; only its hash is stored. Each mapping is versioned. Duplicate external IDs return the existing record. Missing enterprises, periods, required answers, or invalid mappings enter quarantine. Correct the mapping/source and retry; promote validated records to review. Imports are never auto-approved.

## Backup and restore runbook

- Owner: production platform owner, with a named deputy.
- Target RPO: confirm with programme governance before rollout.
- Target RTO: confirm with programme governance before rollout.
- Back up the PostgreSQL database and evidence-provider metadata according to the approved retention policy.
- Restore into an isolated non-production environment.
- Verify row counts, MEL migrations, representative evidence references, login, collection, review, ITT recalculation, and exports.
- Record date, backup identifier, restore duration, tester, discrepancies, and sign-off in the `backup_restore` operational gate.
- A scheduled backup is not considered verified until this restore exercise passes.

## Incident and support runbook

Triage critical events immediately: authorization spikes, evidence exposure, data loss, corrupted calculations, or unavailable collection. Preserve correlation IDs, disable the affected rollout feature, record the rollback reason, notify the incident owner, and avoid placing answers or file contents in logs or tickets. Re-enable only after corrective evidence and owner approval.

## Release and rollback

1. Confirm migrations 0033–0037 and a restorable backup.
2. Run type, lint, MEL phase tests, reconciliation, security, accessibility, and load checks.
3. Enable reporting, then pilot collection/imports for selected counties.
4. Monitor events, queue age, completion, error rates, and dashboard latency.
5. Roll back feature flags first. Roll back application deployment only when data compatibility is confirmed.
6. Never drop legacy tables during the rollback window.

## Service monitoring

Review unresolved error/critical events, failed imports/exports, queue age, missed deadlines, and slow reporting queries daily during pilot and stabilization. Logs contain correlation identifiers and redacted metadata only. Escalation owners and service-level targets must be entered before programme rollout.
