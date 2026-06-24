import { X, FileSpreadsheet, Eye, Edit2, Trash2, Plus, Search, Upload } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const steps = [
  {
    icon: <Upload className="w-5 h-5" />,
    title: '1. Import Excel or CSV',
    desc: 'Click "Import" in the navigation. Choose your file. Preview the data, then click "Confirm and Import". All columns from your file are automatically detected and added as table columns.',
  },
  {
    icon: <Search className="w-5 h-5" />,
    title: '2. View & Filter Assets',
    desc: 'The Asset Register shows all imported data. Use the search bar to find anything across all columns. Click sheet tabs to view specific imports.',
  },
  {
    icon: <Edit2 className="w-5 h-5" />,
    title: '3. Edit Cells Inline',
    desc: 'Click any value in the table and type to edit it directly. Changes save automatically when you click away. You can also click the pencil icon to open a full edit form.',
  },
  {
    icon: <Plus className="w-5 h-5" />,
    title: '4. Add or Remove Columns',
    desc: 'Click "+ Add Column" in the toolbar above the table to create a new column. Click the × on a column tag or header to remove it.',
  },
  {
    icon: <Eye className="w-5 h-5" />,
    title: '5. View Full Details',
    desc: 'Click the eye icon on any row to see the full asset record and its change history.',
  },
  {
    icon: <Trash2 className="w-5 h-5" />,
    title: '6. Delete an Entry',
    desc: 'Click the trash icon on any row to soft-delete it. Deleted items can be restored by an administrator.',
  },
  {
    icon: <FileSpreadsheet className="w-5 h-5" />,
    title: '7. Export to Excel',
    desc: 'Click "Export to Excel" to download a professionally formatted report with all visible columns.',
  },
];

export function HelpGuide({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-24">
      <div className="fixed inset-0 bg-ink/60" onClick={onClose} />
      <div className="relative bg-paper-light border-2 border-ink w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-paper-light border-b border-rule flex items-center justify-between px-6 py-4 z-10">
          <h2 className="font-serif text-2xl text-ink">Quick Guide</h2>
          <button onClick={onClose} className="p-1.5 text-ink-muted hover:text-ink border border-rule hover:border-ink">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-6">
          <p className="text-sm text-ink-soft leading-relaxed">
            This system helps you manage your fixed asset register. Here is how everything works:
          </p>
          {steps.map((s, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-9 h-9 shrink-0 border border-rule bg-paper-dark flex items-center justify-center text-ledger-green">
                {s.icon}
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink mb-1">{s.title}</h3>
                <p className="text-sm text-ink-soft leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
          <div className="border-t border-rule pt-4 pb-2">
            <p className="text-xs text-ink-muted italic">
              Tip: You can rename column headers by editing them directly in the table header.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
