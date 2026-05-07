import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Eye, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { store } from '../lib/assetStore';
import { Asset } from '../lib/types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';

const COLUMNS: { key: keyof Asset | 'actions'; label: string; sortable?: boolean }[] = [
  { key: 'tagNumber',        label: 'Tag Number (New)',                              sortable: true },
  { key: 'name',             label: 'Assets Description',                            sortable: true },
  { key: 'category',         label: 'Category',                                      sortable: true },
  { key: 'location',         label: 'LOCATION',                                      sortable: true },
  { key: 'assignedTo',       label: 'User',                                          sortable: true },
  { key: 'supplier',         label: 'Supplier',                                      sortable: true },
  { key: 'value',            label: 'Acquisition Value / Estimated Value',           sortable: true },
  { key: 'acquisitionDate',  label: 'Acquisition Date / Purchase Date',              sortable: true },
  { key: 'fundingSource',    label: 'Funding Source / Project Code',                 sortable: false },
  { key: 'condition',        label: 'Asset Condition',                               sortable: true },
  { key: 'serialNumber',     label: 'Serial No.',                                    sortable: false },
  { key: 'notes',            label: 'Comment',                                       sortable: false },
  { key: 'actions',          label: 'Actions',                                       sortable: false },
];

export function AssetList() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortField, setSortField] = useState<keyof Asset>('tagNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  const categories = useMemo(() => Array.from(new Set(assets.map((a) => a.category))).filter(Boolean), [assets]);
  const locations   = useMemo(() => Array.from(new Set(assets.map((a) => a.location))).filter(Boolean),  [assets]);

  const filtered = useMemo(() => {
    let result = assets;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(q) || a.tagNumber.toLowerCase().includes(q));
    }
    if (categoryFilter)  result = result.filter((a) => a.category  === categoryFilter);
    if (conditionFilter) result = result.filter((a) => a.condition  === conditionFilter);
    if (locationFilter)  result = result.filter((a) => a.location   === locationFilter);
    return [...result].sort((a, b) => {
      const aVal = a[sortField], bVal = b[sortField];
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      return (aVal > bVal ? 1 : -1) * (sortDirection === 'asc' ? 1 : -1);
    });
  }, [assets, search, categoryFilter, conditionFilter, locationFilter, sortField, sortDirection]);

  const handleSort = (field: keyof Asset) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete "${name}"? This action can be reversed by an administrator.`)) {
      try {
        await store.softDeleteAsset(id);
        await loadAssets();
      } catch {
        alert('Failed to delete asset');
      }
    }
  };

  const exportToExcel = () => {
    const exportData = filtered.map((a) => ({
      'Tag Number (New)': a.tagNumber,
      'Assets Description': a.name,
      'Category': a.category,
      'LOCATION': a.location,
      'User': a.assignedTo || '',
      'Supplier': a.supplier || '',
      'Acquisition Value / Estimated Value': a.value,
      'Acquisition Date / Purchase Date': a.acquisitionDate,
      'Funding Source / Project Code': a.fundingSource || '',
      'Asset Condition': a.condition,
      'Serial No.': a.serialNumber || '',
      'Comment': a.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [15,35,22,20,20,20,28,25,25,15,18,40].map((wch) => ({ wch }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asset Register');
    XLSX.writeFile(wb, `Asset_Register_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const conditionVariant = (c: string): any => {
    if (c === 'New' || c === 'Good') return 'success';
    if (c === 'Fair') return 'info';
    if (c === 'Poor') return 'warning';
    if (c === 'Damaged') return 'danger';
    return 'neutral';
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

      {/* Filters */}
      <div className="bg-paper-light border border-rule p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <Input placeholder="Search tag or name..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="w-4 h-4" />} />
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} placeholder="All Categories" options={categories.map((c) => ({ label: c, value: c }))} />
        <Select value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)} placeholder="All Conditions"
          options={['New','Good','Fair','Poor','Damaged'].map((c) => ({ label: c, value: c }))} />
        <Select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} placeholder="All Locations" options={locations.map((l) => ({ label: l, value: l }))} />
      </div>

      {/* Table */}
      <div className="bg-paper-light border border-rule overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-ink-soft">Loading assets...</div>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-paper-dark/60 border-b-2 border-ink">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && col.key !== 'actions' ? handleSort(col.key as keyof Asset) : undefined}
                    className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink whitespace-nowrap select-none ${col.sortable && col.key !== 'actions' ? 'cursor-pointer hover:bg-paper-dark' : ''}`}
                  >
                    {col.label}
                    {col.sortable && col.key !== 'actions' && (
                      <span className="ml-1">
                        {sortField === col.key
                          ? <span className="text-ledger-green">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                          : <span className="text-rule">·</span>}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((asset, idx) => (
                <tr key={asset.id} className={`border-b border-rule-soft hover:bg-paper-dark/40 transition-colors group ${idx % 2 === 1 ? 'bg-paper-dark/15' : ''}`}>
                  <td className="px-4 py-3 font-mono text-sm text-ledger-green font-semibold whitespace-nowrap">
                    <Link to={`/assets/${asset.id}`} className="hover:underline">{asset.tagNumber}</Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink max-w-[220px] truncate">{asset.name}</td>
                  <td className="px-4 py-3 text-sm text-ink-soft whitespace-nowrap">{asset.category}</td>
                  <td className="px-4 py-3 text-sm text-ink-soft whitespace-nowrap">{asset.location}</td>
                  <td className="px-4 py-3 text-sm text-ink-soft whitespace-nowrap">{asset.assignedTo || '—'}</td>
                  <td className="px-4 py-3 text-sm text-ink-soft whitespace-nowrap">{asset.supplier || '—'}</td>
                  <td className="px-4 py-3 text-sm font-mono text-ink whitespace-nowrap text-right">
                    RWF {asset.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-soft whitespace-nowrap">{asset.acquisitionDate}</td>
                  <td className="px-4 py-3 text-sm text-ink-soft whitespace-nowrap">{asset.fundingSource || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant={conditionVariant(asset.condition)}>{asset.condition}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-soft whitespace-nowrap">{asset.serialNumber || '—'}</td>
                  <td className="px-4 py-3 text-sm text-ink-soft max-w-[160px] truncate">{asset.notes || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                      <Link to={`/assets/${asset.id}`} className="p-1.5 text-ink-muted hover:text-ledger-green" title="View"><Eye className="w-4 h-4" /></Link>
                      <Link to={`/assets/${asset.id}/edit`} className="p-1.5 text-ink-muted hover:text-ink" title="Edit"><Edit2 className="w-4 h-4" /></Link>
                      <button onClick={() => handleDelete(asset.id, asset.name)} className="p-1.5 text-ink-muted hover:text-ledger-red" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-ink-muted text-sm italic font-serif">
                    No entries match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-ink bg-paper-dark/60">
                  <td colSpan={6} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink">
                    Total ({filtered.length} entries)
                  </td>
                  <td className="px-4 py-3 text-sm font-mono font-bold text-ink text-right whitespace-nowrap">
                    RWF {filtered.reduce((s, a) => s + (a.value || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={6}></td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}
