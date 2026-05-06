import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { store } from '../lib/assetStore';
import { Asset } from '../lib/types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
export function AssetForm() {
  const { id } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [formData, setFormData] = useState<Partial<Asset>>({
    tagNumber: '',
    name: '',
    category: '',
    serialNumber: '',
    condition: 'New',
    acquisitionDate: new Date().toISOString().split('T')[0],
    value: 0,
    location: '',
    assignedTo: '',
    supplier: '',
    notes: '',
    insuranceExpiry: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingCategories, setExistingCategories] = useState<string[]>([]);

  useEffect(() => {
    const loadAsset = async () => {
      // Load unique categories for the suggestions
      const assets = await store.getAssets();
      const cats = Array.from(new Set(assets.map(a => a.category))).filter(Boolean);
      setExistingCategories(cats);

      if (isEditing && id) {
        const asset = await store.getAsset(id);
        if (asset) {
          setFormData({
            ...asset,
            acquisitionDate: asset.acquisitionDate.split('T')[0],
            insuranceExpiry: asset.insuranceExpiry ?
            asset.insuranceExpiry.split('T')[0] :
            ''
          });
        } else navigate('/assets');
      }
    };
    loadAsset();
  }, [id, isEditing, navigate]);
  const handleChange = (
  e: React.ChangeEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>

  {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'value' ? parseFloat(value) || 0 : value
    }));
    if (errors[name])
    setErrors((prev) => ({
      ...prev,
      [name]: ''
    }));
  };
  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.tagNumber) e.tagNumber = 'Required';
    if (!formData.name) e.name = 'Required';
    if (!formData.category) e.category = 'Required';
    if (!formData.location) e.location = 'Required';
    if (formData.value === undefined || formData.value < 0)
    e.value = 'Must be 0 or greater';
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const data = {
        ...formData,
        insuranceExpiry: formData.insuranceExpiry || undefined
      };
      if (isEditing && id) await store.updateAsset(id, data);else

      await store.createAsset(
        data as Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
      );
      navigate('/assets');
    } catch (err: any) {
      if (err.message?.includes('already exists'))
      setErrors((prev) => ({
        ...prev,
        tagNumber: err.message
      }));else
      alert('Could not save entry.');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 pb-4 border-b border-rule">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-ink-soft hover:text-ink border border-rule hover:border-ink">
          
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted mb-1">
            {isEditing ? 'Edit Entry' : 'New Entry'}
          </p>
          <h2 className="font-serif text-3xl text-ink">
            {isEditing ? 'Update Asset Record' : 'Register New Asset'}
          </h2>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-paper-light border border-rule">
        
        <div className="p-6 space-y-8">
          <Section title="I. Identification">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Tag Number *"
                name="tagNumber"
                value={formData.tagNumber}
                onChange={handleChange}
                error={errors.tagNumber}
                placeholder="TAG-001" />
              
              <Input
                label="Description *"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                placeholder='MacBook Pro 16"' />
              
              <Input
                label="Category *"
                name="category"
                value={formData.category}
                onChange={handleChange}
                error={errors.category}
                placeholder="IT Equipment"
                list="categories-list" />
              
              <datalist id="categories-list">
                {existingCategories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
                {!existingCategories.includes('IT Equipment') && <option value="IT Equipment" />}
                {!existingCategories.includes('Furniture') && <option value="Furniture" />}
              </datalist>
              <Input
                label="Serial Number"
                name="serialNumber"
                value={formData.serialNumber || ''}
                onChange={handleChange} />
              
            </div>
          </Section>

          <Section title="II. Condition & Value">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Select
                label="Condition *"
                name="condition"
                value={formData.condition}
                onChange={handleChange}
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
              
              <Input
                label="Acquisition Date *"
                type="date"
                name="acquisitionDate"
                value={formData.acquisitionDate}
                onChange={handleChange} />
              
              <Input
                label="Value (RWF) *"
                type="number"
                name="value"
                min="0"
                step="0.01"
                value={formData.value}
                onChange={handleChange}
                error={errors.value} />
              
              <Input
                label="Supplier"
                name="supplier"
                value={formData.supplier || ''}
                onChange={handleChange} />
              
            </div>
          </Section>

          <Section title="III. Location & Custody">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Location *"
                name="location"
                value={formData.location}
                onChange={handleChange}
                error={errors.location}
                placeholder="HQ - Floor 2" />
              
              <Input
                label="Assigned To"
                name="assignedTo"
                value={formData.assignedTo || ''}
                onChange={handleChange}
                placeholder="Employee or Department" />
              
              {formData.category === 'Vehicles' &&
              <Input
                label="Insurance Expiry"
                type="date"
                name="insuranceExpiry"
                value={formData.insuranceExpiry || ''}
                onChange={handleChange} />

              }
            </div>
          </Section>

          <Section title="IV. Remarks">
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              rows={4}
              className="block w-full px-3 py-2 text-sm"
              placeholder="Additional details, condition notes, history…" />
            
          </Section>
        </div>

        <div className="px-6 py-4 border-t border-rule bg-paper-dark/40 flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(-1)}>
            
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            <Save className="w-3.5 h-3.5 mr-2" />
            {isEditing ? 'Save Changes' : 'Register Asset'}
          </Button>
        </div>
      </form>
    </div>);

}
function Section({
  title,
  children



}: {title: string;children: React.ReactNode;}) {
  return (
    <div>
      <h3 className="font-serif text-lg text-ink mb-4 pb-2 border-b border-rule-soft">
        {title}
      </h3>
      {children}
    </div>);

}