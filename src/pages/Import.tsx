import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  ArrowRight } from
'lucide-react';
import * as XLSX from 'xlsx';
import { store } from '../lib/assetStore';
import { Button } from '../components/ui/Button';
export function Import() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const systemFields = [
  {
    key: 'tagNumber',
    label: 'Tag Number',
    required: true
  },
  {
    key: 'name',
    label: 'Description / Name',
    required: true
  },
  {
    key: 'category',
    label: 'Category',
    required: true
  },
  {
    key: 'condition',
    label: 'Condition',
    required: true
  },
  {
    key: 'location',
    label: 'Location',
    required: true
  },
  {
    key: 'value',
    label: 'Value',
    required: true
  },
  {
    key: 'acquisitionDate',
    label: 'Acquisition Date',
    required: true
  },
  {
    key: 'serialNumber',
    label: 'Serial Number',
    required: false
  },
  {
    key: 'assignedTo',
    label: 'Assigned To',
    required: false
  },
  {
    key: 'supplier',
    label: 'Supplier',
    required: false
  },
  {
    key: 'notes',
    label: 'Notes',
    required: false
  }];

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
        const cleanHeaders = (rows[0] as any[]).map((h) => String(h).trim());
        const dataRows = rows.
        slice(1).
        filter((row: any[]) => row.some((c) => c !== '' && c !== null));
        setHeaders(cleanHeaders);
        setRawData(dataRows);
        // Auto-import the data
        handleAutoImport(cleanHeaders, dataRows);
      } catch (err) {
        alert(
          'Could not read the file. Please ensure it is a valid Excel (.xlsx) or CSV file.'
        );
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };
  const handleAutoImport = async (headers: string[], dataRows: any[][]) => {
    setIsImporting(true);

    // Detect if the first row is actually a header vs a title
    let actualHeaders = headers;
    let actualData = dataRows;

    const isHeaderLike = (row: any[]) => 
      row.some(cell => systemFields.some(f => 
        String(cell).toLowerCase().includes(f.key.toLowerCase()) ||
        String(cell).toLowerCase().includes(f.label.toLowerCase().split(' ')[0])
      ));

    if (!isHeaderLike(headers) && dataRows.length > 0 && isHeaderLike(dataRows[0])) {
      actualHeaders = dataRows[0].map(h => String(h).trim());
      actualData = dataRows.slice(1);
    }

    // 1. Determine Column Mapping
    const fieldToColumnMap: Record<string, number> = {};
    const mappedIndices = new Set<number>();

    // First pass: Try to match by header name
    systemFields.forEach(field => {
      const headerIndex = actualHeaders.findIndex(h => {
        const hClean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        const fKeyClean = field.key.toLowerCase().replace(/[^a-z0-9]/g, '');
        const fLabelClean = field.label.toLowerCase().replace(/[^a-z0-9]/g, '');
        return hClean.includes(fKeyClean) || fKeyClean.includes(hClean) || 
               hClean.includes(fLabelClean) || fLabelClean.includes(hClean);
      });

      if (headerIndex !== -1) {
        fieldToColumnMap[field.key] = headerIndex;
        mappedIndices.add(headerIndex);
      }
    });

    // Second pass: If required fields (Tag, Name, Category) aren't mapped, 
    // take the first available unused columns in order.
    const priorityFields = ['tagNumber', 'name', 'category', 'location', 'value', 'condition', 'acquisitionDate'];
    priorityFields.forEach(key => {
      if (fieldToColumnMap[key] === undefined) {
        const nextAvailable = actualHeaders.findIndex((_, i) => !mappedIndices.has(i));
        if (nextAvailable !== -1) {
          fieldToColumnMap[key] = nextAvailable;
          mappedIndices.add(nextAvailable);
        }
      }
    });

    // 2. Process Rows with Fallbacks
    const assetsToImport = actualData.map((row: any[], rowIndex) => {
      const data: any = {};

      systemFields.forEach(field => {
        const colIndex = fieldToColumnMap[field.key];
        let value = colIndex !== undefined ? row[colIndex] : undefined;

        if (field.key === 'value') {
          const num = typeof value === 'number' ? value : parseFloat(String(value || '0').replace(/[^0-9.-]/g, ''));
          data[field.key] = isNaN(num) ? 0 : num;
        } else if (field.key === 'condition') {
          const valid = ['New', 'Good', 'Fair', 'Poor', 'Damaged'];
          const match = valid.find(c => String(value || '').toLowerCase().includes(c.toLowerCase()));
          data[field.key] = match || 'Good';
        } else if (field.key === 'acquisitionDate') {
          const d = value instanceof Date ? value : new Date(value);
          data[field.key] = isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
        } else {
          data[field.key] = value !== undefined && value !== null ? String(value).trim() : '';
        }
      });

      // Critical Fallbacks: Ensure every row has a Tag and Name so the DB accepts it
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
    }).filter(asset => 
      // Filter out rows that repeat headers or are blank placeholders
      !String(asset.tagNumber).toLowerCase().includes('tag') &&
      !String(asset.name).toLowerCase().includes('description')
    );

    try {
      if (assetsToImport.length === 0) {
        throw new Error("No valid data rows found. Ensure your columns have headers like 'Tag Number' and 'Name'.");
      }
      const result = await store.importAssets(assetsToImport);
      setImportResult(result);
    } catch (error: any) {
      console.error('Error during auto import:', error);
      setImportResult({
        success: 0,
        failed: assetsToImport.length, // Assume all failed if a general error occurs
        errors: [`An unexpected error occurred during import: ${error.message || 'Unknown error'}`],
      });
    } finally {
      setStep(2); // Always move to step 2 to show results (even if all failed)
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
        {['Upload File', 'Import Results'].map((label, i) => {
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
              {i < 1 && <span className="flex-1 h-px bg-rule mx-2" />}
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
                {importResult.failed > 0 && (
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-ledger-red" />
                    <span className="text-sm text-ink">
                      {importResult.failed} assets failed to import
                    </span>
                  </div>
                )}
                {importResult.errors.length > 0 && (
                  <div className="bg-paper-dark/40 border border-rule-soft p-4">
                    <h4 className="text-sm font-semibold text-ink mb-2">Errors:</h4>
                    <ul className="text-xs text-ink-soft space-y-1">
                      {importResult.errors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
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