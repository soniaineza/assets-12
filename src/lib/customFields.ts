import { Asset } from './types';

export type CustomFieldsPayload = {
  __customFields: true;
  /** stable column-key -> value */
  fields: Record<string, string>;
  /** stable column-key -> editable column label */
  labels?: Record<string, string>;
  legacyText?: string;
};

export function tryParseCustomFieldsNotes(notes: string | null | undefined): {
  legacyText: string;
  custom: Record<string, string>;
  labels: Record<string, string>;
} {
  if (!notes) return { legacyText: '', custom: {}, labels: {} };


  const raw = notes;
  const trimmed = raw.trim();
  if (!trimmed) return { legacyText: '', custom: {}, labels: {} };

  if (trimmed.startsWith('{') && trimmed.includes('__customFields')) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<CustomFieldsPayload> & {
        fields?: Record<string, any>;
      };

      if (parsed?.__customFields === true && parsed.fields && typeof parsed.fields === 'object') {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed.fields)) {
          out[k] = v == null ? '' : String(v);
        }
        return {
          legacyText: parsed.legacyText || '',
          custom: out,
          labels: (parsed.labels && typeof parsed.labels === 'object'
            ? (parsed.labels as Record<string, any>)
            : {}) as Record<string, string>,
        };
      }
    } catch {
      // ignore
    }
  }

  return { legacyText: raw, custom: {}, labels: {} };
}

export function buildCustomFieldsNotes(
  custom: Record<string, string>,
  legacyText?: string,
  labels?: Record<string, string>
): string {
  const payload: CustomFieldsPayload & { legacyText?: string } = {
    __customFields: true,
    fields: custom,
    ...(labels ? { labels } : {}),
  };

  if (legacyText?.trim()) payload.legacyText = legacyText.trim();

  return JSON.stringify(payload);
}

/** If an asset has no JSON custom fields, create fields from its DB columns for backward compat */
function hydrateFromDb(asset: Asset): Record<string, string> {
  const out: Record<string, string> = {};
  if (asset.tagNumber)        out['Tag Number'] = asset.tagNumber;
  if (asset.name)             out['Name'] = asset.name;
  if (asset.category)         out['Category'] = asset.category;
  if (asset.location)         out['Location'] = asset.location;
  if (asset.assignedTo)       out['Assigned To'] = asset.assignedTo;
  if (asset.supplier)         out['Supplier'] = asset.supplier;
  if (asset.serialNumber)     out['Serial Number'] = asset.serialNumber;
  if (asset.condition)        out['Condition'] = asset.condition;
  if (asset.acquisitionDate)  out['Acquisition Date'] = asset.acquisitionDate;
  if (asset.fundingSource)    out['Funding Source'] = asset.fundingSource;
  if (asset.value != null)    out['Value'] = String(asset.value);
  if (asset.notes && !asset.notes.trim().startsWith('{')) out['Notes'] = asset.notes;
  return out;
}

/** Collect every unique column key from a list of assets by scanning their notes JSON.
 *  Falls back to DB fields for assets without JSON data. */
export function getAllColumnKeys(assets: Asset[]): string[] {
  const keys = new Set<string>();
  let hasJsonData = false;
  for (const a of assets) {
    const p = tryParseCustomFieldsNotes(a.notes);
    const customKeys = Object.keys(p.custom);
    if (customKeys.length > 0) hasJsonData = true;
    for (const k of customKeys) keys.add(k);
  }
  // If no assets have JSON data, fall back to DB columns
  if (!hasJsonData) {
    for (const a of assets) {
      for (const k of Object.keys(hydrateFromDb(a))) keys.add(k);
    }
  }
  return Array.from(keys);
}

/** Collect every unique column label from a list of assets by scanning their notes JSON.
 *  The first-seen label for a given key wins.
 *  Falls back to DB fields for assets without JSON data. */
export function getAllColumnLabels(assets: Asset[]): Record<string, string> {
  const labels: Record<string, string> = {};
  let hasJsonData = false;
  for (const a of assets) {
    const p = tryParseCustomFieldsNotes(a.notes);
    if (Object.keys(p.custom).length > 0) hasJsonData = true;
    for (const [k, v] of Object.entries(p.labels)) {
      if (!(k in labels)) labels[k] = v;
    }
    for (const k of Object.keys(p.custom)) {
      if (!(k in labels)) labels[k] = k;
    }
  }
  if (!hasJsonData) {
    for (const a of assets) {
      for (const k of Object.keys(hydrateFromDb(a))) {
        if (!(k in labels)) labels[k] = k;
      }
    }
  }
  return labels;
}

/** Get the value for a column key from a single asset's notes JSON.
 *  Falls back to DB fields for backward compatibility. */
export function getCustomColumnValue(asset: Asset, key: string): string {
  const p = tryParseCustomFieldsNotes(asset.notes);
  if (p.custom[key] != null) return p.custom[key];
  // Fallback: check if any asset has JSON data; if not, try DB fields
  const dbFallback = hydrateFromDb(asset);
  return dbFallback[key] ?? '';
}

/** Set the value for a column key on an asset, preserving all other fields + labels */
export function setCustomColumnValue(
  asset: Asset,
  key: string,
  value: string,
  label?: string
): string {
  const p = tryParseCustomFieldsNotes(asset.notes);
  p.custom[key] = value;
  if (label) p.labels[key] = label;
  return buildCustomFieldsNotes(p.custom, p.legacyText, p.labels);
}


