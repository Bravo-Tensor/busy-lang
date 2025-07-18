
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
            [`step_${instance.currentStep}`]: outputData
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
          notes: `Completed step ${instance.currentStep + 1}`
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
