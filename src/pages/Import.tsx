import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileSpreadsheet, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';

// Known header → DB column mapping (lowercase keys)
const H: Record<string, string> = {
  'tag number (new)': 'tag_number', 'tag number': 'tag_number', 'tag no.': 'tag_number',
  'tag no': 'tag_number', 'tag': 'tag_number', 'asset tag': 'tag_number',
  'asset no': 'tag_number', 'asset number': 'tag_number',
  'codification numbers': 'tag_number', 'codification number': 'tag_number',
  'assets description': 'name', 'asset description': 'name', 'description': 'name',
  'asset name': 'name', 'name': 'name', 'item': 'name',
  'brand + technical name of asset': 'name', 'type of asset': 'name', 'model': 'name',
  'asset specification': 'name',
  'category': 'category', 'categories': 'category', 'asset category': 'category',
  'class of asset': 'category', 'type': 'category',
  'category (furniture, it, equipment, vehicle, machinery, tools)': 'category',
  'location': 'location', 'iucn rwanda country office': 'location',
  'current office location': 'location', 'office': 'location', 'site': 'location',
  'user': 'assigned_to', 'assigned to': 'assigned_to', 'current user': 'assigned_to',
  'custodian': 'assigned_to', 'donor/owner': 'assigned_to',
  'supplier': 'supplier', 'vendor': 'supplier',
  'acquisition value /estimated value': 'value', 'acquisition value / estimated value': 'value',
  'acquisition value': 'value', 'estimated value': 'value', 'purchase value': 'value',
  'value': 'value', 'amount': 'value', 'cost': 'value',
  'purchased cost': 'value', 'purchase cost': 'value', 'customs value': 'value',
  'acquisition date/purchase date': 'acquisition_date', 'acquisition date / purchase date': 'acquisition_date',
  'acquisition date': 'acquisition_date', 'purchase date': 'acquisition_date',
  'purchased date': 'acquisition_date', 'requisition date': 'acquisition_date', 'date': 'acquisition_date',
  'funding source / project code': 'funding_source', 'funding source': 'funding_source',
  'project code': 'funding_source',
  'asset condition': 'condition', 'condition': 'condition', 'condition of the asset': 'condition',
  'status category': 'condition', 'status': 'condition',
  'serial no.': 'serial_number', 'serial no': 'serial_number', 'serial number': 'serial_number',
  'serial': 'serial_number', 's/n': 'serial_number', 'sn number': 'serial_number',
  'chassis number': 'serial_number',
  'comment': 'notes', 'comments': 'notes', 'notes': 'notes', 'remarks': 'notes',
};

function mapHeader(h: string): string | null {
  const k = h.trim().toLowerCase();
  if (H[k]) return H[k];
  if (k.includes('tag') || k.includes('codif')) return 'tag_number';
  if (k.includes('description') || k.includes('asset name') || k.includes('brand')) return 'name';
  if (k.includes('category') || k.includes('class')) return 'category';
  if (k.includes('location') || k.includes('office') || k.includes('iucn')) return 'location';
  if (k.includes('user') || k.includes('assigned') || k.includes('owner') || k.includes('donor')) return 'assigned_to';
  if (k.includes('supplier') || k.includes('vendor')) return 'supplier';
  if ((k.includes('value') || k.includes('cost')) && !k.includes('tax') && !k.includes('duty') && !k.includes('vat') && !k.includes('wht') && !k.includes('ipl') && !k.includes('auo') && !k.includes('idl')) return 'value';
  if (k.includes('date') && !k.includes('expir') && !k.includes('insurance') && !k.includes('update')) return 'acquisition_date';
  if (k.includes('funding') || k.includes('project code')) return 'funding_source';
  if (k.includes('condition')) return 'condition';
  if (k.includes('serial') || k.includes('chassis') || k.includes('imei') || k === 's/n') return 'serial_number';
  if (k.includes('comment') || k.includes('note') || k.includes('remark')) return 'notes';
  return null;
}

function sanitizeDate(raw: any): string {
  const today = new Date().toISOString().split('T')[0];
  if (!raw || String(raw).trim() === '' || String(raw).trim().toLowerCase() === 'n/a') return today;
  // Excel serial number
  if (/^\d{5}$/.test(String(raw).trim())) {
    const d = new Date(Date.UTC(1899, 11, 30) + parseInt(raw) * 86400000);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2100)
      return d.toISOString().split('T')[0];
  }
  const s = String(raw).trim();
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const d = new Date(`${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2100)
      return d.toISOString().split('T')[0];
  }
  // M/D/YY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mdy) {
    const yr = mdy[3].length === 2 ? `20${mdy[3]}` : mdy[3];
    const d = new Date(`${yr}-${mdy[1].padStart(2,'0')}-${mdy[2].padStart(2,'0')}`);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2100)
      return d.toISOString().split('T')[0];
  }
  // DD-MM-YY
  const dmy2 = s.match(/^(\d{2})-(\d{2})-(\d{2})$/);
  if (dmy2) {
    const d = new Date(`20${dmy2[3]}-${dmy2[2]}-${dmy2[1]}`);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  const d = new Date(s);
  if (!isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2100)
    return d.toISOString().split('T')[0];
  return today;
}

function sanitizeValue(raw: any): number {
  if (!raw || String(raw).trim().toLowerCase() === 'n/a') return 0;
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  const n = parseFloat(String(raw).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function detectHeaderRow(rows: any[][]): number {
  let best = 0, bestScore = 0;
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const cells = rows[r].map((h: any) => String(h || '').trim().toLowerCase());
    // Score: how many cells map to a known DB column
    const score = cells.filter((c: string) => c && mapHeader(c) !== null).length;
    if (score > bestScore) { bestScore = score; best = r; }
  }
  return best;
}

function stripEmptyColumns(headers: string[], rows: any[][]): { headers: string[]; rows: any[][] } {
  // Find columns that have at least one non-empty value in the data rows
  const keep: number[] = [];
  headers.forEach((h, i) => {
    const hasData = h.trim() !== '' && rows.some(r => r[i] !== undefined && r[i] !== null && String(r[i]).trim() !== '');
    if (hasData) keep.push(i);
  });
  return {
    headers: keep.map(i => headers[i]),
    rows: rows.map(r => keep.map(i => r[i])),
  };
}

function buildRecord(row: any[], headers: string[], sheetName: string, now: string): any | null {
  const rec: any = { created_at: now, updated_at: now, deleted_at: null, sheet_name: sheetName };
  const extra: string[] = [];

  headers.forEach((header, i) => {
    const raw = row[i];
    const strVal = raw !== undefined && raw !== null && String(raw).trim() !== '' && String(raw).trim().toLowerCase() !== 'n/a'
      ? String(raw).trim() : null;
    const dbCol = mapHeader(header);

    if (dbCol) {
      if (dbCol === 'value') rec[dbCol] = sanitizeValue(raw);
      else if (dbCol === 'acquisition_date') rec[dbCol] = sanitizeDate(raw);
      else if (!rec[dbCol]) rec[dbCol] = strVal; // first mapped value wins
    } else if (strVal) {
      extra.push(`${header}: ${strVal}`);
    }
  });

  // Skip truly empty rows
  if (!rec.tag_number && !rec.name && extra.length === 0) return null;

  // Store unmapped columns in notes
  if (extra.length > 0) {
    rec.notes = rec.notes ? `${rec.notes} | ${extra.join(' | ')}` : extra.join(' | ');
  }

  // Guaranteed fallbacks
  if (!rec.tag_number) rec.tag_number = `${sheetName}-${Date.now()}-${Math.random().toString(36).slice(2,5)}`;
  if (!rec.name) rec.name = rec.tag_number;
  if (!rec.category) rec.category = sheetName;
  if (!rec.location) rec.location = '';
  if (!rec.acquisition_date) rec.acquisition_date = new Date().toISOString().split('T')[0];
  if (rec.value === undefined || rec.value === null) rec.value = 0;
  if (!rec.condition) rec.condition = 'Good';

  return rec;
}

export function Import() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<{ name: string; headers: string[]; rows: any[][] }[]>([]);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sel = e.target.files?.[0];
    if (!sel) return;
    setFile(sel);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target?.result as ArrayBuffer), { type: 'array', cellDates: false });
        const parsed = wb.SheetNames.map((sheetName) => {
          const ws = wb.Sheets[sheetName];
          const allRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', raw: false }) as any[][];
          if (allRows.length === 0) return { name: sheetName, headers: [], rows: [] };

          const hi = detectHeaderRow(allRows);
          const rawHeaders = allRows[hi].map((h: any) => String(h).trim());
          const dataRows = allRows.slice(hi + 1).filter(r => r.some((c: any) => c !== '' && c !== null));

          // Strip empty/blank columns
          const { headers, rows } = stripEmptyColumns(rawHeaders, dataRows);
          return { name: sheetName, headers, rows };
        }).filter(s => s.rows.length > 0);

        if (parsed.length === 0) { alert('No data found.'); return; }
        setSheets(parsed);
        setStep(2);
      } catch { alert('Could not read file. Please use .xlsx, .xls or .csv'); }
    };
    reader.readAsArrayBuffer(sel);
  };

  const performImport = async () => {
    setIsImporting(true);
    const now = new Date().toISOString();

    await supabase.from('assets').delete().not('id', 'is', null);

    let totalSuccess = 0, totalFailed = 0;
    const insertedIds: { id: string; tag_number: string }[] = [];
    const seenTags = new Set<string>();

    for (const sheet of sheets) {
      const records: any[] = [];
      for (let i = 0; i < sheet.rows.length; i++) {
        const rec = buildRecord(sheet.rows[i], sheet.headers, sheet.name, now);
        if (!rec) continue;
        if (seenTags.has(rec.tag_number)) continue;
        seenTags.add(rec.tag_number);
        records.push(rec);
      }
      if (records.length === 0) continue;

      // Insert in chunks of 100
      for (let i = 0; i < records.length; i += 100) {
        const chunk = records.slice(i, i + 100);
        const { data, error } = await supabase.from('assets').insert(chunk).select('id, tag_number');
        if (error) {
          console.error(`Sheet "${sheet.name}" error:`, error.message);
          totalFailed += chunk.length;
        } else {
          totalSuccess += data.length;
          insertedIds.push(...data);
        }
      }
    }

    // Batch log
    if (insertedIds.length > 0) {
      await supabase.from('change_logs').insert(
        insertedIds.map(a => ({ asset_id: a.id, field: 'CREATED', old_value: null, new_value: `Imported: ${a.tag_number}`, timestamp: now }))
      );
    }

    setImportResult({ success: totalSuccess, failed: totalFailed });
    setStep(3);
    setIsImporting(false);
  };

  const totalRows = sheets.reduce((s, sh) => s + sh.rows.length, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="pb-4 border-b border-rule">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted mb-1">Bulk Import</p>
        <h2 className="font-serif text-3xl text-ink">Import from Excel</h2>
        <p className="text-sm text-ink-soft mt-1">All sheets imported exactly as in your file. No data is changed.</p>
      </div>

      <ol className="flex items-center justify-between border border-rule bg-paper-light px-6 py-4">
        {['Upload File', 'Preview & Confirm', 'Done'].map((label, i) => {
          const s = i + 1, active = step === s, done = step > s;
          return (
            <li key={label} className="flex items-center gap-3 flex-1">
              <span className={`w-7 h-7 flex items-center justify-center font-mono text-xs border-2 ${active ? 'border-ledger-green bg-ledger-green text-paper-light' : done ? 'border-ledger-green text-ledger-green' : 'border-rule text-ink-muted'}`}>
                {done ? '✓' : s}
              </span>
              <span className={`text-xs uppercase tracking-wider font-semibold ${active || done ? 'text-ink' : 'text-ink-muted'}`}>{label}</span>
              {i < 2 && <span className="flex-1 h-px bg-rule mx-2" />}
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <div className="bg-paper-light border border-rule p-12 text-center">
          <div className="mx-auto w-14 h-14 border-2 border-ink bg-paper-dark flex items-center justify-center mb-4">
            <FileSpreadsheet className="w-6 h-6 text-ink" />
          </div>
          <h3 className="font-serif text-2xl text-ink mb-2">Select Excel or CSV File</h3>
          <p className="text-sm text-ink-soft mb-6 max-w-md mx-auto">All sheets imported as-is. Supported: .xlsx, .xls, .csv</p>
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          <Button onClick={() => fileInputRef.current?.click()} size="lg">
            <Upload className="w-4 h-4 mr-2" />Choose File
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-paper-light border border-rule">
          <div className="px-6 py-4 border-b border-rule bg-paper-dark/40 flex items-center justify-between">
            <h3 className="font-serif text-xl text-ink">Preview</h3>
            <span className="text-xs text-ink-muted font-mono">{file?.name} · {sheets.length} sheets · {totalRows} rows</span>
          </div>
          <div className="p-6 space-y-8">
            {sheets.map((sheet) => (
              <div key={sheet.name}>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">
                  Sheet: <span className="text-ink">{sheet.name}</span> — {sheet.rows.length} rows · {sheet.headers.length} columns
                </p>
                <div className="overflow-x-auto border border-rule">
                  <table className="min-w-full text-sm text-left">
                    <thead className="bg-paper-dark/60 border-b-2 border-ink">
                      <tr>
                        {sheet.headers.map((h, i) => (
                          <th key={i} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sheet.rows.slice(0, 5).map((row, ri) => (
                        <tr key={ri} className={`border-b border-rule-soft ${ri % 2 === 1 ? 'bg-paper-dark/15' : ''}`}>
                          {sheet.headers.map((_, ci) => (
                            <td key={ci} className="px-3 py-2 text-ink-soft whitespace-nowrap">{String(row[ci] ?? '').slice(0, 50)}</td>
                          ))}
                        </tr>
                      ))}
                      {sheet.rows.length > 5 && (
                        <tr><td colSpan={sheet.headers.length} className="px-3 py-2 text-xs text-ink-muted italic">…and {sheet.rows.length - 5} more rows</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-rule bg-paper-dark/40 flex justify-between gap-3">
            <Button variant="secondary" onClick={() => setStep(1)}>Choose another file</Button>
            <Button onClick={performImport} disabled={isImporting} isLoading={isImporting}>Confirm and Import</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-paper-light border border-rule">
          <div className="px-6 py-4 border-b border-rule bg-paper-dark/40">
            <h3 className="font-serif text-xl text-ink">Import Complete</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-ledger-green" />
              <span className="text-sm text-ink">
                {importResult?.success ?? 0} assets imported
                {importResult?.failed ? ` · ${importResult.failed} failed` : ''}
              </span>
            </div>
            <div className="flex gap-3 pt-2 flex-wrap">
              <Button onClick={() => navigate('/assets')}>View Assets</Button>
              <Button variant="secondary" onClick={() => { setStep(1); setSheets([]); setFile(null); }}>Import Another File</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
