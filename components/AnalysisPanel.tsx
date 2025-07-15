'use client';

import { MarketAnalysis } from '@/lib/ai-analyzer';
import { formatPrice, formatIndicator } from '@/lib/formatPrice';
import AIAnalysisPanel from './AIAnalysisPanel';
import { ProcessedCandle, BinanceInterval } from '@/lib/binance';
import { TechnicalIndicators, INDICATOR_PERIODS } from '@/lib/technical-analysis';
import { CandlePatternAnalyzer } from '@/lib/candle-patterns';
import { useState } from 'react';

interface AnalysisPanelProps {
  analysis: MarketAnalysis | null;
  isLoading: boolean;
  useAI?: boolean;
  candles?: ProcessedCandle[];
  indicators?: TechnicalIndicators | null;
  currentTimeframe?: BinanceInterval;
  currentSymbol?: string;
  currentPrice?: number | null;
}

export default function AnalysisPanel({ analysis, isLoading, useAI, candles, indicators, currentTimeframe, currentSymbol = 'BTCUSDT', currentPrice }: AnalysisPanelProps) {
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);

  // Show AI analysis if enabled and data is available
  if (useAI && candles && candles.length > 0) {
    return (
      <AIAnalysisPanel 
        candles={candles} 
        indicators={indicators || null} 
        isLoading={isLoading}
        currentTimeframe={currentTimeframe}
        currentSymbol={currentSymbol}
        currentPrice={currentPrice}
      />
    );
  }
  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <p className="text-gray-400">No analysis available</p>
      </div>
    );
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'BULLISH': return 'text-green-400';
      case 'BEARISH': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const getSignalColor = (type: string) => {
    switch (type) {
      case 'BUY': return 'text-green-400 bg-green-900/20';
      case 'SELL': return 'text-red-400 bg-red-900/20';
      default: return 'text-yellow-400 bg-yellow-900/20';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      {/* Price and Trend */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-white">{currentSymbol.replace('USDT', '/USDT')}</h3>
          <p className="text-2xl font-mono text-white">{formatPrice(analysis.currentPrice)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Market Trend</p>
          <p className={`text-lg font-semibold ${getTrendColor(analysis.trend)}`}>
            {analysis.trend}
          </p>
        </div>
      </div>

      {/* Trading Signal */}
      <div className="border border-gray-700 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-lg font-semibold text-white">Trading Signal</h4>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSignalColor(analysis.signals.type)}`}>
            {analysis.signals.type}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-400">Strength</p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${analysis.signals.strength > 70 ? 'bg-green-500' : 
                  analysis.signals.strength > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${analysis.signals.strength}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 mt-1">{analysis.signals.strength}%</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-400">Confidence</p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${analysis.signals.confidence > 70 ? 'bg-green-500' : 
                  analysis.signals.confidence > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${analysis.signals.confidence}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 mt-1">{analysis.signals.confidence}%</p>
          </div>
        </div>

        {/* Entry/Exit Levels */}
        {analysis.signals.entryPrice && (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Entry</p>
              <p className="text-white font-mono">{formatPrice(analysis.signals.entryPrice)}</p>
            </div>
            {analysis.signals.stopLoss && (
              <div>
                <p className="text-gray-400">Stop Loss</p>
                <p className="text-red-400 font-mono">{formatPrice(analysis.signals.stopLoss)}</p>
              </div>
            )}
            {analysis.signals.takeProfit && (
              <div>
                <p className="text-gray-400">Take Profit</p>
                <p className="text-green-400 font-mono">{formatPrice(analysis.signals.takeProfit)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Analysis Reasoning */}
      <div className="border border-gray-700 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-white mb-3">Analysis Reasoning</h4>
        <ul className="space-y-2">
          {analysis.signals.reasoning.map((reason, index) => (
            <li key={index} className="text-sm text-gray-300 flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              {reason}
            </li>
          ))}
        </ul>
      </div>

      {/* Technical Indicators */}
      <div className="border border-gray-700 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-white mb-3">Technical Indicators</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">RSI ({INDICATOR_PERIODS.RSI})</p>
            <p className="text-white font-mono">
              {formatIndicator(analysis.indicators.rsi, 'ratio')}
            </p>
          </div>
          <div>
            <p className="text-gray-400">SMA ({INDICATOR_PERIODS.SMA_SHORT})</p>
            <p className="text-white font-mono">
              {formatPrice(analysis.indicators.sma20)}
            </p>
          </div>
          <div>
            <p className="text-gray-400">MACD ({INDICATOR_PERIODS.MACD_FAST}/{INDICATOR_PERIODS.MACD_SLOW}/{INDICATOR_PERIODS.MACD_SIGNAL})</p>
            <p className="text-white font-mono">
              {formatIndicator(analysis.indicators.macd.macd, 'ratio')}
            </p>
          </div>
          <div>
            <p className="text-gray-400">BB Upper ({INDICATOR_PERIODS.BB_PERIOD}/{INDICATOR_PERIODS.BB_MULTIPLIER})</p>
            <p className="text-white font-mono">
              {formatPrice(analysis.indicators.bollinger.upper)}
            </p>
          </div>
        </div>
      </div>

      {/* Support/Resistance */}
      {(analysis.support || analysis.resistance) && (
        <div className="border border-gray-700 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-3">Support & Resistance</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Support</p>
              <p className="text-green-400 font-mono">
                {formatPrice(analysis.support)}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Resistance</p>
              <p className="text-red-400 font-mono">
                {formatPrice(analysis.resistance)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Candle Patterns */}
      {candles && candles.length > 0 && (() => {
        const detectedPatterns = CandlePatternAnalyzer.detectPatterns(candles);
        return detectedPatterns.length > 0 && (
          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-3">🕯️ Candle Patterns</h4>
            <div className="space-y-3">
              {detectedPatterns.map((detectedPattern, index) => {
                const pattern = detectedPattern.pattern;
                const isExpanded = expandedPattern === `${pattern.name}-${index}`;
                
                return (
                  <div key={index} className="border border-gray-600 rounded-lg p-3 hover:border-gray-500 transition-colors">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedPattern(isExpanded ? null : `${pattern.name}-${index}`)}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{pattern.icon}</span>
                        <div>
                          <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                            CandlePatternAnalyzer.getPatternTypeColor(pattern.type)
                          }`}>
                            {pattern.name}
                          </span>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-gray-400">
                              {CandlePatternAnalyzer.getReliabilityStars(pattern.reliability)}
                            </span>
                            <span className="text-xs text-gray-400">
                              Confidence: {detectedPattern.confidence}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-gray-400">
                        {isExpanded ? '▼' : '▶'}
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-600 space-y-2">
                        <div>
                          <p className="text-sm text-gray-300 font-medium mb-1">คำอธิบาย:</p>
                          <p className="text-sm text-gray-400">{pattern.description}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-300 font-medium mb-1">ความหมายการเทรด:</p>
                          <p className="text-sm text-gray-400">{pattern.tradingImplication}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-300 font-medium mb-1">เมื่อไหร่ควรเทรด:</p>
                          <p className="text-sm text-gray-400">{pattern.when_to_trade}</p>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2">
                          <div className="text-xs text-gray-500">
                            ระดับความน่าเชื่อถือ: {pattern.reliability}/5
                          </div>
                          <div className={`text-xs px-2 py-1 rounded ${
                            pattern.type === 'BULLISH' ? 'bg-green-900/30 text-green-300' :
                            pattern.type === 'BEARISH' ? 'bg-red-900/30 text-red-300' :
                            'bg-yellow-900/30 text-yellow-300'
                          }`}>
                            {pattern.type}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}