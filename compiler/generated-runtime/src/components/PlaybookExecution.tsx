
import { ProcessState } from '../../types/runtime-types';
import TaskInterface from './TaskInterface';

interface PlaybookExecutionProps {
  processState: ProcessState;
  currentTask: any;
  onStepComplete: (outputData: Record<string, any>) => void;
  onStepBack?: () => void;
  isLoading?: boolean;
}

export default function PlaybookExecution({
  processState,
  currentTask,
  onStepComplete,
  onStepBack,
  isLoading = false
}: PlaybookExecutionProps) {
  const progressPercentage = (processState.currentStep / processState.totalSteps) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {processState.clientName || 'Process Execution'}
            </h1>
            <p className="text-gray-600">
              Step {processState.currentStep + 1} of {processState.totalSteps}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-1">
              Progress: {Math.round(progressPercentage)}%
            </div>
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Process Navigation */}
        <div className="flex items-center space-x-2 text-sm">
          {Array.from({ length: processState.totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`process-step ${
                index < processState.currentStep ? 'completed' :
                index === processState.currentStep ? 'active' :
                'pending'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                index < processState.currentStep ? 'bg-green-500 text-white' :
                index === processState.currentStep ? 'bg-blue-500 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Task */}
      {currentTask && (
        <div className="card">
          <TaskInterface
            task={currentTask}
            onComplete={onStepComplete}
            onBack={onStepBack}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Process Complete */}
      {processState.status === 'completed' && (
        <div className="card bg-green-50 border-green-200">
          <div className="text-center py-8">
            <div className="text-green-500 text-4xl mb-4">✓</div>
            <h2 className="text-xl font-medium text-green-800 mb-2">
              Process Complete!
            </h2>
            <p className="text-green-700 mb-4">
              All steps have been completed successfully.
            </p>
            {processState.clientFolderPath && (
              <p className="text-sm text-green-600">
                📁 Files saved to: {processState.clientFolderPath}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
