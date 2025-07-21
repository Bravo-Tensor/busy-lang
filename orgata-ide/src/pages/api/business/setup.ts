import type { NextApiRequest, NextApiResponse } from 'next';
import { BusyGeneratorService } from '@/services/busy-generator';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; businessId?: string; error?: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const setupData = req.body;

    if (!setupData.businessName || !setupData.industry) {
      return res.status(400).json({ 
        success: false, 
        error: 'Business name and industry are required' 
      });
    }

    const busyGenerator = new BusyGeneratorService();
    
    // Generate business structure from setup data
    const modifications = await busyGenerator.generateBusinessFromInterview(
      setupData,
      setupData.industry.toLowerCase()
    );

    // In a real implementation, you would:
    // 1. Save the business data to database
    // 2. Create the actual BUSY files
    // 3. Initialize the business context
    // 4. Set up user session

    const businessId = `business-${Date.now()}`;

    // For now, just return success
    res.status(200).json({ 
      success: true, 
      businessId 
    });

  } catch (error) {
    console.error('Error setting up business:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}