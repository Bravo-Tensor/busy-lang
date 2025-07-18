
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
