
import { useState } from 'react';
import { PlaybookSummary } from '../../types/runtime-types';

interface PlaybookCardProps {
  playbook: PlaybookSummary;
}

export default function PlaybookCard({ playbook }: PlaybookCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleStartPlaybook = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/process/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playbookId: playbook.id,
          initialData: {}
        })
      });

      if (response.ok) {
        const { instanceId } = await response.json();
        window.location.href = `/playbook/${instanceId}`;
      } else {
        console.error('Failed to start playbook');
      }
    } catch (error) {
      console.error('Error starting playbook:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {playbook.name}
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          {playbook.description}
        </p>
        <div className="flex items-center text-xs text-gray-500">
          <span>Team: {playbook.teamName}</span>
          {playbook.activeInstances > 0 && (
            <span className="ml-3">
              {playbook.activeInstances} active
            </span>
          )}
        </div>
      </div>

      <button
        onClick={handleStartPlaybook}
        disabled={isLoading}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Starting...' : 'Start Process'}
      </button>
    </div>
  );
}
