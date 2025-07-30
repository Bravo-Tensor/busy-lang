// Mock kitchen storage system for testing

export interface StorageItem {
  name: string;
  type: string;
  quantity: number | string;
  available: boolean;
  expiration?: string;
}

export interface StorageLocation {
  name: string;
  description: string;
  contents: Map<string, StorageItem>;
}

export class MockKitchenStorage {
  private locations = new Map<string, StorageLocation>();

  constructor() {
    this.initializeStorage();
  }

  private initializeStorage() {
    // Initialize pantry
    const pantry: StorageLocation = {
      name: 'pantry',
      description: 'Dry goods storage',
      contents: new Map([
        ['bread', { name: 'bread', type: 'food-item', quantity: 20, available: true, expiration: '3 days' }],
        ['peanut_butter', { name: 'peanut_butter', type: 'spread', quantity: 1, available: true, expiration: '6 months' }]
      ])
    };

    // Initialize fridge
    const fridge: StorageLocation = {
      name: 'fridge', 
      description: 'Cold storage',
      contents: new Map([
        ['jelly', { name: 'jelly', type: 'spread', quantity: 1, available: true, expiration: '2 months' }]
      ])
    };

    // Initialize cabinet
    const cabinet: StorageLocation = {
      name: 'cabinet',
      description: 'Dishes and serving items', 
      contents: new Map([
        ['plates', { name: 'plates', type: 'dishware', quantity: 8, available: true }],
        ['bowls', { name: 'bowls', type: 'dishware', quantity: 6, available: true }]
      ])
    };

    // Initialize drawer
    const drawer: StorageLocation = {
      name: 'drawer',
      description: 'Utensils and tools',
      contents: new Map([
        ['butter_knives', { name: 'butter_knives', type: 'utensil', quantity: 4, available: true }],
        ['forks', { name: 'forks', type: 'utensil', quantity: 8, available: true }],
        ['spoons', { name: 'spoons', type: 'utensil', quantity: 8, available: true }]
      ])
    };

    this.locations.set('pantry', pantry);
    this.locations.set('fridge', fridge);
    this.locations.set('cabinet', cabinet);
    this.locations.set('drawer', drawer);
  }

  async retrieveItem(locationName: string, itemName: string, quantity: number = 1): Promise<StorageItem | null> {
    console.log(`🏠 Checking ${locationName} for ${itemName}...`);
    
    const location = this.locations.get(locationName);
    if (!location) {
      console.log(`❌ Storage location '${locationName}' not found`);
      return null;
    }

    const item = location.contents.get(itemName);
    if (!item || !item.available) {
      console.log(`❌ Item '${itemName}' not available in ${locationName}`);
      return null;
    }

    if (typeof item.quantity === 'number' && item.quantity < quantity) {
      console.log(`❌ Not enough ${itemName} in ${locationName} (need ${quantity}, have ${item.quantity})`);
      return null;
    }

    // Simulate retrieval time
    await this.delay(500);

    // Update quantity if numeric
    if (typeof item.quantity === 'number') {
      item.quantity -= quantity;
      if (item.quantity <= 0) {
        item.available = false;
      }
    }

    console.log(`✅ Retrieved ${quantity} ${itemName} from ${locationName}`);
    return { ...item, quantity };
  }

  async storeItem(locationName: string, itemName: string): Promise<boolean> {
    console.log(`🏠 Storing ${itemName} back in ${locationName}...`);
    
    const location = this.locations.get(locationName);
    if (!location) {
      console.log(`❌ Storage location '${locationName}' not found`);
      return false;
    }

    // Simulate storage time
    await this.delay(300);
    
    console.log(`✅ Stored ${itemName} in ${locationName}`);
    return true;
  }

  getLocationContents(locationName: string): StorageItem[] {
    const location = this.locations.get(locationName);
    return location ? Array.from(location.contents.values()) : [];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}