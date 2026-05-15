import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, X, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';

const DEFAULT_COLUMNS = [
  'Tag Number', 'Assets Description', 'Category', 'LOCATION',
  'User', 'Supplier', 'Acquisition Value', 'Acquisition Date',
  'Funding Source', 'Asset Condition', 'Serial No.', 'Comment',
];

const COL_TO_DB: Record<string, string> = {
  'tag number': 'tag_number', 'tag no': 'tag_number', 'tag no.': 'tag_number',
  'assets description': 'name', 'asset description': 'name', 'description': 'name', 'name': 'name',
  'category': 'category',
  'location': 'location',
  'user': 'assigned_to', 'assigned to': 'assigned_to',
  'supplier': 'supplier',
  'acquisition value': 'value', 'value': 'value', 'amount': 'value', 'cost': 'value',
  'acquisition date': 'acquisition_date', 'date': 'acquisition_date', 'purchase date': 'acquisition_date',
  'funding source': 'funding_source', 'project code': 'funding_source',
  'asset condition': 'condition', 'condition': 'condition',
  'serial no.': 'serial_number', 'serial no': 'serial_number', 'serial number': 'serial_number',
  'comment': 'notes', 'notes': 'notes', 'remarks': 'notes',
};

function toDb(col: string): string | null {
  return COL_TO_DB[col.toLowerCase()] || null;
}


function tryParseCustomNotes(notes: string | null | undefined): {
  legacyText: string;
  custom: Record<string, string>;
} {
  if (!notes) return { legacyText: '', custom: {} };

  const trimmed = notes.trim();
  if (!trimmed) return { legacyText: '', custom: {} };

  // Expect JSON in the form: {"__customFields": true, "fields": {...}}
  if (trimmed.startsWith('{') && trimmed.includes('__customFields')) {
    try {
      const parsed = JSON.parse(trimmed);
      const fields = parsed?.fields;
      if (parsed?.__customFields === true && fields && typeof fields === 'object') {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(fields as Record<string, any>)) {
          out[k] = v == null ? '' : String(v);
        }
        return { legacyText: '', custom: out };
      }
    } catch {
      // fallthrough
    }
  }

  // Legacy plain-text notes
  return { legacyText: notes, custom: {} };
}

function buildCustomNotesJSON(custom: Record<string, string>, legacyText?: string) {
  const payload = {
    __customFields: true,
    fields: custom,
    legacyText: legacyText?.trim() ? legacyText.trim() : undefined,
  };
  return JSON.stringify(payload);
}


function sanitizeDate(v: string): string {
  if (!v?.trim()) return new Date().toISOString().split('T')[0];
  const dmy = v.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);


  if (dmy) {
    const d = new Date(`${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  const d = new Date(v.trim());
  return !isNaN(d.getTime()) && d.getFullYear() > 1900 ? d.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
}

interface ColumnDef {
  key: string; // stable identifier used for DB mapping & notes
  label: string; // editable UI label
}

interface Sheet {
  id: string;
  name: string;
  columns: ColumnDef[];
  rows: Record<string, string>[]; // indexed by ColumnDef.key
}


function makeSheet(name: string, columns = DEFAULT_COLUMNS): Sheet {
  return {
    id: crypto.randomUUID(),
    name,
    columns: columns.map((c) => ({ key: c, label: c })),
    rows: [{}],
  };
}


// All known system headers a user can pick from
const SYSTEM_HEADERS = [
  'Tag Number', 'Assets Description', 'Category', 'LOCATION',
  'User', 'Supplier', 'Acquisition Value', 'Acquisition Date',
  'Funding Source', 'Asset Condition', 'Serial No.', 'Comment',
];

export function AssetForm() {
  const navigate = useNavigate();
  const [sheets, setSheets] = useState<Sheet[]>([makeSheet('Sheet 1')]);
  const [activeId, setActiveId] = useState<string>(sheets[0].id);
  const [newSheetName, setNewSheetName] = useState('');
  const [newColName, setNewColName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [dbHeaders, setDbHeaders] = useState<string[]>([]);
  const [showColDropdown, setShowColDropdown] = useState(false);

  // Fetch unique column headers already used in the DB
  React.useEffect(() => {
    supabase.from('assets').select('*').limit(1).then(({ data }) => {
      if (data && data[0]) {
        // Map DB columns back to display names
        const dbColToDisplay: Record<string, string> = {
          tag_number: 'Tag Number', name: 'Assets Description', category: 'Category',
          location: 'LOCATION', assigned_to: 'User', supplier: 'Supplier',
          value: 'Acquisition Value', acquisition_date: 'Acquisition Date',
          funding_source: 'Funding Source', condition: 'Asset Condition',
          serial_number: 'Serial No.', notes: 'Comment', sheet_name: 'Sheet Name',
        };
        const cols = Object.keys(data[0])
          .filter(k => !['id','created_at','updated_at','deleted_at','insurance_expiry'].includes(k))
          .map(k => dbColToDisplay[k] || k);
        setDbHeaders(cols);
      } else {
        setDbHeaders(SYSTEM_HEADERS);
      }
    });
  }, []);

  const active = sheets.find(s => s.id === activeId)!;

  // Close dropdown on outside click
  React.useEffect(() => {
    const handler = () => setShowColDropdown(false);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const updateSheet = (id: string, fn: (s: Sheet) => Sheet) =>
    setSheets(prev => prev.map(s => s.id === id ? fn(s) : s));

  // Sheet actions
  const addSheet = () => {
    const name = newSheetName.trim() || `Sheet ${sheets.length + 1}`;
    const s = makeSheet(name);
    setSheets(prev => [...prev, s]);
    setActiveId(s.id);
    setNewSheetName('');
  };

  const removeSheet = (id: string) => {
    if (sheets.length === 1) return;
    const remaining = sheets.filter(s => s.id !== id);
    setSheets(remaining);
    if (activeId === id) setActiveId(remaining[0].id);
  };

  const renameSheet = (id: string, name: string) =>
    updateSheet(id, s => ({ ...s, name }));

  // Column actions
  const addColumn = () => {
    const label = newColName.trim();
    if (!label) return;
    if (active.columns.some((c) => c.label === label || c.key === label)) return;

    const key = label;
    updateSheet(activeId, (s) => ({
      ...s,
      columns: [...s.columns, { key, label }],
    }));
    setNewColName('');
  };

  const removeColumn = (colKey: string) =>
    updateSheet(activeId, (s) => ({
      ...s,
      columns: s.columns.filter((c) => c.key !== colKey),
      rows: s.rows.map((r) => {
        const nr = { ...r };
        delete nr[colKey];
        return nr;
      }),
    }));

  // Row actions
  const addRow = () => updateSheet(activeId, (s) => ({ ...s, rows: [...s.rows, {}] }));

  const removeRow = (ri: number) =>
    updateSheet(activeId, (s) => ({
      ...s,
      rows: s.rows.length > 1 ? s.rows.filter((_, i) => i !== ri) : s.rows,
    }));

  const updateCell = (ri: number, colKey: string, val: string) =>
    updateSheet(activeId, (s) => ({
      ...s,
      rows: s.rows.map((r, i) => (i === ri ? { ...r, [colKey]: val } : r)),
    }));


  // Save
  const handleSave = async () => {
    setIsSaving(true);
    const now = new Date().toISOString();
    const allRecords: any[] = [];

    for (const sheet of sheets) {
      for (const row of sheet.rows) {
        if (!Object.values(row).some(v => v?.trim())) continue;
        const rec: any = { created_at: now, updated_at: now, deleted_at: null, sheet_name: sheet.name };
        const extra: string[] = [];

        sheet.columns.forEach((col) => {
          const val = row[col.key]?.trim() || null;

          // IMPORTANT:
          // - Use stable col.key for DB mapping (so renaming col.label does not break persistence)
          // - Use label only for UI/custom-field display
          const dbKey = toDb(col.key);

          if (dbKey) {
            if (dbKey === 'value') rec[dbKey] = val ? parseFloat(val.replace(/[^0-9.-]/g, '')) || 0 : 0;
            else if (dbKey === 'acquisition_date') rec[dbKey] = sanitizeDate(val || '');
            else if (!rec[dbKey]) rec[dbKey] = val;
          } else if (val) {
            extra.push(`${col.key}: ${val}`);
          }
        });


        // Store custom (non-system) columns in notes as JSON
        // so they can be rendered/edit later.
        if (extra.length > 0) {
          // extra is already "{Column}: {value}"; convert to key/value by splitting only on first ':'
          const custom: Record<string, string> = {};
          for (const item of extra) {
            const idx = item.indexOf(':');
            if (idx === -1) continue;
            const k = item.slice(0, idx).trim();
            const v = item.slice(idx + 1).trim();
            if (k) custom[k] = v;
          }

          const parsedExisting = tryParseCustomNotes(rec.notes);
          const legacyText = parsedExisting.legacyText;
          // Preserve legacy text (if any), overwrite custom fields with latest
          rec.notes = buildCustomNotesJSON({
            ...parsedExisting.custom,
            ...custom,
          }, legacyText);
        }


        if (!rec.tag_number) rec.tag_number = `ENTRY-${Date.now()}-${Math.random().toString(36).slice(2,5)}`;
        if (!rec.name) rec.name = rec.tag_number;
        if (!rec.category) rec.category = sheet.name;
        if (!rec.location) rec.location = '';
        if (!rec.acquisition_date) rec.acquisition_date = now.split('T')[0];
        if (rec.value === undefined || rec.value === null) rec.value = 0;
        if (!rec.condition) rec.condition = 'Good';

        allRecords.push(rec);
      }
    }

    if (allRecords.length === 0) { setIsSaving(false); return; }

    const { error } = await supabase.from('assets').insert(allRecords);
    if (!error) {
      navigate('/assets');
    } else {
      console.error('Save error:', error);
      alert('Failed to save. Check console for details.');
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-rule">
        <button onClick={() => navigate(-1)} className="p-2 text-ink-soft hover:text-ink border border-rule hover:border-ink">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted mb-1">New Entry</p>
          <h2 className="font-serif text-3xl text-ink">Add Asset Records</h2>
        </div>
      </div>

      {/* Sheet tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-rule pb-0">
        {sheets.map(s => (
          <div
            key={s.id}
            onClick={() => setActiveId(s.id)}
            className={`group flex items-center gap-1 px-4 py-2 text-xs font-semibold uppercase tracking-wider border-t border-l border-r cursor-pointer select-none transition-colors ${
              s.id === activeId
                ? 'bg-paper-light border-rule text-ink -mb-px z-10'
                : 'bg-paper-dark/40 border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <FileSpreadsheet className="w-3 h-3" />
            <input
              value={s.name}
              onChange={e => renameSheet(s.id, e.target.value)}
              onClick={e => e.stopPropagation()}
              className="bg-transparent outline-none w-20 text-xs font-semibold uppercase tracking-wider"
            />
            {sheets.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); removeSheet(s.id); }}
                className="opacity-0 group-hover:opacity-100 text-ink-muted hover:text-ledger-red ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        {/* Add sheet */}
        <div className="flex items-center gap-1 ml-2">
          <input
            type="text"
            value={newSheetName}
            onChange={e => setNewSheetName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSheet()}
            placeholder="New sheet name..."
            className="border border-rule bg-paper-light px-2 py-1.5 text-xs text-ink w-36 focus:outline-none focus:border-ink"
          />
          <button
            onClick={addSheet}
            className="p-1.5 border border-rule bg-paper-light text-ink-muted hover:text-ink hover:border-ink"
            title="Add sheet"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Active sheet */}
      <div className="bg-paper-light border border-rule">
        {/* Column toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-rule bg-paper-dark/20">
          <span className="text-xs text-ink-muted uppercase tracking-wider">Add column:</span>
          <div className="relative">
            <input
              type="text"
              value={newColName}
              onChange={e => { setNewColName(e.target.value); setShowColDropdown(true); }}
              onFocus={() => setShowColDropdown(true)}
              onKeyDown={e => { if (e.key === 'Enter') { addColumn(); setShowColDropdown(false); } if (e.key === 'Escape') setShowColDropdown(false); }}
              placeholder="Pick or type a column..."
              className="border border-rule bg-paper-light px-2 py-1.5 text-xs text-ink w-52 focus:outline-none focus:border-ink"
            />
            {showColDropdown && (
              <div className="absolute top-full left-0 z-50 bg-paper-light border border-rule shadow-md w-52 max-h-56 overflow-y-auto">
                {/* Existing DB headers */}
                {dbHeaders
                  .filter(
                    (h) =>
                      !active.columns.some((c) => c.key === h) &&
                      h.toLowerCase().includes(newColName.toLowerCase())
                  )
                  .map((h) => (
                    <button
                      key={h}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setNewColName(h);
                        updateSheet(activeId, (s) => ({
                          ...s,
                          columns: [...s.columns, { key: h, label: h }],
                        }));
                        setNewColName('');
                        setShowColDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-ink hover:bg-paper-dark/40 border-b border-rule/40 last:border-0"
                    >
                      {h}
                    </button>
                  ))}
                {/* Option to create new custom column */}
                {newColName.trim() &&
                  !dbHeaders.includes(newColName.trim()) &&
                  !active.columns.some((c) => c.key === newColName.trim()) && (
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addColumn();
                        setShowColDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-ledger-green hover:bg-paper-dark/40 font-semibold"
                    >
                      + Create "{newColName.trim()}"
                    </button>
                  )}

              </div>
            )}
          </div>
          <button
            onClick={() => { addColumn(); setShowColDropdown(false); }}
            className="p-1.5 border border-rule bg-paper-light text-ink-muted hover:text-ink hover:border-ink"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Spreadsheet */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-paper-dark/60 border-b-2 border-ink">
                <th className="px-2 py-3 w-8 text-ink-muted text-xs font-normal">#</th>
                {active.columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <input
                        value={col.label}
                        onChange={(e) =>
                          updateSheet(activeId, (s) => ({
                            ...s,
                            columns: s.columns.map((c) =>
                              c.key === col.key ? { ...c, label: e.target.value } : c
                            ),
                          }))
                        }
                        className="bg-transparent outline-none w-full focus:border-ink border border-transparent hover:border-rule px-1 rounded"
                      />
                      <button
                        onClick={() => removeColumn(col.key)}
                        className="text-ink-muted hover:text-ledger-red opacity-0 hover:opacity-100 group-hover:opacity-100 ml-1"
                        title="Remove column"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="px-2 py-3 w-8" />

              </tr>
            </thead>
            <tbody>
              {active.rows.map((row, ri) => (
                <tr key={ri} className={`border-b border-rule-soft hover:bg-paper-dark/20 ${ri % 2 === 1 ? 'bg-paper-dark/10' : ''}`}>
                  <td className="px-2 py-1 text-xs text-ink-muted text-center">{ri + 1}</td>
                  {active.columns.map((col) => (
                    <td key={col.key} className="px-1 py-1">
                      <input
                        type="text"
                        value={row[col.key] || ''}
                        onChange={(e) => updateCell(ri, col.key, e.target.value)}
                        className="w-full min-w-[110px] px-2 py-1.5 text-sm text-ink bg-transparent border border-transparent hover:border-rule focus:border-ink focus:outline-none focus:bg-white"
                        placeholder="—"
                      />
                    </td>
                  ))}

                  <td className="px-2 py-1 text-center">
                    <button onClick={() => removeRow(ri)} className="text-ink-muted hover:text-ledger-red">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add row */}
        <div className="px-4 py-3 border-t border-rule">
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink uppercase tracking-wider font-semibold"
          >
            <Plus className="w-3.5 h-3.5" /> Add Row
          </button>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex justify-between items-center">
        <p className="text-xs text-ink-muted">
          {sheets.length} sheet{sheets.length > 1 ? 's' : ''} · {sheets.reduce((s, sh) => s + sh.rows.filter(r => Object.values(r).some(v => v?.trim())).length, 0)} rows with data
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
          <Button onClick={handleSave} isLoading={isSaving}>
            <Save className="w-3.5 h-3.5 mr-2" />Save All Sheets
          </Button>
        </div>
      </div>
    </div>
  );
}
