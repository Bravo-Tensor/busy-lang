
import { NextApiRequest, NextApiResponse } from 'next';
import { ProcessExecutionServiceImpl } from '../../../services/process-execution-service';

const processService = new ProcessExecutionServiceImpl();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { instanceId, outputData } = req.body;

      // Validate input
      if (!instanceId || typeof instanceId !== 'number') {
        return res.status(400).json({ error: 'Valid instanceId is required' });
      }

      if (!outputData || typeof outputData !== 'object') {
        return res.status(400).json({ error: 'Output data is required' });
      }

      // Execute step using the comprehensive execution service
      const result = await processService.executeCurrentStep(instanceId, outputData);

      if (result.success) {
        res.status(200).json({ 
          success: true, 
          result,
          isComplete: result.nextStep === undefined || result.shouldPause
        });
      } else {
        res.status(400).json({ 
          success: false, 
          errors: result.errors || ['Unknown error occurred']
        });
      }
    } catch (error) {
      console.error('Error executing step:', error);
      res.status(500).json({ 
        error: 'Failed to execute step',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end('Method Not Allowed');
  }
}
