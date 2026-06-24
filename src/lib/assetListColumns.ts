import { Asset } from './types';

export type SystemColumnKey = keyof Asset | 'actions';

export interface SystemColumnDef {
  key: SystemColumnKey;
  label: string;
  sortable?: boolean;
}

export const SYSTEM_COLUMNS: SystemColumnDef[] = [
  { key: 'tagNumber',        label: 'Tag Number (New)',                              sortable: true },
  { key: 'name',             label: 'Assets Description',                            sortable: true },
  { key: 'category',         label: 'Category',                                      sortable: true },
  { key: 'location',         label: 'LOCATION',                                      sortable: true },
  { key: 'assignedTo',       label: 'User',                                          sortable: true },
  { key: 'supplier',         label: 'Supplier',                                      sortable: true },
  { key: 'value',            label: 'Acquisition Value / Estimated Value',           sortable: true },
  { key: 'acquisitionDate',  label: 'Acquisition Date / Purchase Date',              sortable: true },
  { key: 'fundingSource',    label: 'Funding Source / Project Code',                 sortable: false },
  { key: 'condition',        label: 'Asset Condition',                               sortable: true },
  { key: 'serialNumber',     label: 'Serial No.',                                    sortable: false },
  { key: 'notes',            label: 'Comment',                                       sortable: false },
  { key: 'actions',          label: 'Actions',                                       sortable: false },
];

