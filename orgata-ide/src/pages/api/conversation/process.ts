import type { NextApiRequest, NextApiResponse } from 'next';
import { ConversationEngine } from '@/services/conversation-engine';
import { AIResponse } from '@/types/conversation';

let conversationEngine: ConversationEngine | null = null;

function getConversationEngine(): ConversationEngine {
  if (!conversationEngine) {
    conversationEngine = new ConversationEngine();
  }
  return conversationEngine;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AIResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, sessionId, businessContext } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({ error: 'Message and sessionId are required' });
    }

    const engine = getConversationEngine();
    const response = await engine.processUserInput(message, sessionId, 'user-1');

    res.status(200).json(response);
  } catch (error) {
    console.error('Error processing conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}