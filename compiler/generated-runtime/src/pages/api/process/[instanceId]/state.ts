
import { NextApiRequest, NextApiResponse } from 'next';
import { ProcessExecutionServiceImpl } from '../../../../services/process-execution-service';

const processService = new ProcessExecutionServiceImpl();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const instanceId = parseInt(req.query.instanceId as string);

      if (!instanceId || isNaN(instanceId)) {
        return res.status(400).json({ error: 'Valid instanceId is required' });
      }

      const processState = await processService.getProcessState(instanceId);
      res.status(200).json({ processState });
    } catch (error) {
      console.error('Error getting process state:', error);
      res.status(500).json({ 
        error: 'Failed to get process state',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end('Method Not Allowed');
  }
}