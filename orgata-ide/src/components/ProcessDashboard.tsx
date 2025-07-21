import React from 'react';
import { BusinessContext } from '@/types/conversation';

interface ProcessDashboardProps {
  businessContext: BusinessContext;
  conversationHistory: any[];
}

export function ProcessDashboard({ businessContext, conversationHistory }: ProcessDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Process Dashboard</h2>
        <p className="text-gray-600">
          Dashboard functionality will be implemented in the next phase.
          This will show real-time process metrics, performance analytics, and business intelligence.
        </p>
      </div>
    </div>
  );
}