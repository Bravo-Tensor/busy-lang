import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { ConversationInterface } from '@/components/ConversationInterface';
import { ProcessDashboard } from '@/components/ProcessDashboard';
import { BusinessSetupWizard } from '@/components/BusinessSetupWizard';
import { AIResponse, BusinessContext } from '@/types/conversation';

interface HomePageState {
  isBusinessSetup: boolean;
  businessContext: BusinessContext | null;
  currentView: 'conversation' | 'dashboard' | 'setup';
  conversationHistory: any[];
}

export default function HomePage() {
  const [state, setState] = useState<HomePageState>({
    isBusinessSetup: false,
    businessContext: null,
    currentView: 'setup',
    conversationHistory: []
  });

  useEffect(() => {
    // Check if business is already set up
    checkBusinessSetup();
  }, []);

  const checkBusinessSetup = async () => {
    try {
      const response = await fetch('/api/business/status');
      const data = await response.json();
      
      if (data.isSetup) {
        setState(prev => ({
          ...prev,
          isBusinessSetup: true,
          businessContext: data.context,
          currentView: 'conversation'
        }));
      }
    } catch (error) {
      console.error('Error checking business setup:', error);
    }
  };

  const handleBusinessSetupComplete = (context: BusinessContext) => {
    setState(prev => ({
      ...prev,
      isBusinessSetup: true,
      businessContext: context,
      currentView: 'conversation'
    }));
  };

  const handleConversationResponse = (response: AIResponse) => {
    setState(prev => ({
      ...prev,
      conversationHistory: [...prev.conversationHistory, response]
    }));
  };

  const handleViewChange = (view: 'conversation' | 'dashboard') => {
    setState(prev => ({ ...prev, currentView: view }));
  };

  return (
    <>
      <Head>
        <title>Orgata IDE - Conversational Business Operating System</title>
        <meta name="description" content="Run your business through conversation with AI-powered process management" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-primary-600">Orgata IDE</h1>
                {state.isBusinessSetup && (
                  <nav className="ml-8 flex space-x-4">
                    <button
                      onClick={() => handleViewChange('conversation')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        state.currentView === 'conversation'
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Conversation
                    </button>
                    <button
                      onClick={() => handleViewChange('dashboard')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        state.currentView === 'dashboard'
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Dashboard
                    </button>
                  </nav>
                )}
              </div>
              
              {state.isBusinessSetup && (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">
                    {state.businessContext?.industry || 'Business'} Operations
                  </span>
                  <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-green-600">Active</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {!state.isBusinessSetup ? (
            <BusinessSetupWizard onComplete={handleBusinessSetupComplete} />
          ) : (
            <div className="px-4 py-6 sm:px-0">
              {state.currentView === 'conversation' && (
                <ConversationInterface
                  businessContext={state.businessContext!}
                  onResponse={handleConversationResponse}
                />
              )}
              
              {state.currentView === 'dashboard' && (
                <ProcessDashboard
                  businessContext={state.businessContext!}
                  conversationHistory={state.conversationHistory}
                />
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Orgata IDE v{process.env.NEXT_PUBLIC_VERSION || '0.1.0'} - 
                Conversational Business Operating System
              </p>
              <div className="flex items-center space-x-4">
                <a
                  href="https://github.com/busy-lang/orgata-ide"
                  className="text-sm text-gray-500 hover:text-gray-700"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
                <a
                  href="/docs"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Documentation
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}