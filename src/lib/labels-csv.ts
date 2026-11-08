/** Minimal RFC 4180 CSV parser for the FCC broadband-labels file. */
export function parseLabelsCsv(csv: string): { columns: string[]; rows: Record<string, string>[] } {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (quoted) {
      if (ch === '"' && csv[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { record.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && csv[i + 1] === '\n') i++;
      record.push(field); field = '';
      if (record.some((f) => f !== '')) records.push(record);
      record = [];
    } else field += ch;
  }
  record.push(field);
  if (record.some((f) => f !== '')) records.push(record);

  const [columns = [], ...data] = records;
  return { columns, rows: data.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i] ?? '']))) };
}
