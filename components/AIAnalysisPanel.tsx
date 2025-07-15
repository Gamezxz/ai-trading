'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ClaudeAI, AIAnalysisResult } from '@/lib/claude-ai';
import { ProcessedCandle, BinanceInterval, binanceFetcher } from '@/lib/binance';
import { TechnicalIndicators, TechnicalAnalysis } from '@/lib/technical-analysis';

interface AIAnalysisPanelProps {
  candles: ProcessedCandle[];
  indicators: TechnicalIndicators | null;
  isLoading?: boolean;
  currentTimeframe?: BinanceInterval;
  currentSymbol?: string;
  currentPrice?: number | null;
}

const timeframeOptions: { value: BinanceInterval; label: string; category: string }[] = [
  // Minutes Group
  { value: '1m', label: '1 Minute', category: 'Minutes' },
  { value: '3m', label: '3 Minutes', category: 'Minutes' },
  { value: '5m', label: '5 Minutes', category: 'Minutes' },
  { value: '15m', label: '15 Minutes', category: 'Minutes' },
  { value: '30m', label: '30 Minutes', category: 'Minutes' },
  
  // Hours Group  
  { value: '1h', label: '1 Hour', category: 'Hours' },
  { value: '2h', label: '2 Hours', category: 'Hours' },
  { value: '4h', label: '4 Hours', category: 'Hours' },
  { value: '6h', label: '6 Hours', category: 'Hours' },
  { value: '8h', label: '8 Hours', category: 'Hours' },
  { value: '12h', label: '12 Hours', category: 'Hours' },
  
  // Days+ Group
  { value: '1d', label: '1 Day', category: 'Days+' },
  { value: '3d', label: '3 Days', category: 'Days+' },
  { value: '1w', label: '1 Week', category: 'Days+' },
  { value: '1M', label: '1 Month', category: 'Days+' }
];

// Group options by category
const groupedOptions = timeframeOptions.reduce((acc, option) => {
  if (!acc[option.category]) {
    acc[option.category] = [];
  }
  acc[option.category].push(option);
  return acc;
}, {} as Record<string, typeof timeframeOptions>);

interface ProviderInfo {
  name: string;
  displayName: string;
  available: boolean;
  configured: boolean;
  isFree: boolean;
  model: string;
  error?: string;
}

interface ProviderStatus {
  available: boolean;
  currentProvider: string;
  providers: ProviderInfo[];
  recommendation: string;
}

export default function AIAnalysisPanel({ candles, indicators, currentTimeframe = '5m', currentSymbol = 'BTCUSDT', currentPrice }: AIAnalysisPanelProps) {
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('auto');
  const [selectedTimeframe, setSelectedTimeframe] = useState<BinanceInterval>(currentTimeframe);
  const [showProviderDetails, setShowProviderDetails] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lastAnalysisInfo, setLastAnalysisInfo] = useState<{
    timestamp: string;
    provider: string;
    isRealAI: boolean;
    model?: string;
  } | null>(null);
  const hadPreviousResultRef = useRef(false);

  // Handle hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Manual AI analysis function
  const handleAnalyzeClick = useCallback(async (useMock = false) => {
    setIsAILoading(true);
    setAiError(null);
    
    try {
      // Fetch data for selected timeframe if different from current
      let analysisCandles = candles;
      let analysisIndicators = indicators;
      
      if (selectedTimeframe !== currentTimeframe) {
        console.log(`Fetching ${selectedTimeframe} data for AI analysis...`);
        analysisCandles = await binanceFetcher.fetchKlines(currentSymbol, selectedTimeframe, 100);
        analysisIndicators = TechnicalAnalysis.calculateAllIndicators(analysisCandles);
      }
      
      if (!analysisIndicators || analysisCandles.length === 0) {
        throw new Error('No data available for analysis');
      }
      
      let result: AIAnalysisResult;
      
      if (useMock) {
        // Force use mock analysis
        console.log('🧪 USING MOCK AI (User requested)');
        result = await ClaudeAI.mockAnalyze(analysisCandles, analysisIndicators, currentPrice);
        setLastAnalysisInfo({
          timestamp: new Date().toLocaleString(),
          provider: 'Mock AI',
          isRealAI: false
        });
      } else if (!providerStatus?.available) {
        // No providers available, fall back to mock
        console.log('🧪 USING MOCK AI (No providers available)');
        result = await ClaudeAI.mockAnalyze(analysisCandles, analysisIndicators, currentPrice);
        setLastAnalysisInfo({
          timestamp: new Date().toLocaleString(),
          provider: 'Mock AI (Fallback)',
          isRealAI: false
        });
      } else {
        // Use real AI analysis with selected provider
        const provider = selectedProvider === 'auto' ? undefined : selectedProvider;
        const actualProvider = provider || providerStatus.currentProvider;
        console.log(`🤖 USING REAL AI: ${actualProvider}`);
        result = await ClaudeAI.analyzeMarket(analysisCandles, analysisIndicators, provider, undefined, currentPrice);
        setLastAnalysisInfo({
          timestamp: new Date().toLocaleString(),
          provider: actualProvider,
          isRealAI: true,
          model: providerStatus.providers.find(p => p.name === actualProvider)?.model
        });
      }
      
      setAiResult(result);
      hadPreviousResultRef.current = true;
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI analysis failed');
      console.error('AI Analysis error:', error);
    } finally {
      setIsAILoading(false);
    }
  }, [candles, indicators, selectedTimeframe, currentTimeframe, currentSymbol, providerStatus?.available, selectedProvider]);

  // Auto-refresh when symbol changes ONLY (removed to prevent rate limit issues)
  useEffect(() => {
    const hadPreviousResult = hadPreviousResultRef.current;
    setAiResult(null);
    setAiError(null);
    console.log('Symbol changed to:', currentSymbol, '- clearing AI results');
    
    // Disabled auto-trigger to prevent rate limit issues
    // Users should manually trigger analysis after symbol change
    console.log('Auto-trigger disabled - please manually analyze after symbol change');
  }, [currentSymbol]);

  // Check AI providers on mount
  useEffect(() => {
    const checkProviders = async () => {
      try {
        const response = await fetch('/api/ai/check');
        if (response.ok) {
          const data = await response.json();
          setProviderStatus(data);
          
          // Set default provider to the current one
          if (data.currentProvider && data.currentProvider !== 'auto') {
            setSelectedProvider(data.currentProvider);
            console.log(`Setting selected provider to: ${data.currentProvider}`);
          } else {
            setSelectedProvider('auto');
          }
          
          console.log('AI Provider Status:', data);
        }
      } catch (error) {
        console.error('Error checking AI providers:', error);
        setProviderStatus({
          available: false,
          currentProvider: 'none',
          providers: [],
          recommendation: 'Failed to check AI providers'
        });
      }
    };
    
    checkProviders();
  }, []);


  // Clear results function
  const handleClearResults = useCallback(() => {
    setAiResult(null);
    setAiError(null);
    hadPreviousResultRef.current = false;
  }, []);

  // Copy results function
  const handleCopyResults = useCallback(() => {
    if (!aiResult) return;
    
    const copyText = `=== AI TRADING ANALYSIS ===
Symbol: ${currentSymbol}
Analysis Time: ${lastAnalysisInfo?.timestamp || 'N/A'}
Provider: ${lastAnalysisInfo?.provider || 'N/A'}
${lastAnalysisInfo?.model ? `Model: ${lastAnalysisInfo.model}` : ''}
AI Type: ${lastAnalysisInfo?.isRealAI ? 'REAL AI' : 'MOCK AI'}

=== TRADING SIGNAL ===
Signal: ${aiResult.signal.type}
Strength: ${aiResult.signal.strength}%
Confidence: ${aiResult.signal.confidence}%
Entry Price: $${aiResult.signal.entryPrice?.toFixed(2) || 'N/A'}
Stop Loss: $${aiResult.signal.stopLoss?.toFixed(2) || 'N/A'}
Take Profit: $${aiResult.signal.takeProfit?.toFixed(2) || 'N/A'}

=== MARKET SENTIMENT ===
${aiResult.marketSentiment}

=== AI REASONING ===
${aiResult.signal.reasoning.map((reason, i) => `${i + 1}. ${reason}`).join('\n')}

=== KEY FACTORS ===
${aiResult.keyFactors.map((factor, i) => `${i + 1}. ${factor}`).join('\n')}

=== RISK ASSESSMENT ===
${aiResult.riskAssessment}

=== TIME HORIZON ===
${aiResult.timeHorizon}

=== CONFIDENCE REASONING ===
${aiResult.confidenceReasoning}

=== RAW DATA ===
${JSON.stringify(aiResult, null, 2)}

Generated: ${new Date().toLocaleString()}`;

    navigator.clipboard.writeText(copyText).then(() => {
      // Show success feedback
      const button = document.querySelector('[data-copy-button]') as HTMLButtonElement;
      if (button) {
        const originalText = button.textContent;
        button.textContent = '✅ Copied!';
        button.style.backgroundColor = '#059669';
        setTimeout(() => {
          button.textContent = originalText;
          button.style.backgroundColor = '';
        }, 2000);
      }
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      // Fallback: show alert with text
      alert('Copy failed. Here\'s the analysis data:\n\n' + copyText);
    });
  }, [aiResult, currentSymbol, lastAnalysisInfo]);

  // Show development mode UI even if AI not available
  // const showDevelopmentMode = isDevelopmentMode || !isAIAvailable;

  // Prevent hydration mismatch by not rendering complex state-dependent content until mounted
  if (!mounted) {
    return (
      <div className="bg-gray-800 rounded-lg p-3 sm:p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-400">Loading AI Analysis...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <h3 className="text-lg font-semibold flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${
            isAILoading ? 'bg-yellow-500 animate-pulse' : 
            aiError ? 'bg-red-500' : 
            providerStatus?.available ? 'bg-green-500' : 'bg-orange-500'
          }`}></div>
          AI Analysis
          {providerStatus?.available && (
            <span className="ml-2 text-xs bg-green-700 text-green-200 px-2 py-1 rounded">
              {selectedProvider === 'auto' 
                ? `Auto: ${providerStatus.providers.find(p => p.name === providerStatus.currentProvider)?.displayName || 'Unknown'}`
                : providerStatus.providers.find(p => p.name === selectedProvider)?.displayName || selectedProvider
              }
            </span>
          )}
          {isAILoading && (
            <div className="ml-2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          )}
        </h3>
        
        {/* Quick Analysis Button */}
        <button
          onClick={() => handleAnalyzeClick(false)} // Always try real AI first
          disabled={isAILoading}
          className={`
            w-full sm:w-auto px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm
            ${isAILoading 
              ? 'bg-yellow-600 text-white cursor-not-allowed' 
              : providerStatus?.available 
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }
            flex items-center justify-center space-x-2
          `}
        >
          <span>{providerStatus?.available ? '🤖' : '🧪'}</span>
          <span className="hidden xs:inline">
            {isAILoading ? 'Analyzing...' : providerStatus?.available ? 'AI Analysis' : 'Mock Analysis'}
          </span>
          <span className="inline xs:hidden">
            {isAILoading ? '...' : 'Analyze'}
          </span>
        </button>
      </div>

      {/* Control Panel */}
      <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
        {/* Current Symbol and Timeframe */}
        <div className="text-xs sm:text-sm text-gray-400 space-y-1">
          <div className="flex flex-col xs:flex-row xs:gap-4">
            <div>Trading Pair: <span className="text-yellow-400 font-medium">{currentSymbol.replace('USDT', '/USDT')}</span></div>
            <div>Currently: <span className="text-blue-400 font-medium">{currentTimeframe.toUpperCase()}</span></div>
          </div>
          <div>Analyze timeframe: <span className="text-green-400 font-medium">{selectedTimeframe.toUpperCase()}</span></div>
        </div>

        {/* AI Provider Selector */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
            AI Provider:
          </label>
          <div className="flex gap-2">
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              disabled={isAILoading}
              className={`
                flex-1 bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-xs sm:text-sm
                focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
                hover:bg-gray-600 transition-colors duration-200
                ${isAILoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <option value="auto">Auto (Best Available)</option>
              {providerStatus?.providers
                .map((provider) => (
                  <option key={provider.name} value={provider.name}>
                    {provider.displayName} {provider.isFree ? '(FREE)' : '(PAID)'} 
                    {!provider.available ? ' - Not Configured' : ''}
                  </option>
                ))}
            </select>
            <button
              onClick={() => setShowProviderDetails(!showProviderDetails)}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-xs sm:text-sm transition-colors"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
            Select Timeframe for AI Analysis:
          </label>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as BinanceInterval)}
            disabled={isAILoading}
            className={`
              w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-xs sm:text-sm
              focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
              hover:bg-gray-600 transition-colors duration-200
              ${isAILoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {Object.entries(groupedOptions).map(([category, options]) => (
              <optgroup key={category} label={category} className="text-gray-300">
                {options.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    className="bg-gray-700 text-white"
                  >
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Provider Details Panel */}
        {showProviderDetails && (
          <div className="bg-gray-700 rounded p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-white">AI Provider Status</h4>
              <button
                onClick={() => setShowProviderDetails(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2">
              {providerStatus?.providers.map((provider) => (
                <div
                  key={provider.name}
                  className={`p-2 rounded border ${
                    provider.available 
                      ? 'bg-green-900/20 border-green-700' 
                      : provider.configured 
                        ? 'bg-yellow-900/20 border-yellow-700'
                        : 'bg-gray-800 border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        provider.available ? 'bg-green-400' : 
                        provider.configured ? 'bg-yellow-400' : 'bg-gray-400'
                      }`}></div>
                      <span className="text-xs font-medium">{provider.displayName}</span>
                      {provider.isFree && (
                        <span className="text-xs bg-green-600 text-white px-1 rounded">FREE</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{provider.model}</span>
                  </div>
                  {provider.error && (
                    <div className="text-xs text-red-400 mt-1">{provider.error}</div>
                  )}
                </div>
              ))}
            </div>
            
            {providerStatus?.recommendation && (
              <div className="text-xs text-blue-300 bg-blue-900/20 border border-blue-700 rounded p-2">
                💡 {providerStatus.recommendation}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* AI Status Info */}
          <div className="text-xs text-gray-400 bg-gray-700 rounded p-2 sm:p-3">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${providerStatus?.available ? 'bg-green-400' : 'bg-orange-400'}`}></div>
              <span className="text-xs">
                {providerStatus?.available ? (
                  selectedProvider === 'auto'
                    ? `🤖 Auto: ${providerStatus.providers.find(p => p.name === providerStatus.currentProvider)?.displayName || 'AI'} Ready`
                    : `🤖 ${providerStatus.providers.find(p => p.name === selectedProvider)?.displayName || selectedProvider} Ready`
                ) : (
                  '🧪 Mock AI Mode'
                )}
              </span>
            </div>
            
            {/* Setup Instructions for Free Providers */}
            {!providerStatus?.available && providerStatus?.providers && (
              <div className="mt-2 text-xs space-y-1">
                <div className="text-yellow-300 font-medium">📝 Setup FREE AI Provider:</div>
                <div className="space-y-1">
                  <div className="text-green-300">
                    🚀 <strong>Groq (Recommended):</strong> Get FREE key from console.groq.com
                  </div>
                  <div className="text-blue-300">
                    💻 <strong>Ollama:</strong> Install locally from ollama.ai (no key needed)
                  </div>
                  <div className="text-purple-300">
                    🤗 <strong>Hugging Face:</strong> Get FREE key from huggingface.co/settings/tokens
                  </div>
                </div>
                <div className="text-gray-400 text-xs mt-2">
                  Add keys to .env.local file and restart server
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Real AI Button (if available) */}
            {providerStatus?.available && (
              <button
                onClick={() => handleAnalyzeClick(false)}
                disabled={isAILoading}
                className={`
                  flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm
                  ${isAILoading 
                    ? 'bg-yellow-600 text-white cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }
                  flex items-center justify-center space-x-1 sm:space-x-2
                `}
              >
                <span>🤖</span>
                <span className="hidden sm:inline">
                  {isAILoading ? 'Analyzing...' : 
                    `${selectedProvider === 'auto' 
                      ? providerStatus.providers.find(p => p.name === providerStatus.currentProvider)?.displayName?.split(' ')[0] || 'AI'
                      : providerStatus.providers.find(p => p.name === selectedProvider)?.displayName?.split(' ')[0] || selectedProvider
                    } ${selectedTimeframe.toUpperCase()}`}
                </span>
                <span className="inline sm:hidden">
                  {isAILoading ? 'AI...' : 
                    `${selectedProvider === 'auto' 
                      ? providerStatus.providers.find(p => p.name === providerStatus.currentProvider)?.displayName?.split(' ')[0] || 'AI'
                      : providerStatus.providers.find(p => p.name === selectedProvider)?.displayName?.split(' ')[0] || selectedProvider
                    } ${selectedTimeframe.toUpperCase()}`}
                </span>
              </button>
            )}

            {/* Mock AI Button (always available for testing) */}
            <button
              onClick={() => handleAnalyzeClick(true)}
              disabled={isAILoading}
              className={`
                flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm
                ${isAILoading 
                  ? 'bg-yellow-600 text-white cursor-not-allowed' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
                }
                flex items-center justify-center space-x-1 sm:space-x-2
              `}
            >
              <span>🧪</span>
              <span className="hidden sm:inline">
                {isAILoading ? 'Analyzing...' : `Mock AI ${selectedTimeframe.toUpperCase()}`}
              </span>
              <span className="inline sm:hidden">
                {isAILoading ? 'Mock...' : `Mock ${selectedTimeframe.toUpperCase()}`}
              </span>
            </button>
            
            {(aiResult || aiError) && (
              <button
                onClick={handleClearResults}
                disabled={isAILoading}
                className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors text-xs sm:text-sm"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {aiError && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-xs sm:text-sm">{aiError}</p>
        </div>
      )}

      {isAILoading && !aiResult && (
        <div className="text-center py-6 sm:py-8">
          <div className="text-xl sm:text-2xl mb-2">🧠</div>
          <p className="text-gray-400 text-sm">
            {providerStatus?.available 
              ? `${selectedProvider === 'auto' 
                  ? providerStatus.providers.find(p => p.name === providerStatus.currentProvider)?.displayName || 'AI'
                  : providerStatus.providers.find(p => p.name === selectedProvider)?.displayName || selectedProvider
                } analyzing market conditions...`
              : 'Mock AI analyzing market conditions...'}
          </p>
          <div className={`inline-block px-3 py-1 rounded-full text-xs mt-2 ${
            providerStatus?.available 
              ? 'bg-green-900/30 text-green-400 border border-green-700'
              : 'bg-yellow-900/30 text-yellow-400 border border-yellow-700'
          }`}>
            {providerStatus?.available ? '🤖 REAL AI' : '🧪 MOCK AI'}
          </div>
        </div>
      )}

      {aiResult && (
        <div className="space-y-3 sm:space-y-4">
          {/* AI Source Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold">Analysis Results</h3>
            <div className="flex items-center gap-2">
              <div className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                aiResult.aiSource.includes('Mock AI') 
                  ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700'
                  : 'bg-green-900/30 text-green-400 border border-green-700'
              }`}>
                <span className="mr-1">
                  {aiResult.aiSource.includes('Mock AI') ? '🧪' : '🤖'}
                </span>
                {aiResult.aiSource}
              </div>
              <button
                onClick={handleCopyResults}
                data-copy-button
                className="px-2 sm:px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm transition-colors font-medium"
                title="Copy all analysis data"
              >
                📋 Copy
              </button>
            </div>
          </div>

          {/* Last Analysis Info */}
          {lastAnalysisInfo && (
            <div className={`p-3 rounded-lg border text-xs ${
              lastAnalysisInfo.isRealAI 
                ? 'bg-green-900/10 border-green-700 text-green-300'
                : 'bg-yellow-900/10 border-yellow-700 text-yellow-300'
            }`}>
              <div className="font-medium mb-1">
                {lastAnalysisInfo.isRealAI ? '🤖 REAL AI ANALYSIS' : '🧪 MOCK AI ANALYSIS'}
              </div>
              <div className="space-y-1">
                <div>Provider: <span className="font-medium">{lastAnalysisInfo.provider}</span></div>
                {lastAnalysisInfo.model && (
                  <div>Model: <span className="font-medium">{lastAnalysisInfo.model}</span></div>
                )}
                <div>Time: <span className="font-medium">{lastAnalysisInfo.timestamp}</span></div>
              </div>
            </div>
          )}
          
          {/* Trading Signal */}
          <div className="border border-gray-700 rounded-lg p-3 sm:p-4">
            <h4 className="font-medium mb-2 text-sm sm:text-base">Trading Signal</h4>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-2">
              <span className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-bold self-start ${
                aiResult.signal.type === 'BUY' ? 'bg-green-600' :
                aiResult.signal.type === 'SELL' ? 'bg-red-600' : 'bg-gray-600'
              }`}>
                {aiResult.signal.type}
              </span>
              <div className="flex gap-4 sm:gap-6">
                <div className="text-left sm:text-right">
                  <div className="text-xs sm:text-sm text-gray-400">Strength</div>
                  <div className="font-bold text-sm sm:text-base">{aiResult.signal.strength}%</div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-xs sm:text-sm text-gray-400">Confidence</div>
                  <div className="font-bold text-sm sm:text-base">{aiResult.signal.confidence}%</div>
                </div>
              </div>
            </div>
            {aiResult.signal.entryPrice && (
              <div className="text-xs sm:text-sm text-gray-400 mt-2">
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <span>Entry: ${aiResult.signal.entryPrice.toFixed(2)}</span>
                  {aiResult.signal.stopLoss && (
                    <span>SL: ${aiResult.signal.stopLoss.toFixed(2)}</span>
                  )}
                  {aiResult.signal.takeProfit && (
                    <span>TP: ${aiResult.signal.takeProfit.toFixed(2)}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Market Sentiment */}
          <div className="border border-gray-700 rounded-lg p-3 sm:p-4">
            <h4 className="font-medium mb-2 text-sm sm:text-base">Market Sentiment</h4>
            <p className="text-xs sm:text-sm text-gray-300">{aiResult.marketSentiment}</p>
          </div>

          {/* AI Reasoning */}
          <div className="border border-gray-700 rounded-lg p-3 sm:p-4">
            <h4 className="font-medium mb-2 text-sm sm:text-base">AI Reasoning</h4>
            <ul className="space-y-1">
              {aiResult.signal.reasoning.map((reason, index) => (
                <li key={index} className="text-xs sm:text-sm text-gray-300 flex items-start">
                  <span className="text-blue-400 mr-2 mt-0.5">•</span>
                  <span className="flex-1">{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Key Factors */}
          <div className="border border-gray-700 rounded-lg p-3 sm:p-4">
            <h4 className="font-medium mb-2 text-sm sm:text-base">Key Factors</h4>
            <ul className="space-y-1">
              {aiResult.keyFactors.map((factor, index) => (
                <li key={index} className="text-xs sm:text-sm text-gray-300 flex items-start">
                  <span className="text-yellow-400 mr-2 mt-0.5">▸</span>
                  <span className="flex-1">{factor}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Risk & Time Horizon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="border border-gray-700 rounded-lg p-2 sm:p-3">
              <h5 className="font-medium text-xs sm:text-sm mb-1">Risk Assessment</h5>
              <p className="text-xs text-gray-300">{aiResult.riskAssessment}</p>
            </div>
            <div className="border border-gray-700 rounded-lg p-2 sm:p-3">
              <h5 className="font-medium text-xs sm:text-sm mb-1">Time Horizon</h5>
              <p className="text-xs text-gray-300">{aiResult.timeHorizon}</p>
            </div>
          </div>

          {/* Confidence Reasoning */}
          <div className="border border-gray-700 rounded-lg p-2 sm:p-3">
            <h5 className="font-medium text-xs sm:text-sm mb-1">Confidence Reasoning</h5>
            <p className="text-xs text-gray-300">{aiResult.confidenceReasoning}</p>
          </div>
        </div>
      )}
    </div>
  );
}