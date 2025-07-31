// Kitchen storage capability implementation

import { Capability, Input, Output } from '@busy-lang/orgata-framework';
import { MockKitchenStorage } from '../mock-services/kitchen-storage.js';
import { SchemaBuilder } from '@busy-lang/orgata-framework';

export interface StorageRequest {
  location: string;
  item: string;
  quantity?: number;
  action: 'retrieve' | 'store';
}

export interface StorageResult {
  success: boolean;
  item?: {
    name: string;
    type: string;
    quantity: number | string;
    available: boolean;
  };
  message: string;
}

export class KitchenStorageCapability implements Capability<StorageRequest, StorageResult> {
  public readonly name = 'kitchen-storage';
  public readonly description = 'Access to kitchen storage locations (pantry, fridge, cabinet, drawer)';
  
  public readonly inputSchema = SchemaBuilder.object({
    location: SchemaBuilder.string({
      enum: ['pantry', 'fridge', 'cabinet', 'drawer'],
      description: 'Storage location to access'
    }),
    item: SchemaBuilder.string({ description: 'Item name to retrieve or store' }),
    quantity: SchemaBuilder.number({ minimum: 1, description: 'Quantity to retrieve' }),
    action: SchemaBuilder.string({
      enum: ['retrieve', 'store'],
      description: 'Action to perform'
    })
  }, ['location', 'item', 'action']);

  public readonly outputSchema = SchemaBuilder.object({
    success: SchemaBuilder.boolean({ description: 'Whether the operation succeeded' }),
    item: SchemaBuilder.object({
      name: SchemaBuilder.string(),
      type: SchemaBuilder.string(),
      quantity: SchemaBuilder.string(),
      available: SchemaBuilder.boolean()
    }, [], 'Retrieved item details'),
    message: SchemaBuilder.string({ description: 'Result message' })
  }, ['success', 'message']);

  private storage = new MockKitchenStorage();

  // Direct access methods for implementations to use
  async retrieveItem(location: string, item: string, quantity: number = 1) {
    try {
      const result = await this.storage.retrieveItem(location, item, quantity);
      return {
        success: !!result,
        item: result,
        message: result 
          ? `Successfully retrieved ${quantity} ${item} from ${location}`
          : `Could not retrieve ${item} from ${location}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Storage operation failed: ${(error as Error).message}`
      };
    }
  }

  async storeItem(location: string, item: string) {
    try {
      const success = await this.storage.storeItem(location, item);
      return {
        success,
        message: success 
          ? `Successfully stored ${item} in ${location}`
          : `Could not store ${item} in ${location}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Storage operation failed: ${(error as Error).message}`
      };
    }
  }
}