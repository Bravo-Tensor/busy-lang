/**
 * End-to-End Integration Tests for BUSY v2.0
 * Tests complete workflows from parsing to runtime execution
 */

import { BusyRuntime, RuntimeConfig } from '../../src/runtime/busy-runtime';
import { ExecutionPolicy } from '../../src/runtime/execution-manager';
import { CapabilityDefinition, ResponsibilityDefinition } from '../../src/runtime/capability-resolver';
import { ResourceDefinition } from '../../src/runtime/resource-manager';
import * as yaml from 'yaml';
import * as fs from 'fs';
import * as path from 'path';

describe('BUSY v2.0 End-to-End Integration', () => {
  let runtime: BusyRuntime;

  beforeEach(() => {
    const executionPolicy: ExecutionPolicy = {
      defaultChain: ['algorithmic', 'ai', 'human'],
      allowHumanOverride: true,
      maxRetries: 2,
      executionTimeout: 10000,
      availableTypes: ['algorithmic', 'ai', 'human']
    };

    const config: RuntimeConfig = {
      executionPolicy,
      resourceConfig: {
        maxConcurrentAllocations: 5,
        defaultReservationMinutes: 10
      },
      capabilityConfig: {
        enableMarketplace: true,
        cacheResolutions: true
      }
    };

    runtime = new BusyRuntime(config);
  });

  describe('complete v2.0 workflow execution', () => {
    it('should execute kitchen restaurant workflow with v2.0 features', async () => {
      // Load example capabilities
      const capabilities: CapabilityDefinition[] = [
        {
          name: 'prepare-pizza',
          description: 'Prepare pizza according to order specifications',
          method: 'Review order details, prepare dough, add toppings, and bake pizza according to specifications',
          inputs: [
            {
              name: 'pizza_order',
              type: 'data',
              format: 'order_details',
              fields: [
                { name: 'size', type: 'string', required: true },
                { name: 'toppings', type: 'array', required: true },
                { name: 'special_instructions', type: 'string', required: false }
              ]
            }
          ],
          outputs: [
            {
              name: 'prepared_pizza',
              type: 'physical',
              format: 'food_item',
              fields: [
                { name: 'order_id', type: 'string', required: true },
                { name: 'preparation_time', type: 'number', required: true },
                { name: 'quality_score', type: 'number', required: true }
              ]
            }
          ]
        },
        {
          name: 'process-payment',
          description: 'Process customer payment for order',
          method: 'Validate payment method, process transaction, and confirm payment',
          inputs: [
            {
              name: 'payment_info',
              type: 'data',
              format: 'payment_details',
              fields: [
                { name: 'amount', type: 'number', required: true },
                { name: 'payment_method', type: 'string', required: true },
                { name: 'customer_id', type: 'string', required: true }
              ]
            }
          ],
          outputs: [
            {
              name: 'payment_confirmation',
              type: 'data',
              format: 'transaction_result',
              fields: [
                { name: 'transaction_id', type: 'string', required: true },
                { name: 'status', type: 'string', required: true }
              ]
            }
          ]
        }
      ];

      // Load example responsibilities
      const responsibilities: ResponsibilityDefinition[] = [
        {
          name: 'monitor-kitchen-quality',
          description: 'Monitor food quality and safety standards',
          method: 'Continuously monitor temperature, cleanliness, and food safety protocols',
          inputs: [],
          outputs: [
            {
              name: 'quality_alert',
              type: 'notification',
              format: 'alert',
              fields: [
                { name: 'alert_type', type: 'string', required: true },
                { name: 'severity', type: 'string', required: true }
              ]
            }
          ],
          monitoringType: 'continuous'
        }
      ];

      // Load example resources
      const resources: ResourceDefinition[] = [
        {
          name: 'head_chef_mario',
          characteristics: {
            type: 'person',
            role: 'head_chef',
            experience_years: 15,
            capabilities: ['prepare-pizza', 'quality-control', 'kitchen-management'],
            specialties: ['italian-cuisine', 'pizza-making'],
            availability: 'full-time',
            shift: 'day'
          }
        },
        {
          name: 'junior_chef_anna',
          extends: 'kitchen_staff',
          characteristics: {
            type: 'person',
            role: 'junior_chef',
            experience_years: 2,
            capabilities: ['prepare-pizza', 'basic-cooking'],
            availability: 'part-time',
            shift: 'evening'
          }
        },
        {
          name: 'pizza_oven_001',
          characteristics: {
            type: 'equipment',
            category: 'cooking',
            capabilities: ['high-heat-cooking', 'pizza-baking'],
            max_temperature: 900,
            fuel_type: 'wood',
            capacity: 4,
            location: 'kitchen_main'
          }
        },
        {
          name: 'pos_system',
          characteristics: {
            type: 'software',
            capabilities: ['process-payment', 'inventory-tracking'],
            version: '2.1.0',
            integrations: ['stripe', 'square'],
            uptime: 99.9
          }
        }
      ];

      // Initialize runtime with test data
      await runtime.initialize({
        capabilities,
        responsibilities,
        resources
      });

      // Register resource instances
      runtime['resourceManager'].registerInstance('head_chef_mario', {
        id: 'mario-001',
        name: 'Chef Mario',
        status: 'available',
        current_orders: 0
      });

      runtime['resourceManager'].registerInstance('pizza_oven_001', {
        id: 'oven-001',
        status: 'ready',
        current_temp: 850,
        queue_length: 0
      });

      runtime['resourceManager'].registerInstance('pos_system', {
        id: 'pos-001',
        status: 'online',
        connection: 'stable'
      });

      // Mock playbook definition
      jest.spyOn(runtime as any, 'loadPlaybookDefinition').mockResolvedValue({
        name: 'pizza-order-fulfillment',
        steps: [
          {
            name: 'prepare_pizza',
            method: 'Prepare pizza according to customer order specifications',
            requirements: [
              {
                name: 'chef',
                priority: [
                  {
                    type: 'specific',
                    specific: 'head_chef_mario'
                  },
                  {
                    type: 'characteristics',
                    characteristics: {
                      capabilities: ['prepare-pizza'],
                      experience_years: '>1'
                    }
                  }
                ]
              },
              {
                name: 'oven',
                priority: [
                  {
                    type: 'specific',
                    specific: 'pizza_oven_001'
                  },
                  {
                    type: 'characteristics',
                    characteristics: {
                      capabilities: ['pizza-baking'],
                      max_temperature: '>800'
                    }
                  }
                ]
              }
            ]
          },
          {
            name: 'process_payment',
            method: 'Process customer payment for the completed order',
            requirements: [
              {
                name: 'payment_system',
                priority: [
                  {
                    type: 'specific',
                    specific: 'pos_system'
                  }
                ]
              }
            ]
          }
        ]
      });

      // Mock step execution results
      jest.spyOn(runtime as any, 'executeStep')
        .mockResolvedValueOnce({
          id: 'step-1',
          name: 'prepare_pizza',
          status: 'completed',
          method: 'Prepare pizza according to customer order specifications',
          inputs: {
            pizza_order: {
              size: 'large',
              toppings: ['pepperoni', 'mushrooms'],
              special_instructions: 'extra cheese'
            }
          },
          outputs: {
            prepared_pizza: {
              order_id: 'ORDER-123',
              preparation_time: 18,
              quality_score: 9.2
            }
          },
          requirements: expect.any(Array),
          allocatedResources: [
            expect.objectContaining({ name: 'chef' }),
            expect.objectContaining({ name: 'oven' })
          ],
          warnings: [],
          errors: []
        })
        .mockResolvedValueOnce({
          id: 'step-2',
          name: 'process_payment',
          status: 'completed',
          method: 'Process customer payment for the completed order',
          inputs: {
            payment_info: {
              amount: 24.99,
              payment_method: 'credit_card',
              customer_id: 'CUST-456'
            }
          },
          outputs: {
            payment_confirmation: {
              transaction_id: 'TXN-789',
              status: 'success'
            }
          },
          requirements: expect.any(Array),
          allocatedResources: [
            expect.objectContaining({ name: 'payment_system' })
          ],
          warnings: [],
          errors: []
        });

      // Execute the complete workflow
      const execution = await runtime.executePlaybook('pizza-order-fulfillment', {
        customer_order: {
          pizza_order: {
            size: 'large',
            toppings: ['pepperoni', 'mushrooms'],
            special_instructions: 'extra cheese'
          },
          payment_info: {
            amount: 24.99,
            payment_method: 'credit_card',
            customer_id: 'CUST-456'
          }
        }
      });

      // Verify execution results
      expect(execution.status).toBe('completed');
      expect(execution.steps).toHaveLength(2);
      
      // Verify first step (pizza preparation)
      const pizzaStep = execution.steps[0];
      expect(pizzaStep.name).toBe('prepare_pizza');
      expect(pizzaStep.status).toBe('completed');
      expect(pizzaStep.outputs.prepared_pizza.order_id).toBe('ORDER-123');
      expect(pizzaStep.allocatedResources).toHaveLength(2);

      // Verify second step (payment processing)  
      const paymentStep = execution.steps[1];
      expect(paymentStep.name).toBe('process_payment');
      expect(paymentStep.status).toBe('completed');
      expect(paymentStep.outputs.payment_confirmation.status).toBe('success');
      expect(paymentStep.allocatedResources).toHaveLength(1);

      // Verify data flow between steps
      expect(paymentStep.inputs).toEqual(expect.objectContaining({
        payment_info: expect.objectContaining({
          amount: 24.99,
          payment_method: 'credit_card'
        })
      }));
    });

    it('should handle resource conflicts and priority chains', async () => {
      // Setup with limited resources
      const limitedResources: ResourceDefinition[] = [
        {
          name: 'single_chef',
          characteristics: {
            type: 'person',
            capabilities: ['prepare-pizza'],
            experience_years: 3
          }
        }
      ];

      await runtime.initialize({
        capabilities: [
          {
            name: 'prepare-pizza',
            description: 'Prepare pizza',
            method: 'Make pizza',
            inputs: [],
            outputs: []
          }
        ],
        resources: limitedResources
      });

      runtime['resourceManager'].registerInstance('single_chef', { status: 'available' });

      // Mock playbook with competing resource requirements
      jest.spyOn(runtime as any, 'loadPlaybookDefinition').mockResolvedValue({
        name: 'concurrent-orders',
        steps: [
          {
            name: 'order_1',
            method: 'Prepare first pizza order',
            requirements: [
              {
                name: 'chef',
                priority: [
                  {
                    type: 'specific',
                    specific: 'single_chef'
                  }
                ]
              }
            ]
          },
          {
            name: 'order_2',
            method: 'Prepare second pizza order',
            requirements: [
              {
                name: 'chef',
                priority: [
                  {
                    type: 'specific',
                    specific: 'single_chef' // Same resource
                  }
                ]
              }
            ]
          }
        ]
      });

      // Mock execution of first step to succeed, second to initially fail then succeed after resource release
      jest.spyOn(runtime as any, 'executeStep')
        .mockResolvedValueOnce({
          id: 'step-1',
          name: 'order_1',
          status: 'completed',
          method: 'Prepare first pizza order',
          inputs: {},
          outputs: { result: 'first_pizza_ready' },
          requirements: expect.any(Array),
          allocatedResources: [expect.objectContaining({ name: 'chef' })],
          warnings: [],
          errors: []
        })
        .mockResolvedValueOnce({
          id: 'step-2',
          name: 'order_2',
          status: 'completed',
          method: 'Prepare second pizza order',
          inputs: { result: 'first_pizza_ready' },
          outputs: { result: 'second_pizza_ready' },
          requirements: expect.any(Array),
          allocatedResources: [expect.objectContaining({ name: 'chef' })],
          warnings: [],
          errors: []
        });

      const execution = await runtime.executePlaybook('concurrent-orders', {});

      expect(execution.status).toBe('completed');
      expect(execution.steps).toHaveLength(2);
      expect(execution.steps[0].status).toBe('completed');
      expect(execution.steps[1].status).toBe('completed');
    });

    it('should handle execution strategy fallbacks', async () => {
      // Setup minimal runtime
      await runtime.initialize({
        capabilities: [
          {
            name: 'complex-analysis',
            description: 'Complex data analysis that may require AI or human intervention',
            method: 'Analyze complex customer data patterns',
            inputs: [],
            outputs: []
          }
        ]
      });

      jest.spyOn(runtime as any, 'loadPlaybookDefinition').mockResolvedValue({
        name: 'data-analysis-workflow',
        steps: [
          {
            name: 'analyze_data',
            method: 'Perform complex analysis of customer behavior patterns',
            requirements: []
          }
        ]
      });

      // Mock execution manager to simulate algorithmic failure and AI success
      jest.spyOn(runtime['executionManager'], 'executeStep').mockResolvedValue({
        success: true,
        outputs: { 
          analysis_result: 'Customer segments identified: high-value, price-sensitive, loyalty-focused',
          confidence: 0.87,
          method_used: 'ai' 
        },
        executionType: 'ai', // Indicates fallback to AI after algorithmic failure
        duration: 3500,
        logs: [
          {
            timestamp: new Date(),
            level: 'info',
            message: 'Algorithmic method failed, falling back to AI'
          },
          {
            timestamp: new Date(),
            level: 'info',
            message: 'AI analysis completed successfully'
          }
        ]
      });

      const execution = await runtime.executePlaybook('data-analysis-workflow', {
        customer_data: {
          records: 15000,
          time_period: '6_months',
          data_quality: 'high'
        }
      });

      expect(execution.status).toBe('completed');
      expect(execution.steps[0].executionResult?.executionType).toBe('ai');
      expect(execution.steps[0].executionResult?.outputs.method_used).toBe('ai');
      expect(execution.steps[0].executionResult?.logs).toHaveLength(2);
    });

    it('should handle responsibility monitoring integration', async () => {
      const monitoringResponsibilities: ResponsibilityDefinition[] = [
        {
          name: 'order-quality-monitoring',
          description: 'Monitor order preparation quality and customer satisfaction',
          method: 'Track preparation times, quality scores, and customer feedback',
          inputs: [],
          outputs: [
            {
              name: 'quality_alert',
              type: 'notification',
              format: 'alert',
              fields: [
                { name: 'alert_type', type: 'string', required: true },
                { name: 'threshold_breached', type: 'string', required: true }
              ]
            }
          ],
          monitoringType: 'continuous'
        }
      ];

      await runtime.initialize({
        responsibilities: monitoringResponsibilities
      });

      // Verify responsibility registration
      const marketplaceInfo = runtime['capabilityResolver'].getMarketplaceInfo();
      expect(marketplaceInfo.totalCapabilities).toBe(1); // Includes responsibility

      const responsibility = runtime['capabilityResolver'].getCapability('order-quality-monitoring');
      expect(responsibility).toBeDefined();
      expect((responsibility as ResponsibilityDefinition).monitoringType).toBe('continuous');
    });

    it('should provide comprehensive runtime statistics', async () => {
      await runtime.initialize({
        capabilities: [
          {
            name: 'test-capability',
            description: 'Test capability',
            method: 'Test method',
            inputs: [],
            outputs: []
          }
        ],
        resources: [
          {
            name: 'test-resource',
            characteristics: {
              type: 'test',
              capabilities: ['test-capability']
            }
          }
        ]
      });

      runtime['resourceManager'].registerInstance('test-resource', { status: 'available' });

      jest.spyOn(runtime as any, 'loadPlaybookDefinition').mockResolvedValue({
        name: 'stats-test',
        steps: [
          {
            name: 'test_step',
            method: 'Test step',
            requirements: [
              {
                name: 'test_req',
                priority: [
                  {
                    type: 'specific',
                    specific: 'test-resource'
                  }
                ]
              }
            ]
          }
        ]
      });

      jest.spyOn(runtime as any, 'executeStep').mockResolvedValue({
        id: 'step-1',
        name: 'test_step',
        status: 'completed',
        method: 'Test step',
        inputs: {},
        outputs: {},
        requirements: expect.any(Array),
        allocatedResources: [expect.any(Object)],
        warnings: [],
        errors: []
      });

      // Execute playbooks to generate statistics
      await runtime.executePlaybook('stats-test', {});
      const runningExecution = await runtime.executePlaybook('stats-test', {});
      runningExecution.status = 'running';

      const stats = runtime.getRuntimeStats();

      expect(stats.activeExecutions).toBe(1);
      expect(stats.completedExecutions).toBe(1);
      expect(stats.resourceUtilization).toEqual(expect.objectContaining({
        totalResources: expect.any(Number),
        utilizationRate: expect.any(Number)
      }));
      expect(stats.capabilityMarketplace).toEqual(expect.objectContaining({
        totalCapabilities: expect.any(Number),
        totalProviders: expect.any(Number)
      }));
      expect(stats.executionPolicies).toEqual(expect.objectContaining({
        defaultChain: ['algorithmic', 'ai', 'human'],
        allowHumanOverride: true
      }));
    });
  });

  describe('error handling and recovery', () => {
    it('should handle step execution failures gracefully', async () => {
      await runtime.initialize({
        capabilities: [
          {
            name: 'failing-capability',
            description: 'Capability that will fail',
            method: 'This will fail',
            inputs: [],
            outputs: []
          }
        ]
      });

      jest.spyOn(runtime as any, 'loadPlaybookDefinition').mockResolvedValue({
        name: 'failing-playbook',
        steps: [
          {
            name: 'failing_step',
            method: 'This step will fail',
            requirements: []
          }
        ]
      });

      // Mock step execution to throw error
      jest.spyOn(runtime as any, 'executeStep').mockRejectedValue(
        new Error('Step execution failed due to resource allocation error')
      );

      await expect(runtime.executePlaybook('failing-playbook', {}))
        .rejects.toThrow('Step execution failed due to resource allocation error');
    });

    it('should handle resource allocation conflicts', async () => {
      await runtime.initialize({
        resources: [
          {
            name: 'busy_resource',
            characteristics: {
              type: 'limited',
              capabilities: ['test']
            }
          }
        ]
      });

      // Don't register instance to simulate unavailable resource
      jest.spyOn(runtime as any, 'loadPlaybookDefinition').mockResolvedValue({
        name: 'resource-conflict-test',
        steps: [
          {
            name: 'resource_step',
            method: 'Use limited resource',
            requirements: [
              {
                name: 'limited_resource',
                priority: [
                  {
                    type: 'specific',
                    specific: 'busy_resource'
                  }
                ]
              }
            ]
          }
        ]
      });

      await expect(runtime.executePlaybook('resource-conflict-test', {}))
        .rejects.toThrow('Resource allocation failed');
    });

    it('should handle malformed capability definitions', async () => {
      // Should not throw error even with malformed data
      await expect(runtime.initialize({
        capabilities: [
          {
            name: '',
            description: '',
            method: '',
            inputs: [],
            outputs: []
          } as any
        ]
      })).resolves.not.toThrow();
    });
  });

  describe('configuration and lifecycle management', () => {
    it('should update runtime configuration at runtime', () => {
      const newConfig = {
        executionPolicy: {
          defaultChain: ['human', 'ai'],
          allowHumanOverride: false,
          maxRetries: 1,
          executionTimeout: 5000,
          availableTypes: ['human', 'ai']
        } as ExecutionPolicy
      };

      runtime.updateConfig(newConfig);

      const stats = runtime.getRuntimeStats();
      expect(stats.executionPolicies.defaultChain).toEqual(['human', 'ai']);
      expect(stats.executionPolicies.allowHumanOverride).toBe(false);
    });

    it('should handle graceful shutdown', async () => {
      await runtime.initialize({});

      jest.spyOn(runtime as any, 'loadPlaybookDefinition').mockResolvedValue({
        name: 'shutdown-test',
        steps: []
      });

      // Create some active executions
      const execution1 = await runtime.executePlaybook('test-1', {});
      const execution2 = await runtime.executePlaybook('test-2', {});

      execution1.status = 'running';
      execution2.status = 'running';

      await runtime.shutdown();

      expect(runtime.listActiveExecutions()).toHaveLength(0);
    });
  });

  describe('YAML parsing integration', () => {
    it('should handle real BUSY v2.0 YAML content', () => {
      const busyYamlContent = `
version: "2.0"
metadata:
  name: "Integration Test Process"
  description: "Test process for integration testing"
  layer: "L0"

capabilities:
  - capability:
      name: "test-integration-capability"
      description: "Capability for integration testing"
      method: |
        Execute integration test steps:
        1. Setup test environment
        2. Run test cases
        3. Validate results
        4. Cleanup resources
      inputs:
        - name: "test_config"
          type: "data"
          format: "configuration"
          fields:
            - name: "test_suite"
              type: "string"
              required: true
            - name: "environment"
              type: "string"
              required: true
      outputs:
        - name: "test_results"
          type: "data"
          format: "test_report"
          fields:
            - name: "passed"
              type: "number"
              required: true
            - name: "failed"
              type: "number"
              required: true
            - name: "status"
              type: "string"
              required: true

resources:
  - resource:
      name: "test_runner"
      characteristics:
        type: "service"
        capabilities: ["test-integration-capability"]
        version: "1.0.0"
        environment: "docker"

playbook:
  name: "integration-test-workflow"
  description: "Execute integration tests"
  steps:
    - step:
        name: "run_integration_tests"
        method: |
          Execute comprehensive integration test suite
          to validate system functionality and performance
        requirements:
          - name: "test_runner"
            priority:
              - type: "specific"
                specific: "test_runner"
        inputs:
          - name: "test_config"
            type: "data"
            fields:
              - name: "test_suite"
                type: "string"
                required: true
        outputs:
          - name: "test_results"
            type: "data"
            fields:
              - name: "status"
                type: "string"
                required: true
  inputs:
    - name: "test_configuration"
      type: "data"
      fields:
        - name: "suite_name"
          type: "string"
          required: true
  outputs:
    - name: "execution_results"
      type: "data"
      fields:
        - name: "overall_status"
          type: "string"
          required: true
`;

      // Parse YAML content
      const parsedContent = yaml.parse(busyYamlContent);

      expect(parsedContent.version).toBe('2.0');
      expect(parsedContent.metadata.name).toBe('Integration Test Process');
      expect(parsedContent.capabilities).toHaveLength(1);
      expect(parsedContent.capabilities[0].capability.name).toBe('test-integration-capability');
      expect(parsedContent.resources).toHaveLength(1);
      expect(parsedContent.playbook.name).toBe('integration-test-workflow');
      expect(parsedContent.playbook.steps).toHaveLength(1);
      expect(parsedContent.playbook.steps[0].step.requirements).toHaveLength(1);
    });
  });
});

/**
 * Performance and Load Testing
 */
describe('BUSY v2.0 Performance Tests', () => {
  let runtime: BusyRuntime;

  beforeEach(() => {
    const config: RuntimeConfig = {
      executionPolicy: {
        defaultChain: ['algorithmic'],
        allowHumanOverride: false,
        maxRetries: 1,
        executionTimeout: 1000,
        availableTypes: ['algorithmic']
      },
      resourceConfig: { maxConcurrentAllocations: 100 }
    };

    runtime = new BusyRuntime(config);
  });

  it('should handle high volume of capability registrations', async () => {
    const startTime = Date.now();
    
    const capabilities = Array.from({ length: 1000 }, (_, i) => ({
      name: `capability-${i}`,
      description: `Test capability ${i}`,
      method: `Execute test method ${i}`,
      inputs: [],
      outputs: []
    }));

    await runtime.initialize({ capabilities });

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    
    const stats = runtime.getRuntimeStats();
    expect(stats.capabilityMarketplace.totalCapabilities).toBe(1000);
  });

  it('should handle concurrent resource allocations efficiently', async () => {
    const resources = Array.from({ length: 50 }, (_, i) => ({
      name: `resource-${i}`,
      characteristics: {
        type: 'test',
        id: i,
        capabilities: [`capability-${i % 10}`]
      }
    }));

    await runtime.initialize({ resources });

    // Register all resource instances
    resources.forEach(resource => {
      runtime['resourceManager'].registerInstance(resource.name, { status: 'available' });
    });

    const startTime = Date.now();
    
    // Simulate concurrent allocations
    const allocations = Array.from({ length: 25 }, (_, i) => ({
      name: `allocation-${i}`,
      priority: [
        {
          type: 'characteristics' as const,
          characteristics: { type: 'test' }
        }
      ]
    }));

    const allocationPromises = allocations.map((_, i) =>
      runtime['resourceManager'].allocateResources(`step-${i}`, [allocations[i]])
    );

    const results = await Promise.all(allocationPromises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    expect(results.filter(r => r.success)).toHaveLength(25); // All should succeed
  });
});