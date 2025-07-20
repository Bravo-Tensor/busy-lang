
import { prisma } from '../lib/prisma';

export interface StateTransitionRequest {
  instanceId: number;
  instanceType: 'playbook' | 'task';
  fromStatus: string | null;
  toStatus: string;
  notes?: string;
  metadata?: Record<string, any>;
  userId?: string;
}

export class StateManager {
  
  async recordTransition(request: StateTransitionRequest): Promise<void> {
    try {
      // Get current status if not provided
      let fromStatus = request.fromStatus;
      if (!fromStatus) {
        fromStatus = await this.getCurrentStatus(request.instanceId, request.instanceType);
      }

      // Create state transition record
      await prisma.stateTransition.create({
        data: {
          instanceId: request.instanceId,
          instanceType: request.instanceType,
          fromStatus,
          toStatus: request.toStatus,
          notes: request.notes || '',
          metadataJson: request.metadata ? JSON.stringify(request.metadata) : null,
          userId: request.userId || null
        }
      });

      console.log(`📊 State transition recorded: ${request.instanceType} ${request.instanceId} ${fromStatus} → ${request.toStatus}`);

    } catch (error) {
      console.error('❌ Error recording state transition:', error);
      // Don't throw - state transitions are for auditing, shouldn't break the process
    }
  }

  async getTransitionHistory(instanceId: number, instanceType: 'playbook' | 'task'): Promise<any[]> {
    return await prisma.stateTransition.findMany({
      where: {
        instanceId,
        instanceType
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async getProcessTimeline(instanceId: number): Promise<any> {
    const transitions = await prisma.stateTransition.findMany({
      where: {
        instanceId,
        instanceType: 'playbook'
      },
      orderBy: { createdAt: 'asc' }
    });

    const taskTransitions = await prisma.stateTransition.findMany({
      where: {
        instanceType: 'task'
      },
      include: {
        taskInstance: {
          where: { playbookInstanceId: instanceId }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return {
      processTransitions: transitions,
      taskTransitions: taskTransitions.filter(t => t.taskInstance),
      timeline: [...transitions, ...taskTransitions].sort((a, b) => 
        a.createdAt.getTime() - b.createdAt.getTime()
      )
    };
  }

  async getCurrentStatus(instanceId: number, instanceType: 'playbook' | 'task'): Promise<string | null> {
    if (instanceType === 'playbook') {
      const instance = await prisma.playbookInstance.findUnique({
        where: { id: instanceId },
        select: { status: true }
      });
      return instance?.status || null;
    } else {
      const taskInstance = await prisma.taskInstance.findFirst({
        where: { id: instanceId },
        select: { status: true }
      });
      return taskInstance?.status || null;
    }
  }

  async getProcessStatistics(instanceId?: number): Promise<any> {
    const where = instanceId ? { playbookInstanceId: instanceId } : {};

    const [totalProcesses, activeProcesses, completedProcesses, failedProcesses] = await Promise.all([
      prisma.playbookInstance.count(),
      prisma.playbookInstance.count({ where: { status: 'in_progress' } }),
      prisma.playbookInstance.count({ where: { status: 'completed' } }),
      prisma.playbookInstance.count({ where: { status: 'failed' } })
    ]);

    const avgCompletionTime = await this.calculateAverageCompletionTime();
    const successRate = totalProcesses > 0 ? (completedProcesses / totalProcesses) * 100 : 0;

    return {
      totalProcesses,
      activeProcesses,
      completedProcesses,
      failedProcesses,
      averageCompletionTime: avgCompletionTime,
      successRate: Math.round(successRate * 100) / 100
    };
  }

  async identifyBottlenecks(): Promise<any[]> {
    // Identify tasks that take longer than average
    const taskDurations = await prisma.$queryRaw`
      SELECT 
        t.name,
        t.id,
        AVG(EXTRACT(EPOCH FROM (ti.completed_at - ti.started_at))) as avg_duration_seconds,
        COUNT(*) as execution_count
      FROM task_instances ti
      JOIN tasks t ON ti.task_id = t.id
      WHERE ti.completed_at IS NOT NULL AND ti.started_at IS NOT NULL
      GROUP BY t.id, t.name
      HAVING COUNT(*) >= 3
      ORDER BY avg_duration_seconds DESC
    `;

    return (taskDurations as any[]).map(task => ({
      taskId: task.id,
      taskName: task.name,
      averageDuration: Math.round(task.avg_duration_seconds),
      executionCount: task.execution_count,
      isBottleneck: task.avg_duration_seconds > 300 // More than 5 minutes
    }));
  }

  async generateInsights(instanceId?: number): Promise<any> {
    const statistics = await this.getProcessStatistics(instanceId);
    const bottlenecks = await this.identifyBottlenecks();

    const insights = {
      performance: {
        overallHealth: this.assessOverallHealth(statistics),
        recommendations: this.generateRecommendations(statistics, bottlenecks)
      },
      trends: {
        completionRate: statistics.successRate,
        averageTime: statistics.averageCompletionTime,
        bottleneckTasks: bottlenecks.filter(b => b.isBottleneck).length
      },
      alerts: this.generateAlerts(statistics, bottlenecks)
    };

    return insights;
  }

  private async calculateAverageCompletionTime(): Promise<number> {
    const completedProcesses = await prisma.playbookInstance.findMany({
      where: { 
        status: 'completed',
        completedAt: { not: null }
      },
      select: { startedAt: true, completedAt: true }
    });

    if (completedProcesses.length === 0) return 0;

    const totalDuration = completedProcesses.reduce((sum, process) => {
      if (process.completedAt) {
        return sum + (process.completedAt.getTime() - process.startedAt.getTime());
      }
      return sum;
    }, 0);

    return Math.round(totalDuration / completedProcesses.length / 1000 / 60); // Average in minutes
  }

  private assessOverallHealth(statistics: any): 'excellent' | 'good' | 'fair' | 'poor' {
    const successRate = statistics.successRate;
    const activeRate = statistics.totalProcesses > 0 ? 
      (statistics.activeProcesses / statistics.totalProcesses) * 100 : 0;

    if (successRate >= 95 && activeRate < 20) return 'excellent';
    if (successRate >= 90 && activeRate < 30) return 'good';
    if (successRate >= 80 && activeRate < 50) return 'fair';
    return 'poor';
  }

  private generateRecommendations(statistics: any, bottlenecks: any[]): string[] {
    const recommendations: string[] = [];

    if (statistics.successRate < 90) {
      recommendations.push('Review failed processes to identify common failure patterns');
    }

    if (statistics.averageCompletionTime > 480) { // More than 8 hours
      recommendations.push('Consider optimizing process workflows to reduce completion time');
    }

    if (bottlenecks.length > 0) {
      recommendations.push(`Address bottleneck tasks: ${bottlenecks.slice(0, 3).map(b => b.taskName).join(', ')}`);
    }

    if (statistics.activeProcesses > statistics.totalProcesses * 0.5) {
      recommendations.push('High number of active processes - consider resource allocation');
    }

    return recommendations;
  }

  private generateAlerts(statistics: any, bottlenecks: any[]): any[] {
    const alerts: any[] = [];

    if (statistics.successRate < 80) {
      alerts.push({
        level: 'high',
        message: `Low success rate: ${statistics.successRate}%`,
        action: 'Review and address failing processes'
      });
    }

    if (statistics.failedProcesses > 5) {
      alerts.push({
        level: 'medium',
        message: `${statistics.failedProcesses} failed processes detected`,
        action: 'Investigate failure patterns'
      });
    }

    const criticalBottlenecks = bottlenecks.filter(b => b.averageDuration > 1800); // More than 30 minutes
    if (criticalBottlenecks.length > 0) {
      alerts.push({
        level: 'medium',
        message: `${criticalBottlenecks.length} critical bottlenecks identified`,
        action: 'Optimize long-running tasks'
      });
    }

    return alerts;
  }
}
