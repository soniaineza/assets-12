import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Eye, FileSpreadsheet } from 'lucide-react';
import XLSX from 'xlsx-js-style';
import { store } from '../lib/assetStore';
import { Asset } from '../lib/types';
import {
  getAllColumnKeys,
  getAllColumnLabels,
  getCustomColumnValue,
  tryParseCustomFieldsNotes,
  buildCustomFieldsNotes,
} from '../lib/customFields';
import { useI18n } from '../lib/i18n';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

function DynamicCell({ value, onSave }: { value: string; onSave: (val: string) => Promise<void> }) {
  const [local, setLocal] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLocal(value); }, [value]);

  return (
    <input
      className="w-full min-w-[100px] bg-transparent px-2 py-1.5 text-sm text-ink border border-transparent hover:border-rule focus:border-ink focus:outline-none focus:bg-paper-light"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={async () => {
        if (local === value) return;
        setSaving(true);
        await onSave(local);
        setSaving(false);
      }}
      disabled={saving}
    />
  );
}

export function AssetList() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sheetFilter, setSheetFilter] = useState('');
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnKey, setNewColumnKey] = useState('');

  useEffect(() => { loadAssets(); }, []);

  const loadAssets = async () => {
    try {
      const data = await store.getAssets();
      setAssets(data);
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Dynamically compute all column keys and labels from assets
  const allColumnKeys = useMemo(() => getAllColumnKeys(assets), [assets]);
  const allColumnLabels = useMemo(() => getAllColumnLabels(assets), [assets]);

  // Sort columns alphabetically by label
  const sortedColumns = useMemo(() =>
    [...allColumnKeys].sort((a, b) =>
      (allColumnLabels[a] || a).localeCompare(allColumnLabels[b] || b)
    ),
    [allColumnKeys, allColumnLabels]
  );

  const [columnKeys, setColumnKeys] = useState<string[]>(() => sortedColumns);
  const [columnLabels, setColumnLabels] = useState<Record<string, string>>(() => allColumnLabels);

  // Sync when assets change
  useEffect(() => {
    setColumnKeys(sortedColumns);
    setColumnLabels((prev) => {
      const merged = { ...allColumnLabels };
      // Preserve any user-renamed labels
      for (const k of Object.keys(prev)) {
        if (k in merged) merged[k] = prev[k];
      }
      return merged;
    });
  }, [sortedColumns, allColumnLabels]);

  const sheets = useMemo(
    () => Array.from(new Set(assets.map((a) => a.sheetName))).filter(Boolean) as string[],
    [assets]
  );

  const updateAssetNotes = useCallback(async (asset: Asset, key: string, value: string, label?: string) => {
    const p = tryParseCustomFieldsNotes(asset.notes);
    p.custom[key] = value;
    if (label) p.labels[key] = label;
    const nextNotes = buildCustomFieldsNotes(p.custom, p.legacyText, p.labels);
    await store.updateAsset(asset.id, { notes: nextNotes } as any);
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(t('confirmDelete', { name }))) {
      try {
        await store.softDeleteAsset(id);
        await loadAssets();
      } catch {
        alert(t('failedDelete'));
      }
    }
  };

  // Filtering: search across ALL column values
  const filtered = useMemo(() => {
    let result = assets;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((a) => {
        // Search in all JSON fields
        const p = tryParseCustomFieldsNotes(a.notes);
        for (const v of Object.values(p.custom)) {
          if (v.toLowerCase().includes(q)) return true;
        }
        // Also check DB fields for backward compat
        if (a.tagNumber?.toLowerCase().includes(q)) return true;
        if (a.name?.toLowerCase().includes(q)) return true;
        return false;
      });
    }
    if (sheetFilter) result = result.filter((a) => a.sheetName === sheetFilter);
    return result;
  }, [assets, search, sheetFilter]);

  // Export to Excel
  const exportToExcel = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const sheetsByName: Record<string, Asset[]> = {};

    filtered.forEach((a) => {
      const sn = a.sheetName || t('assetRegister');
      if (!sheetsByName[sn]) sheetsByName[sn] = [];
      sheetsByName[sn].push(a);
    });

    const wb = XLSX.utils.book_new();
    const headers = [...columnKeys.map((k) => columnLabels[k] || k)];

    Object.entries(sheetsByName).forEach(([sheetName, sheetAssets]) => {
      const aoa: any[][] = [
        [t('officeRwanda'), '', `DATE OF FIXED ASSET REGISTER: ${dateStr}`, ...Array(headers.length - 3).fill('')],
        [],
        [t('fixedAssetInfo'), ...Array(headers.length - 1).fill('')],
        [],
        headers,
        ...sheetAssets.map((a) =>
          columnKeys.map((k) => getCustomColumnValue(a, k))
        ),
        [t('totalLabel', { n: sheetAssets.length }), ...Array(headers.length - 1).fill('')],
      ];

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const numCols = headers.length;
      ws['!cols'] = columnKeys.map(() => ({ wch: 22 }));
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
        { s: { r: 0, c: 2 }, e: { r: 0, c: numCols - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: numCols - 1 } },
      ];

      const col = (c: number) => String.fromCharCode(65 + c);
      const ref = (r: number, c: number) => `${col(c)}${r + 1}`;
      const headerRowIdx = 4;
      const dataStartRow = 5;
      const dataEndRow = dataStartRow + sheetAssets.length - 1;
      const totalRowIdx = dataEndRow + 1;

      for (let c = 0; c < numCols; c++) {
        const titleCell = ws[ref(0, c)];
        if (titleCell) {
          titleCell.s = {
            font: { bold: true, sz: 12, color: { rgb: '1F3864' } },
            fill: { fgColor: { rgb: 'D9E1F2' } },
            alignment: { horizontal: c === 0 ? 'left' : 'right', vertical: 'center' },
          };
        }
        const infoCell = ws[ref(2, c)];
        if (infoCell) {
          infoCell.s = {
            font: { bold: true, sz: 11, color: { rgb: '1F3864' } },
            fill: { fgColor: { rgb: 'D9E1F2' } },
            alignment: { horizontal: 'center', vertical: 'center' },
          };
        }
      }

      for (let c = 0; c < numCols; c++) {
        const cell = ws[ref(headerRowIdx, c)];
        if (cell) {
          cell.s = {
            font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '1F3864' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: 'FFFFFF' } },
              bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
              left: { style: 'thin', color: { rgb: 'FFFFFF' } },
              right: { style: 'thin', color: { rgb: 'FFFFFF' } },
            },
          };
        }
      }

      for (let r = dataStartRow; r <= dataEndRow; r++) {
        const isEven = (r - dataStartRow) % 2 === 0;
        const fillColor = isEven ? 'FFFFFF' : 'EEF2F7';
        for (let c = 0; c < numCols; c++) {
          if (!ws[ref(r, c)]) ws[ref(r, c)] = { v: '', t: 's' };
          ws[ref(r, c)].s = {
            font: { sz: 10 },
            fill: { fgColor: { rgb: fillColor } },
            alignment: { horizontal: 'left', vertical: 'center' },
            border: {
              top: { style: 'hair', color: { rgb: 'CCCCCC' } },
              bottom: { style: 'hair', color: { rgb: 'CCCCCC' } },
              left: { style: 'hair', color: { rgb: 'CCCCCC' } },
              right: { style: 'hair', color: { rgb: 'CCCCCC' } },
            },
          };
        }
      }

      for (let c = 0; c < numCols; c++) {
        if (!ws[ref(totalRowIdx, c)]) ws[ref(totalRowIdx, c)] = { v: '', t: 's' };
        ws[ref(totalRowIdx, c)].s = {
          font: { bold: true, sz: 10, color: { rgb: '1F3864' } },
          fill: { fgColor: { rgb: 'D9E1F2' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'medium', color: { rgb: '1F3864' } },
            bottom: { style: 'medium', color: { rgb: '1F3864' } },
            left: { style: 'thin', color: { rgb: '1F3864' } },
            right: { style: 'thin', color: { rgb: '1F3864' } },
          },
        };
      }

      ws['!rows'] = [
        { hpt: 22 },
        { hpt: 6 },
        { hpt: 20 },
        { hpt: 6 },
        { hpt: 36 },
        ...sheetAssets.map(() => ({ hpt: 18 })),
        { hpt: 20 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    });

    XLSX.writeFile(wb, `Fixed_Assets_Register_${dateStr}.xlsx`);
  };

  const addColumn = async (key: string) => {
    const k = key.trim();
    if (!k || columnKeys.includes(k)) return;
    const nextKeys = [...columnKeys, k];
    const nextLabels = { ...columnLabels, [k]: k };
    setColumnKeys(nextKeys);
    setColumnLabels(nextLabels);

    await Promise.all(
      assets
        .filter((a) => (a.notes || '').includes('__customFields'))
        .map((a) => {
          const p = tryParseCustomFieldsNotes(a.notes);
          p.custom[k] = '';
          p.labels[k] = k;
          return store.updateAsset(a.id, { notes: buildCustomFieldsNotes(p.custom, p.legacyText, p.labels) } as any);
        })
    );
  };

  const removeColumn = async (key: string) => {
    if (!window.confirm(t('confirmDeleteColumn', { name: columnLabels[key] || key }))) return;
    const nextKeys = columnKeys.filter((k) => k !== key);
    const nextLabels = { ...columnLabels };
    delete nextLabels[key];
    setColumnKeys(nextKeys);
    setColumnLabels(nextLabels);

    await Promise.all(
      assets
        .filter((a) => (a.notes || '').includes('__customFields'))
        .map((a) => {
          const p = tryParseCustomFieldsNotes(a.notes);
          delete p.custom[key];
          delete p.labels[key];
          return store.updateAsset(a.id, { notes: buildCustomFieldsNotes(p.custom, p.legacyText, p.labels) } as any);
        })
    );
  };

  const renameColumn = async (key: string, newLabel: string) => {
    const label = newLabel.trim();
    if (!label) return;
    setColumnLabels((prev) => ({ ...prev, [key]: label }));

    await Promise.all(
      assets
        .filter((a) => (a.notes || '').includes('__customFields'))
        .map((a) => {
          const p = tryParseCustomFieldsNotes(a.notes);
          p.labels[key] = label;
          return store.updateAsset(a.id, { notes: buildCustomFieldsNotes(p.custom, p.legacyText, p.labels) } as any);
        })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-4 border-b border-rule">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted mb-1">Section A</p>
          <h2 className="font-serif text-3xl text-ink">Asset Register</h2>
          <p className="text-sm text-ink-soft mt-1">{filtered.length} of {assets.length} entries shown</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportToExcel}>
            <FileSpreadsheet className="w-3.5 h-3.5 mr-2" />Export to Excel
          </Button>
          <Button onClick={() => navigate('/assets/new')}>
            <Plus className="w-3.5 h-3.5 mr-2" />New Entry
          </Button>
        </div>
      </div>

      {/* Sheet tabs */}
      {sheets.length > 0 && (
        <div className="flex items-stretch border-b border-rule bg-paper-dark/20 -mb-px">
          <button
            onClick={() => setSheetFilter('')}
            className={`
              flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors
              ${!sheetFilter
                ? 'bg-paper-light text-ink border-t-2 border-l border-r border-rule border-t-ledger-green -mb-px z-10'
                : 'text-ink-muted hover:text-ink border-b border-rule hover:bg-paper-dark/40'
              }
            `}
          >
            {t('allSheets')}
          </button>
          {sheets.map((s) => {
            const count = assets.filter((a) => a.sheetName === s).length;
            const active = sheetFilter === s;
            return (
              <button
                key={s}
                onClick={() => setSheetFilter(s)}
                className={`
                  flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors
                  ${active
                    ? 'bg-paper-light text-ink border-t-2 border-l border-r border-rule border-t-ledger-green -mb-px z-10'
                    : 'text-ink-muted hover:text-ink border-b border-rule hover:bg-paper-dark/40'
                  }
                `}
              >
                <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-mono rounded bg-paper-dark border border-rule text-ink-soft">
                  {count}
                </span>
                {s}
              </button>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="bg-paper-light border border-rule p-4">
        <Input
          placeholder="Search across all columns..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Columns toolbar */}
      <div className="bg-paper-light border border-rule p-3 flex items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Columns</span>
        {columnKeys.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {columnKeys.map((k) => (
              <span
                key={k}
                className="group flex items-center gap-1 text-xs bg-paper-dark border border-rule px-2 py-0.5 text-ink-soft"
              >
                {columnLabels[k] || k}
                <button
                  onClick={() => removeColumn(k)}
                  className="text-ink-muted hover:text-ledger-red opacity-0 group-hover:opacity-100 transition-opacity"
                  title={`Remove column "${columnLabels[k] || k}"`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {addingColumn ? (
          <div className="flex items-center gap-1 ml-auto">
            <input
              autoFocus
              className="w-36 bg-paper-light border border-ink px-2 py-1 text-xs font-semibold uppercase tracking-wider"
              placeholder="Column name"
              value={newColumnKey}
              onChange={(e) => setNewColumnKey(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  await addColumn(newColumnKey);
                  setNewColumnKey('');
                  setAddingColumn(false);
                }
                if (e.key === 'Escape') {
                  setNewColumnKey('');
                  setAddingColumn(false);
                }
              }}
              onBlur={async () => {
                if (newColumnKey.trim()) {
                  await addColumn(newColumnKey);
                }
                setNewColumnKey('');
                setAddingColumn(false);
              }}
            />
          </div>
        ) : (
          <button
            onClick={() => setAddingColumn(true)}
            className="ml-auto text-xs font-semibold uppercase tracking-wider text-ink-muted hover:text-ledger-green border border-dashed border-rule px-3 py-1 hover:border-ledger-green transition-colors"
          >
            + Add Column
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-paper-light border border-rule overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-ink-soft">Loading assets...</div>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-paper-dark/60 border-b-2 border-ink">
                {columnKeys.map((k) => (
                  <th
                    key={k}
                    className="px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-ink whitespace-nowrap select-none"
                  >
                    <div className="flex items-center gap-1">
                      <input
                        className="bg-transparent outline-none w-full text-[11px] font-bold uppercase tracking-wider"
                        value={columnLabels[k] || k}
                        onChange={(e) => {
                          const next = e.target.value;
                          setColumnLabels((prev) => ({ ...prev, [k]: next }));
                        }}
                        onBlur={() => renameColumn(k, columnLabels[k] || k)}
                      />
                      <button
                        onClick={() => removeColumn(k)}
                        className="text-ink-muted hover:text-ledger-red opacity-0 hover:opacity-100 ml-1"
                        title={`Remove column "${columnLabels[k] || k}"`}
                      >
                        ×
                      </button>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink whitespace-nowrap select-none">
                  {t('colActions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((asset, idx) => (
                  <tr
                    key={asset.id}
                    className={`border-b border-rule-soft hover:bg-paper-dark/40 transition-colors group ${idx % 2 === 1 ? 'bg-paper-dark/15' : ''}`}
                  >
                    {columnKeys.map((k) => (
                      <td key={k} className="px-2 py-1">
                        <DynamicCell
                          value={getCustomColumnValue(asset, k)}
                          onSave={async (val) => {
                            await updateAssetNotes(asset, k, val);
                          }}
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        <Link to={`/assets/${asset.id}`} className="p-1.5 text-ink-muted hover:text-ledger-green" title="View">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link to={`/assets/${asset.id}/edit`} className="p-1.5 text-ink-muted hover:text-ink" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(asset.id, asset.tagNumber || asset.name || '')}
                          className="p-1.5 text-ink-muted hover:text-ledger-red"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columnKeys.length + 1}
                    className="px-4 py-12 text-center text-ink-muted text-sm italic font-serif"
                  >
                    No entries match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
