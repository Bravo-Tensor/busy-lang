
import { ProcessDashboard } from '../../types/runtime-types';
import ProcessCard from './ProcessCard';
import PlaybookCard from './PlaybookCard';
import ActivityFeed from './ActivityFeed';

interface DashboardProps {
  dashboard: ProcessDashboard;
}

export default function Dashboard({ dashboard }: DashboardProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Active Processes */}
      <div className="lg:col-span-2">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Active Processes ({dashboard.activeProcesses.length})
          </h2>
          <div className="space-y-4">
            {dashboard.activeProcesses.map((process) => (
              <ProcessCard key={process.instanceId} process={process} />
            ))}
            {dashboard.activeProcesses.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>No active processes. Start a new playbook to begin.</p>
              </div>
            )}
          </div>
        </div>

        {/* Available Playbooks */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Start New Process
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboard.availablePlaybooks.map((playbook) => (
              <PlaybookCard key={playbook.id} playbook={playbook} />
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Statistics */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Processes</span>
              <span className="font-medium">{dashboard.statistics.totalProcesses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active</span>
              <span className="font-medium text-blue-600">{dashboard.statistics.activeProcesses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Completed</span>
              <span className="font-medium text-green-600">{dashboard.statistics.completedProcesses}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <ActivityFeed activities={dashboard.recentActivity} />
        </div>
      </div>
    </div>
  );
}
