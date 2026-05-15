import { useEffect, useMemo, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { store } from '../lib/assetStore';
import { Asset, AssetCondition } from '../lib/types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { buildCustomFieldsNotes, tryParseCustomFieldsNotes } from '../lib/customFields';

const CONDITION_OPTIONS: AssetCondition[] = ['New', 'Good', 'Fair', 'Poor', 'Damaged'];

function normalizeCustomDraft(input: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    const key = k?.trim();
    if (!key) continue;
    out[key] = v == null ? '' : String(v);
  }
  return out;
}

export function AssetEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState<Partial<Asset>>({});

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      const fetched = await store.getAsset(id);
      if (fetched) {
        setAsset(fetched);
        setFormData(fetched);
      }
      setLoading(false);
    };

    load();
  }, [id]);

  const updateField = <K extends keyof Asset>(field: K, value: Asset[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const { legacyText, custom } = useMemo(() => {
    const raw = asset?.notes ?? '';
    if (!raw) return { legacyText: '', custom: {} as Record<string, string> };
    return tryParseCustomFieldsNotes(raw);
  }, [asset?.id, asset?.notes]);

  const [customDraft, setCustomDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    setCustomDraft(custom);
  }, [custom, asset?.id]);

  const handleSave = async () => {
    if (!id || !formData.tagNumber || !formData.name || !formData.category || !formData.location) {
      alert('Please fill in the required fields: Tag Number, Description, Category, and Location.');
      return;
    }

    setIsSaving(true);
    try {
      const customPayload = normalizeCustomDraft(customDraft);

      await store.updateAsset(id, {
        tagNumber: formData.tagNumber.trim(),
        name: formData.name.trim(),
        category: formData.category.trim(),
        serialNumber: formData.serialNumber?.trim() || undefined,

        condition: (formData.condition || 'Good') as AssetCondition,
        acquisitionDate: formData.acquisitionDate || new Date().toISOString().split('T')[0],
        value: Number(formData.value ?? 0),
        location: formData.location.trim(),
        assignedTo: formData.assignedTo?.trim() || undefined,

        supplier: formData.supplier?.trim() || undefined,

        fundingSource: formData.fundingSource?.trim() || undefined,

        // Save system notes back as JSON custom fields (preserving legacy text)
        notes: buildCustomFieldsNotes(customPayload, legacyText),

        insuranceExpiry: formData.insuranceExpiry?.trim() || undefined,
      });

      navigate(`/assets/${id}`);
    } catch (error) {
      console.error('Update failed:', error);
      alert('Failed to save asset. Check console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!id) {
    return <div className="p-6 text-center text-ink-muted">Missing asset id.</div>;
  }

  if (loading) {
    return <div className="p-6 text-center text-ink-muted">Loading asset...</div>;
  }

  if (!asset) {
    return <div className="p-6 text-center text-ink-muted">Asset not found.</div>;
  }

  const sortedCustomKeys = Object.keys(customDraft).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 pb-4 border-b border-rule">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-ink-soft hover:text-ink border border-rule hover:border-ink"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted mb-1">Edit Asset</p>
          <h2 className="font-serif text-3xl text-ink">{asset.name}</h2>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Tag Number" value={formData.tagNumber || ''} onChange={(e) => updateField('tagNumber', e.target.value)} />
        <Input label="Asset Description" value={formData.name || ''} onChange={(e) => updateField('name', e.target.value)} />
        <Input label="Category" value={formData.category || ''} onChange={(e) => updateField('category', e.target.value)} />
        <Input label="Location" value={formData.location || ''} onChange={(e) => updateField('location', e.target.value)} />
        <Input label="User" value={formData.assignedTo || ''} onChange={(e) => updateField('assignedTo', e.target.value)} />
        <Input label="Supplier" value={formData.supplier || ''} onChange={(e) => updateField('supplier', e.target.value)} />
        <Input label="Serial Number" value={formData.serialNumber || ''} onChange={(e) => updateField('serialNumber', e.target.value)} />

        <Select
          label="Condition"
          value={formData.condition || ''}
          onChange={(e) => updateField('condition', e.target.value as AssetCondition)}
          options={CONDITION_OPTIONS.map((c) => ({ label: c, value: c }))}
          placeholder="Select condition"
        />

        <Input
          label="Acquisition Date"
          type="date"
          value={formData.acquisitionDate || ''}
          onChange={(e) => updateField('acquisitionDate', e.target.value)}
        />
        <Input
          label="Insurance Expiry"
          type="date"
          value={formData.insuranceExpiry || ''}
          onChange={(e) => updateField('insuranceExpiry', e.target.value)}
        />
        <Input
          label="Value"
          type="number"
          step="0.01"
          value={formData.value?.toString() ?? '0'}
          onChange={(e) => updateField('value', Number(e.target.value))}
        />
        <Input
          label="Funding Source"
          value={formData.fundingSource || ''}
          onChange={(e) => updateField('fundingSource', e.target.value)}
        />

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">Custom Fields</label>
          <div className="space-y-3">
            {sortedCustomKeys.length === 0 && (
              <p className="text-sm text-ink-muted italic">No custom fields.</p>
            )}

            {sortedCustomKeys.map((k) => (
              <div key={k} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="text-sm font-semibold text-ink-muted pt-2">{k}</div>
                <input
                  type="text"
                  value={customDraft[k] || ''}
                  onChange={(e) => setCustomDraft((prev) => ({ ...prev, [k]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-rule focus:outline-none focus:border-ink"
                />
              </div>
            ))}

            {sortedCustomKeys.length > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  className="text-xs text-ledger-red hover:underline"
                  onClick={() => setCustomDraft({})}
                >
                  Clear custom fields
                </button>
              </div>
            )}

            <div className="pt-3 border-t border-rule">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">Add / edit a custom field</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Field name"
                  value={''}
                  onChange={() => {}}
                  disabled
                  className="opacity-60 cursor-not-allowed px-3 py-2 text-sm border border-rule"
                />
                <input
                  type="text"
                  placeholder="(Use system UI: Add column in New Entry)"
                  value={''}
                  onChange={() => {}}
                  disabled
                  className="opacity-60 cursor-not-allowed px-3 py-2 text-sm border border-rule sm:col-span-2"
                />
              </div>
              <p className="text-xs text-ink-muted mt-2">
                Custom field names are created in <b>New Entry</b> / <b>Import</b>. Use Edit to update values.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button onClick={handleSave} isLoading={isSaving}>
          <Save className="w-3.5 h-3.5 mr-2" /> Save Asset
        </Button>
      </div>
    </div>
  );
}

