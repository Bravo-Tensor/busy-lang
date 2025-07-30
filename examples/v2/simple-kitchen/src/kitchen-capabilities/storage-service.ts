// Kitchen storage capability implementation

import { Capability, Input, Output } from '../orgata-framework/index.js';
import { MockKitchenStorage } from '../mock-services/kitchen-storage.js';
import { SchemaBuilder } from '../orgata-framework/input-output.js';

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

  async execute(input: Input<StorageRequest>): Promise<Output<StorageResult>> {
    // This would normally be called by Context, but for capability we implement directly
    const request = input.data;
    
    try {
      if (request.action === 'retrieve') {
        const item = await this.storage.retrieveItem(
          request.location, 
          request.item, 
          request.quantity || 1
        );
        
        if (item) {
          return {
            data: {
              success: true,
              item,
              message: `Successfully retrieved ${request.quantity || 1} ${request.item} from ${request.location}`
            },
            schema: this.outputSchema,
            validate: () => ({ isValid: true, errors: [] }),
            serialize: function() { return JSON.stringify(this.data); }
          };
        } else {
          return {
            data: {
              success: false,
              message: `Could not retrieve ${request.item} from ${request.location}`
            },
            schema: this.outputSchema,
            validate: () => ({ isValid: true, errors: [] }),
            serialize: function() { return JSON.stringify(this.data); }
          };
        }
      } else if (request.action === 'store') {
        const success = await this.storage.storeItem(request.location, request.item);
        
        return {
          data: {
            success,
            message: success 
              ? `Successfully stored ${request.item} in ${request.location}`
              : `Could not store ${request.item} in ${request.location}`
          },
          schema: this.outputSchema,
          validate: () => ({ isValid: true, errors: [] }),
          serialize: function() { return JSON.stringify(this.data); }
        };
      } else {
        throw new Error(`Unknown action: ${request.action}`);
      }
    } catch (error) {
      return {
        data: {
          success: false,
          message: `Storage operation failed: ${error.message}`
        },
        schema: this.outputSchema,
        validate: () => ({ isValid: true, errors: [] }),
        serialize: function() { return JSON.stringify(this.data); }
      };
    }
  }
}