export function csvCell(value) {
  let text = String(value ?? '');
  let first = 0;
  while (first < text.length && (text.charCodeAt(first) <= 32 || /\s/.test(text[first]))) first += 1;
  if (/^[=+\-@]/.test(text.slice(first))) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function serializeCsv(rows) {
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
