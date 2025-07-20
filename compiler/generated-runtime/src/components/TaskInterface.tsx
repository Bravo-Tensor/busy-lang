
import { useState } from 'react';
import HumanTaskForm from './HumanTaskForm';
import AlgorithmicTaskMock from './AlgorithmicTaskMock';
import AIAgentTaskMock from './AIAgentTaskMock';

interface TaskInterfaceProps {
  task: any;
  onComplete: (outputData: Record<string, any>) => void;
  onBack?: () => void;
  isLoading?: boolean;
}

export default function TaskInterface({ task, onComplete, onBack, isLoading }: TaskInterfaceProps) {
  const [taskData, setTaskData] = useState<Record<string, any>>({});

  const handleComplete = (outputData: Record<string, any>) => {
    onComplete(outputData);
  };

  const renderTaskInterface = () => {
    switch (task.execution_type) {
      case 'human':
      case 'human_creative':
        return (
          <HumanTaskForm
            task={task}
            onComplete={handleComplete}
            isLoading={isLoading}
          />
        );
      case 'algorithmic':
        return (
          <AlgorithmicTaskMock
            task={task}
            onComplete={handleComplete}
            isLoading={isLoading}
          />
        );
      case 'ai_agent':
        return (
          <AIAgentTaskMock
            task={task}
            onComplete={handleComplete}
            isLoading={isLoading}
          />
        );
      default:
        return (
          <div className="text-center py-8 text-gray-500">
            <p>Unknown task type: {task.execution_type}</p>
          </div>
        );
    }
  };

  return (
    <div>
      {/* Task Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {task.name}
        </h2>
        <p className="text-gray-600 mb-4">
          {task.description}
        </p>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span className="flex items-center">
            <span className="w-2 h-2 bg-blue-400 rounded-full mr-2" />
            {task.execution_type}
          </span>
          {task.estimated_duration && (
            <span>⏱️ {task.estimated_duration}</span>
          )}
        </div>
      </div>

      {/* Task Interface */}
      {renderTaskInterface()}

      {/* Navigation */}
      <div className="flex justify-between mt-6 pt-4 border-t">
        <button
          onClick={onBack}
          disabled={!onBack || isLoading}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Back
        </button>
        <div className="text-sm text-gray-500">
          Complete this step to continue
        </div>
      </div>
    </div>
  );
}
