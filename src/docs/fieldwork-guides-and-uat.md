# Fieldwork Module: Guides, UAT Script and Release Notes

## 1. Field staff guide (EDO / field officer)

**Plan visits** (Fieldwork, then New visit plan)
1. Give the plan a title. Search or filter the enterprise list (it loads 25 at a time; use Load more) and tick the enterprises you will visit. The top checkbox selects everything shown.
2. For every enterprise set the agenda, start time (Nairobi time), duration in minutes and the field officer(s). Each visit needs all four.
3. Save draft. You can Edit a draft or returned plan at any time.
4. Submit for review and choose your REDO. If you choose none, an administrator reviews it.
5. When approved, you, your REDO and the ESM recipients receive the itinerary by email. An approved plan cannot be edited. Cancel it with a reason and create a new one if something changes.

**On the day** (Fieldwork, then Visit execution)
1. Open Today. Tap Check in on arrival. Read the privacy notice, tick the box, and tap Share my location. Wait for the accuracy reading (aim for 100 m or better; go outdoors and Try again if it is worse).
2. If location is blocked or fails you can Continue without location. The visit is still recorded but a REDO must accept it before your report opens.
3. Tap Check out when you leave. If you lose connection the page keeps your reading: reconnect and tap Retry. Do not close the page while it says offline.
4. If a visit did not happen, tap Mark missed and give the reason.

**Reports**
- A report opens only for visits that are completed and location-verified (or accepted by a REDO). You never get a form for a missed visit.
- Required: activities (150+ words), findings and gaps (200+ words), recommendations (150+ words), plus challenges, solutions, action points and timeline. Save draft often; submit when every counter is satisfied.
- If your REDO returns a report, the reason is shown on top. Fix it and resubmit.

**Pending items and the booking block**
- The banner on Visit execution shows exactly how many reports and missed-visit reasons are pending. You receive a reminder email at 17:00 Nairobi time on days with open items.
- While anything is pending you cannot create or submit a new plan. Clear the items, or ask an administrator to lift the block.

## 2. REDO guide

- **Plans:** Fieldwork shows plans routed to you. Open View itinerary to see times, agendas and officers, then Approve or Return (a reason is required). You cannot review your own plans.
- **Location exceptions:** Visit execution, Location exceptions lists visits that could not be verified automatically. Accept visit with a reason to open the report, or leave it if the visit looks wrong.
- **Reports:** Reports awaiting review, then Review. Approve sends the feedback email to the enterprise's verified contact. Return needs a reason.
- **Client feedback issues:** if an email failed, or the enterprise has no verified contact, it is listed with a Retry send button.

## 3. Administrator guide

**Oversight** (Admin, Fieldwork Oversight)
- Summary cards link to the filtered lists. The amber banner appears when deliveries failed in the last 7 days, when the same recipient has 3 or more failures, or when client feedback is held for a missing verified contact.
- Tabs: Plans, Visits (including location verification outcomes and missed reasons), Reports, Notifications (delivery status and failure reasons), Audit trail. Filter by text, status, dates, EDO and REDO. Lists are paginated 25 per page.
- Oversight role users see the same data read-only.

**Exports** (administrators only)
- Export XLSX or Export CSV downloads exactly the rows matching the current filters, so totals reconcile with the screen. Report exports include the full report text.
- Precise coordinates are excluded. Use Export with coordinates on the Visits tab only when needed. It asks for confirmation and records the export as including precise location.
- Exports are limited to 10,000 rows (narrow by date), limited to 10 per minute, neutralised against spreadsheet formulas, and logged in `fieldwork_export_events` (who, dataset, filters, row count).

**Booking gate** (Visit execution, Booking gate, admin only)
- Lists officers with pending items. Lift gate (reason of 10+ characters) allows booking for 48 hours; Revoke override ends it. Every override is stored with the administrator and reason.

**Configuration**
| Setting | Purpose |
| --- | --- |
| `FIELDWORK_ESM_RECIPIENTS` | Comma-separated ESM email addresses for itineraries |
| `CRON_SECRET` | Authorises the 17:00 Nairobi reminder job |
| `FIELDWORK_VERIFY_RADIUS_METERS` | Allowed distance from the enterprise (default 300) |
| `FIELDWORK_MAX_ACCURACY_METERS` | Worst acceptable GPS accuracy (default 100) |
| `NEXT_PUBLIC_APP_URL` | Base URL used in reminder links |

**Monitoring.** Fieldwork writes one-line JSON logs (`"scope":"fieldwork"`) for rate-limit hits, export success or failure, email failures and reminder failures. Search the platform logs for `"scope":"fieldwork","level":"error"`.

## 4. UAT script

| # | Scenario | Expected result |
| --- | --- | --- |
| 1 | EDO creates a plan for 5 enterprises (bulk-select 3, add 2), each with agenda, time, duration and officer | Draft saved; derived plan window spans first start to last end |
| 2 | Try to save with one blank agenda | Save disabled and the visit is flagged |
| 3 | Submit to a REDO; sign in as another REDO | Other REDO cannot see or review it; assigned REDO can |
| 4 | REDO returns without a reason | Blocked. With a reason, EDO sees it, edits and resubmits |
| 5 | REDO approves | One itinerary delivery each for EDO, REDO and ESM; plan locked; audit shows each step |
| 6 | Try editing the approved plan | Not offered; direct action call is refused. Cancel with reason works |
| 7 | On the day, check in 3 of 5 visits near the enterprise (verified), 1 with location denied, leave 1 untouched | 3 verified, 1 needs review, 1 open |
| 8 | Check out all checked-in visits | 3 report tasks only; the denied visit has none yet |
| 9 | REDO accepts the denied visit with a reason | Report task opens; audit shows exception |
| 10 | Next day, check pending banner | Shows 4 reports and 1 missed-visit reason; booking a new plan is refused |
| 11 | Record the missed reason; submit reports with a 149-word activities field | Server rejects the short field; 150 words accepted |
| 12 | Admin lifts the gate with a reason | EDO can book for 48 hours; revoking restores the block |
| 13 | REDO approves a report for an enterprise with a verified contact | Feedback email sent and logged. With no verified contact: held, then sent after Retry |
| 14 | Run the reminder job twice in one day | One email per officer per day |
| 15 | Admin filters Visits by `needs_review`, exports CSV | Row count equals on-screen count; no coordinates column |
| 16 | Admin exports Visits with coordinates | Confirmation shown; export event recorded as precise location |
| 17 | Open a cell starting with `=` in an exported file | Displays as text, not a formula |
| 18 | Non-admin calls `/api/fieldwork/export` | 403 |

## 5. Release and rollback guidance

1. Apply migrations 0060 to 0064 in order. They are additive (new tables, columns, indexes, constraints); no existing data is rewritten.
2. Set the environment variables above, confirm the cron appears in the deployment, and run the reminder once with `Authorization: Bearer $CRON_SECRET`.
3. Monitor for 48 hours: the oversight banner, email failures in the logs, and rate-limit warnings.
4. Rollback is forward-fix: the code paths are additive, so redeploy the previous build; the extra tables and columns are harmless. Do not drop fieldwork tables once real visits exist.
5. Open items before production sign-off: retention period for precise coordinates, backup and restore drill, and an accessibility and load review at expected scale.
