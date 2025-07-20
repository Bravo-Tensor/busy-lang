
import { NextApiRequest, NextApiResponse } from 'next';
import { ProcessExecutionServiceImpl } from '../../../services/process-execution-service';

const processService = new ProcessExecutionServiceImpl();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { playbookId, initialData } = req.body;

      // Validate input
      if (!playbookId || typeof playbookId !== 'number') {
        return res.status(400).json({ error: 'Valid playbookId is required' });
      }

      if (!initialData || typeof initialData !== 'object') {
        return res.status(400).json({ error: 'Initial data is required' });
      }

      // Start playbook using the comprehensive execution service
      const processState = await processService.startPlaybook(playbookId, initialData);
      
      res.status(200).json({ 
        instanceId: processState.instanceId,
        processState 
      });
    } catch (error) {
      console.error('Error starting playbook:', error);
      res.status(500).json({ 
        error: 'Failed to start playbook',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end('Method Not Allowed');
  }
}
