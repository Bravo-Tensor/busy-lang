// Input/Output implementations with validation

import { Input, Output, JsonSchema, ValidationResult, ValidationError } from './types.js';

export class DataInput<T = any> implements Input<T> {
  constructor(
    public readonly data: T,
    public readonly schema: JsonSchema
  ) {}

  validate(): ValidationResult {
    const errors: ValidationError[] = [];
    
    try {
      this.validateValue(this.data, this.schema, '');
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(error);
      } else {
        errors.push(new ValidationError(`Validation failed: ${error.message}`));
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  serialize(): string {
    return JSON.stringify({
      data: this.data,
      schema: this.schema,
      timestamp: new Date().toISOString()
    });
  }

  private validateValue(value: any, schema: JsonSchema, path: string): void {
    // Type validation
    if (schema.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== schema.type) {
        throw new ValidationError(
          `Expected ${schema.type} but got ${actualType}`,
          path || 'root'
        );
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      throw new ValidationError(
        `Value must be one of: ${schema.enum.join(', ')}`,
        path || 'root'
      );
    }

    // Number validations
    if (schema.type === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        throw new ValidationError(
          `Value must be at least ${schema.minimum}`,
          path || 'root'
        );
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        throw new ValidationError(
          `Value must be at most ${schema.maximum}`,
          path || 'root'
        );
      }
    }

    // Object validation
    if (schema.type === 'object' && schema.properties) {
      if (!value || typeof value !== 'object') {
        throw new ValidationError('Expected object', path || 'root');
      }

      // Check required fields
      if (schema.required) {
        for (const required of schema.required) {
          if (!(required in value)) {
            throw new ValidationError(
              `Required field missing: ${required}`,
              path ? `${path}.${required}` : required
            );
          }
        }
      }

      // Validate each property
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in value) {
          const fieldPath = path ? `${path}.${key}` : key;
          this.validateValue(value[key], propSchema, fieldPath);
        }
      }
    }

    // Array validation
    if (schema.type === 'array' && schema.items) {
      if (!Array.isArray(value)) {
        throw new ValidationError('Expected array', path || 'root');
      }

      value.forEach((item, index) => {
        const itemPath = path ? `${path}[${index}]` : `[${index}]`;
        this.validateValue(item, schema.items!, itemPath);
      });
    }
  }
}

export class DataOutput<T = any> implements Output<T> {
  constructor(
    public readonly data: T,
    public readonly schema: JsonSchema
  ) {}

  validate(): ValidationResult {
    // Use same validation as DataInput
    const input = new DataInput(this.data, this.schema);
    return input.validate();
  }

  serialize(): string {
    return JSON.stringify({
      data: this.data,
      schema: this.schema,
      timestamp: new Date().toISOString()
    });
  }
}

// Utility functions for creating common schemas
export const SchemaBuilder = {
  string(options?: { enum?: string[]; description?: string }): JsonSchema {
    return {
      type: 'string',
      ...options
    };
  },

  number(options?: { minimum?: number; maximum?: number; description?: string }): JsonSchema {
    return {
      type: 'number',
      ...options
    };
  },

  boolean(options?: { description?: string }): JsonSchema {
    return {
      type: 'boolean',
      ...options
    };
  },

  object(properties: Record<string, JsonSchema>, required?: string[], description?: string): JsonSchema {
    return {
      type: 'object',
      properties,
      required,
      description
    };
  },

  array(items: JsonSchema, description?: string): JsonSchema {
    return {
      type: 'array',
      items,
      description
    };
  }
};