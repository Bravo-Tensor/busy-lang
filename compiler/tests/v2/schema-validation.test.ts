/**
 * Tests for BUSY v2.0 Schema Validation
 * Tests JSON schema validation for capabilities, responsibilities, resources, and requirements
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';

describe('BUSY v2.0 Schema Validation', () => {
  let ajv: Ajv;
  let capabilitySchema: any;
  let responsibilitySchema: any;
  let resourceSchema: any;
  let requirementSchema: any;
  let busySchema: any;

  beforeAll(() => {
    ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(ajv);

    // Load schemas
    const schemaPath = path.join(__dirname, '../../schemas/v2');
    
    capabilitySchema = JSON.parse(
      fs.readFileSync(path.join(schemaPath, 'capability-schema.json'), 'utf8')
    );
    
    responsibilitySchema = JSON.parse(
      fs.readFileSync(path.join(schemaPath, 'responsibility-schema.json'), 'utf8')
    );
    
    resourceSchema = JSON.parse(
      fs.readFileSync(path.join(schemaPath, 'resource-schema.json'), 'utf8')
    );
    
    requirementSchema = JSON.parse(
      fs.readFileSync(path.join(schemaPath, 'requirement-schema.json'), 'utf8')
    );
    
    busySchema = JSON.parse(
      fs.readFileSync(path.join(schemaPath, 'busy-schema.json'), 'utf8')
    );

    // Add schemas to AJV
    ajv.addSchema(capabilitySchema, 'capability');
    ajv.addSchema(responsibilitySchema, 'responsibility');
    ajv.addSchema(resourceSchema, 'resource');
    ajv.addSchema(requirementSchema, 'requirement');
    ajv.addSchema(busySchema, 'busy');
  });

  describe('Capability Schema Validation', () => {
    it('should validate complete capability definition', () => {
      const validCapability = {
        name: 'qualify-lead',
        description: 'Assess lead potential and fit',
        method: 'Review lead information and score against qualification criteria',
        inputs: [
          {
            name: 'raw_lead',
            type: 'data',
            format: 'lead_info',
            fields: [
              {
                name: 'company_name',
                type: 'string',
                required: true
              },
              {
                name: 'contact_email',
                type: 'string',
                required: true
              }
            ]
          }
        ],
        outputs: [
          {
            name: 'qualified_lead',
            type: 'data',
            format: 'qualification_result',
            fields: [
              {
                name: 'status',
                type: 'string',
                required: true
              },
              {
                name: 'score',
                type: 'number',
                required: true
              }
            ]
          }
        ],
        version: '1.0',
        provider: 'sales-team',
        tags: ['sales', 'qualification']
      };

      const validate = ajv.getSchema('capability');
      const isValid = validate!(validCapability);

      if (!isValid) {
        console.log('Validation errors:', validate!.errors);
      }

      expect(isValid).toBe(true);
    });

    it('should validate minimal capability definition', () => {
      const minimalCapability = {
        name: 'simple-task',
        description: 'A simple task',
        method: 'Do something simple',
        inputs: [],
        outputs: []
      };

      const validate = ajv.getSchema('capability');
      const isValid = validate!(minimalCapability);

      expect(isValid).toBe(true);
    });

    it('should reject capability without required fields', () => {
      const invalidCapability = {
        name: 'invalid-capability',
        // Missing description, method, inputs, outputs
      };

      const validate = ajv.getSchema('capability');
      const isValid = validate!(invalidCapability);

      expect(isValid).toBe(false);
      expect(validate!.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          instancePath: '',
          keyword: 'required',
          params: expect.objectContaining({
            missingProperty: expect.stringMatching(/description|method|inputs|outputs/)
          })
        })
      ]));
    });

    it('should validate input/output specifications', () => {
      const capabilityWithComplexIO = {
        name: 'complex-capability',
        description: 'Capability with complex input/output',
        method: 'Process complex data',
        inputs: [
          {
            name: 'complex_input',
            type: 'data',
            format: 'complex_format',
            fields: [
              {
                name: 'id',
                type: 'string',
                required: true
              },
              {
                name: 'metadata',
                type: 'object',
                required: false
              }
            ]
          }
        ],
        outputs: [
          {
            name: 'result',
            type: 'document',
            format: 'report',
            fields: [
              {
                name: 'summary',
                type: 'string',
                required: true
              }
            ]
          }
        ]
      };

      const validate = ajv.getSchema('capability');
      const isValid = validate!(capabilityWithComplexIO);

      expect(isValid).toBe(true);
    });

    it('should reject invalid input/output types', () => {
      const invalidCapability = {
        name: 'invalid-io-capability',
        description: 'Capability with invalid I/O',
        method: 'Process data',
        inputs: [
          {
            name: 'invalid_input',
            type: 'invalid_type', // Invalid type
            fields: []
          }
        ],
        outputs: []
      };

      const validate = ajv.getSchema('capability');
      const isValid = validate!(invalidCapability);

      expect(isValid).toBe(false);
      expect(validate!.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          keyword: 'enum',
          instancePath: '/inputs/0/type'
        })
      ]));
    });
  });

  describe('Responsibility Schema Validation', () => {
    it('should validate complete responsibility definition', () => {
      const validResponsibility = {
        name: 'maintain-lead-quality',
        description: 'Ensure lead qualification accuracy stays above 80%',
        method: 'Monitor qualification accuracy and alert when below threshold',
        inputs: [],
        outputs: [
          {
            name: 'quality_alert',
            type: 'notification',
            format: 'alert',
            fields: [
              {
                name: 'current_accuracy',
                type: 'number',
                required: true
              },
              {
                name: 'trend',
                type: 'string',
                required: true
              }
            ]
          }
        ],
        monitoringType: 'continuous',
        version: '1.0',
        provider: 'quality-system'
      };

      const validate = ajv.getSchema('responsibility');
      const isValid = validate!(validResponsibility);

      if (!isValid) {
        console.log('Responsibility validation errors:', validate!.errors);
      }

      expect(isValid).toBe(true);
    });

    it('should validate different monitoring types', () => {
      const monitoringTypes = ['continuous', 'periodic', 'event-driven'];

      monitoringTypes.forEach(monitoringType => {
        const responsibility = {
          name: `test-responsibility-${monitoringType}`,
          description: `Test responsibility with ${monitoringType} monitoring`,
          method: 'Monitor something',
          inputs: [],
          outputs: [],
          monitoringType
        };

        const validate = ajv.getSchema('responsibility');
        const isValid = validate!(responsibility);

        expect(isValid).toBe(true);
      });
    });

    it('should reject invalid monitoring type', () => {
      const invalidResponsibility = {
        name: 'invalid-monitoring',
        description: 'Invalid monitoring type',
        method: 'Monitor with invalid type',
        inputs: [],
        outputs: [],
        monitoringType: 'invalid-type'
      };

      const validate = ajv.getSchema('responsibility');
      const isValid = validate!(invalidResponsibility);

      expect(isValid).toBe(false);
      expect(validate!.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          keyword: 'enum',
          instancePath: '/monitoringType'
        })
      ]));
    });

    it('should require monitoringType field', () => {
      const responsibilityWithoutMonitoring = {
        name: 'no-monitoring-type',
        description: 'Responsibility without monitoring type',
        method: 'Do something',
        inputs: [],
        outputs: []
        // Missing monitoringType
      };

      const validate = ajv.getSchema('responsibility');
      const isValid = validate!(responsibilityWithoutMonitoring);

      expect(isValid).toBe(false);
      expect(validate!.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          keyword: 'required',
          params: { missingProperty: 'monitoringType' }
        })
      ]));
    });
  });

  describe('Resource Schema Validation', () => {
    it('should validate complete resource definition', () => {
      const validResource = {
        name: 'jane_doe',
        extends: 'sales_team_member',
        characteristics: {
          type: 'person',
          role: 'senior_sales_rep',
          experience_years: 5,
          capabilities: ['qualify-lead', 'close-deals'],
          location: 'NYC',
          availability: 'full-time',
          cost_per_hour: 75.50
        }
      };

      const validate = ajv.getSchema('resource');
      const isValid = validate!(validResource);

      if (!isValid) {
        console.log('Resource validation errors:', validate!.errors);
      }

      expect(isValid).toBe(true);
    });

    it('should validate resource without inheritance', () => {
      const simpleResource = {
        name: 'meeting_room_a',
        characteristics: {
          type: 'meeting_space',
          capacity: 8,
          equipment: ['projector', 'whiteboard', 'conference_phone'],
          location: 'floor_2'
        }
      };

      const validate = ajv.getSchema('resource');
      const isValid = validate!(simpleResource);

      expect(isValid).toBe(true);
    });

    it('should allow flexible characteristics', () => {
      const resourceWithCustomCharacteristics = {
        name: 'specialized_tool',
        characteristics: {
          type: 'software',
          license_type: 'enterprise',
          supported_formats: ['pdf', 'docx', 'xlsx'],
          api_endpoints: 50,
          custom_field: 'custom_value',
          nested_object: {
            sub_field: 'sub_value',
            sub_number: 42
          }
        }
      };

      const validate = ajv.getSchema('resource');
      const isValid = validate!(resourceWithCustomCharacteristics);

      expect(isValid).toBe(true);
    });

    it('should reject resource without required fields', () => {
      const invalidResource = {
        name: 'invalid_resource'
        // Missing characteristics
      };

      const validate = ajv.getSchema('resource');
      const isValid = validate!(invalidResource);

      expect(isValid).toBe(false);
      expect(validate!.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          keyword: 'required',
          params: { missingProperty: 'characteristics' }
        })
      ]));
    });
  });

  describe('Requirement Schema Validation', () => {
    it('should validate complete requirement with priority chain', () => {
      const validRequirement = {
        name: 'sales_rep',
        characteristics: {
          capabilities: ['qualify-lead'],
          experience_years: '>2'
        },
        priority: [
          {
            type: 'specific',
            specific: 'jane_doe'
          },
          {
            type: 'characteristics',
            characteristics: {
              experience_years: '>2',
              capabilities: ['qualify-lead'],
              location: 'NYC'
            }
          },
          {
            type: 'emergency',
            characteristics: {
              capabilities: ['basic-qualification']
            },
            warning: 'Using emergency resource allocation'
          }
        ]
      };

      const validate = ajv.getSchema('requirement');
      const isValid = validate!(validRequirement);

      if (!isValid) {
        console.log('Requirement validation errors:', validate!.errors);
      }

      expect(isValid).toBe(true);
    });

    it('should validate different priority types', () => {
      const specificPriority = {
        name: 'specific_requirement',
        priority: [
          {
            type: 'specific',
            specific: 'specific_resource_id'
          }
        ]
      };

      const characteristicsPriority = {
        name: 'characteristics_requirement',
        priority: [
          {
            type: 'characteristics',
            characteristics: {
              type: 'person',
              skills: ['communication', 'analysis']
            }
          }
        ]
      };

      const emergencyPriority = {
        name: 'emergency_requirement',
        priority: [
          {
            type: 'emergency',
            characteristics: {
              available: true
            },
            warning: 'Emergency allocation'
          }
        ]
      };

      const validate = ajv.getSchema('requirement');

      expect(validate!(specificPriority)).toBe(true);
      expect(validate!(characteristicsPriority)).toBe(true);
      expect(validate!(emergencyPriority)).toBe(true);
    });

    it('should reject invalid priority types', () => {
      const invalidRequirement = {
        name: 'invalid_priority',
        priority: [
          {
            type: 'invalid_type',
            specific: 'some_resource'
          }
        ]
      };

      const validate = ajv.getSchema('requirement');
      const isValid = validate!(invalidRequirement);

      expect(isValid).toBe(false);
      expect(validate!.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          keyword: 'enum',
          instancePath: '/priority/0/type'
        })
      ]));
    });

    it('should require specific field for specific priority type', () => {
      const invalidSpecificPriority = {
        name: 'invalid_specific',
        priority: [
          {
            type: 'specific'
            // Missing specific field
          }
        ]
      };

      const validate = ajv.getSchema('requirement');
      const isValid = validate!(invalidSpecificPriority);

      expect(isValid).toBe(false);
    });

    it('should require characteristics field for characteristics priority type', () => {
      const invalidCharacteristicsPriority = {
        name: 'invalid_characteristics',
        priority: [
          {
            type: 'characteristics'
            // Missing characteristics field
          }
        ]
      };

      const validate = ajv.getSchema('requirement');
      const isValid = validate!(invalidCharacteristicsPriority);

      expect(isValid).toBe(false);
    });
  });

  describe('Complete BUSY Schema Validation', () => {
    it('should validate complete v2.0 BUSY file', () => {
      const validBusyFile = {
        version: '2.0',
        metadata: {
          name: 'Sales Process v2.0',
          description: 'Complete sales process with v2.0 features',
          layer: 'L0'
        },
        imports: [
          {
            capability: 'external-validation',
            version: '^2.0'
          },
          {
            tool: 'salesforce',
            version: '^1.5'
          }
        ],
        capabilities: [
          {
            capability: {
              name: 'qualify-lead',
              description: 'Lead qualification capability',
              method: 'Review and score leads',
              inputs: [
                {
                  name: 'raw_lead',
                  type: 'data',
                  fields: [
                    {
                      name: 'company_name',
                      type: 'string',
                      required: true
                    }
                  ]
                }
              ],
              outputs: [
                {
                  name: 'qualified_lead',
                  type: 'data',
                  fields: [
                    {
                      name: 'status',
                      type: 'string',
                      required: true
                    }
                  ]
                }
              ]
            }
          }
        ],
        responsibilities: [
          {
            responsibility: {
              name: 'maintain-quality',
              description: 'Quality monitoring',
              method: 'Monitor and alert',
              inputs: [],
              outputs: [],
              monitoringType: 'continuous'
            }
          }
        ],
        resources: [
          {
            resource: {
              name: 'sales_rep',
              characteristics: {
                type: 'person',
                capabilities: ['qualify-lead']
              }
            }
          }
        ],
        role: {
          name: 'sales-representative',
          capabilities: ['qualify-lead'],
          responsibilities: ['maintain-quality']
        },
        playbook: {
          name: 'lead-process',
          description: 'Lead processing workflow',
          steps: [
            {
              step: {
                name: 'qualify_lead',
                method: 'Qualify the incoming lead',
                requirements: [
                  {
                    name: 'sales_rep',
                    priority: [
                      {
                        type: 'characteristics',
                        characteristics: {
                          capabilities: ['qualify-lead']
                        }
                      }
                    ]
                  }
                ],
                inputs: [
                  {
                    name: 'raw_lead',
                    type: 'data',
                    fields: []
                  }
                ],
                outputs: [
                  {
                    name: 'qualified_lead',
                    type: 'data',
                    fields: []
                  }
                ]
              }
            }
          ],
          inputs: [
            {
              name: 'incoming_lead',
              type: 'data',
              fields: []
            }
          ],
          outputs: [
            {
              name: 'process_result',
              type: 'data',
              fields: []
            }
          ]
        }
      };

      const validate = ajv.getSchema('busy');
      const isValid = validate!(validBusyFile);

      if (!isValid) {
        console.log('Complete BUSY validation errors:', validate!.errors);
      }

      expect(isValid).toBe(true);
    });

    it('should validate minimal v2.0 BUSY file', () => {
      const minimalBusyFile = {
        version: '2.0',
        metadata: {
          name: 'Minimal Process',
          layer: 'L0'
        }
      };

      const validate = ajv.getSchema('busy');
      const isValid = validate!(minimalBusyFile);

      expect(isValid).toBe(true);
    });

    it('should reject file with wrong version', () => {
      const invalidVersionFile = {
        version: '1.0', // Wrong version
        metadata: {
          name: 'Invalid Version',
          layer: 'L0'
        }
      };

      const validate = ajv.getSchema('busy');
      const isValid = validate!(invalidVersionFile);

      expect(isValid).toBe(false);
      expect(validate!.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          keyword: 'enum',
          instancePath: '/version'
        })
      ]));
    });

    it('should reject file without required metadata', () => {
      const invalidFile = {
        version: '2.0'
        // Missing metadata
      };

      const validate = ajv.getSchema('busy');
      const isValid = validate!(invalidFile);

      expect(isValid).toBe(false);
      expect(validate!.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          keyword: 'required',
          params: { missingProperty: 'metadata' }
        })
      ]));
    });
  });

  describe('Schema Cross-References', () => {
    it('should validate capability references in roles', () => {
      const fileWithCapabilityReference = {
        version: '2.0',
        metadata: {
          name: 'Reference Test',
          layer: 'L0'
        },
        capabilities: [
          {
            capability: {
              name: 'test-capability',
              description: 'Test capability',
              method: 'Test method',
              inputs: [],
              outputs: []
            }
          }
        ],
        role: {
          name: 'test-role',
          capabilities: ['test-capability'] // Reference to defined capability
        }
      };

      const validate = ajv.getSchema('busy');
      const isValid = validate!(fileWithCapabilityReference);

      expect(isValid).toBe(true);
    });

    it('should validate resource requirements in steps', () => {
      const fileWithResourceRequirement = {
        version: '2.0',
        metadata: {
          name: 'Resource Test',
          layer: 'L0'
        },
        resources: [
          {
            resource: {
              name: 'test-resource',
              characteristics: {
                type: 'test',
                capabilities: ['test-cap']
              }
            }
          }
        ],
        playbook: {
          name: 'test-playbook',
          steps: [
            {
              step: {
                name: 'test-step',
                method: 'Test step method',
                requirements: [
                  {
                    name: 'test-req',
                    priority: [
                      {
                        type: 'specific',
                        specific: 'test-resource' // Reference to defined resource
                      }
                    ]
                  }
                ],
                inputs: [],
                outputs: []
              }
            }
          ],
          inputs: [],
          outputs: []
        }
      };

      const validate = ajv.getSchema('busy');
      const isValid = validate!(fileWithResourceRequirement);

      expect(isValid).toBe(true);
    });
  });
});