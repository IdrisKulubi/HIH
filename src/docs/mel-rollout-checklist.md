# MEL Rollout and Acceptance Checklist

## Internal test

- Apply migrations 0033–0037 to an isolated environment.
- Seed representative enterprises, periods, indicators, targets, reports, evidence, and imports.
- Complete ITT reconciliation, security review, internal UAT, regression tests, and defect triage.

## Pilot

- Record passed internal gates and select pilot counties in MEL Operations.
- Train pilot collectors, REDO reviewers, and MEL approvers.
- Enable only the required collection/import/reporting flags.
- Review completion, queue age, DQA issues, import quarantine, events, and support tickets daily.

## Programme rollout

- Record a successful non-production restore test.
- Close pilot acceptance and training gates.
- Confirm support contacts, escalation owner, rollback readiness, and legacy compatibility.
- Enable authorized users and monitor expected-scale performance.

## Stabilization and handover

- Run the enhanced monitoring window for the agreed duration.
- Close critical/high defects and tune slow paths.
- Complete accessibility/load gates and operational-owner runbook acceptance.
- Record stabilization evidence, then advance the rollout stage to complete.

Legacy tables and routes remain intact until migration reconciliation, rollback windows, and formal sign-off are complete.
