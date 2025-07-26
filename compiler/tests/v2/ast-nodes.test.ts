/**
 * Tests for BUSY v2.0 AST Nodes
 * Tests new node types, capability/responsibility structures, and resource definitions
 */

import { 
  CapabilityNode, 
  ResponsibilityNode, 
  ResourceDefinitionNode,
  RequirementNode,
  StepNode,
  RoleNode,
  PlaybookNode,
  PriorityItemNode,
  InputOutputSpecNode,
  FieldSpecNode
} from '../../src/ast/nodes-v2';

describe('BUSY v2.0 AST Nodes', () => {
  describe('CapabilityNode', () => {
    it('should create capability node with required fields', () => {
      const inputSpec: InputOutputSpecNode = {
        type: 'InputOutputSpecNode',
        name: 'raw_lead',
        dataType: 'data',
        format: 'lead_info',
        fields: [
          {
            type: 'FieldSpecNode',
            name: 'company_name',
            fieldType: 'string',
            required: true,
            location: { line: 1, column: 1, offset: 0, length: 12 }
          }
        ],
        location: { line: 1, column: 1, offset: 0, length: 50 }
      };

      const outputSpec: InputOutputSpecNode = {
        type: 'InputOutputSpecNode',
        name: 'qualified_lead',
        dataType: 'data',
        format: 'qualification_result',
        fields: [
          {
            type: 'FieldSpecNode',
            name: 'status',
            fieldType: 'string',
            required: true,
            location: { line: 2, column: 1, offset: 51, length: 6 }
          }
        ],
        location: { line: 2, column: 1, offset: 51, length: 60 }
      };

      const capability: CapabilityNode = {
        type: 'CapabilityNode',
        name: 'qualify-lead',
        description: 'Assess lead potential and fit',
        method: 'Review lead information and score against criteria',
        inputs: [inputSpec],
        outputs: [outputSpec],
        version: '1.0',
        provider: 'sales-team',
        tags: ['sales', 'qualification'],
        location: { line: 1, column: 1, offset: 0, length: 200 }
      };

      expect(capability.type).toBe('CapabilityNode');
      expect(capability.name).toBe('qualify-lead');
      expect(capability.inputs).toHaveLength(1);
      expect(capability.outputs).toHaveLength(1);
      expect(capability.tags).toContain('sales');
    });

    it('should handle optional fields', () => {
      const minimalCapability: CapabilityNode = {
        type: 'CapabilityNode',
        name: 'simple-capability',
        description: 'Simple capability',
        method: 'Do something simple',
        inputs: [],
        outputs: [],
        location: { line: 1, column: 1, offset: 0, length: 100 }
      };

      expect(minimalCapability.version).toBeUndefined();
      expect(minimalCapability.provider).toBeUndefined();
      expect(minimalCapability.tags).toBeUndefined();
    });
  });

  describe('ResponsibilityNode', () => {
    it('should create responsibility node with monitoring type', () => {
      const responsibility: ResponsibilityNode = {
        type: 'ResponsibilityNode',
        name: 'maintain-lead-quality',
        description: 'Ensure lead qualification accuracy stays above 80%',
        method: 'Monitor qualification accuracy and alert when below threshold',
        inputs: [],
        outputs: [
          {
            type: 'InputOutputSpecNode',
            name: 'quality_alert',
            dataType: 'notification',
            format: 'alert',
            fields: [
              {
                type: 'FieldSpecNode',
                name: 'current_accuracy',
                fieldType: 'number',
                required: true,
                location: { line: 1, column: 1, offset: 0, length: 16 }
              }
            ],
            location: { line: 1, column: 1, offset: 0, length: 50 }
          }
        ],
        monitoringType: 'continuous',
        location: { line: 1, column: 1, offset: 0, length: 150 }
      };

      expect(responsibility.type).toBe('ResponsibilityNode');
      expect(responsibility.monitoringType).toBe('continuous');
      expect(responsibility.outputs).toHaveLength(1);
    });

    it('should support different monitoring types', () => {
      const periodicResponsibility: ResponsibilityNode = {
        type: 'ResponsibilityNode',
        name: 'weekly-report',
        description: 'Generate weekly reports',
        method: 'Compile and send weekly performance reports',
        inputs: [],
        outputs: [],
        monitoringType: 'periodic',
        location: { line: 1, column: 1, offset: 0, length: 100 }
      };

      const eventDrivenResponsibility: ResponsibilityNode = {
        type: 'ResponsibilityNode',
        name: 'alert-on-failure',
        description: 'Alert when system failures occur',
        method: 'Monitor system health and send alerts',
        inputs: [],
        outputs: [],
        monitoringType: 'event-driven',
        location: { line: 1, column: 1, offset: 0, length: 100 }
      };

      expect(periodicResponsibility.monitoringType).toBe('periodic');
      expect(eventDrivenResponsibility.monitoringType).toBe('event-driven');
    });
  });

  describe('ResourceDefinitionNode', () => {
    it('should create resource with characteristics', () => {
      const resource: ResourceDefinitionNode = {
        type: 'ResourceDefinitionNode',
        name: 'jane_doe',
        extends: 'sales_team_member',
        characteristics: {
          type: 'person',
          role: 'senior_sales_rep',
          experience_years: 5,
          capabilities: ['qualify-lead', 'close-deals'],
          location: 'NYC'
        },
        location: { line: 1, column: 1, offset: 0, length: 120 }
      };

      expect(resource.type).toBe('ResourceDefinitionNode');
      expect(resource.name).toBe('jane_doe');
      expect(resource.extends).toBe('sales_team_member');
      expect(resource.characteristics.type).toBe('person');
      expect(resource.characteristics.capabilities).toContain('qualify-lead');
    });

    it('should handle resource without inheritance', () => {
      const simpleResource: ResourceDefinitionNode = {
        type: 'ResourceDefinitionNode',
        name: 'meeting_room_a',
        characteristics: {
          type: 'meeting_space',
          capacity: 8,
          equipment: ['projector', 'whiteboard']
        },
        location: { line: 1, column: 1, offset: 0, length: 80 }
      };

      expect(simpleResource.extends).toBeUndefined();
      expect(simpleResource.characteristics.capacity).toBe(8);
      expect(simpleResource.characteristics.equipment).toContain('projector');
    });
  });

  describe('RequirementNode', () => {
    it('should create requirement with priority chain', () => {
      const specificPriority: PriorityItemNode = {
        type: 'PriorityItemNode',
        priorityType: 'specific',
        specific: 'jane_doe',
        location: { line: 1, column: 1, offset: 0, length: 20 }
      };

      const characteristicsPriority: PriorityItemNode = {
        type: 'PriorityItemNode',
        priorityType: 'characteristics',
        characteristics: {
          experience_years: '>2',
          capabilities: ['qualify-lead']
        },
        location: { line: 2, column: 1, offset: 21, length: 50 }
      };

      const emergencyPriority: PriorityItemNode = {
        type: 'PriorityItemNode',
        priorityType: 'emergency',
        characteristics: {
          capabilities: ['qualify-lead']
        },
        warning: 'Using emergency resource allocation',
        location: { line: 3, column: 1, offset: 72, length: 60 }
      };

      const requirement: RequirementNode = {
        type: 'RequirementNode',
        name: 'sales_rep',
        characteristics: {
          capabilities: ['qualify-lead']
        },
        priority: [specificPriority, characteristicsPriority, emergencyPriority],
        location: { line: 1, column: 1, offset: 0, length: 150 }
      };

      expect(requirement.type).toBe('RequirementNode');
      expect(requirement.priority).toHaveLength(3);
      expect(requirement.priority[0].priorityType).toBe('specific');
      expect(requirement.priority[1].priorityType).toBe('characteristics');
      expect(requirement.priority[2].priorityType).toBe('emergency');
      expect(requirement.priority[2].warning).toBeDefined();
    });
  });

  describe('StepNode v2.0', () => {
    it('should create step with method field and requirements', () => {
      const requirement: RequirementNode = {
        type: 'RequirementNode',
        name: 'sales_rep',
        priority: [
          {
            type: 'PriorityItemNode',
            priorityType: 'specific',
            specific: 'jane_doe',
            location: { line: 1, column: 1, offset: 0, length: 20 }
          }
        ],
        location: { line: 1, column: 1, offset: 0, length: 50 }
      };

      const step: StepNode = {
        type: 'StepNode',
        name: 'qualify_lead',
        method: 'Review lead information and company profile.\nScore lead based on qualification criteria.\nDocument decision and reasoning.',
        requirements: [requirement],
        inputs: [
          {
            type: 'InputOutputSpecNode',
            name: 'raw_lead',
            dataType: 'data',
            format: 'lead_info',
            fields: [],
            location: { line: 1, column: 1, offset: 0, length: 30 }
          }
        ],
        outputs: [
          {
            type: 'InputOutputSpecNode',
            name: 'qualified_lead',
            dataType: 'data',
            format: 'qualification_result',
            fields: [],
            location: { line: 2, column: 1, offset: 31, length: 40 }
          }
        ],
        location: { line: 1, column: 1, offset: 0, length: 200 }
      };

      expect(step.type).toBe('StepNode');
      expect(step.method).toContain('Review lead information');
      expect(step.requirements).toHaveLength(1);
      expect(step.inputs).toHaveLength(1);
      expect(step.outputs).toHaveLength(1);
    });

    it('should handle step without requirements', () => {
      const simpleStep: StepNode = {
        type: 'StepNode',
        name: 'simple_step',
        method: 'Perform a simple operation',
        inputs: [],
        outputs: [],
        location: { line: 1, column: 1, offset: 0, length: 50 }
      };

      expect(simpleStep.requirements).toBeUndefined();
      expect(simpleStep.method).toBe('Perform a simple operation');
    });
  });

  describe('RoleNode v2.0', () => {
    it('should create role with capability and responsibility references', () => {
      const role: RoleNode = {
        type: 'RoleNode',
        name: 'sales-rep',
        capabilities: ['qualify-lead', 'schedule-meetings', 'update-crm'],
        responsibilities: ['maintain-lead-quality', 'follow-up-prospects'],
        location: { line: 1, column: 1, offset: 0, length: 100 }
      };

      expect(role.type).toBe('RoleNode');
      expect(role.capabilities).toHaveLength(3);
      expect(role.responsibilities).toHaveLength(2);
      expect(role.capabilities).toContain('qualify-lead');
      expect(role.responsibilities).toContain('maintain-lead-quality');
    });

    it('should handle role with only capabilities', () => {
      const capabilityOnlyRole: RoleNode = {
        type: 'RoleNode',
        name: 'junior-analyst',
        capabilities: ['analyze-data'],
        location: { line: 1, column: 1, offset: 0, length: 50 }
      };

      expect(capabilityOnlyRole.responsibilities).toBeUndefined();
      expect(capabilityOnlyRole.capabilities).toEqual(['analyze-data']);
    });
  });

  describe('PlaybookNode v2.0', () => {
    it('should create playbook with v2.0 steps', () => {
      const step: StepNode = {
        type: 'StepNode',
        name: 'qualify_lead',
        method: 'Qualify the incoming lead using established criteria',
        requirements: [
          {
            type: 'RequirementNode',
            name: 'sales_rep',
            priority: [
              {
                type: 'PriorityItemNode',
                priorityType: 'characteristics',
                characteristics: { capabilities: ['qualify-lead'] },
                location: { line: 1, column: 1, offset: 0, length: 30 }
              }
            ],
            location: { line: 1, column: 1, offset: 0, length: 50 }
          }
        ],
        inputs: [],
        outputs: [],
        location: { line: 1, column: 1, offset: 0, length: 100 }
      };

      const playbook: PlaybookNode = {
        type: 'PlaybookNode',
        name: 'lead-qualification-process',
        description: 'Complete lead qualification workflow',
        steps: [step],
        inputs: [
          {
            type: 'InputOutputSpecNode',
            name: 'incoming_lead',
            dataType: 'data',
            format: 'lead_data',
            fields: [],
            location: { line: 1, column: 1, offset: 0, length: 30 }
          }
        ],
        outputs: [
          {
            type: 'InputOutputSpecNode',
            name: 'qualification_result',
            dataType: 'data',
            format: 'result',
            fields: [],
            location: { line: 2, column: 1, offset: 31, length: 40 }
          }
        ],
        location: { line: 1, column: 1, offset: 0, length: 200 }
      };

      expect(playbook.type).toBe('PlaybookNode');
      expect(playbook.steps).toHaveLength(1);
      expect(playbook.steps[0].method).toContain('Qualify the incoming lead');
      expect(playbook.steps[0].requirements).toBeDefined();
    });
  });

  describe('InputOutputSpecNode', () => {
    it('should create input/output spec with fields', () => {
      const fields: FieldSpecNode[] = [
        {
          type: 'FieldSpecNode',
          name: 'company_name',
          fieldType: 'string',
          required: true,
          location: { line: 1, column: 1, offset: 0, length: 12 }
        },
        {
          type: 'FieldSpecNode',
          name: 'contact_email',
          fieldType: 'string',
          required: true,
          location: { line: 2, column: 1, offset: 13, length: 13 }
        },
        {
          type: 'FieldSpecNode',
          name: 'phone_number',
          fieldType: 'string',
          required: false,
          location: { line: 3, column: 1, offset: 27, length: 12 }
        }
      ];

      const inputSpec: InputOutputSpecNode = {
        type: 'InputOutputSpecNode',
        name: 'lead_data',
        dataType: 'data',
        format: 'lead_information',
        fields,
        location: { line: 1, column: 1, offset: 0, length: 100 }
      };

      expect(inputSpec.type).toBe('InputOutputSpecNode');
      expect(inputSpec.fields).toHaveLength(3);
      expect(inputSpec.fields[0].required).toBe(true);
      expect(inputSpec.fields[2].required).toBe(false);
    });

    it('should support different data types', () => {
      const dataInput: InputOutputSpecNode = {
        type: 'InputOutputSpecNode',
        name: 'data_input',
        dataType: 'data',
        fields: [],
        location: { line: 1, column: 1, offset: 0, length: 30 }
      };

      const documentInput: InputOutputSpecNode = {
        type: 'InputOutputSpecNode',
        name: 'document_input',
        dataType: 'document',
        fields: [],
        location: { line: 1, column: 1, offset: 0, length: 30 }
      };

      const notificationOutput: InputOutputSpecNode = {
        type: 'InputOutputSpecNode',
        name: 'alert_output',
        dataType: 'notification',
        fields: [],
        location: { line: 1, column: 1, offset: 0, length: 30 }
      };

      expect(dataInput.dataType).toBe('data');
      expect(documentInput.dataType).toBe('document');
      expect(notificationOutput.dataType).toBe('notification');
    });
  });

  describe('PriorityItemNode', () => {
    it('should create specific priority item', () => {
      const specificPriority: PriorityItemNode = {
        type: 'PriorityItemNode',
        priorityType: 'specific',
        specific: 'jane_doe_senior_rep',
        location: { line: 1, column: 1, offset: 0, length: 25 }
      };

      expect(specificPriority.priorityType).toBe('specific');
      expect(specificPriority.specific).toBe('jane_doe_senior_rep');
      expect(specificPriority.characteristics).toBeUndefined();
      expect(specificPriority.warning).toBeUndefined();
    });

    it('should create characteristics priority item', () => {
      const characteristicsPriority: PriorityItemNode = {
        type: 'PriorityItemNode',
        priorityType: 'characteristics',
        characteristics: {
          experience_years: '>3',
          capabilities: ['qualify-lead', 'close-deals'],
          availability: 'full-time',
          location: 'NYC'
        },
        location: { line: 1, column: 1, offset: 0, length: 80 }
      };

      expect(characteristicsPriority.priorityType).toBe('characteristics');
      expect(characteristicsPriority.characteristics?.experience_years).toBe('>3');
      expect(characteristicsPriority.characteristics?.capabilities).toContain('qualify-lead');
      expect(characteristicsPriority.specific).toBeUndefined();
    });

    it('should create emergency priority item with warning', () => {
      const emergencyPriority: PriorityItemNode = {
        type: 'PriorityItemNode',
        priorityType: 'emergency',
        characteristics: {
          capabilities: ['basic-qualification']
        },
        warning: 'Using junior staff for complex qualification - review required',
        location: { line: 1, column: 1, offset: 0, length: 100 }
      };

      expect(emergencyPriority.priorityType).toBe('emergency');
      expect(emergencyPriority.warning).toContain('Using junior staff');
      expect(emergencyPriority.characteristics?.capabilities).toContain('basic-qualification');
    });
  });

  describe('FieldSpecNode', () => {
    it('should create field specification', () => {
      const requiredField: FieldSpecNode = {
        type: 'FieldSpecNode',
        name: 'customer_id',
        fieldType: 'string',
        required: true,
        location: { line: 1, column: 1, offset: 0, length: 15 }
      };

      const optionalField: FieldSpecNode = {
        type: 'FieldSpecNode',
        name: 'notes',
        fieldType: 'string',
        required: false,
        location: { line: 2, column: 1, offset: 16, length: 10 }
      };

      const numberField: FieldSpecNode = {
        type: 'FieldSpecNode',
        name: 'score',
        fieldType: 'number',
        required: true,
        location: { line: 3, column: 1, offset: 27, length: 8 }
      };

      expect(requiredField.required).toBe(true);
      expect(optionalField.required).toBe(false);
      expect(requiredField.fieldType).toBe('string');
      expect(numberField.fieldType).toBe('number');
    });

    it('should support different field types', () => {
      const fieldTypes = ['string', 'number', 'boolean', 'date', 'object', 'array'];
      
      fieldTypes.forEach((fieldType, index) => {
        const field: FieldSpecNode = {
          type: 'FieldSpecNode',
          name: `field_${index}`,
          fieldType,
          required: true,
          location: { line: index + 1, column: 1, offset: index * 20, length: 15 }
        };

        expect(field.fieldType).toBe(fieldType);
      });
    });
  });

  describe('node location tracking', () => {
    it('should include location information in all nodes', () => {
      const capability: CapabilityNode = {
        type: 'CapabilityNode',
        name: 'test-capability',
        description: 'Test capability',
        method: 'Test method',
        inputs: [],
        outputs: [],
        location: { line: 5, column: 10, offset: 100, length: 50 }
      };

      expect(capability.location.line).toBe(5);
      expect(capability.location.column).toBe(10);
      expect(capability.location.offset).toBe(100);
      expect(capability.location.length).toBe(50);
    });

    it('should handle nested node locations', () => {
      const field: FieldSpecNode = {
        type: 'FieldSpecNode',
        name: 'nested_field',
        fieldType: 'string',
        required: true,
        location: { line: 3, column: 5, offset: 45, length: 12 }
      };

      const inputSpec: InputOutputSpecNode = {
        type: 'InputOutputSpecNode',
        name: 'input_with_field',
        dataType: 'data',
        fields: [field],
        location: { line: 2, column: 1, offset: 20, length: 60 }
      };

      expect(inputSpec.location.line).toBe(2);
      expect(inputSpec.fields[0].location.line).toBe(3);
      expect(inputSpec.fields[0].location.offset).toBeGreaterThan(inputSpec.location.offset);
    });
  });
});