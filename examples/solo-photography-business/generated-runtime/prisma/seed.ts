
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with BUSY definitions...');

  // Clear existing data
  await prisma.taskInstance.deleteMany();
  await prisma.playbookInstance.deleteMany();
  await prisma.stateTransition.deleteMany();
  await prisma.documentInstance.deleteMany();
  await prisma.import.deleteMany();
  await prisma.task.deleteMany();
  await prisma.document.deleteMany();
  await prisma.playbook.deleteMany();
  await prisma.role.deleteMany();
  await prisma.team.deleteMany();

  // Seed Teams
  
  const team0 = await prisma.team.create({
    data: {
      name: 'Business Operations',
      type: 'platform',
      description: 'Foundational business services supporting all other operations',
      layer: 'L0', // TODO: Extract from file metadata
      configJson: JSON.stringify({}),
      busyFilePath: '/Users/paullorsbach/Workspace/Repos/busy-lang/examples/solo-photography-business/L0/business-operations/team.busy'
    }
  });
  

  const team1 = await prisma.team.create({
    data: {
      name: 'Client Operations',
      type: 'stream-aligned',
      description: 'End-to-end client lifecycle management from initial inquiry to project delivery',
      layer: 'L0', // TODO: Extract from file metadata
      configJson: JSON.stringify({}),
      busyFilePath: '/Users/paullorsbach/Workspace/Repos/busy-lang/examples/solo-photography-business/L0/client-operations/team.busy'
    }
  });
  

  const team2 = await prisma.team.create({
    data: {
      name: 'Creative Production',
      type: 'stream-aligned',
      description: 'Creative execution from concept to final deliverable',
      layer: 'L0', // TODO: Extract from file metadata
      configJson: JSON.stringify({}),
      busyFilePath: '/Users/paullorsbach/Workspace/Repos/busy-lang/examples/solo-photography-business/L0/creative-production/team.busy'
    }
  });
  

  // Seed Roles
  
  const role0 = await prisma.role.create({
    data: {
      teamId: team0.id, // TODO: Map to correct team
      name: 'contract-administrator',
      description: 'Handles contract creation, management, and compliance for client agreements and vendor relationships',
      configJson: JSON.stringify({}),
      busyFilePath: '/Users/paullorsbach/Workspace/Repos/busy-lang/examples/solo-photography-business/L0/business-operations/roles/contract-administrator.busy'
    }
  });
  

  const role1 = await prisma.role.create({
    data: {
      teamId: team0.id, // TODO: Map to correct team
      name: 'financial-manager',
      description: 'Responsible for all financial operations including invoicing, payment processing, expense tracking, and financial reporting',
      configJson: JSON.stringify({}),
      busyFilePath: '/Users/paullorsbach/Workspace/Repos/busy-lang/examples/solo-photography-business/L0/business-operations/roles/financial-manager.busy'
    }
  });
  

  const role2 = await prisma.role.create({
    data: {
      teamId: team0.id, // TODO: Map to correct team
      name: 'consultation-coordinator',
      description: 'Conducts consultation calls, presents packages, and converts prospects to bookings',
      configJson: JSON.stringify({}),
      busyFilePath: '/Users/paullorsbach/Workspace/Repos/busy-lang/examples/solo-photography-business/L0/client-operations/roles/consultation-coordinator.busy'
    }
  });
  

  const role3 = await prisma.role.create({
    data: {
      teamId: team0.id, // TODO: Map to correct team
      name: 'inquiry-manager',
      description: 'First point of contact for potential clients, responsible for qualifying leads and scheduling consultations',
      configJson: JSON.stringify({}),
      busyFilePath: '/Users/paullorsbach/Workspace/Repos/busy-lang/examples/solo-photography-business/L0/client-operations/roles/inquiry-manager.busy'
    }
  });
  

  const role4 = await prisma.role.create({
    data: {
      teamId: team0.id, // TODO: Map to correct team
      name: 'project-coordinator',
      description: 'Coordinates project execution, timeline management, and client communications throughout the photography project lifecycle',
      configJson: JSON.stringify({}),
      busyFilePath: '/Users/paullorsbach/Workspace/Repos/busy-lang/examples/solo-photography-business/L0/client-operations/roles/project-coordinator.busy'
    }
  });
  

  const role5 = await prisma.role.create({
    data: {
      teamId: team0.id, // TODO: Map to correct team
      name: 'photo-editor',
      description: 'Technical and creative specialist responsible for post-processing, color correction, and final image preparation',
      configJson: JSON.stringify({}),
      busyFilePath: '/Users/paullorsbach/Workspace/Repos/busy-lang/examples/solo-photography-business/L0/creative-production/roles/photo-editor.busy'
    }
  });
  

  const role6 = await prisma.role.create({
    data: {
      teamId: team0.id, // TODO: Map to correct team
      name: 'photographer',
      description: 'Creative lead responsible for photography execution, artistic direction, and technical image capture',
      configJson: JSON.stringify({}),
      busyFilePath: '/Users/paullorsbach/Workspace/Repos/busy-lang/examples/solo-photography-business/L0/creative-production/roles/photographer.busy'
    }
  });
  

  // Seed Playbooks
  
  const playbook0 = await prisma.playbook.create({
    data: {
      teamId: team0.id, // TODO: Map to correct team
      name: 'monthly-financials',
      description: 'Comprehensive monthly financial review and planning process',
      cadenceConfig: JSON.stringify({}),
      configJson: JSON.stringify({}),
      busyFilePath: '/Users/paullorsbach/Workspace/Repos/busy-lang/examples/solo-photography-business/L0/business-operations/playbooks/monthly-financials.busy'
    }
  });
  

  const playbook1 = await prisma.playbook.create({
    data: {
      teamId: team0.id, // TODO: Map to correct team
      name: 'vendor-management',
      description: 'Systematic vendor evaluation, onboarding, and relationship management',
      cadenceConfig: JSON.stringify({}),
      configJson: JSON.stringify({}),
      busyFilePath: '/Users/paullorsbach/Workspace/Repos/busy-lang/examples/solo-photography-business/L0/business-operations/playbooks/vendor-management.busy'
    }
  });
  

  const playbook2 = await prisma.playbook.create({
    data: {
      teamId: team0.id, // TODO: Map to correct team
      name: 'client-onboarding',
      description: 'Comprehensive onboarding process to set expectations and gather shoot requirements',
      cadenceConfig: JSON.stringify({}),
      configJson: JSON.stringify({}),
      busyFilePath: '/Users/paullorsbach/Workspace/Repos/busy-lang/examples/solo-photography-business/L0/client-operations/playbooks/client-onboarding.busy'
    }
  });
  

  const playbook3 = await prisma.playbook.create({
    data: {
      teamId: team0.id, // TODO: Map to correct team
      name: 'inquiry-to-booking',
      description: 'Systematic process for converting inquiries into confirmed bookings',
      cadenceConfig: JSON.stringify({}),
      configJson: JSON.stringify({}),
      busyFilePath: '/Users/paullorsbach/Workspace/Repos/busy-lang/examples/solo-photography-business/L0/client-operations/playbooks/inquiry-to-booking.busy'
    }
  });
  

  const playbook4 = await prisma.playbook.create({
    data: {
      teamId: team0.id, // TODO: Map to correct team
      name: 'photo-production',
      description: 'End-to-end photo production from shoot execution to final client delivery',
      cadenceConfig: JSON.stringify({}),
      configJson: JSON.stringify({}),
      busyFilePath: '/Users/paullorsbach/Workspace/Repos/busy-lang/examples/solo-photography-business/L0/creative-production/playbooks/photo-production.busy'
    }
  });
  

  // Seed Documents
  
  const document0 = await prisma.document.create({
    data: {
      name: 'business-plan',
      contentType: 'narrative',
      schemaJson: JSON.stringify({}),
      busyFilePath: '/Users/paullorsbach/Workspace/Repos/busy-lang/examples/solo-photography-business/L0/business-operations/documents/business-plan.busy'
    }
  });
  

  const document1 = await prisma.document.create({
    data: {
      name: 'client-contract',
      contentType: 'structured',
      schemaJson: JSON.stringify({}),
      busyFilePath: '/Users/paullorsbach/Workspace/Repos/busy-lang/examples/solo-photography-business/L0/client-operations/documents/client-contract.busy'
    }
  });
  

  const document2 = await prisma.document.create({
    data: {
      name: 'shoot-brief',
      contentType: 'structured',
      schemaJson: JSON.stringify({}),
      busyFilePath: '/Users/paullorsbach/Workspace/Repos/busy-lang/examples/solo-photography-business/L0/creative-production/documents/shoot-brief.busy'
    }
  });
  

  // Seed Tasks
  
  const task0 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'reconcile_accounts',
      description: 'Reconcile all business accounts and transactions',
      executionType: 'human',
      estimatedDuration: '1h',
      orderIndex: 0,
      configJson: JSON.stringify({})
    }
  });
  

  const task1 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'generate_profit_loss',
      description: 'Create monthly profit and loss statement',
      executionType: 'algorithmic',
      estimatedDuration: '15m',
      orderIndex: 1,
      configJson: JSON.stringify({})
    }
  });
  

  const task2 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'cash_flow_analysis',
      description: 'Analyze cash flow patterns and projections',
      executionType: 'algorithmic',
      estimatedDuration: '20m',
      orderIndex: 2,
      configJson: JSON.stringify({})
    }
  });
  

  const task3 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'expense_analysis',
      description: 'Categorize and analyze business expenses',
      executionType: 'human',
      estimatedDuration: '45m',
      orderIndex: 3,
      configJson: JSON.stringify({})
    }
  });
  

  const task4 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'tax_preparation_status',
      description: 'Review tax preparation and compliance status',
      executionType: 'human',
      estimatedDuration: '30m',
      orderIndex: 4,
      configJson: JSON.stringify({})
    }
  });
  

  const task5 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'business_health_assessment',
      description: 'Assess overall business financial health',
      executionType: 'ai_agent',
      estimatedDuration: '20m',
      orderIndex: 5,
      configJson: JSON.stringify({})
    }
  });
  

  const task6 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'generate_monthly_report',
      description: 'Compile comprehensive monthly financial report',
      executionType: 'algorithmic',
      estimatedDuration: '25m',
      orderIndex: 6,
      configJson: JSON.stringify({})
    }
  });
  

  const task7 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'planning_next_month',
      description: 'Plan financial goals and actions for next month',
      executionType: 'human',
      estimatedDuration: '30m',
      orderIndex: 7,
      configJson: JSON.stringify({})
    }
  });
  

  const task8 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'vendor_needs_assessment',
      description: 'Assess current and future vendor requirements',
      executionType: 'human',
      estimatedDuration: '45m',
      orderIndex: 8,
      configJson: JSON.stringify({})
    }
  });
  

  const task9 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'vendor_research_and_sourcing',
      description: 'Research and identify potential new vendors',
      executionType: 'ai_agent',
      estimatedDuration: '1h',
      orderIndex: 9,
      configJson: JSON.stringify({})
    }
  });
  

  const task10 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'vendor_evaluation',
      description: 'Evaluate vendor candidates against criteria',
      executionType: 'human',
      estimatedDuration: '2h',
      orderIndex: 10,
      configJson: JSON.stringify({})
    }
  });
  

  const task11 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'vendor_negotiations',
      description: 'Negotiate terms and contracts with selected vendors',
      executionType: 'human',
      estimatedDuration: '3h',
      orderIndex: 11,
      configJson: JSON.stringify({})
    }
  });
  

  const task12 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'contract_creation_and_execution',
      description: 'Create formal contracts and execute agreements',
      executionType: 'algorithmic',
      estimatedDuration: '1h',
      orderIndex: 12,
      configJson: JSON.stringify({})
    }
  });
  

  const task13 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'vendor_onboarding',
      description: 'Onboard new vendors and setup operational procedures',
      executionType: 'human',
      estimatedDuration: '90m',
      orderIndex: 13,
      configJson: JSON.stringify({})
    }
  });
  

  const task14 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'performance_monitoring_setup',
      description: 'Establish vendor performance monitoring system',
      executionType: 'algorithmic',
      estimatedDuration: '30m',
      orderIndex: 14,
      configJson: JSON.stringify({})
    }
  });
  

  const task15 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'quarterly_vendor_review',
      description: 'Review vendor performance and relationship health',
      executionType: 'human',
      estimatedDuration: '1h',
      orderIndex: 15,
      configJson: JSON.stringify({})
    }
  });
  

  const task16 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'vendor_portfolio_optimization',
      description: 'Optimize vendor portfolio based on performance and needs',
      executionType: 'human',
      estimatedDuration: '45m',
      orderIndex: 16,
      configJson: JSON.stringify({})
    }
  });
  

  const task17 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'create_client_contract',
      description: 'Generate customized client service agreement',
      executionType: 'algorithmic',
      estimatedDuration: '20m',
      orderIndex: 17,
      configJson: JSON.stringify({})
    }
  });
  

  const task18 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'manage_vendor_agreements',
      description: 'Maintain vendor contracts and renewals',
      executionType: 'human',
      estimatedDuration: '30m',
      orderIndex: 18,
      configJson: JSON.stringify({})
    }
  });
  

  const task19 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'compliance_review',
      description: 'Review business compliance requirements',
      executionType: 'human',
      estimatedDuration: '45m',
      orderIndex: 19,
      configJson: JSON.stringify({})
    }
  });
  

  const task20 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'generate_invoice',
      description: 'Create and send client invoice',
      executionType: 'algorithmic',
      estimatedDuration: '10m',
      orderIndex: 20,
      configJson: JSON.stringify({})
    }
  });
  

  const task21 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'track_expenses',
      description: 'Record and categorize business expense',
      executionType: 'human',
      estimatedDuration: '5m',
      orderIndex: 21,
      configJson: JSON.stringify({})
    }
  });
  

  const task22 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'payment_follow_up',
      description: 'Follow up on overdue invoices',
      executionType: 'human',
      estimatedDuration: '15m',
      orderIndex: 22,
      configJson: JSON.stringify({})
    }
  });
  

  const task23 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'send_welcome_package',
      description: 'Send welcome email with onboarding materials',
      executionType: 'algorithmic',
      estimatedDuration: '10m',
      orderIndex: 23,
      configJson: JSON.stringify({})
    }
  });
  

  const task24 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'client_questionnaire',
      description: 'Collect detailed shoot requirements and preferences',
      executionType: 'human',
      estimatedDuration: '20m',
      orderIndex: 24,
      configJson: JSON.stringify({})
    }
  });
  

  const task25 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'gather_timeline_requirements',
      description: 'Extract timing constraints from client responses',
      executionType: 'human',
      estimatedDuration: '10m',
      orderIndex: 25,
      configJson: JSON.stringify({})
    }
  });
  

  const task26 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'schedule_key_milestones',
      description: 'Define and schedule critical project milestones',
      executionType: 'human',
      estimatedDuration: '15m',
      orderIndex: 26,
      configJson: JSON.stringify({})
    }
  });
  

  const task27 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'finalize_project_timeline',
      description: 'Create final timeline document with all details',
      executionType: 'human',
      estimatedDuration: '5m',
      orderIndex: 27,
      configJson: JSON.stringify({})
    }
  });
  

  const task28 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'timeline_planning',
      description: 'Create detailed project timeline and milestones',
      executionType: 'human',
      estimatedDuration: '30m',
      orderIndex: 28,
      configJson: JSON.stringify({})
    }
  });
  

  const task29 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'location_scouting_coordination',
      description: 'Coordinate location details and logistics',
      executionType: 'human',
      estimatedDuration: '25m',
      orderIndex: 29,
      configJson: JSON.stringify({})
    }
  });
  

  const task30 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'pre_shoot_call',
      description: 'Final preparation call before shoot',
      executionType: 'human',
      estimatedDuration: '20m',
      orderIndex: 30,
      configJson: JSON.stringify({})
    }
  });
  

  const task31 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'shoot_preparation_handoff',
      description: 'Package all requirements for creative team',
      executionType: 'algorithmic',
      estimatedDuration: '15m',
      orderIndex: 31,
      configJson: JSON.stringify({})
    }
  });
  

  const task32 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'acknowledge_inquiry',
      description: 'Send immediate acknowledgment to prospect',
      executionType: 'algorithmic',
      estimatedDuration: '2m',
      orderIndex: 32,
      configJson: JSON.stringify({})
    }
  });
  

  const task33 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'qualify_lead',
      description: 'Assess fit and qualification criteria',
      executionType: 'human',
      estimatedDuration: '15m',
      orderIndex: 33,
      configJson: JSON.stringify({})
    }
  });
  

  const task34 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'send_portfolio_and_pricing',
      description: 'Provide portfolio examples and pricing information',
      executionType: 'algorithmic',
      estimatedDuration: '5m',
      orderIndex: 34,
      configJson: JSON.stringify({})
    }
  });
  

  const task35 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'schedule_consultation',
      description: 'Book consultation call with qualified prospect',
      executionType: 'algorithmic',
      estimatedDuration: '3m',
      orderIndex: 35,
      configJson: JSON.stringify({})
    }
  });
  

  const task36 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'conduct_consultation',
      description: 'Lead consultation call with prospect',
      executionType: 'human',
      estimatedDuration: '45m',
      orderIndex: 36,
      configJson: JSON.stringify({})
    }
  });
  

  const task37 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'process_booking',
      description: 'Generate contract and process deposit',
      executionType: 'algorithmic',
      estimatedDuration: '20m',
      orderIndex: 37,
      configJson: JSON.stringify({})
    }
  });
  

  const task38 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'respond_to_inquiry',
      description: 'Initial response to prospective client inquiry',
      executionType: 'human',
      estimatedDuration: '15m',
      orderIndex: 38,
      configJson: JSON.stringify({})
    }
  });
  

  const task39 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'project_kickoff',
      description: 'Initiate project workflow and timeline',
      executionType: 'human',
      estimatedDuration: '30m',
      orderIndex: 39,
      configJson: JSON.stringify({})
    }
  });
  

  const task40 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'pre_shoot_coordination',
      description: 'Coordinate shoot logistics and preparation',
      executionType: 'human',
      estimatedDuration: '20m',
      orderIndex: 40,
      configJson: JSON.stringify({})
    }
  });
  

  const task41 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'equipment_preparation',
      description: 'Prepare and check all photography equipment',
      executionType: 'human',
      estimatedDuration: '45m',
      orderIndex: 41,
      configJson: JSON.stringify({})
    }
  });
  

  const task42 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'execute_photoshoot',
      description: 'Conduct photography session',
      executionType: 'human_creative',
      estimatedDuration: '240m',
      orderIndex: 42,
      configJson: JSON.stringify({})
    }
  });
  

  const task43 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'immediate_backup',
      description: 'Secure backup of all captured images',
      executionType: 'algorithmic',
      estimatedDuration: '30m',
      orderIndex: 43,
      configJson: JSON.stringify({})
    }
  });
  

  const task44 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'initial_cull_and_select',
      description: 'First pass selection of best images',
      executionType: 'human_creative',
      estimatedDuration: '90m',
      orderIndex: 44,
      configJson: JSON.stringify({})
    }
  });
  

  const task45 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'color_correction',
      description: 'Apply color correction and white balance',
      executionType: 'human_creative',
      estimatedDuration: '90m',
      orderIndex: 45,
      configJson: JSON.stringify({})
    }
  });
  

  const task46 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'creative_enhancement',
      description: 'Apply artistic edits and style adjustments',
      executionType: 'human_creative',
      estimatedDuration: '120m',
      orderIndex: 46,
      configJson: JSON.stringify({})
    }
  });
  

  const task47 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'final_processing',
      description: 'Apply final touches and prepare for delivery',
      executionType: 'human_creative',
      estimatedDuration: '90m',
      orderIndex: 47,
      configJson: JSON.stringify({})
    }
  });
  

  const task48 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'quality_review',
      description: 'Review all edited images for consistency',
      executionType: 'human',
      estimatedDuration: '60m',
      orderIndex: 48,
      configJson: JSON.stringify({})
    }
  });
  

  const task49 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'post_processing',
      description: 'Edit and enhance selected images',
      executionType: 'human_creative',
      estimatedDuration: '360m',
      orderIndex: 49,
      configJson: JSON.stringify({})
    }
  });
  

  const task50 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'client_preview_gallery',
      description: 'Create preview gallery for client review',
      executionType: 'algorithmic',
      estimatedDuration: '20m',
      orderIndex: 50,
      configJson: JSON.stringify({})
    }
  });
  

  const task51 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'client_review_and_feedback',
      description: 'Present gallery to client for review and selections',
      executionType: 'human',
      estimatedDuration: '30m',
      orderIndex: 51,
      configJson: JSON.stringify({})
    }
  });
  

  const task52 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'final_delivery_preparation',
      description: 'Prepare final deliverables in all required formats',
      executionType: 'algorithmic',
      estimatedDuration: '45m',
      orderIndex: 52,
      configJson: JSON.stringify({})
    }
  });
  

  const task53 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'client_delivery',
      description: 'Deliver final images to client',
      executionType: 'algorithmic',
      estimatedDuration: '15m',
      orderIndex: 53,
      configJson: JSON.stringify({})
    }
  });
  

  const task54 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'cull_and_select',
      description: 'Review and select best images from shoot',
      executionType: 'human_creative',
      estimatedDuration: '60m',
      orderIndex: 54,
      configJson: JSON.stringify({})
    }
  });
  

  const task55 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'edit_images',
      description: 'Apply post-processing and enhancements',
      executionType: 'human_creative',
      estimatedDuration: '180m',
      orderIndex: 55,
      configJson: JSON.stringify({})
    }
  });
  

  const task56 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'prepare_delivery',
      description: 'Format and organize final deliverables',
      executionType: 'algorithmic',
      estimatedDuration: '30m',
      orderIndex: 56,
      configJson: JSON.stringify({})
    }
  });
  

  const task57 = await prisma.task.create({
    data: {
      playbookId: playbook0.id, // TODO: Map to correct playbook
      roleId: role0.id, // TODO: Map to correct role
      name: 'backup_and_organize',
      description: 'Secure image backup and initial organization',
      executionType: 'algorithmic',
      estimatedDuration: '30m',
      orderIndex: 57,
      configJson: JSON.stringify({})
    }
  });
  

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
