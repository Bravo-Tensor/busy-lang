import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, MicrophoneIcon } from '@heroicons/react/24/outline';
import { AIResponse, BusinessContext, ConversationTurn } from '@/types/conversation';

interface ConversationInterfaceProps {
  businessContext: BusinessContext;
  onResponse: (response: AIResponse) => void;
}

export function ConversationInterface({ businessContext, onResponse }: ConversationInterfaceProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  useEffect(() => {
    // Focus input on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/conversation/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          sessionId: businessContext.sessionId,
          businessContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process message');
      }

      const aiResponse: AIResponse = await response.json();
      
      // Create conversation turn
      const turn: ConversationTurn = {
        id: Date.now().toString(),
        timestamp: new Date(),
        userInput,
        aiResponse,
        intent: {
          type: 'discovery',
          confidence: 0.8,
          entities: [],
          businessContext,
          originalText: userInput
        },
        context: businessContext,
        actions: aiResponse.proposedActions || []
      };

      setConversation(prev => [...prev, turn]);
      onResponse(aiResponse);

    } catch (error) {
      console.error('Error processing message:', error);
      // Show error message
      const errorResponse: AIResponse = {
        message: "I'm sorry, I encountered an error processing your request. Please try again.",
        proposedActions: [],
        confidenceLevel: 0,
        requiresApproval: false
      };
      
      const turn: ConversationTurn = {
        id: Date.now().toString(),
        timestamp: new Date(),
        userInput,
        aiResponse: errorResponse,
        intent: {
          type: 'help',
          confidence: 0.5,
          entities: [],
          businessContext,
          originalText: userInput
        },
        context: businessContext,
        actions: []
      };

      setConversation(prev => [...prev, turn]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const renderMessage = (turn: ConversationTurn, index: number) => (
    <div key={turn.id} className="space-y-4">
      {/* User Message */}
      <div className="flex justify-end">
        <div className="max-w-xs lg:max-w-md xl:max-w-2xl bg-primary-600 text-white rounded-lg px-4 py-2">
          <p className="text-sm">{turn.userInput}</p>
        </div>
      </div>

      {/* AI Response */}
      <div className="flex justify-start">
        <div className="max-w-xs lg:max-w-md xl:max-w-4xl bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-800 whitespace-pre-wrap">{turn.aiResponse.message}</p>
          </div>
          
          {/* Proposed Actions */}
          {turn.actions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Proposed Actions
              </h4>
              <div className="space-y-2">
                {turn.actions.map((action, actionIndex) => (
                  <div key={actionIndex} className="flex items-center justify-between bg-gray-50 rounded p-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{action.type}</p>
                      <p className="text-xs text-gray-600">{action.filePath}</p>
                    </div>
                    <button className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded hover:bg-primary-200">
                      Review
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Knit Analysis */}
          {turn.aiResponse.knitAnalysis && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Impact Analysis
              </h4>
              <div className="text-xs space-y-1">
                {turn.aiResponse.knitAnalysis.hasBreakingChanges && (
                  <p className="text-red-600">⚠️ Breaking changes detected</p>
                )}
                {turn.aiResponse.knitAnalysis.dependentProcesses.length > 0 && (
                  <p className="text-amber-600">
                    📊 {turn.aiResponse.knitAnalysis.dependentProcesses.length} processes affected
                  </p>
                )}
                <p className="text-gray-600">
                  ⏱️ Estimated time: {turn.aiResponse.knitAnalysis.estimatedTime}min
                </p>
              </div>
            </div>
          )}

          {/* Suggested Questions */}
          {turn.aiResponse.suggestedQuestions && turn.aiResponse.suggestedQuestions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Suggestions
              </h4>
              <div className="flex flex-wrap gap-2">
                {turn.aiResponse.suggestedQuestions.map((question, qIndex) => (
                  <button
                    key={qIndex}
                    onClick={() => setInput(question)}
                    className="text-xs bg-conversation-100 text-conversation-700 px-2 py-1 rounded hover:bg-conversation-200"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-2 text-xs text-gray-400">
            {turn.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-gray-50 rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex-none bg-white px-6 py-4 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Business Conversation</h2>
            <p className="text-sm text-gray-500">
              Ask me anything about your business processes
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-green-400 rounded-full"></div>
            <span className="text-xs text-green-600">AI Assistant Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {conversation.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <MicrophoneIcon className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Welcome to Orgata IDE
              </h3>
              <p className="text-gray-500 max-w-md">
                I'm your AI business assistant. I can help you create, modify, and optimize your business processes through natural conversation.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
              {[
                "Help me set up my business processes",
                "I want to improve my client onboarding",
                "Show me my process performance",
                "How do I optimize my workflow?"
              ].map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setInput(suggestion)}
                  className="text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  <span className="text-sm text-gray-700">{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {conversation.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="flex-none bg-white px-6 py-4 border-t border-gray-200 rounded-b-lg">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me about your business processes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={1}
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex-none bg-primary-600 text-white p-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <PaperAirplaneIcon className="w-5 h-5" />
            )}
          </button>
        </form>
        
        <div className="mt-2 text-xs text-gray-500 text-center">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}