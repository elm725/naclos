export function monthRange(month: string): { start: string; end: string } {
  const [year, mon] = month.split('-').map(Number);
  if (!year || !mon) {
    throw new Error(`Invalid month string: "${month}", expected "YYYY-MM"`);
  }
  const start = `${month}-01`;
  const endDate = new Date(Date.UTC(year, mon, 1));
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
}