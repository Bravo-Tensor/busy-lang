import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ isSetup: boolean; context?: any }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ isSetup: false });
  }

  try {
    // In a real implementation, you would:
    // 1. Check if user has a business set up
    // 2. Load their business context from database
    // 3. Return the context if found

    // For demo purposes, always return not setup
    res.status(200).json({ 
      isSetup: false 
    });

  } catch (error) {
    console.error('Error checking business status:', error);
    res.status(500).json({ isSetup: false });
  }
}