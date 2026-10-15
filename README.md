# LoanPilot — Multi-loan EMI & Prepayment Planner

A standalone browser-based planning tool built with HTML, CSS and vanilla JavaScript. No server, login, database, analytics, or financial-data connection is required.

## Run
Open `index.html` in a modern browser. The core calculations and CSV/JSON handling work offline. The interface uses system fonts as a fallback; the stylesheet optionally loads Google Fonts when online.

## Included
- Add, edit, duplicate, archive and delete loans.
- Optional per-loan prepayment limits by month and Indian financial year (April–March).
- Monthly reducing-balance and simplified daily outstanding interest estimates.
- EMI, amortization schedule, estimated closure dates and portfolio dashboard.
- One-time, monthly, quarterly, half-yearly and annual prepayments, multiple plans at once.
- Annual bonus planner with reserve and allocation assumptions.
- Advisor comparison for highest rate, effective-cost proxy, smallest balance and largest balance.
- Baseline vs. strategy scenario comparison, monthly/quarterly/yearly report views.
- CSV exports for loans, prepayments, bonus plans, transactions and schedules; JSON portfolio backup/restore.
- CSV template download and input validation.
- Light/dark theme.

## Calculation assumptions and limitations
This is a planning model, not a bank statement or legal interpretation of lender rules. Monthly interest is outstanding principal × annual rate / 12. Daily mode estimates monthly accrual using the calendar days in each period and Actual/365 or Actual/366. Payments are represented on the configured EMI date each month; a planned prepayment is applied after the first scheduled EMI on or after its effective date. The model does not yet simulate arbitrary intra-month rate-change events, moratoriums or lender-specific day-count conventions. EMI and payment-order practices differ by lender. The entered EMI is treated as the scheduled amount; final payments are capped to the amount owed.

The advisor evaluates a handful of transparent allocation heuristics using the same simulation engine. It is not an exhaustive combinatorial optimizer and must not label its result mathematically optimal. Fees are estimated from each loan's configured prepayment fee percentage. Actual lender rules, taxes, minimums, lock-ins, frequency caps and penalty rules should be verified independently. No strategy is universally best; keep an adequate emergency reserve.

Prepayment schedules are generated from start date and frequency and capped by the model horizon. Payments under a loan’s configured minimum prepayment are skipped unless same-installment planned payments together meet that minimum. Planned payments change projections, not the current recorded principal; update the loan balance after an actual payment. The application does not yet reconcile actual transactions into opening balances or implement all advanced lender-specific constraints described in the specification. Transactions are stored/exported separately from projections.

## Data portability
Portfolio changes are auto-saved in the browser's local storage, and an unfinished loan form is restored after a refresh. This is local to the same browser and device; clearing browser data may erase it. Use **Import & export** to download a separate JSON or CSV backup periodically. Browsers cannot silently overwrite a CSV file on your device, so CSV downloads remain an explicit action. JSON backup is the most complete single-file restore format. CSV files contain sensitive financial data; store them securely.

CSV headers are defined in `csv-utils.js`. IDs are stable references: `prepayments.loanId`, `transactions.loanId`. CSV import previews/validates before replacing or merging. Download the provided templates to see the exact column names.

## Files
- `index.html` — page shell and loan editor
- `styles.css` — responsive interface and themes
- `app.js` — application state, pages, interactions
- `calculations.js` — EMI, amortization and portfolio simulation
- `prepayment-advisor.js` — heuristic strategy comparisons
- `csv-utils.js` — CSV parsing/export and JSON backup
- `reports.js` — reporting helpers
- `tests/test-calculations.html` — browser-run regression tests

## Test
Open `tests/test-calculations.html` in a browser and inspect the results. Tests cover EMI, zero-rate loans, payoff, recurring prepayments, CSV quoting and negative balance protection.
