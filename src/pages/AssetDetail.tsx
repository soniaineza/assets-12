import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react';

import { store } from '../lib/assetStore';
import { Asset, ChangeLogEntry } from '../lib/types';

import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
    if (window.confirm(`Delete "${asset.name}"?`)) {
      try {
        await store.softDeleteAsset(asset.id);
        navigate('/assets');
      } catch (error) {
        console.error('Error deleting asset:', error);
        alert('Failed to delete asset');
      }
    }
  };

  const conditionVariant = (c: string): any => {
    if (c === 'New' || c === 'Good') return 'success';
    if (c === 'Fair') return 'info';
    if (c === 'Poor') return 'warning';
    if (c === 'Damaged') return 'danger';

    return 'neutral';
  };

  const fmtDate = (v: string | undefined) => {
    if (!v) return '—';

    const d = new Date(v);

    return isNaN(d.getTime())
      ? v
      : d.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        });
  };

  const fields = [
    {
      label: 'Tag Number',
      value: asset.tagNumber,
      mono: true,
    },
    {
      label: 'Description',
      value: asset.name,
    },
    {
      label: 'Category',
      value: asset.category,
    },
    {
      label: 'Serial Number',
      value: asset.serialNumber || '—',
    },
    {
      label: 'Acquisition Date',
      value: fmtDate(asset.acquisitionDate),
    },
    {
      label: 'Value',
      value: `RWF ${(asset.value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
      })}`,
      mono: true,
    },
    {
      label: 'Location',
      value: asset.location || '—',
    },
    {
      label: 'Assigned To',
      value: asset.assignedTo || '—',
    },
    {
      label: 'Supplier',
      value: asset.supplier || '—',
    },
    {
      label: 'Funding Source',
      value: asset.fundingSource || '—',
    },

    ...(asset.insuranceExpiry
      ? [
          {
            label: 'Insurance Expiry',
            value: fmtDate(asset.insuranceExpiry),
          },
        ]
      : []),
  ];

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
          Asset Record
        </p>
      </div>

      {/* Header card */}
      <div className="bg-paper-light border-2 border-ink">
        <div className="p-6 border-b border-rule flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-ledger-green font-semibold mb-1">
              {asset.tagNumber}
            </p>

            <h2 className="font-serif text-3xl text-ink">
              {asset.name}
            </h2>

            <div className="mt-3 flex items-center gap-2">
              <Badge variant={conditionVariant(asset.condition)}>
                {asset.condition}
              </Badge>

              <span className="text-xs text-ink-muted uppercase tracking-wider">
                {asset.category}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Link to={`/assets/${asset.id}/edit`}>
              <Button variant="secondary">
                <Edit2 className="w-3.5 h-3.5 mr-2" />
                Edit
              </Button>
            </Link>

            <Button variant="danger" onClick={handleDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Detail grid */}
        <dl className="grid grid-cols-1 sm:grid-cols-2">
          {fields.map((f, i) => (
            <div
              key={f.label}
              className={`
                px-6 py-4 border-rule
                ${i < fields.length - 1 ? 'border-b' : ''}
                ${i % 2 === 0 ? 'sm:border-r' : ''}
                ${
                  i === fields.length - 1 && fields.length % 2 !== 0
                    ? 'sm:col-span-2'
                    : ''
                }
              `}
            >
              <dt className="text-[11px] uppercase tracking-wider text-ink-muted font-semibold mb-1">
                {f.label}
              </dt>

              <dd
                className={`text-sm text-ink ${
                  f.mono ? 'font-mono' : ''
                }`}
              >
                {f.value}
              </dd>
            </div>
          ))}
        </dl>

        {asset.notes && (
          <div className="px-6 py-4 border-t border-rule bg-paper-dark/30">
            <dt className="text-[11px] uppercase tracking-wider text-ink-muted font-semibold mb-2">
              Remarks
            </dt>

            <dd className="text-sm text-ink whitespace-pre-wrap font-serif italic">
              "{asset.notes}"
            </dd>
          </div>
        )}
      </div>

      {/* History */}
      <div className="bg-paper-light border border-rule">
        <div className="px-6 py-3 border-b border-rule bg-paper-dark/40">
          <h3 className="font-serif text-lg text-ink">
            Record History
          </h3>
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
                    {log.field === 'CREATED' ||
                    log.field === 'IMPORTED' ||
                    log.field === 'DELETED' ? (
                      <span className="font-semibold uppercase text-[11px] tracking-wider text-ledger-green">
                        {log.newValue}
                      </span>
                    ) : (
                      <>
                        <span className="text-ink-soft">
                          Updated{' '}
                        </span>

                        <span className="font-semibold">
                          {log.field}
                        </span>

                        <span className="text-ink-muted">
                          {' '}
                          from{' '}
                        </span>

                        <span className="line-through text-ink-muted">
                          {String(log.oldValue || '—')}
                        </span>

                        <span className="text-ink-muted">
                          {' '}
                          to{' '}
                        </span>

                        <span className="font-medium">
                          {String(log.newValue || '—')}
                        </span>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ink-muted italic font-serif">
              No changes recorded.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

