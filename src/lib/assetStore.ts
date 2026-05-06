import { Asset, ChangeLogEntry } from './types';
import { supabase } from './supabase';

class AssetStore {
  async getAssets(): Promise<Asset[]> {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assets:', error);
      return [];
    }

    return (data || []).map(this.transformFromDb);
  }

  async getAsset(id: string): Promise<Asset | undefined> {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      console.error('Error fetching asset:', error);
      return undefined;
    }

    return this.transformFromDb(data);
  }

  async getAssetByTag(tagNumber: string): Promise<Asset | undefined> {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('tag_number', tagNumber)
      .is('deleted_at', null)
      .single();

    if (error) {
      // PGRST116 means no rows found, which is an expected scenario for getAssetByTag
      if (error.code === 'PGRST116') {
        return undefined;
      }
      console.error('Error fetching asset by tag:', error);
      return undefined;
    }

    return this.transformFromDb(data);
  }

  async createAsset(
    assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
  ): Promise<Asset> {
    // Check if tag number already exists
    const existing = await this.getAssetByTag(assetData.tagNumber);
    if (existing) {
      throw new Error(`Asset with tag number ${assetData.tagNumber} already exists`);
    }

    const now = new Date().toISOString();
    const newAsset = {
      tag_number: assetData.tagNumber,
      name: assetData.name,
      category: assetData.category,
      serial_number: assetData.serialNumber || null,
      condition: assetData.condition,
      acquisition_date: assetData.acquisitionDate,
      value: assetData.value,
      location: assetData.location,
      assigned_to: assetData.assignedTo || null,
      supplier: assetData.supplier || null,
      notes: assetData.notes || null,
      insurance_expiry: assetData.insuranceExpiry || null,
      created_at: now,
      updated_at: now,
      deleted_at: null
    };

    const { data, error } = await supabase
      .from('assets')
      .insert([newAsset])
      .select()
      .single();

    if (error) {
      console.error('Error creating asset:', error);
      throw new Error('Failed to create asset');
    }

    // Log creation
    await this.logChange(data.id, 'CREATED', null, 'Asset Created');

    return this.transformFromDb(data);
  }

  async updateAsset(
    id: string,
    updates: Partial<Omit<Asset, 'id' | 'createdAt' | 'deletedAt'>>
  ): Promise<Asset> {
    const currentAsset = await this.getAsset(id);
    if (!currentAsset) {
      throw new Error('Asset not found');
    }

    // Check tag number uniqueness if being updated
    if (updates.tagNumber && updates.tagNumber !== currentAsset.tagNumber) {
      const existing = await this.getAssetByTag(updates.tagNumber);
      if (existing) {
        throw new Error(`Asset with tag number ${updates.tagNumber} already exists`);
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.tagNumber !== undefined) updateData.tag_number = updates.tagNumber;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.serialNumber !== undefined) updateData.serial_number = updates.serialNumber;
    if (updates.condition !== undefined) updateData.condition = updates.condition;
    if (updates.acquisitionDate !== undefined) updateData.acquisition_date = updates.acquisitionDate;
    if (updates.value !== undefined) updateData.value = updates.value;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo;
    if (updates.supplier !== undefined) updateData.supplier = updates.supplier;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.insuranceExpiry !== undefined) updateData.insurance_expiry = updates.insuranceExpiry;

    const { data, error } = await supabase
      .from('assets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating asset:', error);
      throw new Error('Failed to update asset');
    }

    // Log changes
    Object.keys(updates).forEach(key => {
      if (key !== 'updatedAt' && (currentAsset as any)[key] !== updates[key as keyof Asset]) {
        this.logChange(id, key, (currentAsset as any)[key], updates[key as keyof Asset]);
      }
    });

    return this.transformFromDb(data);
  }

  async softDeleteAsset(id: string): Promise<void> {
    const { error } = await supabase
      .from('assets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error deleting asset:', error);
      throw new Error('Failed to delete asset');
    }

    await this.logChange(id, 'DELETED', null, 'Asset Soft Deleted');
  }

  async importAssets(
    assetsData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>[]
  ): Promise<{success: number; failed: number; errors: string[]}> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const now = new Date().toISOString();
    
    const assetsToCreate: any[] = [];
    const incomingTags = assetsData.map(a => a.tagNumber);
    
    // Optimized Pass: Check all tags in the DB at once
    const { data: existingDbAssets } = await supabase
      .from('assets')
      .select('tag_number')
      .in('tag_number', incomingTags)
      .is('deleted_at', null);

    const existingTagsInDb = new Set((existingDbAssets || []).map(a => a.tag_number));
    const processedInBatch = new Set<string>();

    for (let i = 0; i < assetsData.length; i++) {
      const assetData = assetsData[i];
      try {
        if (processedInBatch.has(assetData.tagNumber)) {
            failed++;
            errors.push(`Row ${i + 1}: Duplicate tag number '${assetData.tagNumber}' found within the import file. Skipping.`);
            continue;
        }
        processedInBatch.add(assetData.tagNumber);

        if (existingTagsInDb.has(assetData.tagNumber)) {
          failed++;
          errors.push(`Row ${i + 1}: Tag '${assetData.tagNumber}' already exists in database. Skipping.`);
          continue;
        }

        const newAsset = {
          tag_number: assetData.tagNumber,
          name: assetData.name,
          category: assetData.category,
          serial_number: assetData.serialNumber || null,
          condition: assetData.condition,
          acquisition_date: assetData.acquisitionDate,
          value: assetData.value,
          location: assetData.location,
          assigned_to: assetData.assignedTo || null,
          supplier: assetData.supplier || null,
          notes: assetData.notes || null,
          insurance_expiry: assetData.insuranceExpiry || null,
          created_at: now,
          updated_at: now,
          deleted_at: null
        };
        assetsToCreate.push(newAsset);
      } catch (err: any) {
        failed++;
        errors.push(`Row ${i + 1}: Pre-import check failed for '${assetData.tagNumber}': ${err.message}`);
      }
    }

    // Second pass: Perform a single batch insert for all new assets
    if (assetsToCreate.length > 0) {
      const { data, error } = await supabase
        .from('assets')
        .insert(assetsToCreate)
        .select('id, tag_number'); // Select minimal data to confirm insertion

      if (error) {
        failed += assetsToCreate.length; // Assume all remaining failed if batch insert fails
        errors.push(`Batch insert failed: ${error.message}`);
        console.error('Batch insert error:', error);
      } else {
        success += data.length;
        // Log creation for each successfully imported asset
        for (const asset of data) {
          await this.logChange(asset.id, 'CREATED', null, `Asset Imported: ${asset.tag_number}`);
        }
      }
    }
    return { success, failed, errors };
  }

  async getChangeLog(assetId: string): Promise<ChangeLogEntry[]> {
    const { data, error } = await supabase
      .from('change_logs')
      .select('*')
      .eq('asset_id', assetId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching change log:', error);
      return [];
    }

    return (data || []).map(log => ({
      id: log.id,
      assetId: log.asset_id,
      field: log.field,
      oldValue: log.old_value,
      newValue: log.new_value,
      timestamp: log.timestamp
    }));
  }

  private async logChange(assetId: string, field: string, oldValue: any, newValue: any): Promise<void> {
    const { error } = await supabase
      .from('change_logs')
      .insert([{
        asset_id: assetId,
        field,
        old_value: oldValue,
        new_value: newValue,
        timestamp: new Date().toISOString()
      }]);

    if (error) {
      console.error('Error logging change:', error);
    }
  }

  private transformFromDb(dbAsset: any): Asset {
    return {
      id: dbAsset.id,
      tagNumber: dbAsset.tag_number,
      name: dbAsset.name,
      category: dbAsset.category,
      serialNumber: dbAsset.serial_number,
      condition: dbAsset.condition,
      acquisitionDate: dbAsset.acquisition_date,
      value: dbAsset.value,
      location: dbAsset.location,
      assignedTo: dbAsset.assigned_to,
      supplier: dbAsset.supplier,
      notes: dbAsset.notes,
      createdAt: dbAsset.created_at,
      updatedAt: dbAsset.updated_at,
      deletedAt: dbAsset.deleted_at,
      insuranceExpiry: dbAsset.insurance_expiry
    };
  }
}

export const store = new AssetStore();