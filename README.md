# Naclos Operations & Audit Portal

A mobile-first PWA that replaces the manual daily Excel accounting workbook with
a fraud-resistant digital closing process for fast-food store managers. Every
submission auto-calculates totals, flags inventory variance ("Manque 500g Dinde"
style alerts), locks itself against tampering, and emails the owner + partner a
PDF and Excel report every night.

## File Structure

```
naclos-operations-portal/
├── supabase/
│   └── schema.sql                 # Full Postgres schema, triggers, RLS
├── types/
│   └── index.ts                   # Shared TypeScript types + seed catalogs
├── lib/
│   ├── supabaseClient.ts          # Browser + admin Supabase clients
│   ├── calculations.ts            # All auto-calc formulas + theft-detection logic
│   ├── pdfGenerator.tsx           # React-PDF nightly report document
│   └── excelExport.ts             # ExcelJS monthly workbook builder/appender
├── app/
│   ├── layout.tsx / globals.css
│   ├── entry/page.tsx             # Manager daily entry screen
│   ├── dashboard/page.tsx         # Admin analytics screen
│   └── api/
│       ├── closure/submit/route.ts    # POST — validate, save, lock, trigger report
│       └── reports/email/route.ts     # POST — build PDF+XLSX, email owner/partner
├── components/
│   ├── DailyEntryForm.tsx         # 5-step wizard (Revenue → Expenses → Stock → Sales → Summary)
│   ├── ExpenseInput.tsx           # Expense + staff advance entry
│   ├── InventoryTracker.tsx       # Stock variance tracker with live flags
│   ├── MenuSalesCounter.tsx       # +/- quantity counters per menu category
│   └── AdminDashboard.tsx         # Revenue/expense/margin charts (recharts)
├── scripts/
│   └── runNightlyReport.ts        # Cron-safe fallback report trigger
├── public/manifest.json           # PWA manifest
└── .env.example
```

## Setup

1. **Create a Supabase project**, then run `supabase/schema.sql` in the SQL editor
   (or via `supabase db push`). This creates all tables, seed data (expense
   categories, raw materials, menu catalog), triggers, and RLS policies.

2. **Copy environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase URL/keys, Resend API key, and the two recipient emails
   (owner + partner).

3. **Install and run**:
   ```bash
   npm install
   npm run dev
   ```
   - Manager entry screen: `http://localhost:3000/entry`
   - Admin dashboard: `http://localhost:3000/dashboard`

4. **Nightly email automation** — two options:
   - **Automatic (default):** `/api/closure/submit` fires `/api/reports/email`
     immediately after a manager submits their closing. No cron needed if every
     store submits once per night.
   - **Scheduled safety net:** run `npm run cron:email` on a schedule (Vercel
     Cron, `pg_cron`, or system cron) to catch any closure that was locked but
     never emailed (e.g. a transient failure).

## How the Theft-Prevention Flow Works

1. Manager fills in revenue, expenses, staff advances, stock counts, and menu sales.
2. On submit, `computeClosureTotals()` (in `lib/calculations.ts`) calculates:
   - `Calculated Remaining Stock = Opening Stock + Supply Purchased − Consumed`
   - `Variance = Physical Closing Count − Calculated Remaining Stock`
   - Any variance beyond a small rounding tolerance is flagged red, both in the
     UI and in the emailed report (e.g. *"Manque 500g Dinde"*).
3. The closure row and all child rows (expenses, advances, inventory, sales) are
   written, then the closure is immediately set to `status = 'locked'`.
4. A Postgres trigger (`block_edits_if_locked`) rejects any further insert/update/
   delete on that day's child tables at the database level — not just the UI —
   so a manager cannot quietly edit numbers after submission. Only an admin
   flow you build on top (using `ADMIN_UNLOCK_SECRET`) can move a closure back
   to `admin_reopened` before edits are allowed again.
5. `computeClosureTotals` also exposes `crossCheckConsumptionAgainstSales()`, a
   pluggable hook: wire in your real recipe table (grams of each raw material
   per menu item) to flag cases where logged consumption doesn't match what the
   day's sales volume implies — the strongest signal for portion inflation or
   inventory theft.

## Notes & Next Steps for Production

- **Auth**: this scaffold uses the Supabase service-role key server-side for
  all writes. Add Supabase Auth (magic link or PIN-based) so each manager has
  an identity, and tighten RLS policies beyond the `service_role`-only ones
  provided, scoping managers to their own `store_id`.
- **Recipe table**: add a `recipes` table (`menu_item_id`, `raw_material_id`,
  `quantity_per_unit`) and pass it into `crossCheckConsumptionAgainstSales` for
  full automatic theft detection, not just physical-count variance.
- **File storage**: `report_deliveries` currently only logs metadata; wire
  `pdf_url` / `xlsx_url` to Supabase Storage if you want a historical archive
  the owner can browse in the dashboard, not just their inbox.
- **Admin unlock endpoint**: `ADMIN_UNLOCK_SECRET` is reserved in `.env.example`
  for a `/api/closure/[id]/reopen` route you can add to move a closure from
  `locked` → `admin_reopened`, log it in `audit_log`, and allow one edit pass.
- **Multi-store**: the schema already includes `store_id` throughout; add a
  store switcher to the entry form and dashboard when you roll out beyond one
  location.
