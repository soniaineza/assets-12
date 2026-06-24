import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, X, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { useI18n } from '../lib/i18n';

interface ColumnDef {
  key: string;
  label: string;
}

interface Sheet {
  id: string;
  name: string;
  columns: ColumnDef[];
  rows: Record<string, string>[];
}

function makeSheet(name: string): Sheet {
  return {
    id: crypto.randomUUID(),
    name,
    columns: [],
    rows: [{}],
  };
}

export function AssetForm() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [sheets, setSheets] = useState<Sheet[]>([makeSheet('Sheet 1')]);
  const [activeId, setActiveId] = useState<string>(sheets[0].id);
  const [newSheetName, setNewSheetName] = useState('');
  const [newColName, setNewColName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const active = sheets.find(s => s.id === activeId)!;

  const updateSheet = (id: string, fn: (s: Sheet) => Sheet) =>
    setSheets(prev => prev.map(s => s.id === id ? fn(s) : s));

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

  const addColumn = () => {
    const label = newColName.trim();
    if (!label) return;
    if (active.columns.some(c => c.key === label)) return;
    updateSheet(activeId, s => ({
      ...s,
      columns: [...s.columns, { key: label, label }],
    }));
    setNewColName('');
  };

  const removeColumn = (colKey: string) =>
    updateSheet(activeId, s => ({
      ...s,
      columns: s.columns.filter(c => c.key !== colKey),
      rows: s.rows.map(r => {
        const nr = { ...r };
        delete nr[colKey];
        return nr;
      }),
    }));

  const addRow = () => updateSheet(activeId, s => ({ ...s, rows: [...s.rows, {}] }));

  const removeRow = (ri: number) =>
    updateSheet(activeId, s => ({
      ...s,
      rows: s.rows.length > 1 ? s.rows.filter((_, i) => i !== ri) : s.rows,
    }));

  const updateCell = (ri: number, colKey: string, val: string) =>
    updateSheet(activeId, s => ({
      ...s,
      rows: s.rows.map((r, i) => (i === ri ? { ...r, [colKey]: val } : r)),
    }));

  const handleSave = async () => {
    setIsSaving(true);
    const now = new Date().toISOString();
    const allRecords: any[] = [];

    for (const sheet of sheets) {
      for (const row of sheet.rows) {
        if (!Object.values(row).some(v => v?.trim())) continue;

        const fields: Record<string, string> = {};
        const labels: Record<string, string> = {};

        sheet.columns.forEach(col => {
          const val = row[col.key]?.trim() || '';
          fields[col.key] = val;
          labels[col.key] = col.label;
        });

        const rec: any = {
          created_at: now,
          updated_at: now,
          deleted_at: null,
          sheet_name: sheet.name,
          notes: JSON.stringify({ __customFields: true, fields, labels }),
        };

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
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted mb-1">{t('newEntrySubtitle')}</p>
          <h2 className="font-serif text-3xl text-ink">{t('newEntryTitle')}</h2>
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
        <div className="flex items-center gap-1 ml-2">
          <input
            type="text"
            value={newSheetName}
            onChange={e => setNewSheetName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSheet()}
            placeholder={t('newSheetName')}
            className="border border-rule bg-paper-light px-2 py-1.5 text-xs text-ink w-36 focus:outline-none focus:border-ink"
          />
          <button
            onClick={addSheet}
            className="p-1.5 border border-rule bg-paper-light text-ink-muted hover:text-ink hover:border-ink"
            title={t('addSheet')}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Active sheet */}
      <div className="bg-paper-light border border-rule">
        {/* Column toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-rule bg-paper-dark/20">
          <span className="text-xs text-ink-muted uppercase tracking-wider">{t('addColumnBtn')}</span>
          <input
            type="text"
            value={newColName}
            onChange={e => setNewColName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addColumn(); }}
            placeholder={t('pickColumn')}
            className="border border-rule bg-paper-light px-2 py-1.5 text-xs text-ink w-52 focus:outline-none focus:border-ink"
          />
          <button
            onClick={addColumn}
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
                          updateSheet(activeId, s => ({
                            ...s,
                            columns: s.columns.map(c =>
                              c.key === col.key ? { ...c, label: e.target.value } : c
                            ),
                          }))
                        }
                        className="bg-transparent outline-none w-full focus:border-ink border border-transparent hover:border-rule px-1 rounded"
                      />
                      <button
                        onClick={() => removeColumn(col.key)}
                        className="text-ink-muted hover:text-ledger-red opacity-0 hover:opacity-100 ml-1"
                        title={t('removeColumn')}
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
            <Plus className="w-3.5 h-3.5" />{t('addRow')}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center">
        <p className="text-xs text-ink-muted">
          {t('sheetsCount', { n: sheets.length, rows: sheets.reduce((s, sh) => s + sh.rows.filter(r => Object.values(r).some(v => v?.trim())).length, 0) })}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>{t('cancel')}</Button>
          <Button onClick={handleSave} isLoading={isSaving}>
            <Save className="w-3.5 h-3.5 mr-2" />{t('saveAllSheets')}
          </Button>
        </div>
      </div>
    </div>
  );
}
