
import Link from 'next/link';
import { ProcessState } from '../../types/runtime-types';
import { formatDistanceToNow } from 'date-fns';

interface ProcessCardProps {
  process: ProcessState;
}

export default function ProcessCard({ process }: ProcessCardProps) {
  const progressPercentage = (process.currentStep / process.totalSteps) * 100;

  return (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {process.clientName || 'Unnamed Process'}
          </h3>
          <p className="text-sm text-gray-600">
            Started {formatDistanceToNow(process.startedAt, { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            process.status === 'completed' ? 'bg-green-100 text-green-800' :
            process.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
            process.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {process.status}
          </span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Step {process.currentStep + 1} of {process.totalSteps}</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {process.clientFolderPath && (
            <span>📁 {process.clientFolderPath.split('/').pop()}</span>
          )}
        </div>
        <Link
          href={`/playbook/${process.instanceId}`}
          className="btn-primary text-sm py-1 px-3"
        >
          Continue →
        </Link>
      </div>
    </div>
  );
}
