import React, { useState } from 'react';
import { ChevronRightIcon, CheckIcon } from '@heroicons/react/24/outline';
import { BusinessContext } from '@/types/conversation';

interface BusinessSetupWizardProps {
  onComplete: (context: BusinessContext) => void;
}

interface SetupStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface SetupData {
  businessName: string;
  industry: string;
  businessSize: 'solo' | 'small' | 'medium' | 'enterprise';
  mainProcesses: string[];
  teamSize: string;
  goals: string[];
}

export function BusinessSetupWizard({ onComplete }: BusinessSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [setupData, setSetupData] = useState<SetupData>({
    businessName: '',
    industry: '',
    businessSize: 'solo',
    mainProcesses: [],
    teamSize: '1',
    goals: []
  });

  const steps: SetupStep[] = [
    {
      id: 'business-info',
      title: 'Business Information',
      description: 'Tell us about your business',
      completed: false
    },
    {
      id: 'team-structure',
      title: 'Team Structure',
      description: 'Define your team and roles',
      completed: false
    },
    {
      id: 'main-processes',
      title: 'Main Processes',
      description: 'Identify your core business processes',
      completed: false
    },
    {
      id: 'goals',
      title: 'Business Goals',
      description: 'Set your optimization goals',
      completed: false
    }
  ];

  const industries = [
    'Photography',
    'Consulting',
    'Creative Agency',
    'E-commerce',
    'Professional Services',
    'Healthcare',
    'Education',
    'Real Estate',
    'Food & Beverage',
    'Technology',
    'Other'
  ];

  const commonProcesses = [
    'Client Onboarding',
    'Project Delivery',
    'Sales & Marketing',
    'Customer Support',
    'Quality Assurance',
    'Invoicing & Payments',
    'Team Coordination',
    'Vendor Management',
    'Reporting & Analytics',
    'Compliance & Documentation'
  ];

  const businessGoals = [
    'Reduce process time',
    'Improve quality',
    'Increase customer satisfaction',
    'Better team coordination',
    'Automate repetitive tasks',
    'Improve communication',
    'Reduce errors',
    'Scale operations',
    'Better insights & analytics',
    'Compliance management'
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      // Submit setup data to API
      const response = await fetch('/api/business/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(setupData),
      });

      if (!response.ok) {
        throw new Error('Failed to set up business');
      }

      const result = await response.json();
      
      // Create business context
      const businessContext: BusinessContext = {
        industry: setupData.industry.toLowerCase(),
        businessSize: setupData.businessSize,
        currentProcesses: new Map(),
        executionMetrics: [],
        recentModifications: [],
        userRole: {
          id: 'business-owner',
          name: 'Business Owner',
          permissions: [],
          businessDomains: [setupData.industry.toLowerCase()]
        },
        conversationGoals: ['setup'],
        sessionId: Date.now().toString()
      };

      onComplete(businessContext);
    } catch (error) {
      console.error('Error setting up business:', error);
      alert('Failed to set up business. Please try again.');
    }
  };

  const updateSetupData = (updates: Partial<SetupData>) => {
    setSetupData(prev => ({ ...prev, ...updates }));
  };

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return setupData.businessName && setupData.industry;
      case 1:
        return setupData.teamSize;
      case 2:
        return setupData.mainProcesses.length > 0;
      case 3:
        return setupData.goals.length > 0;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name
              </label>
              <input
                type="text"
                value={setupData.businessName}
                onChange={(e) => updateSetupData({ businessName: e.target.value })}
                placeholder="Enter your business name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry
              </label>
              <select
                value={setupData.industry}
                onChange={(e) => updateSetupData({ industry: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select your industry</option>
                {industries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Size
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: 'solo', label: 'Solo (Just me)' },
                  { value: 'small', label: 'Small (2-10)' },
                  { value: 'medium', label: 'Medium (11-50)' },
                  { value: 'enterprise', label: 'Enterprise (50+)' }
                ].map((size) => (
                  <button
                    key={size.value}
                    onClick={() => updateSetupData({ businessSize: size.value as any })}
                    className={`p-3 text-sm border rounded-md ${
                      setupData.businessSize === size.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Team Size
              </label>
              <input
                type="number"
                min="1"
                value={setupData.teamSize}
                onChange={(e) => updateSetupData({ teamSize: e.target.value })}
                placeholder="Number of team members"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> We'll help you define specific roles and responsibilities for your team members after the initial setup.
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Select the main processes that are important to your business:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {commonProcesses.map((process) => (
                  <button
                    key={process}
                    onClick={() => updateSetupData({
                      mainProcesses: toggleArrayItem(setupData.mainProcesses, process)
                    })}
                    className={`p-3 text-left border rounded-md transition-colors ${
                      setupData.mainProcesses.includes(process)
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{process}</span>
                      {setupData.mainProcesses.includes(process) && (
                        <CheckIcon className="w-4 h-4 text-primary-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                What are your main goals for optimizing your business processes?
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {businessGoals.map((goal) => (
                  <button
                    key={goal}
                    onClick={() => updateSetupData({
                      goals: toggleArrayItem(setupData.goals, goal)
                    })}
                    className={`p-3 text-left border rounded-md transition-colors ${
                      setupData.goals.includes(goal)
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{goal}</span>
                      {setupData.goals.includes(goal) && (
                        <CheckIcon className="w-4 h-4 text-primary-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Orgata IDE
          </h1>
          <p className="text-lg text-gray-600">
            Let's set up your business processes in just a few steps
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index <= currentStep
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {index < currentStep ? (
                    <CheckIcon className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-full h-1 mx-4 ${
                      index < currentStep ? 'bg-primary-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {steps.map((step, index) => (
              <div key={step.id} className="text-center" style={{ width: '120px' }}>
                <p className="text-xs font-medium text-gray-900">{step.title}</p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {steps[currentStep].title}
            </h2>
            <p className="text-gray-600">{steps[currentStep].description}</p>
          </div>

          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>

          {currentStep === steps.length - 1 ? (
            <button
              onClick={handleComplete}
              disabled={!isStepValid()}
              className="px-6 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>Complete Setup</span>
              <CheckIcon className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!isStepValid()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>Next</span>
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}