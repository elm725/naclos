import ExcelJS from 'exceljs';

/**
 * Generates an executive Excel report buffer for a daily closure entry.
 */
export async function generateExcelReport(
  closure: any,
  existingWorkbookBuffer?: Buffer
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  if (existingWorkbookBuffer) {
    await workbook.xlsx.load(existingWorkbookBuffer as any);
  }

  buildDailySummarySheet(workbook, closure);
  buildStockInventorySheet(workbook, closure);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Alias exported function to match API route imports.
 */
export async function generateDailyExcelBuffer(
  closure: any,
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
  }

  const currency = process.env.NEXT_PUBLIC_CURRENCY || 'MAD';
  const businessDate = closure.businessDate || closure.business_date || '';
  const managerName = closure.managerName || closure.manager_name || 'Tayeb';

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
  subCell.value = `Date: ${businessDate}   |   Responsable: ${managerName}   |   Statut: ${closure.status || 'Soumis'}`;
  subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '64748B' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(2).height = 20;

  sheet.addRow([]);

  // 2. KPI Cards
  sheet.getCell('A4').value = 'RECETTE BRUTE';
  sheet.getCell('B4').value = 'TOTAL DÉPENSES';
  sheet.getCell('C4').value = 'CASH NET ATTENDU';
  sheet.getCell('D4').value = 'ANOMALIE STOCK';

  ['A4', 'B4', 'C4', 'D4'].forEach((col) => {
    const c = sheet.getCell(col);
    c.font = { name: 'Arial', size: 9, bold: true, color: { argb: '475569' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const grossRevenue = Number(closure.grossRevenue ?? closure.gross_revenue) || 0;
  const totalExpenses = Number(closure.totalExpenses ?? closure.total_expenses) || 0;
  const netCash = Number(closure.netCash ?? closure.net_cash) || grossRevenue - totalExpenses;

  sheet.getCell('A5').value = grossRevenue;
  sheet.getCell('A5').numFmt = `#,##0.00 "${currency}"`;
  sheet.getCell('A5').font = { name: 'Arial', size: 13, bold: true, color: { argb: '15803D' } };
  sheet.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } };

  sheet.getCell('B5').value = totalExpenses;
  sheet.getCell('B5').numFmt = `#,##0.00 "${currency}"`;
  sheet.getCell('B5').font = { name: 'Arial', size: 13, bold: true, color: { argb: 'B91C1C' } };
  sheet.getCell('B5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };

  sheet.getCell('C5').value = { formula: 'A5-B5', result: netCash };
  sheet.getCell('C5').numFmt = `#,##0.00 "${currency}"`;
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

  // 3. Expenses Section
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
      valCell.numFmt = `#,##0.00 "${currency}"`;
      valCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'B91C1C' } };
      startRow++;
    });

    sheet.getRow(startRow).values = ['', 'TOTAL DÉPENSES', '', { formula: `SUM(D${expStart}:D${startRow - 1})` }];
    sheet.mergeCells(`B${startRow}:C${startRow}`);
    sheet.getCell(`B${startRow}`).font = { name: 'Arial', size: 10, bold: true };
    const totCell = sheet.getCell(`D${startRow}`);
    totCell.numFmt = `#,##0.00 "${currency}"`;
    totCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'B91C1C' } };
  } else {
    sheet.getRow(startRow).values = ['-', 'Aucune dépense enregistrée', '', 0];
    sheet.mergeCells(`B${startRow}:C${startRow}`);
  }

  sheet.columns = [
    { width: 8 },
    { width: 30 },
    { width: 20 },
    { width: 20 },
  ];
}

function buildStockInventorySheet(workbook: ExcelJS.Workbook, closure: any): void {
  const sheetName = 'État du Stock';
  let sheet = workbook.getWorksheet(sheetName);

  if (!sheet) {
    sheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }],
    });

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
      item.materialCode || item.code || '-',
      item.materialLabel || item.label || 'Article',
      Number(item.physicalClosingCount ?? item.count) || 0,
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