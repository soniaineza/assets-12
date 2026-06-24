import { useI18n } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';
import { store } from '../lib/assetStore';
import { Asset } from '../lib/types';
import { Button } from '../components/ui/Button';
import { tryParseCustomFieldsNotes, buildCustomFieldsNotes } from '../lib/customFields';

export function AssetEdit() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [newFieldKey, setNewFieldKey] = useState('');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const fetched = await store.getAsset(id);
      if (fetched) {
        setAsset(fetched);
        const p = tryParseCustomFieldsNotes(fetched.notes);
        setFields({ ...p.custom });
        setLabels({ ...p.labels });
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const updateField = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const addField = () => {
    const k = newFieldKey.trim();
    if (!k || k in fields) return;
    setFields((prev) => ({ ...prev, [k]: '' }));
    setLabels((prev) => ({ ...prev, [k]: k }));
    setNewFieldKey('');
  };

  const removeField = (key: string) => {
    setFields((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setLabels((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      const p = tryParseCustomFieldsNotes(asset?.notes);
      const nextNotes = buildCustomFieldsNotes(fields, p.legacyText, labels);
      await store.updateAsset(id, { notes: nextNotes } as any);
      navigate(`/assets/${id}`);
    } catch (error) {
      console.error('Update failed:', error);
      alert('Failed to save asset.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!id) {
    return <div className="p-6 text-center text-ink-muted">{t('missingId')}</div>;
  }

  if (loading) {
    return <div className="p-6 text-center text-ink-muted">{t('loadingAsset')}</div>;
  }

  if (!asset) {
    return <div className="p-6 text-center text-ink-muted">{t('assetNotFound')}</div>;
  }

  const sortedKeys = Object.keys(fields).sort((a, b) => a.localeCompare(b));

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
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted mb-1">{t('editAsset')}</p>
          <h2 className="font-serif text-3xl text-ink">{asset.name || asset.tagNumber || 'Asset'}</h2>
        </div>
      </div>

      <div className="bg-paper-light border border-rule p-6">
        <div className="space-y-4">
          {sortedKeys.length === 0 && (
            <p className="text-sm text-ink-muted italic">No fields yet. Add one below.</p>
          )}
          {sortedKeys.map((k) => (
            <div key={k} className="grid grid-cols-1 sm:grid-cols-[200px_1fr_auto] gap-3 items-start">
              <input
                className="w-full px-3 py-2 text-sm border border-rule focus:outline-none focus:border-ink font-semibold text-ink-muted"
                value={labels[k] || k}
                onChange={(e) => setLabels((prev) => ({ ...prev, [k]: e.target.value }))}
                placeholder="Label"
              />
              <input
                className="w-full px-3 py-2 text-sm border border-rule focus:outline-none focus:border-ink"
                value={fields[k] ?? ''}
                onChange={(e) => updateField(k, e.target.value)}
                placeholder="Value"
              />
              <button
                onClick={() => removeField(k)}
                className="p-2 text-ink-muted hover:text-ledger-red"
                title="Remove field"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-rule">
          <div className="flex items-center gap-2">
            <input
              className="border border-rule bg-paper-light px-3 py-2 text-sm text-ink w-48 focus:outline-none focus:border-ink"
              placeholder="New field name"
              value={newFieldKey}
              onChange={(e) => setNewFieldKey(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addField(); }}
            />
            <Button variant="secondary" onClick={addField}>
              <Plus className="w-3.5 h-3.5 mr-1" />Add Field
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          {t('cancel')}
        </Button>
        <Button onClick={handleSave} isLoading={isSaving}>
          <Save className="w-3.5 h-3.5 mr-2" /> {t('saveAsset')}
        </Button>
      </div>
    </div>
  );
}
