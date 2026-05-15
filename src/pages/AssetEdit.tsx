import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { store } from '../lib/assetStore';
import { Asset, AssetCondition } from '../lib/types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

const CONDITION_OPTIONS: AssetCondition[] = ['New', 'Good', 'Fair', 'Poor', 'Damaged'];

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

  const handleSave = async () => {
    if (!id || !formData.tagNumber || !formData.name || !formData.category || !formData.location) {
      alert('Please fill in the required fields: Tag Number, Description, Category, and Location.');
      return;
    }

    setIsSaving(true);
    try {
      await store.updateAsset(id, {
        tagNumber: formData.tagNumber.trim(),
        name: formData.name.trim(),
        category: formData.category.trim(),
        serialNumber: formData.serialNumber?.trim() || null,
        condition: (formData.condition || 'Good') as AssetCondition,
        acquisitionDate: formData.acquisitionDate || new Date().toISOString().split('T')[0],
        value: Number(formData.value ?? 0),
        location: formData.location.trim(),
        assignedTo: formData.assignedTo?.trim() || null,
        supplier: formData.supplier?.trim() || null,
        fundingSource: formData.fundingSource?.trim() || null,
        notes: formData.notes?.trim() || null,
        insuranceExpiry: formData.insuranceExpiry?.trim() || null,
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
        <Input
          label="Tag Number"
          value={formData.tagNumber || ''}
          onChange={(e) => updateField('tagNumber', e.target.value)}
        />
        <Input
          label="Asset Description"
          value={formData.name || ''}
          onChange={(e) => updateField('name', e.target.value)}
        />
        <Input
          label="Category"
          value={formData.category || ''}
          onChange={(e) => updateField('category', e.target.value)}
        />
        <Input
          label="Location"
          value={formData.location || ''}
          onChange={(e) => updateField('location', e.target.value)}
        />
        <Input
          label="User"
          value={formData.assignedTo || ''}
          onChange={(e) => updateField('assignedTo', e.target.value)}
        />
        <Input
          label="Supplier"
          value={formData.supplier || ''}
          onChange={(e) => updateField('supplier', e.target.value)}
        />
        <Input
          label="Serial Number"
          value={formData.serialNumber || ''}
          onChange={(e) => updateField('serialNumber', e.target.value)}
        />
        <Select
          label="Condition"
          value={formData.condition || ''}
          onChange={(e) => updateField('condition', e.target.value as AssetCondition)}
          options={CONDITION_OPTIONS.map((condition) => ({ label: condition, value: condition }))}
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
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">Notes</label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => updateField('notes', e.target.value)}
            className="block w-full min-h-[140px] px-3 py-2 text-sm border border-rule"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
        <Button onClick={handleSave} isLoading={isSaving}>
          <Save className="w-3.5 h-3.5 mr-2" /> Save Asset
        </Button>
      </div>
    </div>
  );
}
