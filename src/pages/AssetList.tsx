import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Download,
  FileSpreadsheet } from
'lucide-react';
import * as XLSX from 'xlsx';
import { store } from '../lib/assetStore';
import { Asset } from '../lib/types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
export function AssetList() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssets();
  }, []);

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
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sortField, setSortField] = useState<keyof Asset>('tagNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const categories = useMemo(
    () => Array.from(new Set(assets.map((a) => a.category))).filter(Boolean),
    [assets]
  );
  const locations = useMemo(
    () => Array.from(new Set(assets.map((a) => a.location))).filter(Boolean),
    [assets]
  );
  const filtered = useMemo(() => {
    let result = assets;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
        a.name.toLowerCase().includes(q) ||
        a.tagNumber.toLowerCase().includes(q)
      );
    }
    if (categoryFilter)
    result = result.filter((a) => a.category === categoryFilter);
    if (conditionFilter)
    result = result.filter((a) => a.condition === conditionFilter);
    if (locationFilter)
    result = result.filter((a) => a.location === locationFilter);
    result = [...result].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = aVal > bVal ? 1 : -1;
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [
  assets,
  search,
  categoryFilter,
  conditionFilter,
  locationFilter,
  sortField,
  sortDirection]
  );
  const handleSort = (field: keyof Asset) => {
    if (sortField === field)
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');else
    {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  const handleDelete = async (id: string, name: string) => {
    if (
    window.confirm(
      `Delete "${name}"? This action can be reversed by an administrator.`
    ))
    {
      try {
        await store.softDeleteAsset(id);
        await loadAssets(); // Reload assets after deletion
      } catch (error) {
        console.error('Error deleting asset:', error);
        alert('Failed to delete asset');
      }
    }
  };
  const exportToExcel = () => {
    const exportData = filtered.map((a) => ({
      'Tag Number': a.tagNumber,
      Name: a.name,
      Category: a.category,
      'Serial Number': a.serialNumber || '',
      Condition: a.condition,
      'Acquisition Date': a.acquisitionDate,
      Value: `RWF ${a.value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`,
      Location: a.location,
      'Assigned To': a.assignedTo || '',
      Supplier: a.supplier || '',
      'Insurance Expiry': a.insuranceExpiry || '',
      Notes: a.notes || ''
    }));

    // Create a worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set professional column widths (Standard SheetJS doesn't support colors)
    ws['!cols'] = [
      { wch: 15 }, // Tag Number
      { wch: 35 }, // Name
      { wch: 20 }, // Category
      { wch: 20 }, // Serial Number
      { wch: 12 }, // Condition
      { wch: 18 }, // Acquisition Date
      { wch: 15 }, // Value
      { wch: 20 }, // Location
      { wch: 20 }, // Assigned To
      { wch: 20 }, // Supplier
      { wch: 18 }, // Insurance
      { wch: 40 }  // Notes
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asset Register');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Asset_Register_${today}.xlsx`);
  };
  const conditionVariant = (c: string): any => {
    if (c === 'New' || c === 'Good') return 'success';
    if (c === 'Fair') return 'info';
    if (c === 'Poor') return 'warning';
    if (c === 'Damaged') return 'danger';
    return 'neutral';
  };
  const SortIndicator = ({ field }: {field: keyof Asset;}) => {
    if (sortField !== field) return <span className="text-rule ml-1">·</span>;
    return (
      <span className="text-ledger-green ml-1">
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>);

  };
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-4 border-b border-rule">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted mb-1">
            Section A
          </p>
          <h2 className="font-serif text-3xl text-ink">Asset Register</h2>
          <p className="text-sm text-ink-soft mt-1">
            {filtered.length} of {assets.length} entries shown
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportToExcel}>
            <FileSpreadsheet className="w-3.5 h-3.5 mr-2" />
            Export to Excel
          </Button>
          <Button onClick={() => navigate('/assets/new')}>
            <Plus className="w-3.5 h-3.5 mr-2" />
            New Entry
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-paper-light border border-rule p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <Input
          placeholder="Search tag or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="w-4 h-4" />} />
        
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          placeholder="All Categories"
          options={categories.map((c) => ({
            label: c,
            value: c
          }))} />
        
        <Select
          value={conditionFilter}
          onChange={(e) => setConditionFilter(e.target.value)}
          placeholder="All Conditions"
          options={[
          {
            label: 'New',
            value: 'New'
          },
          {
            label: 'Good',
            value: 'Good'
          },
          {
            label: 'Fair',
            value: 'Fair'
          },
          {
            label: 'Poor',
            value: 'Poor'
          },
          {
            label: 'Damaged',
            value: 'Damaged'
          }]
          } />
        
        <Select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          placeholder="All Locations"
          options={locations.map((l) => ({
            label: l,
            value: l
          }))} />
        
      </div>

      {/* Ledger Table */}
      <div className="bg-paper-light border border-rule overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="text-ink-soft">Loading assets...</div>
          </div>
        ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-paper-dark/60 border-b-2 border-ink">
              {[
              {
                key: 'tagNumber',
                label: 'Tag No.'
              },
              {
                key: 'name',
                label: 'Description'
              },
              {
                key: 'category',
                label: 'Category'
              },
              {
                key: 'condition',
                label: 'Condition'
              },
              {
                key: 'location',
                label: 'Location'
              },
              {
                key: 'assignedTo',
                label: 'Assigned'
              },
              {
                key: 'value',
                label: 'Value'
              }].
              map((col) =>
              <th
                key={col.key}
                onClick={() => handleSort(col.key as keyof Asset)}
                className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink cursor-pointer select-none hover:bg-paper-dark whitespace-nowrap">
                
                  {col.label}
                  <SortIndicator field={col.key as keyof Asset} />
                </th>
              )}
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ?
            filtered.map((asset, idx) =>
            <tr
              key={asset.id}
              className={`border-b border-rule-soft hover:bg-paper-dark/40 transition-colors group ${idx % 2 === 1 ? 'bg-paper-dark/15' : ''}`}>
              
                  <td className="px-4 py-3 font-mono text-sm text-ledger-green font-semibold">
                    <Link
                  to={`/assets/${asset.id}`}
                  className="hover:underline">
                  
                      {asset.tagNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink">{asset.name}</td>
                  <td className="px-4 py-3 text-sm text-ink-soft">
                    {asset.category}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={conditionVariant(asset.condition)}>
                      {asset.condition}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-soft">
                    {asset.location}
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-soft">
                    {asset.assignedTo || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-ink text-right">
                    RWF
                    {asset.value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                      <Link
                    to={`/assets/${asset.id}`}
                    className="p-1.5 text-ink-muted hover:text-ledger-green"
                    title="View">
                    
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                    to={`/assets/${asset.id}/edit`}
                    className="p-1.5 text-ink-muted hover:text-ink"
                    title="Edit">
                    
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <button
                    onClick={() => handleDelete(asset.id, asset.name)}
                    className="p-1.5 text-ink-muted hover:text-ledger-red"
                    title="Delete">
                    
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
            ) :

            <tr>
                <td
                colSpan={8}
                className="px-4 py-12 text-center text-ink-muted text-sm italic font-serif">
                
                  No entries match the current filters.
                </td>
              </tr>
            }
          </tbody>
          {filtered.length > 0 &&
          <tfoot>
              <tr className="border-t-2 border-ink bg-paper-dark/60">
                <td
                colSpan={6}
                className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink">
                
                  Total ({filtered.length} entries)
                </td>
                <td className="px-4 py-3 text-sm font-mono font-bold text-ink text-right">
                  RWF 
                  {filtered.
                reduce((s, a) => s + (a.value || 0), 0).
                toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
                </td>
                <td></td>
              </tr>
            </tfoot>
          }
        </table>
        )}
      </div>
    </div>);

}