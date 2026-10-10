'use client';

export default function ExportCsv({ rows, filename, columns }: {
  rows: Record<string, unknown>[]; filename: string; columns: { key: string; label: string }[];
}) {
  function download() {
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [columns.map((c) => esc(c.label)).join(',')];
    for (const r of rows) lines.push(columns.map((c) => esc(r[c.key])).join(','));
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button type="button" className="btn btn-ghost" onClick={download} disabled={rows.length === 0}>
      Export to Excel (CSV)
    </button>
  );
}
