# Wealth Manager

A standalone browser-based personal finance planner built with HTML, CSS and vanilla JavaScript. No server, login, database, analytics, or financial-account connection is required.

## Run
Open `index.html` in a modern browser. The core calculations and CSV/JSON handling work offline. The interface uses system fonts as a fallback; the stylesheet optionally loads Google Fonts when online.

## Included
- Add, edit, duplicate, archive and delete loans.
- Optional per-loan prepayment limits by month and Indian financial year (April–March).
- Monthly reducing-balance and simplified daily outstanding interest estimates.
- EMI, amortization schedule, estimated closure dates and portfolio dashboard with estimated prepayment interest/time savings by loan, with portfolio totals secondary.
- One-time, monthly, quarterly, half-yearly and annual prepayments, multiple plans at once.
- Annual bonus planner with reserve and allocation assumptions.
- Advisor comparison for highest rate, effective-cost proxy, smallest balance and largest balance, showing selected-loan impact first and portfolio totals as context.
- Baseline vs. strategy scenario comparison, monthly/quarterly/yearly report views.
- A cross-feature financial overview and dedicated loan dashboard, with a simplified five-section navigation and contextual links that keep planning, loan, family, and data tools together.
- Multiple isolated portfolios with a persistent header switcher, portfolio creation/rename/archive, and a default portfolio.
- A simple local family dashboard where each member is one separate portfolio, plus optional shared household assets and liabilities.
- Net-worth calculator with editable asset balances and growth assumptions (including EPF, NPS, mutual funds and PPF), multiple monthly income sources, an adjustable savings rate, and a year-by-year future projection. Active loan repayment schedules are included as liabilities.
- Deposit planner for fixed deposits, recurring deposits and bonds, including invested/current values, rates, investment and maturity dates or months remaining, separate interest and principal payout frequencies, estimated maturity values, and payout events in the cash-flow calendar. Active deposit balances have dedicated summaries in both Overview and Net worth, alongside the general asset table; the summaries do not add balances a second time. A maturity ladder groups active deposits by month, configurable in-app reminders highlight upcoming/overdue maturities, and renewal decisions can be recorded with a new term/rate or marked redeemed while retaining redemption history. User-entered tax and TDS rates estimate interest tax and withholding credits; these are illustrative estimates, not statutory calculations or tax advice. Deposits are counted once in net worth, asset projections, goals, reviews, and family totals.
- Monthly cash-flow tracking for recurring expenses, loan EMIs, other debt payments, goal contributions, the net-worth savings target, currently active recurring prepayment plans and estimated surplus. Future-starting recurring payments appear separately until their start date.
- Emergency-fund tracker that sizes a configurable 1–24 month target from expenses marked essential and only includes assets explicitly eligible as accessible reserves.
- Rolling 12-month cash-flow calendar for estimated monthly expenses and goal contributions, dated loan EMIs, prepayment plans, other debt payments, RD installments, deposit interest/principal payouts, and expected bonuses net of reserves.
- Financial goals with editable targets, saved balances, target dates and ETAs; link multiple Net worth assets to a goal with per-asset monthly contributions and scenario growth rates. Goal views show projected value, growth, contributions and estimated returns, while linked contributions flow into cash-flow and net-worth projections without adding asset balances twice. Estimates use constant growth and month-end contributions; they are not guaranteed returns.
- Expected bonuses flow into projected savings after their configured reserve deductions; their entered frequency is used for future projection estimates.
- Bonus plans can prefill the reserve-adjusted amount and date in the loan prepayment advisor for a separate strategy comparison.
- Credit-card and other liability tracking; these additional balances are included in net-worth projections.
- Nominal and inflation-adjusted net-worth projections, with an editable inflation assumption.
- What-if comparisons for savings rate, investment returns, income growth and extra monthly loan payments without changing the saved plan.
- Account-review reminders for balances with editable review dates and review intervals.
- CSV exports for loans, prepayments, bonus plans, transactions, net-worth assets (including full deposit terms), a separate deposits file, income sources and net-worth assumptions; workspace JSON backups preserve member portfolios and household shared records.
- Guided CSV/JSON selection, destination and replace/merge confirmation, schema validation, duplicate summaries, mapped multi-portfolio loan imports, family CSV imports, downloadable templates, a bounded local import history, and downloadable CSV validation reports.
- Light/dark theme.
- App-styled dropdown menus and date pickers that replace browser-native popups, with keyboard and touch interaction.

The local-storage key remains compatible with existing LoanPilot and FinPath installations. Existing single-portfolio data is migrated in place to the multi-portfolio workspace without changing financial record IDs. Older separate family-member profiles are folded into matching portfolios where possible; unmatched profiles become empty member portfolios without copying or changing financial records. A first run starts with an empty portfolio; demo data is available only through the explicit reset-to-sample action.

## Calculation assumptions and limitations
This is a planning model, not a bank statement or legal interpretation of lender rules. Monthly interest is outstanding principal × annual rate / 12, regardless of the number of calendar days in the period. Daily mode estimates accrual using the calendar days in each period and Actual/365 or Actual/366; for the first scheduled EMI, the preceding period is estimated from the same calendar date one month earlier. The configured EMI date is the deduction date. A planned prepayment is applied after the first scheduled EMI on or after its effective date. The model does not yet simulate arbitrary intra-month rate-change events, moratoriums or lender-specific day-count conventions. EMI and payment-order practices differ by lender. The entered EMI is treated as the scheduled amount; final payments are capped to the amount owed.

The advisor evaluates a handful of transparent allocation heuristics using the same simulation engine. It is not an exhaustive combinatorial optimizer and must not label its result mathematically optimal. Fees are estimated from each loan's configured prepayment fee percentage. Actual lender rules, taxes, minimums, lock-ins, frequency caps and penalty rules should be verified independently. No strategy is universally best; keep an adequate emergency reserve.

Prepayment schedules are generated from start date and frequency and capped by the model horizon. Payments under a loan’s configured minimum prepayment are skipped unless same-installment planned payments together meet that minimum. Planned payments change projections, not the current recorded principal; update the loan balance after an actual payment. The application does not yet reconcile actual transactions into opening balances or implement all advanced lender-specific constraints described in the specification. Transactions are stored/exported separately from projections.

## Data portability
Portfolio changes are auto-saved in the browser's local storage, and an unfinished loan form is restored after a refresh only within the portfolio where it was drafted. This is local to the same browser and device; clearing browser data may erase it. Use **Import & export** to download a separate JSON or CSV backup periodically. A current-portfolio JSON backup, selected-portfolio backup, or full-family JSON backup retains stable IDs and relationship mappings. CSV files contain sensitive financial data; store them securely.

CSV headers are defined in `csv-utils.js`. IDs are stable references: `prepayments.loanId`, `transactions.loanId`, and member/portfolio `id`. Deposits are net-worth asset records, so JSON backups and asset CSVs retain their terms; use the separate deposits CSV template/file for focused imports and exports. A family member is the same record as a portfolio; there is no separate member profile or ownership-mapping step. CSV import validates before replacing or merging, rejects unsupported columns, summarizes matching IDs, and writes only after confirmation. A loans CSV with a `portfolioId` column can be imported using **Map loans by member**. Older JSON backups and family-member CSVs are migrated to the one-member-per-portfolio model; ownership-allocation CSVs are no longer used. Download the templates for exact headers.

CSV exports are separate files for loans, prepayments, bonus plans, transactions, expenses, liabilities, goals, assets, incomes, net-worth assumptions, and planning assumptions; import each through **Import & export**. XLSX and PDF are not supported by this offline app. The family CSV export is a summary; JSON is the detailed, re-importable family backup. Family net worth counts each portfolio once and counts shared records once by stable ID; owner shares only allocate member-level values. Household history contains only dated values saved in this browser and does not invent earlier valuations.

Family features are a convenience for one local browser profile, not a secure multi-user/family-sharing system: there are no accounts, authentication, or per-member permissions. Anyone able to use the browser profile can view its stored data. Each member is represented by one portfolio, and household shared assets/liabilities are kept separate from member portfolios. Imported and manually entered balances are not live valuations. Invested cost basis, investment performance, currency conversion, and consolidated family cash flow are not separately modeled. Replacing loans preserves linked plans/history only for loan IDs present in the imported file and leaves unrelated planning data unchanged. Older LoanPilot and FinPath backups remain compatible and load with defaults for newer planning sections.

## Files
- `index.html` — page shell and loan editor
- `styles.css` — responsive interface and themes
- `app.js` — application state, pages, interactions
- `calculations.js` — EMI, amortization and portfolio simulation
- `networth.js` — asset, income and loan-liability projections
- `portfolio-family.js` — legacy migration, portfolio workspace and family calculations
- `prepayment-advisor.js` — heuristic strategy comparisons
- `csv-utils.js` — CSV parsing/export and JSON backup
- `reports.js` — reporting helpers
- `tests/test-calculations.html` — browser-run regression tests
- `tests/test-networth.html` — browser-run net-worth and portability tests
- `tests/test-portfolios.html` — portfolio migration, one-member-per-portfolio and household aggregation tests

## Test
Open `tests/test-calculations.html`, `tests/test-networth.html`, and `tests/test-portfolios.html` in a browser and inspect the results. Tests cover EMI, payoff, recurring prepayments, CSV quoting, net-worth and inflation projections, cash flow, goals, account reviews, additional liabilities, portability, legacy migration, member portfolios, and consolidated calculations.
