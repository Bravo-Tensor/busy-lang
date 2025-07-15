/**
 * YAML parsing utilities with position tracking
 * Handles YAML parsing with detailed error reporting and source location tracking
 */

import * as YAML from 'yaml';
import { readFile } from 'fs/promises';

/**
 * Source position information
 */
export interface SourcePosition {
  /** Line number (1-based) */
  line: number;
  
  /** Column number (1-based) */
  column: number;
  
  /** Character offset from start of file */
  offset: number;
}

/**
 * Source range spanning from start to end position
 */
export interface SourceRange {
  start: SourcePosition;
  end: SourcePosition;
}

/**
 * YAML parsing error with position information
 */
export class YamlParseError extends Error {
  constructor(
    message: string,
    public readonly file: string,
    public readonly position?: SourcePosition,
    public readonly range?: SourceRange
  ) {
    super(message);
    this.name = 'YamlParseError';
  }
}

/**
 * Parsed YAML document with position tracking
 */
export interface ParsedYaml<T = unknown> {
  /** Parsed data */
  data: T;
  
  /** Source file path */
  file: string;
  
  /** Raw YAML content */
  source: string;
  
  /** YAML document for position queries */
  document: YAML.Document;
}

/**
 * YAML parser with position tracking capabilities
 */
export class YamlParser {
  /**
   * Parse YAML file with position tracking
   */
  async parseFile<T = unknown>(filePath: string): Promise<ParsedYaml<T>> {
    try {
      const source = await readFile(filePath, 'utf8');
      return this.parseString<T>(source, filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new YamlParseError(`File not found: ${filePath}`, filePath);
      }
      throw new YamlParseError(
        `Failed to read file: ${(error as Error).message}`, 
        filePath
      );
    }
  }
  
  /**
   * Parse YAML string with position tracking
   */
  parseString<T = unknown>(source: string, filePath: string = '<string>'): ParsedYaml<T> {
    try {
      const document = YAML.parseDocument(source, {
        keepSourceTokens: true
      });
      
      // Check for YAML parsing errors
      if (document.errors.length > 0) {
        const error = document.errors[0];
        const position = error.pos ? this.getPositionFromOffset(source, error.pos[0]) : undefined;
        throw new YamlParseError(
          `YAML syntax error: ${error.message}`,
          filePath,
          position
        );
      }
      
      // Check for warnings
      if (document.warnings.length > 0) {
        // For now, just log warnings - could be configurable
        for (const warning of document.warnings) {
          console.warn(`YAML warning in ${filePath}: ${warning.message}`);
        }
      }
      
      const data = document.toJS() as T;
      
      return {
        data,
        file: filePath,
        source,
        document
      };
    } catch (error) {
      if (error instanceof YamlParseError) {
        throw error;
      }
      
      throw new YamlParseError(
        `Failed to parse YAML: ${(error as Error).message}`,
        filePath
      );
    }
  }
  
  /**
   * Get source position for a specific path in the parsed document
   */
  getPositionForPath(parsed: ParsedYaml, path: (string | number)[]): SourcePosition | null {
    try {
      // Navigate to the node at the specified path
      let node = parsed.document.contents;
      
      for (const segment of path) {
        if (!node) break;
        
        if (typeof segment === 'string' && YAML.isMap(node)) {
          const pair = node.items.find(item => 
            YAML.isScalar(item.key) && item.key.value === segment
          );
          node = pair?.value || null;
        } else if (typeof segment === 'number' && YAML.isSeq(node)) {
          node = node.items[segment] || null;
        } else {
          return null;
        }
      }
      
      if (node && 'range' in node && node.range) {
        return this.getPositionFromOffset(parsed.source, node.range[0]);
      }
      
      return null;
    } catch {
      return null;
    }
  }
  
  /**
   * Get source range for a specific path in the parsed document
   */
  getRangeForPath(parsed: ParsedYaml, path: (string | number)[]): SourceRange | null {
    try {
      // Navigate to the node at the specified path
      let node = parsed.document.contents;
      
      for (const segment of path) {
        if (!node) break;
        
        if (typeof segment === 'string' && YAML.isMap(node)) {
          const pair = node.items.find(item => 
            YAML.isScalar(item.key) && item.key.value === segment
          );
          node = pair?.value || null;
        } else if (typeof segment === 'number' && YAML.isSeq(node)) {
          node = node.items[segment] || null;
        } else {
          return null;
        }
      }
      
      if (node && 'range' in node && node.range) {
        return {
          start: this.getPositionFromOffset(parsed.source, node.range[0]),
          end: this.getPositionFromOffset(parsed.source, node.range[1])
        };
      }
      
      return null;
    } catch {
      return null;
    }
  }
  
  /**
   * Convert character offset to line/column position
   */
  private getPositionFromOffset(source: string, offset: number): SourcePosition {
    const lines = source.substring(0, offset).split('\\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    
    return { line, column, offset };
  }
  
  /**
   * Validate YAML against JSON Schema
   */
  async validateSchema(parsed: ParsedYaml, schemaPath: string): Promise<ValidationResult> {
    try {
      const Ajv = (await import('ajv')).default;
      const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
      
      const ajv = new Ajv({ allErrors: true, verbose: true });
      const validate = ajv.compile(schema);
      
      const isValid = validate(parsed.data);
      
      if (!isValid && validate.errors) {
        const errors = validate.errors.map(error => ({
          message: `${error.instancePath || 'root'} ${error.message}`,
          path: this.errorPathToArray(error.instancePath),
          position: this.getPositionForPath(parsed, this.errorPathToArray(error.instancePath)),
          data: error.data,
          schema: error.schema
        }));
        
        return { isValid: false, errors };
      }
      
      return { isValid: true, errors: [] };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          message: `Schema validation failed: ${(error as Error).message}`,
          path: [],
          position: null,
          data: null,
          schema: null
        }]
      };
    }
  }
  
  /**
   * Convert JSON Schema error path to array
   */
  private errorPathToArray(instancePath: string = ''): (string | number)[] {
    if (!instancePath || instancePath === '') return [];
    
    return instancePath
      .split('/')
      .slice(1) // Remove leading empty string
      .map(segment => {
        // Try to parse as number for array indices
        const num = parseInt(segment, 10);
        return isNaN(num) ? segment : num;
      });
  }
}

/**
 * Schema validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Schema validation error
 */
export interface ValidationError {
  message: string;
  path: (string | number)[];
  position: SourcePosition | null;
  data: unknown;
  schema: unknown;
}

/**
 * Create a new YAML parser instance
 */
export function createYamlParser(): YamlParser {
  return new YamlParser();
}

/**
 * Quick utility function to parse a YAML file
 */
export async function parseYamlFile<T = unknown>(filePath: string): Promise<ParsedYaml<T>> {
  const parser = createYamlParser();
  return parser.parseFile<T>(filePath);
}

/**
 * Quick utility function to parse YAML string
 */
export function parseYamlString<T = unknown>(source: string, filePath?: string): ParsedYaml<T> {
  const parser = createYamlParser();
  return parser.parseString<T>(source, filePath);
}