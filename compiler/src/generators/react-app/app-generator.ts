import { AnalysisResult } from '../../analysis/types';
import { PlaybookNode, TaskNode } from '../../ast/nodes';
import { promises as fs } from 'fs';
import path from 'path';

export interface ReactAppGenerationOptions {
  outputPath: string;
  appName: string;
  useTypeScript: boolean;
  includeTailwind: boolean;
  includeAuth: boolean;
}

export class ReactAppGenerator {
  constructor(private options: ReactAppGenerationOptions) {}

  async generateApp(analysisResult: AnalysisResult): Promise<void> {
    await this.createProjectStructure();
    await this.generatePackageJson();
    await this.generateNextConfig();
    await this.generateTailwindConfig();
    await this.generateMainPages(analysisResult);
    await this.generateComponents(analysisResult);
    await this.generateServices(analysisResult);
    await this.generateUtils();

    console.log(`React application generated successfully at ${this.options.outputPath}`);
  }

  private async createProjectStructure(): Promise<void> {
    const dirs = [
      'src/components',
      'src/pages/api/process',
      'src/pages/api/task',
      'src/pages/playbook/[id]',
      'src/lib',
      'src/services',
      'src/utils',
      'src/types',
      'src/styles',
      'prisma',
      'public',
      'clients',
      'styles'
    ];

    for (const dir of dirs) {
      await fs.mkdir(path.join(this.options.outputPath, dir), { recursive: true });
    }
  }

  private async generatePackageJson(): Promise<void> {
    const packageJson = {
      name: this.options.appName,
      version: '1.0.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint',
        'db:push': 'prisma db push',
        'db:studio': 'prisma studio',
        'db:generate': 'prisma generate'
      },
      dependencies: {
        'next': '^14.0.0',
        'react': '^18.2.0',
        'react-dom': '^18.2.0',
        '@prisma/client': '^5.7.0',
        'prisma': '^5.7.0',
        'date-fns': '^2.30.0',
        'clsx': '^2.0.0'
      },
      devDependencies: {
        '@types/node': '^20.10.0',
        '@types/react': '^18.2.45',
        '@types/react-dom': '^18.2.18',
        'typescript': '^5.3.3',
        'eslint': '^8.56.0',
        'eslint-config-next': '^14.0.0',
        'autoprefixer': '^10.4.16',
        'postcss': '^8.4.32',
        'tailwindcss': '^3.3.6',
        '@tailwindcss/forms': '^0.5.7'
      }
    };

    await fs.writeFile(
      path.join(this.options.outputPath, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      'utf-8'
    );
  }

  private async generateNextConfig(): Promise<void> {
    const nextConfig = `
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Using pages directory for now
  pageExtensions: ['js', 'jsx', 'ts', 'tsx']
};

module.exports = nextConfig;
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'next.config.js'),
      nextConfig,
      'utf-8'
    );
  }

  private async generateTailwindConfig(): Promise<void> {
    const tailwindConfig = `
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
`;

    const postcssConfig = `
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'tailwind.config.js'),
      tailwindConfig,
      'utf-8'
    );

    await fs.writeFile(
      path.join(this.options.outputPath, 'postcss.config.js'),
      postcssConfig,
      'utf-8'
    );
  }

  private async generateMainPages(analysisResult: AnalysisResult): Promise<void> {
    // Generate _app.tsx for global styles
    const appPage = `
import type { AppProps } from 'next/app';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/pages/_app.tsx'),
      appPage,
      'utf-8'
    );

    // Generate main dashboard page
    const indexPage = `
import { GetServerSideProps } from 'next';
import { prisma } from '../lib/prisma';
import Dashboard from '../components/Dashboard';
import { ProcessDashboard } from '../../types/runtime-types';

interface HomeProps {
  dashboard: ProcessDashboard;
}

export default function Home({ dashboard }: HomeProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Business Process Dashboard
          </h1>
          <Dashboard dashboard={dashboard} />
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const [activeProcesses, availablePlaybooks, recentActivity] = await Promise.all([
    prisma.playbookInstance.findMany({
      where: { status: { not: 'completed' } },
      include: { playbook: { include: { team: true } } },
      orderBy: { startedAt: 'desc' }
    }),
    prisma.playbook.findMany({
      include: { team: true, _count: { select: { instances: true } } }
    }),
    prisma.stateTransition.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    })
  ]);

  const dashboard: ProcessDashboard = {
    activeProcesses: activeProcesses.map(p => ({
      instanceId: p.id,
      playbookId: p.playbookId,
      status: p.status as any,
      currentStep: p.currentStep,
      totalSteps: 0, // TODO: Calculate from playbook
      clientName: p.clientName,
      clientFolderPath: p.clientFolderPath,
      startedAt: p.startedAt,
      completedAt: p.completedAt,
      data: p.dataJson ? JSON.parse(p.dataJson) : {}
    })),
    availablePlaybooks: availablePlaybooks.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      teamName: p.team.name,
      activeInstances: p._count.instances
    })),
    recentActivity: recentActivity.map(a => ({
      id: a.id,
      timestamp: a.createdAt,
      instanceId: a.instanceId,
      action: a.toStatus,
      details: a.notes || '',
      userId: a.userId
    })),
    statistics: {
      totalProcesses: activeProcesses.length,
      activeProcesses: activeProcesses.filter(p => p.status === 'in_progress').length,
      completedProcesses: 0, // TODO: Calculate
      averageCompletionTime: 0, // TODO: Calculate
      successRate: 0 // TODO: Calculate
    }
  };

  return {
    props: {
      dashboard
    }
  };
};
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/pages/index.tsx'),
      indexPage,
      'utf-8'
    );

    // Generate playbook execution page
    const playbookPage = `
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
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/pages/playbook/[id]/index.tsx'),
      playbookPage,
      'utf-8'
    );

    // Generate global styles
    const globalStyles = `
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom styles */
.btn-primary {
  @apply bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors;
}

.btn-secondary {
  @apply bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors;
}

.form-input {
  @apply mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500;
}

.form-label {
  @apply block text-sm font-medium text-gray-700 mb-1;
}

.card {
  @apply bg-white rounded-lg shadow-md p-6;
}

.process-step {
  @apply flex items-center space-x-2 text-sm;
}

.process-step.active {
  @apply text-blue-600 font-medium;
}

.process-step.completed {
  @apply text-green-600;
}

.process-step.pending {
  @apply text-gray-400;
}
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/styles/globals.css'),
      globalStyles,
      'utf-8'
    );
  }

  private async generateComponents(analysisResult: AnalysisResult): Promise<void> {
    // Generate Dashboard component
    const dashboardComponent = `
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
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/components/Dashboard.tsx'),
      dashboardComponent,
      'utf-8'
    );

    // Generate ProcessCard component
    const processCardComponent = `
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
          <span className={\`px-2 py-1 text-xs font-medium rounded-full \${
            process.status === 'completed' ? 'bg-green-100 text-green-800' :
            process.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
            process.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }\`}>
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
            style={{ width: \`\${progressPercentage}%\` }}
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
          href={\`/playbook/\${process.instanceId}\`}
          className="btn-primary text-sm py-1 px-3"
        >
          Continue →
        </Link>
      </div>
    </div>
  );
}
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/components/ProcessCard.tsx'),
      processCardComponent,
      'utf-8'
    );

    // Generate PlaybookCard component
    const playbookCardComponent = `
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
        window.location.href = \`/playbook/\${instanceId}\`;
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
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/components/PlaybookCard.tsx'),
      playbookCardComponent,
      'utf-8'
    );

    // Generate additional components
    await this.generateActivityFeed();
    await this.generatePlaybookExecution();
    await this.generateTaskInterface();
  }

  private async generateActivityFeed(): Promise<void> {
    const component = `
import { ActivityLog } from '../../types/runtime-types';
import { formatDistanceToNow } from 'date-fns';

interface ActivityFeedProps {
  activities: ActivityLog[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        No recent activity
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">
              {activity.action}
            </p>
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/components/ActivityFeed.tsx'),
      component,
      'utf-8'
    );
  }

  private async generatePlaybookExecution(): Promise<void> {
    const component = `
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
                style={{ width: \`\${progressPercentage}%\` }}
              />
            </div>
          </div>
        </div>

        {/* Process Navigation */}
        <div className="flex items-center space-x-2 text-sm">
          {Array.from({ length: processState.totalSteps }).map((_, index) => (
            <div
              key={index}
              className={\`process-step \${
                index < processState.currentStep ? 'completed' :
                index === processState.currentStep ? 'active' :
                'pending'
              }\`}
            >
              <div className={\`w-6 h-6 rounded-full flex items-center justify-center text-xs \${
                index < processState.currentStep ? 'bg-green-500 text-white' :
                index === processState.currentStep ? 'bg-blue-500 text-white' :
                'bg-gray-200 text-gray-500'
              }\`}>
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
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/components/PlaybookExecution.tsx'),
      component,
      'utf-8'
    );
  }

  private async generateTaskInterface(): Promise<void> {
    const component = `
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
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/components/TaskInterface.tsx'),
      component,
      'utf-8'
    );

    // Generate task-specific components
    await this.generateTaskComponents();
  }

  private async generateTaskComponents(): Promise<void> {
    // Human Task Form
    const humanTaskForm = `
import { useState } from 'react';
import FormField from './FormField';

interface HumanTaskFormProps {
  task: any;
  onComplete: (outputData: Record<string, any>) => void;
  isLoading?: boolean;
}

export default function HumanTaskForm({ task, onComplete, isLoading }: HumanTaskFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    
    // TODO: Implement proper validation based on task schema
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onComplete(formData);
  };

  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Generate form fields based on task configuration
  const renderFormFields = () => {
    // TODO: Generate fields based on task.outputs schema
    return (
      <div className="space-y-4">
        <FormField
          name="notes"
          label="Notes"
          type="textarea"
          value={formData.notes || ''}
          onChange={(value) => handleFieldChange('notes', value)}
          placeholder="Add any notes about this step..."
        />
        <FormField
          name="completed"
          label="Mark as Complete"
          type="checkbox"
          value={formData.completed || false}
          onChange={(value) => handleFieldChange('completed', value)}
        />
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {renderFormFields()}
      
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Complete Step'}
        </button>
      </div>
    </form>
  );
}
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/components/HumanTaskForm.tsx'),
      humanTaskForm,
      'utf-8'
    );

    // Algorithmic Task Mock
    const algorithmicTaskMock = `
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
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/components/AlgorithmicTaskMock.tsx'),
      algorithmicTaskMock,
      'utf-8'
    );

    // AI Agent Task Mock
    const aiAgentTaskMock = `
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
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/components/AIAgentTaskMock.tsx'),
      aiAgentTaskMock,
      'utf-8'
    );

    // Form Field Component
    const formField = `
interface FormFieldProps {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
  value: any;
  onChange: (value: any) => void;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

export default function FormField({
  name,
  label,
  type,
  value,
  onChange,
  required = false,
  options = [],
  placeholder,
  disabled = false,
  error
}: FormFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked :
                    type === 'number' ? Number(e.target.value) :
                    e.target.value;
    onChange(newValue);
  };

  const renderField = () => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            id={name}
            name={name}
            value={value || ''}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className="form-input"
            rows={4}
          />
        );
      case 'select':
        return (
          <select
            id={name}
            name={name}
            value={value || ''}
            onChange={handleChange}
            disabled={disabled}
            required={required}
            className="form-input"
          >
            <option value="">Select an option</option>
            {options.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              id={name}
              name={name}
              checked={value || false}
              onChange={handleChange}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor={name} className="ml-2 block text-sm text-gray-700">
              {label}
            </label>
          </div>
        );
      default:
        return (
          <input
            type={type}
            id={name}
            name={name}
            value={value || ''}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className="form-input"
          />
        );
    }
  };

  return (
    <div>
      {type !== 'checkbox' && (
        <label htmlFor={name} className="form-label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {renderField()}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/components/FormField.tsx'),
      formField,
      'utf-8'
    );
  }

  private async generateServices(analysisResult: AnalysisResult): Promise<void> {
    // Generate API routes for process management
    const processApiRoute = `
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { playbookId, initialData } = req.body;

      // Create new playbook instance
      const instance = await prisma.playbookInstance.create({
        data: {
          playbookId,
          status: 'started',
          clientName: initialData.clientName || 'Unnamed Client',
          currentStep: 0,
          dataJson: JSON.stringify(initialData),
          clientFolderPath: null // Will be set after folder creation
        }
      });

      // TODO: Create client folder
      
      res.status(200).json({ instanceId: instance.id });
    } catch (error) {
      console.error('Error starting playbook:', error);
      res.status(500).json({ error: 'Failed to start playbook' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end('Method Not Allowed');
  }
}
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/pages/api/process/start.ts'),
      processApiRoute,
      'utf-8'
    );

    // Generate step execution API
    const stepExecutionRoute = `
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { instanceId, outputData } = req.body;

      // Get current instance
      const instance = await prisma.playbookInstance.findUnique({
        where: { id: instanceId },
        include: { playbook: { include: { tasks: true } } }
      });

      if (!instance) {
        return res.status(404).json({ error: 'Process instance not found' });
      }

      // Create task instance record
      const currentTask = instance.playbook.tasks[instance.currentStep];
      if (currentTask) {
        await prisma.taskInstance.create({
          data: {
            playbookInstanceId: instanceId,
            taskId: currentTask.id,
            status: 'completed',
            outputDataJson: JSON.stringify(outputData),
            completedAt: new Date()
          }
        });
      }

      // Update process state
      const nextStep = instance.currentStep + 1;
      const isComplete = nextStep >= instance.playbook.tasks.length;

      await prisma.playbookInstance.update({
        where: { id: instanceId },
        data: {
          currentStep: nextStep,
          status: isComplete ? 'completed' : 'in_progress',
          completedAt: isComplete ? new Date() : null,
          dataJson: JSON.stringify({
            ...JSON.parse(instance.dataJson || '{}'),
            [\`step_\${instance.currentStep}\`]: outputData
          })
        }
      });

      // Create state transition record
      await prisma.stateTransition.create({
        data: {
          instanceId,
          instanceType: 'playbook',
          fromStatus: instance.status,
          toStatus: isComplete ? 'completed' : 'in_progress',
          notes: \`Completed step \${instance.currentStep + 1}\`
        }
      });

      // TODO: Update client folder with new data

      res.status(200).json({ success: true, isComplete });
    } catch (error) {
      console.error('Error executing step:', error);
      res.status(500).json({ error: 'Failed to execute step' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end('Method Not Allowed');
  }
}
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/pages/api/process/execute-step.ts'),
      stepExecutionRoute,
      'utf-8'
    );

    // Generate Prisma client setup
    const prismaLib = `
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/lib/prisma.ts'),
      prismaLib,
      'utf-8'
    );
  }

  private async generateUtils(): Promise<void> {
    // Generate file system utilities
    const fileUtils = `
import { promises as fs } from 'fs';
import path from 'path';

export class ClientFolderManager {
  private baseClientPath: string;

  constructor(baseClientPath: string = './clients') {
    this.baseClientPath = baseClientPath;
  }

  async createClientFolder(instanceId: number, clientName: string): Promise<string> {
    const folderName = \`\${instanceId}-\${this.sanitizeFileName(clientName)}\`;
    const folderPath = path.join(this.baseClientPath, folderName);
    
    // Create folder structure
    await fs.mkdir(folderPath, { recursive: true });
    await fs.mkdir(path.join(folderPath, 'documents'), { recursive: true });
    await fs.mkdir(path.join(folderPath, 'communications'), { recursive: true });
    await fs.mkdir(path.join(folderPath, 'notes'), { recursive: true });
    
    // Create initial metadata
    const metadata = {
      instanceId,
      clientName,
      createdAt: new Date().toISOString(),
      version: 1
    };
    
    await fs.writeFile(
      path.join(folderPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );
    
    return folderPath;
  }

  async updateProcessLog(folderPath: string, logContent: string): Promise<void> {
    const logPath = path.join(folderPath, 'process-log.md');
    await fs.writeFile(logPath, logContent, 'utf-8');
  }

  async saveDocument(folderPath: string, filename: string, content: string | Buffer): Promise<void> {
    const docPath = path.join(folderPath, 'documents', filename);
    
    if (typeof content === 'string') {
      await fs.writeFile(docPath, content, 'utf-8');
    } else {
      await fs.writeFile(docPath, content);
    }
  }

  private sanitizeFileName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  }

  generateProcessLog(processData: any): string {
    return \`# Client Process: \${processData.clientName}

## Process Overview
- **Started**: \${processData.startedAt}
- **Playbook**: \${processData.playbookName}
- **Current Step**: \${processData.currentStep}
- **Status**: \${processData.status}

## Activity Log
\${processData.activities?.map((activity: any) => 
  \`### \${activity.timestamp} - \${activity.action}\\n\${activity.details}\\n\`
).join('\\n') || 'No activity recorded yet'}

## Process Data
\\\`\\\`\\\`json
\${JSON.stringify(processData.data, null, 2)}
\\\`\\\`\\\`
\`;
  }
}
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'src/utils/file-utils.ts'),
      fileUtils,
      'utf-8'
    );

    // Generate TypeScript config
    const tsConfig = {
      compilerOptions: {
        target: 'es5',
        lib: ['dom', 'dom.iterable', 'es6'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [
          {
            name: 'next'
          }
        ],
        baseUrl: '.',
        paths: {
          '@/*': ['./src/*']
        }
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules']
    };

    await fs.writeFile(
      path.join(this.options.outputPath, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2),
      'utf-8'
    );

    // Generate README
    const readme = `# Generated Business Application

This application was generated from BUSY language specifications using the BUSY Runtime Generator.

## Getting Started

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Set up the database:
\`\`\`bash
npx prisma db push
\`\`\`

3. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- **Process Dashboard**: Overview of all active business processes
- **Playbook Execution**: Step-by-step process execution with forms
- **Client Folders**: Human-readable artifact storage
- **Database Integration**: Persistent state management
- **Type Safety**: Full TypeScript integration

## Generated Structure

- \`src/pages/\` - Next.js pages (dashboard, playbook execution)
- \`src/components/\` - React components (forms, cards, interfaces)
- \`src/lib/\` - Database and utility libraries
- \`src/types/\` - TypeScript type definitions
- \`clients/\` - Client folder storage
- \`prisma/\` - Database schema and migrations

## Customization

This application is generated from BUSY files. To modify:

1. **UI Changes**: Edit components in \`src/components/\` (preserved across regenerations)
2. **Business Logic**: Modify BUSY files and regenerate
3. **Styling**: Edit \`src/styles/globals.css\` and \`tailwind.config.js\`
4. **Database**: Update BUSY files and run \`npx prisma db push\`

## Database Management

- **View Data**: \`npm run db:studio\`
- **Reset Database**: Delete \`prisma/dev.db\` and run \`npx prisma db push\`
- **Migrations**: Handled automatically during regeneration

## Client Folders

Each process instance creates a folder in \`clients/\` containing:
- \`process-log.md\` - Human-readable process history
- \`documents/\` - Generated documents and files
- \`communications/\` - Email and communication records
- \`metadata.json\` - Machine-readable process state

## Development

This is a generated application. The source BUSY files are the source of truth for business logic. UI customizations are preserved across regenerations.

For questions about the BUSY language or runtime generation, see the compiler documentation.
`;

    await fs.writeFile(
      path.join(this.options.outputPath, 'README.md'),
      readme,
      'utf-8'
    );
  }
}