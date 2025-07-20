
import { NextApiRequest, NextApiResponse } from 'next';
import { ProcessExecutionServiceImpl } from '../../../../services/process-execution-service';

const processService = new ProcessExecutionServiceImpl();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const instanceId = parseInt(req.query.instanceId as string);
      const { action } = req.body;

      if (!instanceId || isNaN(instanceId)) {
        return res.status(400).json({ error: 'Valid instanceId is required' });
      }

      if (!action || !['pause', 'resume', 'cancel'].includes(action)) {
        return res.status(400).json({ error: 'Valid action (pause, resume, cancel) is required' });
      }

      switch (action) {
        case 'pause':
          await processService.pauseProcess(instanceId);
          break;
        case 'resume':
          await processService.resumeProcess(instanceId);
          break;
        case 'cancel':
          await processService.cancelProcess(instanceId);
          break;
      }

      res.status(200).json({ success: true, action });
    } catch (error) {
      console.error('Error controlling process:', error);
      res.status(500).json({ 
        error: 'Failed to control process',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end('Method Not Allowed');
  }
}