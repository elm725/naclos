import ExcelJS from 'exceljs';
import type { DailyClosureRecord, DailyClosureInput } from '@/types';

/**
 * Generates an executive Excel report buffer for a daily closure entry.
 */
export async function generateExcelReport(
  closure: DailyClosureRecord | DailyClosureInput,
  existingWorkbookBuffer?: Buffer
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  if (existingWorkbookBuffer) {
    await workbook.xlsx.load(existingWorkbookBuffer as any);
  }

  // 1. Build or Append Daily Summary Sheet
  buildDailySummarySheet(workbook, closure);

  // 2. Build or Append Stock Inventory Sheet
  buildStockInventorySheet(workbook, closure);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Alias exported function to match API route imports.
 */
export async function generateDailyExcelBuffer(
  closure: DailyClosureRecord | DailyClosureInput,
  existingWorkbookBuffer?: Buffer
): Promise<Buffer> {
  return generateExcelReport(closure, existingWorkbookBuffer);
}

function buildDailySummarySheet(workbook: ExcelJS.Workbook, closure: any): void {
  const sheetName = 'Rapport Quotidien';
  let sheet = workbook.getWorksheet(sheetName);

  if (!sheet) {
    sheet = workbook.addWorksheet(sheetName, {
      pageSetup: { paperSize: 9, orientation: 'landscape' },
      views: [{ showGridLines: true }],
    });
  } else {
    sheet.addPageBreak();
  }

  const currency = process.env.NEXT_PUBLIC_CURRENCY || 'MAD';

  // 1. Title Banner
  sheet.mergeCells('A1:D1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'NACLOS — RAPPORT DE CLÔTURE DE CAISSE';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 36;

  // Subtitle
  sheet.mergeCells('A2:D2');
  const subCell = sheet.getCell('A2');
  subCell.value = `Date: ${closure.businessDate}   |   Responsable: ${closure.managerName}   |   Statut: ${closure.status || 'Soumis'}`;
  subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '64748B' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(2).height = 20;

  sheet.addRow([]);

  // 2. KPI Cards (Rows 4 & 5)
  sheet.getCell('A4').value = 'RECETTE BRUTE';
  sheet.getCell('B4').value = 'TOTAL DÉPENSES';
  sheet.getCell('C4').value = 'CASH NET ATTENDU';
  sheet.getCell('D4').value = 'ANOMALIE STOCK';

  ['A4', 'B4', 'C4', 'D4'].forEach((col) => {
    const c = sheet.getCell(col);
    c.font = { name: 'Arial', size: 9, bold: true, color: { argb: '475569' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const grossRevenue = Number(closure.grossRevenue) || 0;
  const totalExpenses = Number(closure.totalExpenses) || 0;
  const netCash = Number(closure.netCash) || grossRevenue - totalExpenses;

  sheet.getCell('A5').value = grossRevenue;
  sheet.getCell('A5').numberFormat = `#,##0.00 "${currency}"`;
  sheet.getCell('A5').font = { name: 'Arial', size: 13, bold: true, color: { argb: '15803D' } };
  sheet.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } };

  sheet.getCell('B5').value = totalExpenses;
  sheet.getCell('B5').numberFormat = `#,##0.00 "${currency}"`;
  sheet.getCell('B5').font = { name: 'Arial', size: 13, bold: true, color: { argb: 'B91C1C' } };
  sheet.getCell('B5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };

  sheet.getCell('C5').value = { formula: 'A5-B5', result: netCash };
  sheet.getCell('C5').numberFormat = `#,##0.00 "${currency}"`;
  sheet.getCell('C5').font = { name: 'Arial', size: 13, bold: true, color: { argb: '0F172A' } };
  sheet.getCell('C5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };

  sheet.getCell('D5').value = closure.hasInventoryDiscrepancy ? 'OUI' : 'AUCUN';
  sheet.getCell('D5').font = { name: 'Arial', size: 11, bold: true, color: { argb: closure.hasInventoryDiscrepancy ? 'B91C1C' : '15803D' } };

  ['A5', 'B5', 'C5', 'D5'].forEach((col) => {
    const c = sheet.getCell(col);
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = {
      top: { style: 'thin', color: { argb: 'CBD5E1' } },
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } },
    };
  });
  sheet.getRow(5).height = 28;

  sheet.addRow([]);

  // 3. Expenses Section Table
  let startRow = 8;
  sheet.mergeCells(`A${startRow}:D${startRow}`);
  const expTitle = sheet.getCell(`A${startRow}`);
  expTitle.value = '1. DÉTAIL DES DÉPENSES DU JOUR';
  expTitle.font = { name: 'Arial', size: 11, bold: true, color: { argb: '0F172A' } };
  expTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
  sheet.getRow(startRow).height = 22;

  startRow++;
  sheet.getRow(startRow).values = ['#', 'Libellé de la Dépense', '', 'Montant'];
  sheet.mergeCells(`B${startRow}:C${startRow}`);
  ['A', 'B', 'D'].forEach((col) => {
    const c = sheet.getCell(`${col}${startRow}`);
    c.font = { name: 'Arial', size: 9, bold: true, color: { argb: '475569' } };
  });

  startRow++;
  const expensesList = closure.expenses || [];
  if (expensesList.length > 0) {
    const expStart = startRow;
    expensesList.forEach((exp: any, idx: number) => {
      sheet.getRow(startRow).values = [idx + 1, exp.label, '', Number(exp.amount)];
      sheet.mergeCells(`B${startRow}:C${startRow}`);
      sheet.getCell(`A${startRow}`).alignment = { horizontal: 'center' };
      const valCell = sheet.getCell(`D${startRow}`);
      valCell.numberFormat = `#,##0.00 "${currency}"`;
      valCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'B91C1C' } };
      startRow++;
    });

    // Total Expenses Formula
    sheet.getRow(startRow).values = ['', 'TOTAL DÉPENSES', '', { formula: `SUM(D${expStart}:D${startRow - 1})` }];
    sheet.mergeCells(`B${startRow}:C${startRow}`);
    sheet.getCell(`B${startRow}`).font = { name: 'Arial', size: 10, bold: true };
    const totCell = sheet.getCell(`D${startRow}`);
    totCell.numberFormat = `#,##0.00 "${currency}"`;
    totCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'B91C1C' } };
    startRow++;
  } else {
    sheet.getRow(startRow).values = ['-', 'Aucune dépense enregistrée', '', 0];
    sheet.mergeCells(`B${startRow}:C${startRow}`);
    startRow++;
  }

  // Column Widths
  sheet.columns = [
    { width: 8 },  // Col A
    { width: 30 }, // Col B
    { width: 20 }, // Col C
    { width: 20 }, // Col D
  ];
}

function buildStockInventorySheet(workbook: ExcelJS.Workbook, closure: any): void {
  const sheetName = 'État du Stock';
  let sheet = workbook.getWorksheet(sheetName);

  if (!sheet) {
    sheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }],
    });

    // Header Row
    sheet.addRow(['#', 'Code Article', 'Désignation Produit', 'Stock Réel Compté', 'Unité']);
    const hRow = sheet.getRow(1);
    hRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    hRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    sheet.getRow(1).height = 26;
  }

  const inventoryList = closure.inventory || [];
  inventoryList.forEach((item: any, idx: number) => {
    const row = sheet.addRow([
      idx + 1,
      item.materialCode || '-',
      item.materialLabel || 'Article',
      Number(item.physicalClosingCount) || 0,
      item.unit || 'unité',
    ]);

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(4).font = { bold: true };
    row.getCell(4).alignment = { horizontal: 'right' };
  });

  sheet.columns = [
    { width: 8 },
    { width: 16 },
    { width: 32 },
    { width: 22 },
    { width: 14 },
  ];
}