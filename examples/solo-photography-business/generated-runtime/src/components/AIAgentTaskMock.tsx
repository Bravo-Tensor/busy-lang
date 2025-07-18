
import { useState } from 'react';

interface AIAgentTaskMockProps {
  task: any;
  onComplete: (outputData: Record<string, any>) => void;
  isLoading?: boolean;
}

export default function AIAgentTaskMock({ task, onComplete, isLoading }: AIAgentTaskMockProps) {
  const [agentThinking, setAgentThinking] = useState(false);

  const handleExecute = async () => {
    setAgentThinking(true);
    
    // Mock AI agent processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockOutput = {
      executed: true,
      timestamp: new Date().toISOString(),
      agent_response: 'Mock AI agent response based on the prompt',
      confidence: 0.85,
      reasoning: 'This is a mock AI agent response for development purposes'
    };
    
    setAgentThinking(false);
    onComplete(mockOutput);
  };

  return (
    <div className="bg-blue-50 rounded-lg p-6">
      <div className="text-center">
        <div className="text-blue-400 text-4xl mb-4">🤖</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          AI Agent Task
        </h3>
        <p className="text-gray-600 mb-4">
          This task will be handled by an AI agent.
        </p>
        {task.agent_prompt && (
          <div className="bg-white rounded-md p-3 mb-4 text-left">
            <p className="text-sm font-medium text-gray-700 mb-1">Prompt:</p>
            <p className="text-sm text-gray-600">{task.agent_prompt}</p>
          </div>
        )}
        <button
          onClick={handleExecute}
          disabled={isLoading || agentThinking}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {agentThinking ? 'AI Agent Thinking...' : 
           isLoading ? 'Processing...' : 
           'Execute AI Agent'}
        </button>
      </div>
    </div>
  );
}
