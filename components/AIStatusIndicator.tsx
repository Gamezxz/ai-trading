'use client';

import { useEffect, useState } from 'react';

interface AIStatusIndicatorProps {
  className?: string;
}

export default function AIStatusIndicator({ className = '' }: AIStatusIndicatorProps) {
  const [status, setStatus] = useState<{
    available: boolean;
    currentProvider: string;
    providers: Array<{
      name: string;
      displayName: string;
      available: boolean;
      isFree: boolean;
    }>;
  } | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/ai/check');
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (error) {
        console.error('Failed to check AI status:', error);
      }
    };

    checkStatus();
    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  const availableProviders = status.providers.filter(p => p.available);
  const currentProviderInfo = status.providers.find(p => p.name === status.currentProvider);

  return (
    <div className={`fixed bottom-4 right-4 bg-gray-800 border border-gray-600 rounded-lg p-3 text-xs ${className}`}>
      <div className="font-medium mb-2">AI Status</div>
      <div className="space-y-1">
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-2 ${status.available ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className={status.available ? 'text-green-400' : 'text-red-400'}>
            {status.available ? 'AI Available' : 'AI Unavailable'}
          </span>
        </div>
        {currentProviderInfo && (
          <div className="text-gray-300">
            Current: {currentProviderInfo.displayName} {currentProviderInfo.isFree ? '(FREE)' : '(PAID)'}
          </div>
        )}
        <div className="text-gray-400">
          Ready: {availableProviders.length}/{status.providers.length}
        </div>
      </div>
    </div>
  );
}