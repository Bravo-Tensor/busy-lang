import { BusinessContext, ProcessMetrics } from '@/types/conversation';

export class ProcessAnalysisService {
  async analyzeBusinessPerformance(context: BusinessContext): Promise<BusinessPerformanceAnalysis> {
    const processes = Array.from(context.currentProcesses.values());
    
    if (processes.length === 0) {
      return this.createEmptyAnalysis();
    }

    const metrics = await this.calculatePerformanceMetrics(processes, context.executionMetrics);
    const insights = await this.generateInsights(metrics, processes);
    const recommendations = await this.generateRecommendations(metrics, insights);

    return {
      efficiency: metrics.overall.efficiency,
      quality: metrics.overall.quality,
      onTime: metrics.overall.onTimeDelivery,
      insights,
      recommendations,
      detailedMetrics: metrics
    };
  }

  private async calculatePerformanceMetrics(
    processes: any[], 
    executionMetrics: ProcessMetrics[]
  ): Promise<DetailedMetrics> {
    // Calculate comprehensive performance metrics
    const efficiency = this.calculateEfficiency(executionMetrics);
    const quality = this.calculateQuality(executionMetrics);
    const onTimeDelivery = this.calculateOnTimeDelivery(executionMetrics);
    
    return {
      overall: {
        efficiency,
        quality,
        onTimeDelivery,
        processCount: processes.length,
        averageExecutionTime: this.calculateAverageExecutionTime(executionMetrics)
      },
      byProcess: this.calculateProcessSpecificMetrics(processes, executionMetrics),
      trends: this.calculateTrends(executionMetrics)
    };
  }

  private calculateEfficiency(metrics: ProcessMetrics[]): number {
    if (metrics.length === 0) return 0;
    
    const totalEfficiency = metrics.reduce((sum, metric) => sum + metric.efficiency, 0);
    return Math.round((totalEfficiency / metrics.length) * 100) / 100;
  }

  private calculateQuality(metrics: ProcessMetrics[]): number {
    if (metrics.length === 0) return 0;
    
    const totalQuality = metrics.reduce((sum, metric) => sum + metric.qualityScore, 0);
    return Math.round((totalQuality / metrics.length) * 100) / 100;
  }

  private calculateOnTimeDelivery(metrics: ProcessMetrics[]): number {
    if (metrics.length === 0) return 0;
    
    // This would need to be calculated from actual execution data
    // For now, return a placeholder
    return 0.85; // 85%
  }

  private calculateAverageExecutionTime(metrics: ProcessMetrics[]): number {
    if (metrics.length === 0) return 0;
    
    const totalTime = metrics.reduce((sum, metric) => sum + metric.duration, 0);
    return Math.round(totalTime / metrics.length);
  }

  private calculateProcessSpecificMetrics(processes: any[], metrics: ProcessMetrics[]): ProcessSpecificMetrics[] {
    return processes.map(process => ({
      processId: process.id,
      processName: process.name,
      executionCount: this.getExecutionCount(process.id, metrics),
      averageDuration: this.getAverageDuration(process.id, metrics),
      successRate: this.getSuccessRate(process.id, metrics),
      bottlenecks: this.identifyBottlenecks(process.id, metrics)
    }));
  }

  private calculateTrends(metrics: ProcessMetrics[]): TrendAnalysis {
    // Analyze trends over time
    const sortedMetrics = metrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    return {
      efficiency: this.calculateTrendDirection(sortedMetrics, 'efficiency'),
      quality: this.calculateTrendDirection(sortedMetrics, 'qualityScore'),
      volume: this.calculateVolumetrend(sortedMetrics)
    };
  }

  private async generateInsights(metrics: DetailedMetrics, processes: any[]): Promise<BusinessInsight[]> {
    const insights: BusinessInsight[] = [];

    // Performance insights
    if (metrics.overall.efficiency < 0.7) {
      insights.push({
        type: 'performance',
        severity: 'medium',
        title: 'Below Average Efficiency',
        description: `Overall process efficiency is ${(metrics.overall.efficiency * 100).toFixed(1)}%, which is below the 70% target.`,
        recommendation: 'Consider process optimization or automation opportunities.',
        impact: 'medium'
      });
    }

    // Quality insights
    if (metrics.overall.quality < 0.8) {
      insights.push({
        type: 'quality',
        severity: 'high',
        title: 'Quality Concerns',
        description: `Quality score is ${(metrics.overall.quality * 100).toFixed(1)}%, indicating potential quality issues.`,
        recommendation: 'Implement additional quality gates and review processes.',
        impact: 'high'
      });
    }

    // Process-specific insights
    const slowProcesses = metrics.byProcess.filter(p => p.averageDuration > metrics.overall.averageExecutionTime * 1.5);
    if (slowProcesses.length > 0) {
      insights.push({
        type: 'bottleneck',
        severity: 'medium',
        title: 'Slow Processes Identified',
        description: `${slowProcesses.length} processes are taking significantly longer than average.`,
        recommendation: 'Focus optimization efforts on: ' + slowProcesses.map(p => p.processName).join(', '),
        impact: 'medium'
      });
    }

    return insights;
  }

  private async generateRecommendations(
    metrics: DetailedMetrics, 
    insights: BusinessInsight[]
  ): Promise<BusinessRecommendation[]> {
    const recommendations: BusinessRecommendation[] = [];

    // High-priority recommendations based on insights
    const highSeverityInsights = insights.filter(i => i.severity === 'high');
    if (highSeverityInsights.length > 0) {
      recommendations.push({
        id: 'high-priority-fixes',
        title: 'Address Critical Issues',
        description: 'Focus on resolving high-severity issues first',
        priority: 'high',
        estimatedImpact: 'high',
        effort: 'medium',
        timeframe: '1-2 weeks',
        actions: highSeverityInsights.map(insight => insight.recommendation)
      });
    }

    // Process optimization recommendations
    if (metrics.overall.efficiency < 0.8) {
      recommendations.push({
        id: 'process-optimization',
        title: 'Optimize Process Efficiency',
        description: 'Implement automation and streamline workflows',
        priority: 'medium',
        estimatedImpact: 'high',
        effort: 'high',
        timeframe: '1-2 months',
        actions: [
          'Identify manual tasks suitable for automation',
          'Streamline approval processes',
          'Implement parallel task execution where possible'
        ]
      });
    }

    // Quality improvement recommendations
    if (metrics.overall.quality < 0.85) {
      recommendations.push({
        id: 'quality-improvement',
        title: 'Enhance Quality Management',
        description: 'Strengthen quality controls and monitoring',
        priority: 'medium',
        estimatedImpact: 'medium',
        effort: 'medium',
        timeframe: '2-4 weeks',
        actions: [
          'Add quality checkpoints at critical stages',
          'Implement automated quality validation',
          'Establish quality metrics dashboard'
        ]
      });
    }

    return recommendations;
  }

  private createEmptyAnalysis(): BusinessPerformanceAnalysis {
    return {
      efficiency: 0,
      quality: 0,
      onTime: 0,
      insights: [{
        type: 'setup',
        severity: 'low',
        title: 'No Process Data Available',
        description: 'No business processes have been executed yet.',
        recommendation: 'Set up your business processes and start executing them to see performance analytics.',
        impact: 'low'
      }],
      recommendations: [{
        id: 'initial-setup',
        title: 'Complete Business Setup',
        description: 'Set up your core business processes',
        priority: 'high',
        estimatedImpact: 'high',
        effort: 'medium',
        timeframe: '1 week',
        actions: [
          'Define your main business processes',
          'Set up team structure and roles',
          'Create process templates'
        ]
      }],
      detailedMetrics: {
        overall: {
          efficiency: 0,
          quality: 0,
          onTimeDelivery: 0,
          processCount: 0,
          averageExecutionTime: 0
        },
        byProcess: [],
        trends: {
          efficiency: { direction: 'stable', magnitude: 0 },
          quality: { direction: 'stable', magnitude: 0 },
          volume: { direction: 'stable', magnitude: 0 }
        }
      }
    };
  }

  private getExecutionCount(processId: string, metrics: ProcessMetrics[]): number {
    return metrics.filter(m => m.processId === processId).length;
  }

  private getAverageDuration(processId: string, metrics: ProcessMetrics[]): number {
    const processMetrics = metrics.filter(m => m.processId === processId);
    if (processMetrics.length === 0) return 0;
    
    const totalDuration = processMetrics.reduce((sum, m) => sum + m.duration, 0);
    return Math.round(totalDuration / processMetrics.length);
  }

  private getSuccessRate(processId: string, metrics: ProcessMetrics[]): number {
    const processMetrics = metrics.filter(m => m.processId === processId);
    if (processMetrics.length === 0) return 0;
    
    // This would need to be calculated from actual success/failure data
    // For now, return a placeholder based on quality score
    const avgQuality = processMetrics.reduce((sum, m) => sum + m.qualityScore, 0) / processMetrics.length;
    return Math.round(avgQuality * 100) / 100;
  }

  private identifyBottlenecks(processId: string, metrics: ProcessMetrics[]): string[] {
    // This would analyze process execution data to identify bottlenecks
    // For now, return placeholder data
    return [];
  }

  private calculateTrendDirection(metrics: ProcessMetrics[], field: keyof ProcessMetrics): TrendDirection {
    if (metrics.length < 2) {
      return { direction: 'stable', magnitude: 0 };
    }

    const recent = metrics.slice(-5); // Last 5 executions
    const older = metrics.slice(-10, -5); // Previous 5 executions

    if (recent.length === 0 || older.length === 0) {
      return { direction: 'stable', magnitude: 0 };
    }

    const recentAvg = recent.reduce((sum, m) => sum + (m[field] as number), 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + (m[field] as number), 0) / older.length;

    const change = recentAvg - olderAvg;
    const magnitude = Math.abs(change / olderAvg);

    return {
      direction: change > 0.05 ? 'improving' : change < -0.05 ? 'declining' : 'stable',
      magnitude: Math.round(magnitude * 100) / 100
    };
  }

  private calculateVolumetrend(metrics: ProcessMetrics[]): TrendDirection {
    // Calculate volume trend based on execution frequency
    if (metrics.length < 2) {
      return { direction: 'stable', magnitude: 0 };
    }

    // Group by time periods and compare
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentCount = metrics.filter(m => m.timestamp >= oneWeekAgo).length;
    const previousCount = metrics.filter(m => m.timestamp >= twoWeeksAgo && m.timestamp < oneWeekAgo).length;

    if (previousCount === 0) {
      return { direction: 'stable', magnitude: 0 };
    }

    const change = (recentCount - previousCount) / previousCount;

    return {
      direction: change > 0.1 ? 'improving' : change < -0.1 ? 'declining' : 'stable',
      magnitude: Math.round(Math.abs(change) * 100) / 100
    };
  }
}

// Supporting interfaces
interface BusinessPerformanceAnalysis {
  efficiency: number;
  quality: number;
  onTime: number;
  insights: BusinessInsight[];
  recommendations: BusinessRecommendation[];
  detailedMetrics: DetailedMetrics;
}

interface DetailedMetrics {
  overall: {
    efficiency: number;
    quality: number;
    onTimeDelivery: number;
    processCount: number;
    averageExecutionTime: number;
  };
  byProcess: ProcessSpecificMetrics[];
  trends: TrendAnalysis;
}

interface ProcessSpecificMetrics {
  processId: string;
  processName: string;
  executionCount: number;
  averageDuration: number;
  successRate: number;
  bottlenecks: string[];
}

interface TrendAnalysis {
  efficiency: TrendDirection;
  quality: TrendDirection;
  volume: TrendDirection;
}

interface TrendDirection {
  direction: 'improving' | 'stable' | 'declining';
  magnitude: number;
}

interface BusinessInsight {
  type: 'performance' | 'quality' | 'bottleneck' | 'setup';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  recommendation: string;
  impact: 'low' | 'medium' | 'high';
}

interface BusinessRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  timeframe: string;
  actions: string[];
}