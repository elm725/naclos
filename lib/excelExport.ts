import ExcelJS from 'exceljs';
import type { DailyClosureInput } from '@/types';
import { computeClosureTotals } from './calculations';

/**
 * Generates an Excel report buffer for a daily closure entry.
 */
export async function generateExcelReport(
  closure: DailyClosureInput,
  existingWorkbookBuffer?: Buffer
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  if (existingWorkbookBuffer) {
    await workbook.xlsx.load(existingWorkbookBuffer as any);
  }

  buildOrAppendMonthlySummarySheet(workbook, closure);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Alias exported function to match API route imports.
 */
export async function generateDailyExcelBuffer(
  closure: DailyClosureInput,
  existingWorkbookBuffer?: Buffer
): Promise<Buffer> {
  return generateExcelReport(closure, existingWorkbookBuffer);
}

function buildOrAppendMonthlySummarySheet(
  workbook: ExcelJS.Workbook,
  closure: DailyClosureInput
): void {
  const dateObj = new Date(closure.businessDate);
  const monthName = dateObj.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
  const sheetName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  let sheet = workbook.getWorksheet(sheetName);

  if (!sheet) {
    sheet = workbook.addWorksheet(sheetName, {
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    sheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Responsable', key: 'manager', width: 18 },
      { header: 'Revenu Brut (DH)', key: 'grossRevenue', width: 18 },
      { header: 'Total Dépenses (DH)', key: 'totalExpenses', width: 20 },
      { header: 'Avances Staff (DH)', key: 'totalAdvances', width: 18 },
      { header: 'Cash Net (DH)', key: 'netCash', width: 16 },
      { header: 'Profit Net (DH)', key: 'netProfit', width: 16 },
      { header: 'Écart Stock', key: 'discrepancy', width: 15 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '171717' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  }

  const totals = computeClosureTotals(closure);

  sheet.addRow({
    date: closure.businessDate,
    manager: closure.managerName,
    grossRevenue: closure.grossRevenue,
    totalExpenses: totals.totalExpenses,
    totalAdvances: totals.totalStaffAdvances,
    netCash: totals.netCash,
    netProfit: totals.netProfit,
    discrepancy: totals.hasInventoryDiscrepancy ? 'OUI (Anomalie)' : 'NON',
  });
}