# MEL Security and Privacy Review

## Implemented controls

- Server-side MEL role checks on configuration, imports, reporting, GIS, exports, and rollout operations.
- Self-approval prevention for monitoring and imported instrument submissions.
- High-entropy integration secrets stored only as SHA-256 hashes and compared with constant-time equality.
- Import and export rate limits stored in PostgreSQL for multi-instance consistency.
- Import payload size limit, explicit field allow-list, duplicate protection, validation, quarantine, and audit events.
- Export spreadsheet-formula neutralization for values beginning with `=`, `+`, `-`, or `@`.
- GIS precision reduction, server-side authorization, and audited geographic exports.
- Operational-log redaction for names, emails, phones, identity fields, tokens, secrets, answers, files, and URLs.
- Evidence file type, count, and size controls inherited from the UploadThing MEL route.
- Published instrument immutability and audit history.

## Threat review

| Threat | Control | Residual action |
|---|---|---|
| Horizontal enterprise access | Role and assignment checks | Run authorization penetration fixtures in staging |
| Reviewer privilege escalation | Manager/reviewer gates and self-approval prevention | Review production role assignments |
| Evidence URL leakage | Authorized repository and reduced export fields | Confirm provider signed-link/retention capability |
| Malicious uploads | Allow-listed MIME types and size/count limits | Complete malware-scanning decision |
| Duplicate webhooks | Provider/connection/external-ID idempotency key | Monitor duplicate rate |
| Spreadsheet injection | Cell neutralization before CSV/XLSX generation | Include adversarial export test in releases |
| Geographic export misuse | Authorization, rounded coordinates, audit event | Review geographic export logs |

## Required external evidence

Dependency vulnerability review, production secret-store configuration, database-access review, evidence-provider recovery test, retention/deletion approval, and staging penetration checks remain operational gates. Critical/high findings must be resolved before programme rollout.
