export type AssetCondition = 'New' | 'Good' | 'Fair' | 'Poor' | 'Damaged';

export interface Attachment {
  name: string;
  url: string;
}

export interface Asset {
  id: string;
  tagNumber: string;
  name: string;
  category: string;
  serialNumber?: string;
  condition: AssetCondition;
  acquisitionDate: string;
  value: number;
  location: string;
  assignedTo?: string;
  supplier?: string;
  fundingSource?: string;
  notes?: string;
  sheetName?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  insuranceExpiry?: string;
  attachments?: Attachment[];
}

export interface ChangeLogEntry {
  id: string;
  assetId: string;
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
}