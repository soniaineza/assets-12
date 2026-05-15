export type CustomFieldsPayload = {
  __customFields: true;
  fields: Record<string, string>;
  legacyText?: string;
};

export function tryParseCustomFieldsNotes(notes: string | null | undefined): {
  legacyText: string;
  custom: Record<string, string>;
} {
  if (!notes) return { legacyText: '', custom: {} };

  const raw = notes;
  const trimmed = raw.trim();
  if (!trimmed) return { legacyText: '', custom: {} };

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
        return { legacyText: parsed.legacyText || '', custom: out };
      }
    } catch {
      // ignore
    }
  }

  return { legacyText: raw, custom: {} };
}

export function buildCustomFieldsNotes(
  custom: Record<string, string>,
  legacyText?: string
): string {
  const payload: CustomFieldsPayload & { legacyText?: string } = {
    __customFields: true,
    fields: custom,
  };

  if (legacyText?.trim()) payload.legacyText = legacyText.trim();

  return JSON.stringify(payload);
}

