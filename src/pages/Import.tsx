import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { store } from '../lib/assetStore';
import { Button } from '../components/ui/Button';
export function Import() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldToColumnMap, setFieldToColumnMap] = useState<Record<string, number>>({});
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const normalizeHeader = (value: any) =>
    String(value || '').trim();

  const expectedHeaderOrder = [
    { key: 'tagNumber', label: 'Tag Number (New)', required: true },
    { key: 'name', label: 'Assets Description', required: true },
    { key: 'category', label: 'Category (Furniture, IT, Equipm)', required: true },
    { key: 'location', label: 'LOCATION', required: true },
    { key: 'assignedTo', label: 'User', required: false },
    { key: 'supplier', label: 'Supplier', required: false },
    { key: 'value', label: 'Acquisition Value /Estimated Value', required: true },
    { key: 'acquisitionDate', label: 'Acquisition date/Purchase Date', required: true },
    { key: 'fundingSource', label: 'Funding Source / Project Code', required: false },
    { key: 'condition', label: 'Asset Condition', required: true },
    { key: 'serialNumber', label: 'Serial No.', required: false },
    { key: 'notes', label: 'Comment', required: false }
  ];

  const systemFields = [
    {
      key: 'tagNumber',
      label: 'Tag Number (New)',
      required: true
    },
    {
      key: 'name',
      label: 'Assets Description',
      required: true,
      aliases: ['asset description', 'asset name', 'description', 'name']
    },
    {
      key: 'category',
      label: 'Category',
      required: true,
      aliases: ['categories', 'asset category', 'type']
    },
    {
      key: 'location',
      label: 'Location',
      required: true,
      aliases: ['site', 'office', 'branch', 'place']
    },
    {
      key: 'assignedTo',
      label: 'User',
      required: false,
      aliases: ['assigned to', 'assigned', 'custodian', 'responsible']
    },
    {
      key: 'supplier',
      label: 'Supplier',
      required: false,
      aliases: ['vendor', 'provider']
    },
    {
      key: 'value',
      label: 'Acquisition Value',
      required: true,
      aliases: ['value', 'acquisition value', 'estimated value', 'purchase value', 'amount']
    },
    {
      key: 'acquisitionDate',
      label: 'Acquisition Date',
      required: true,
      aliases: ['acquisition date', 'purchase date', 'date', 'acquisitiondate']
    },
    {
      key: 'fundingSource',
      label: 'Funding Source / Project Code',
      required: false,
      aliases: ['funding source', 'project code']
    },
    {
      key: 'condition',
      label: 'Asset Condition',
      required: true,
      aliases: ['condition', 'asset condition', 'status']
    },
    {
      key: 'serialNumber',
      label: 'Serial Number',
      required: false,
      aliases: ['serial no', 'serial']
    },
    {
      key: 'notes',
      label: 'Comment',
      required: false,
      aliases: ['notes', 'comment', 'comments']
    }
  ];

  const getMappedHeaderName = (fieldKey: string) => {
    const colIndex = fieldToColumnMap[fieldKey];
    return colIndex !== undefined ? headers[colIndex] || '' : '';
  };

  const preparePreview = (incomingHeaders: string[], dataRows: any[][]) => {
    const actualHeaders = incomingHeaders.map((h) => String(h || '').trim().toLowerCase());

    // Build a comprehensive alias map for every field
    const fieldAliasMap: Record<string, string[]> = {
      tagNumber:       ['tag number (new)', 'tag number', 'tag no', 'tag', 'asset tag', 'asset no', 'asset number'],
      name:            ['assets description', 'asset description', 'asset name', 'description', 'name', 'item'],
      category:        ['category (furniture, it, equipm)', 'category', 'categories', 'asset category', 'type'],
      location:        ['location', 'loc', 'site', 'office', 'branch', 'place'],
      assignedTo:      ['user', 'assigned to', 'assigned', 'custodian', 'responsible'],
      supplier:        ['supplier', 'vendor', 'provider'],
      value:           ['acquisition value /estimated value', 'acquisition value', 'estimated value', 'purchase value', 'value', 'amount', 'cost'],
      acquisitionDate: ['acquisition date/purchase date', 'acquisition date', 'purchase date', 'date', 'acquisitiondate'],
      fundingSource:   ['funding source / project code', 'funding source', 'project code'],
      condition:       ['asset condition', 'condition', 'status'],
      serialNumber:    ['serial no.', 'serial no', 'serial number', 'serial'],
      notes:           ['comment', 'comments', 'notes', 'remarks'],
    };

    const fieldMap: Record<string, number> = {};
    Object.entries(fieldAliasMap).forEach(([fieldKey, aliases]) => {
      const colIndex = actualHeaders.findIndex((h) => aliases.includes(h));
      if (colIndex !== -1) fieldMap[fieldKey] = colIndex;
    });

    setHeaders(incomingHeaders.map((h) => String(h).trim()));
    setRawData(dataRows);
    setFieldToColumnMap(fieldMap);
    setPreviewErrors([]);
    setImportResult(null);
    setStep(2);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true
        });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any[]>(firstSheet, {
          header: 1,
          defval: '',
          raw: false
        });
        if (rows.length === 0) {
          alert('The file appears to be empty.');
          return;
        }
        // Auto-detect the header row by scoring against all known aliases
        const allKnownLabels = [
          'tag number (new)', 'tag number', 'tag no', 'tag', 'asset tag', 'asset no', 'asset number',
          'assets description', 'asset description', 'asset name', 'description', 'name',
          'category (furniture, it, equipm)', 'category', 'categories',
          'location', 'loc', 'site', 'office', 'branch',
          'user', 'assigned to', 'supplier', 'vendor',
          'acquisition value /estimated value', 'acquisition value', 'estimated value', 'value', 'amount',
          'acquisition date/purchase date', 'acquisition date', 'purchase date', 'date',
          'asset condition', 'condition', 'status',
          'serial no.', 'serial no', 'serial number', 'serial',
          'comment', 'comments', 'notes', 'funding source', 'project code'
        ];
        let headerRowIndex = 0;
        let bestScore = 0;
        for (let r = 0; r < Math.min(rows.length, 10); r++) {
          const rowCells = (rows[r] as any[]).map((h) => String(h || '').trim().toLowerCase());
          const score = rowCells.filter((cell) => allKnownLabels.includes(cell)).length;
          if (score > bestScore) {
            bestScore = score;
            headerRowIndex = r;
          }
        }

        const cleanHeaders = (rows[headerRowIndex] as any[]).map((h) => String(h).trim());
        const dataRows = rows
          .slice(headerRowIndex + 1)
          .filter((row: any[]) => row.some((c) => c !== '' && c !== null));

        preparePreview(cleanHeaders, dataRows);
      } catch (err) {
        alert(
          'Could not read the file. Please ensure it is a valid Excel (.xlsx) or CSV file.'
        );
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const performImport = async () => {
    setIsImporting(true);

    try {
      await store.clearAssets();
    } catch (err: any) {
      console.error('Error clearing existing assets before import:', err);
      setImportResult({
        success: 0,
        failed: 0,
        errors: ['Failed to clear existing asset data before import.']
      });
      setIsImporting(false);
      return;
    }

    const assetsToImport = rawData
      .map((row: any[], rowIndex) => {
        const data: any = {};

        systemFields.forEach((field) => {
          const colIndex = fieldToColumnMap[field.key];
          let value = colIndex !== undefined ? row[colIndex] : undefined;

          if (field.key === 'value') {
            const num = typeof value === 'number'
              ? value
              : parseFloat(String(value || '0').replace(/[^0-9.-]/g, ''));
            data[field.key] = isNaN(num) ? 0 : num;
          } else if (field.key === 'condition') {
            const valid = ['New', 'Good', 'Fair', 'Poor', 'Damaged'];
            const match = valid.find((c) => String(value || '').toLowerCase().includes(c.toLowerCase()));
            data[field.key] = match || 'Good';
          } else if (field.key === 'acquisitionDate') {
            const d = value instanceof Date ? value : new Date(value);
            data[field.key] = isNaN(d.getTime())
              ? new Date().toISOString().split('T')[0]
              : d.toISOString().split('T')[0];
          } else {
            data[field.key] = value !== undefined && value !== null ? String(value).trim() : '';
          }
        });

        if (!data.tagNumber) {
          data.tagNumber = `AUTO-${Date.now()}-${rowIndex}`;
        }
        if (!data.name) {
          data.name = `Imported Asset ${rowIndex + 1}`;
        }
        if (!data.category) {
          data.category = 'Uncategorized';
        }
        if (!data.location) {
          data.location = 'Unknown';
        }

        return data;
      })
      .filter((asset) =>
        !String(asset.tagNumber).toLowerCase().includes('tag') &&
        !String(asset.name).toLowerCase().includes('description')
      );

    try {
      if (assetsToImport.length === 0) {
        throw new Error("No valid data rows found. Ensure your columns have headers like 'Tag Number' and 'Assets Description'.");
      }
      const result = await store.importAssets(assetsToImport);
      setImportResult(result);
    } catch (error: any) {
      console.error('Error during import:', error);
      setImportResult({
        success: 0,
        failed: assetsToImport.length,
        errors: [`An unexpected error occurred during import: ${error.message || 'Unknown error'}`]
      });
    } finally {
      setStep(3);
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-4 border-b border-rule">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted mb-1">
          Bulk Import
        </p>
        <h2 className="font-serif text-3xl text-ink">Import from Excel</h2>
        <p className="text-sm text-ink-soft mt-1">
          Migrate existing records from Excel (.xlsx) or CSV files.
        </p>
      </div>

      {/* Stepper */}
      <ol className="flex items-center justify-between border border-rule bg-paper-light px-6 py-4">
        {['Upload File', 'Preview Mapping', 'Import Results'].map((label, i) => {
          const s = i + 1;
          const active = step === s;
          const done = step > s;
          return (
            <li key={label} className="flex items-center gap-3 flex-1">
              <span
                className={`w-7 h-7 flex items-center justify-center font-mono text-xs border-2 ${active ? 'border-ledger-green bg-ledger-green text-paper-light' : done ? 'border-ledger-green text-ledger-green' : 'border-rule text-ink-muted'}`}>
                {done ? '✓' : s}
              </span>
              <span
                className={`text-xs uppercase tracking-wider font-semibold ${active || done ? 'text-ink' : 'text-ink-muted'}`}>
                {label}
              </span>
              {i < 2 && <span className="flex-1 h-px bg-rule mx-2" />}
            </li>);

        })}
      </ol>

      {step === 1 &&
      <div className="bg-paper-light border border-rule p-12 text-center">
          <div className="mx-auto w-14 h-14 border-2 border-ink bg-paper-dark flex items-center justify-center mb-4">
            <FileSpreadsheet className="w-6 h-6 text-ink" />
          </div>
          <h3 className="font-serif text-2xl text-ink mb-2">
            Select Excel or CSV File
          </h3>
          <p className="text-sm text-ink-soft mb-6 max-w-md mx-auto">
            Your file should have column headers in the first row. Supported
            formats: .xlsx, .xls, .csv
          </p>
          <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange} />
        
          <Button onClick={() => fileInputRef.current?.click()} size="lg">
            <Upload className="w-4 h-4 mr-2" />
            Choose File
          </Button>
        </div>
      }

      {step === 2 &&
      <div className="bg-paper-light border border-rule">
          <div className="px-6 py-4 border-b border-rule bg-paper-dark/40 flex items-center justify-between">
            <h3 className="font-serif text-xl text-ink">Preview Column Mapping</h3>
            <span className="text-xs text-ink-muted font-mono">
              {file?.name} · {rawData.length} rows loaded
            </span>
          </div>

          <div className="p-6 space-y-6">
            <p className="text-sm text-ink-soft">
              Review the header mapping before importing. The file headers are matched to the expected import fields in the order shown below.
            </p>

            <div className="grid grid-cols-12 gap-3 text-xs uppercase tracking-[0.16em] font-semibold text-ink-muted border-b border-rule pb-3">
              <div className="col-span-5">Expected Field</div>
              <div className="col-span-5">Matched Column</div>
              <div className="col-span-2">Required</div>
            </div>
            {expectedHeaderOrder.map(({ key, label }) => {
              const matchedHeader = getMappedHeaderName(key);
              const field = systemFields.find((f) => f.key === key);
              const required = field?.required ? 'Yes' : 'No';
              return (
                <div key={key} className="grid grid-cols-12 gap-3 py-3 border-b border-rule/40 text-sm">
                  <div className="col-span-5 text-ink">{label}</div>
                  <div className="col-span-5 text-ink-soft">{matchedHeader || 'Not mapped'}</div>
                  <div className="col-span-2 text-ink">{required}</div>
                </div>
              );
            })}

<div>
              <h4 className="text-sm font-semibold text-ink mb-3">Sample rows</h4>
              <div className="overflow-x-auto border border-rule rounded-lg">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-paper-dark/40 text-ink-muted text-xs uppercase">
                    <tr>
                      {headers.map((header) => (
                        <th key={header} className="px-3 py-2 border-b border-rule">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawData.slice(0, 3).map((row, rowIndex) => (
                      <tr key={rowIndex} className="odd:bg-paper-light">
                        {headers.map((_, colIndex) => (
                          <td key={colIndex} className="px-3 py-2 border-b border-rule text-ink-soft">
                            {String(row[colIndex] ?? '').slice(0, 80)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-rule bg-paper-dark/40 flex flex-col md:flex-row justify-between gap-3">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Choose another file
            </Button>
            <Button
              onClick={performImport}
              disabled={isImporting}
              isLoading={isImporting}>
              Confirm and Import
            </Button>
          </div>
        </div>
      }

      {step === 3 &&
      <div className="bg-paper-light border border-rule">
          <div className="px-6 py-4 border-b border-rule bg-paper-dark/40 flex items-center justify-between">
            <h3 className="font-serif text-xl text-ink">Import Results</h3>
            <span className="text-xs text-ink-muted font-mono">
              {file?.name} · {rawData.length} rows processed
            </span>
          </div>

          <div className="p-6">
            {importResult && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-ledger-green" />
                  <span className="text-sm text-ink">
                    Successfully imported {importResult.success} assets
                  </span>
                </div>
                <div className="flex gap-3 pt-4 flex-wrap">
                  <Button onClick={() => navigate('/assets')}>
                    View Assets
                  </Button>
                  <Button variant="secondary" onClick={() => window.location.reload()}>
                    Import Another File
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      }
    </div>);

}