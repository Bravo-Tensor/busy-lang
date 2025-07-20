
interface AlgorithmicTaskMockProps {
  task: any;
  onComplete: (outputData: Record<string, any>) => void;
  isLoading?: boolean;
}

export default function AlgorithmicTaskMock({ task, onComplete, isLoading }: AlgorithmicTaskMockProps) {
  const handleExecute = () => {
    // Mock algorithmic execution
    const mockOutput = {
      executed: true,
      timestamp: new Date().toISOString(),
      algorithm: task.algorithm || 'default',
      result: 'Mock algorithmic result'
    };
    
    onComplete(mockOutput);
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="text-center">
        <div className="text-gray-400 text-4xl mb-4">⚙️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Algorithmic Task
        </h3>
        <p className="text-gray-600 mb-4">
          This task will be executed automatically by the system.
        </p>
        {task.algorithm && (
          <p className="text-sm text-gray-500 mb-4">
            Algorithm: {task.algorithm}
          </p>
        )}
        <button
          onClick={handleExecute}
          disabled={isLoading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Executing...' : 'Execute Algorithm'}
        </button>
      </div>
    </div>
  );
}
