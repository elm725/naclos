import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const month = url.searchParams.get('month');
  
  if (!month) return NextResponse.json({ error: 'Month required' }, { status: 400 });

  try {
    const supabase = getSupabaseAdminClient();
    
    // Fetch both tables for the selected month
    const [expensesRes, salariesRes] = await Promise.all([
      supabase.from('monthly_fixed_expenses').select('*').eq('month', month),
      supabase.from('monthly_staff_salaries').select('*').eq('month', month)
    ]);

    return NextResponse.json({
      expenses: expensesRes.data || [],
      salaries: salariesRes.data || []
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const { month, expenses, salaries } = payload;
    
    if (!month) return NextResponse.json({ error: 'Month required' }, { status: 400 });

    const supabase = getSupabaseAdminClient();

    // 1. Delete all existing records for this specific month so we can cleanly overwrite them
    await Promise.all([
      supabase.from('monthly_fixed_expenses').delete().eq('month', month),
      supabase.from('monthly_staff_salaries').delete().eq('month', month)
    ]);

    // 2. Insert the new valid expenses
    if (expenses && expenses.length > 0) {
      const validExpenses = expenses
        .filter((e: any) => e.label && Number(e.amount) > 0)
        .map((e: any) => ({ month, label: e.label, amount: Number(e.amount) }));
      
      if (validExpenses.length > 0) {
        await supabase.from('monthly_fixed_expenses').insert(validExpenses);
      }
    }

    // 3. Insert the new valid salaries
    if (salaries && salaries.length > 0) {
      const validSalaries = salaries
        .filter((s: any) => s.name && Number(s.baseSalary) > 0)
        .map((s: any) => ({ month, name: s.name, base_salary: Number(s.baseSalary) }));
      
      if (validSalaries.length > 0) {
        await supabase.from('monthly_staff_salaries').insert(validSalaries);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
