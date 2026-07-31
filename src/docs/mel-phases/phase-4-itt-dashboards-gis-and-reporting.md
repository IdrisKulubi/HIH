# MEL Phase 4: ITT, Dashboards, GIS and Reporting

## 1. Objective

Convert approved operational data into auditable ITT actuals, programme dashboards, GIS views, exports, and management reports.

At the end of Phase 4, MEL can trace every reported result from the dashboard back to approved source records and evidence.

## 2. Dependencies

- structured indicator definitions and targets from Phase 1;
- approved reports and DQA state from Phase 3;
- reliable existing CNA, CDP, mentorship, KYC, A2F, and training data;
- verified GPS coordinates for GIS.

## 3. In Scope

- indicator calculation engine;
- numerator/denominator and aggregation rules;
- annual and period actuals;
- ITT actual/target/achievement views;
- traffic-light status;
- baseline and trend analysis;
- quarterly and cumulative jobs;
- all agreed disaggregation;
- programme and enterprise dashboards;
- GIS map;
- Excel/CSV exports;
- donor/management reporting views;
- data lineage and drill-down;
- calculation reconciliation tests.

## 4. Out of Scope

- generic survey builder;
- external mobile-data connectors;
- advanced AI-generated reporting;
- final production migration/hardening work assigned to Phase 5.

## 5. Indicator Engine

### 5.1 Trusted-data rule

Only approved and currently valid records contribute to official actuals.

Draft, returned, reopened, voided, or rejected records must not contribute.

### 5.2 Aggregation

- counts and currency: sum;
- enterprises: distinct count;
- percentages: approved numerator divided by eligible denominator;
- profitability trend: median monthly-equivalent enterprise profit;
- waste: sum by waste stream and unit;
- one-time achievements: distinct approved enterprises/deliverables;
- latest-status indicators: use the latest approved state within the defined period.

### 5.3 Profitability

For each enterprise and quarter:

- quarterly profit = revenue - costs;
- monthly-equivalent profit = quarterly profit / 3;
- cohort result = median monthly-equivalent profit;
- growth = `(current cohort median - baseline cohort median) / baseline cohort median * 100`.

Handle zero or missing baselines explicitly. Never emit `Infinity`, `NaN`, or a misleading percentage.

### 5.4 Achievement and traffic lights

- achievement = actual / target * 100;
- targets must match the same unit, period, and segment as actuals;
- traffic-light thresholds come from Phase 1 configuration;
- overachievement may exceed 100%;
- indicators where lower is better require an explicit inverse rule.

### 5.5 Recalculation

- calculations must be deterministic and repeatable;
- indicator results store calculation version and last-calculated timestamp;
- configuration changes trigger controlled recalculation;
- an audit view shows the inputs used.

## 6. ITT Coverage

Support:

- impact job target: total, direct, and indirect;
- LT1 profitability;
- LT2 markets and financial resilience;
- LT3 circular economy and social safeguards;
- LT4 sector/policy environment;
- Output 1 enterprise mobilization, CNA, CDP, jobs, training, plans, technology, products;
- Output 2 financial and market indicators;
- Output 3 ESG, life-cycle assessment, certification, safeguards, and waste;
- Output 4 policy and partnership results.

Programme-level indicators use Phase 4 MEL entry forms backed by Phase 1 indicator definitions.

## 7. Dashboard Views

### 7.1 Executive overview

- enterprises reporting;
- reporting completeness;
- revenue/profit trend;
- jobs against target;
- finance accessed;
- markets/innovation;
- green-growth results;
- overall ITT traffic lights.

### 7.2 ITT dashboard

- result hierarchy;
- baseline;
- annual and overall target;
- actual;
- percentage achievement;
- Red/Amber/Green status;
- trend;
- drill-down to source records.

### 7.3 Enterprise dashboard

- baseline and period history;
- quarterly/cumulative jobs;
- profitability trend;
- deliverables achieved;
- evidence completeness;
- open learning actions.

### 7.4 Data-quality dashboard

- reporting completion;
- late/catch-up reports;
- returned reports;
- unresolved DQA issues;
- missing/expired evidence;
- enterprises without verified GPS.

## 8. Disaggregation

Dashboards and exports must support, where applicable:

- Foundation/Accelerator;
- male/female enterprise owner;
- youth/non-youth enterprise owner;
- PLWD-led enterprise;
- refugee-led enterprise if confirmed;
- job-holder male/female/youth/PLWD/refugee;
- county;
- sector;
- reporting period;
- programme year.

Do not add disaggregation filters to indicators whose source data cannot validly support them.

## 9. GIS

Use verified KYC GPS coordinates.

Features:

- enterprise map;
- county/sector/track filters;
- reporting and achievement status;
- cluster view for dense areas;
- missing/invalid-coordinate queue;
- link from map point to authorized enterprise summary.

Controls:

- do not expose precise enterprise coordinates publicly;
- role-check map data server-side;
- define an appropriate displayed precision;
- log restricted geographic exports.

## 10. Exports

Provide:

- ITT workbook export;
- enterprise monitoring records;
- jobs-disaggregation export;
- evidence index;
- DQA/completeness export;
- programme-level results;
- filtered dashboard export.

Requirements:

- typed dates, currency, counts, and percentages;
- clear source period and export timestamp;
- filter summary;
- stable column names;
- no internal URLs or sensitive fields unless authorized;
- large exports handled without blocking the interactive request where necessary.

## 11. Data Lineage

Every dashboard value must expose:

- indicator definition/version;
- target/version;
- calculation rule;
- contributing source count;
- last calculation time;
- drill-down to approved records;
- exclusions and missing-data notes.

## 12. Performance

- add indexes for period, enterprise, indicator, status, county, track, and sector;
- avoid loading evidence payloads in aggregate queries;
- precompute or cache expensive programme aggregates;
- invalidate caches after approval/reopen/configuration changes;
- paginate drill-down tables;
- test with production-scale row counts.

## 13. Testing

### Calculation fixtures

Create fixed datasets covering:

- jobs target distribution;
- direct/indirect totals;
- overlapping disaggregation;
- median profitability;
- percentage numerator/denominator;
- zero baselines;
- overachievement;
- reopened report exclusion;
- one-time achievement deduplication;
- waste by stream.

### Reconciliation

- manually reconcile representative outputs with source records;
- compare seeded ITT targets with the workbook;
- verify dashboard totals equal export totals;
- verify filters preserve valid denominators.

### Security and UI

- restricted drill-down and GIS access;
- responsive dashboard;
- empty/loading/error states;
- keyboard and screen-reader basics;
- export authorization.

## 14. Deliverables

- Phase 4 schema migration if aggregate/result tables are required;
- indicator calculation engine;
- programme-level MEL result-entry screen;
- ITT and operational dashboards;
- GIS view;
- exports;
- lineage/drill-down;
- reconciliation test suite;
- MEL reporting guide.

## 15. Acceptance Criteria

Phase 4 is accepted when:

- all activated ITT indicators have a defined source and calculation;
- actuals reconcile with approved records;
- achievement and traffic lights use configured targets;
- dashboards support valid disaggregation;
- reopened/invalid data is excluded;
- users can trace totals to source submissions;
- GIS respects data-access rules;
- exports match filtered dashboard results;
- performance is acceptable at production-like scale.

## 16. Phase Gate

Do not start Phase 5 until MEL signs off a formal reconciliation pack containing representative indicators from impact, LT outcomes, and Outputs 1-4.
