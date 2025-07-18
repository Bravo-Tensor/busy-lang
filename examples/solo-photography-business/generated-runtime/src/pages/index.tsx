
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
