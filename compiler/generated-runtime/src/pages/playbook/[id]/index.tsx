
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { prisma } from '../../../lib/prisma';
import PlaybookExecution from '../../../components/PlaybookExecution';
import { ProcessState } from '../../../../types/runtime-types';

interface PlaybookPageProps {
  processState: ProcessState;
  currentTask: any;
}

export default function PlaybookPage({ processState, currentTask }: PlaybookPageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleStepComplete = async (outputData: Record<string, any>) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/process/execute-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId: processState.instanceId,
          outputData
        })
      });

      if (response.ok) {
        router.reload();
      } else {
        console.error('Failed to execute step');
      }
    } catch (error) {
      console.error('Error executing step:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepBack = () => {
    // TODO: Implement step back functionality
    console.log('Step back not implemented yet');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <PlaybookExecution
          processState={processState}
          currentTask={currentTask}
          onStepComplete={handleStepComplete}
          onStepBack={handleStepBack}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.query;
  const instanceId = parseInt(id as string);

  const instance = await prisma.playbookInstance.findUnique({
    where: { id: instanceId },
    include: {
      playbook: {
        include: {
          tasks: {
            orderBy: { orderIndex: 'asc' }
          }
        }
      }
    }
  });

  if (!instance) {
    return { notFound: true };
  }

  const processState: ProcessState = {
    instanceId: instance.id,
    playbookId: instance.playbookId,
    status: instance.status as any,
    currentStep: instance.currentStep,
    totalSteps: instance.playbook.tasks.length,
    clientName: instance.clientName,
    clientFolderPath: instance.clientFolderPath,
    startedAt: instance.startedAt,
    completedAt: instance.completedAt,
    data: instance.dataJson ? JSON.parse(instance.dataJson) : {}
  };

  const currentTask = instance.playbook.tasks[instance.currentStep];

  return {
    props: {
      processState,
      currentTask: currentTask ? {
        id: currentTask.id,
        name: currentTask.name,
        description: currentTask.description,
        execution_type: currentTask.executionType,
        config: currentTask.configJson ? JSON.parse(currentTask.configJson) : {}
      } : null
    }
  };
};
