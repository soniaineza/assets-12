# TODO — Spreadsheet-like New Entry

## Plan approval ✅/❌
- [ ] Confirm scope: header rename is label-only; DB mapping stable.

## Implementation steps
- [ ] Update `src/pages/AssetForm.tsx` column model to include stable `key/id` + editable `label`.
- [ ] Make column header cells inline editable (no column removal/add on rename).
- [ ] Add spreadsheet keyboard navigation for cell editing (Tab / Enter / Arrow).
- [ ] Add paste support (TSV/CSV clipboard -> fill grid starting at active cell).
- [ ] Add copy support for rectangular ranges (basic: copy from the current active cell and optional selection).
- [ ] Add simple easy-save behavior (debounced save or debounce until “Save All Sheets” only) per agreed approach.
- [ ] Add optional column resizing via drag (if feasible without major UI change).

## Testing
- [ ] Manually verify: existing columns render, cannot disappear due to rename.
- [ ] Manually verify: pasting multiple cells fills correct rows/cols.
- [ ] Manually verify: Tab/Enter/Arrow navigation matches expectation.
- [ ] Manually verify: saving persists to correct DB fields (mapping stable).

