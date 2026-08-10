/**
 * Standalone nightly job: finds any 'locked' closures from today that have not
 * yet had a report emailed, and triggers /api/reports/email for each.
 *
 * Run with: npm run cron:email
 * Schedule with system cron, Supabase Edge Function + pg_cron, or a platform
 * scheduler (Vercel Cron, Railway Cron, etc.) at your store's closing time,
 * e.g.: 0 23 * * *  (11:00 PM daily)
 */
import { getSupabaseAdminClient } from '../lib/supabaseClient';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function main() {
  const supabase = getSupabaseAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: closures, error } = await supabase
    .from('daily_closures')
    .select('id, business_date, status')
    .eq('business_date', today)
    .in('status', ['locked', 'submitted']);

  if (error) {
    console.error('Failed to fetch closures:', error.message);
    process.exit(1);
  }

  if (!closures || closures.length === 0) {
    console.log(`No closures found for ${today}. Nothing to send.`);
    return;
  }

  for (const closure of closures) {
    const { data: alreadySent } = await supabase
      .from('report_deliveries')
      .select('id')
      .eq('closure_id', closure.id)
      .maybeSingle();

    if (alreadySent) {
      console.log(`Report already sent for closure ${closure.id} (${closure.business_date}). Skipping.`);
      continue;
    }

    console.log(`Sending report for closure ${closure.id} (${closure.business_date})…`);
    const res = await fetch(`${APP_URL}/api/reports/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cron-secret': process.env.CRON_SECRET || '' },
      body: JSON.stringify({ closureId: closure.id }),
    });

    if (!res.ok) {
      console.error(`Failed to send report for ${closure.id}:`, await res.text());
    } else {
      console.log(`Report sent for ${closure.id}.`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
