import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react';
import { store } from '../lib/assetStore';
import { Asset, ChangeLogEntry } from '../lib/types';
import { tryParseCustomFieldsNotes } from '../lib/customFields';
import { Button } from '../components/ui/Button';
import { useI18n } from '../lib/i18n';

export function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [logs, setLogs] = useState<ChangeLogEntry[]>([]);

  useEffect(() => {
    const loadAsset = async () => {
      if (id) {
        const found = await store.getAsset(id);
        if (found) {
          setAsset(found);
          const changeLogs = await store.getChangeLog(id);
          setLogs(changeLogs);
        } else {
          navigate('/assets');
        }
      }
    };
    loadAsset();
  }, [id, navigate]);

  if (!asset) return null;

  const handleDelete = async () => {
    if (window.confirm(t('confirmDeleteAsset', { name: asset.name }))) {
      try {
        await store.softDeleteAsset(asset.id);
        navigate('/assets');
      } catch {
        alert(t('failedDelete'));
      }
    }
  };

  // Read all dynamic fields from notes JSON
  const parsed = tryParseCustomFieldsNotes(asset.notes);
  const dynamicFields = Object.entries(parsed.custom).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/assets')}
          className="p-2 text-ink-soft hover:text-ink border border-rule hover:border-ink"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          {t('assetRecord')}
        </p>
      </div>

      {/* Header card */}
      <div className="bg-paper-light border-2 border-ink">
        <div className="p-6 border-b border-rule flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-ledger-green font-semibold mb-1">
              {asset.tagNumber || asset.id?.slice(0, 8) || '—'}
            </p>
            <h2 className="font-serif text-3xl text-ink">
              {asset.name || 'Asset Record'}
            </h2>
          </div>
          <div className="flex gap-2">
            <Link to={`/assets/${asset.id}/edit`}>
              <Button variant="secondary">
                <Edit2 className="w-3.5 h-3.5 mr-2" />
                {t('edit')}
              </Button>
            </Link>
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              {t('delete')}
            </Button>
          </div>
        </div>

        {/* Dynamic detail grid */}
        {dynamicFields.length > 0 && (
          <dl className="grid grid-cols-1 sm:grid-cols-2">
            {dynamicFields.map(([key, value], i) => (
              <div
                key={key}
                className={`
                  px-6 py-4 border-rule
                  ${i < dynamicFields.length - 1 ? 'border-b' : ''}
                  ${i % 2 === 0 ? 'sm:border-r' : ''}
                `}
              >
                <dt className="text-[11px] uppercase tracking-wider text-ink-muted font-semibold mb-1">
                  {parsed.labels[key] || key}
                </dt>
                <dd className="text-sm text-ink">
                  {value || '—'}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {dynamicFields.length === 0 && (
          <div className="px-6 py-8 text-center text-ink-muted text-sm italic font-serif">
            No fields data available for this asset.
          </div>
        )}
      </div>

      {/* History */}
      <div className="bg-paper-light border border-rule">
        <div className="px-6 py-3 border-b border-rule bg-paper-dark/40">
          <h3 className="font-serif text-lg text-ink">{t('recordHistory')}</h3>
        </div>
        <div className="p-6">
          {logs.length > 0 ? (
            <ol className="space-y-3">
              {logs.map((log) => (
                <li key={log.id} className="flex gap-4 text-sm">
                  <span className="font-mono text-xs text-ink-muted whitespace-nowrap pt-0.5 w-32 shrink-0">
                    {new Date(log.timestamp).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="text-ink">
                    {log.field === 'CREATED' || log.field === 'IMPORTED' || log.field === 'DELETED' ? (
                      <span className="font-semibold uppercase text-[11px] tracking-wider text-ledger-green">
                        {log.newValue}
                      </span>
                    ) : (
                      <>
                        <span className="text-ink-soft">Updated </span>
                        <span className="font-semibold">{log.field}</span>
                        <span className="text-ink-muted"> from </span>
                        <span className="line-through text-ink-muted">{String(log.oldValue || '—')}</span>
                        <span className="text-ink-muted"> to </span>
                        <span className="font-medium">{String(log.newValue || '—')}</span>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ink-muted italic font-serif">{t('noChanges')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
