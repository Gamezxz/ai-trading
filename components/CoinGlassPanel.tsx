'use client';

import { useState, useEffect, useCallback } from 'react';
import { BullMarketPeakIndicators, MarketSentiment, SellSignalStrength, isSymbolSupported } from '@/lib/coinglass';

interface CoinGlassPanelProps {
  className?: string;
  symbol?: string;
}

interface ComprehensiveMarketData {
  sentiment: {
    fear_greed_index: number;
    fear_greed_classification: string;
    market_sentiment: string;
  };
  market_data: {
    total_market_cap: number;
    total_volume_24h: number;
    market_cap_change_24h: number;
    active_cryptocurrencies: number;
    btc_dominance: number;
    eth_dominance: number;
  };
  coin_data: {
    symbol: string;
    price: number;
    market_cap: number;
    volume_24h: number;
    price_change_24h: number;
    futures_open_interest: number;
    funding_rate: number;
    mark_price: number;
    next_funding_time: number;
  };
  derivatives: {
    funding_rate: number;
    funding_rate_annual: number;
    open_interest_usd: number;
    oi_change_signal: string;
  };
  trading_metrics: {
    volume_24h_btc: number;
    volume_24h_usd: number;
    price_change_pct: number;
    high_24h: number;
    low_24h: number;
    volatility: number;
  };
  signals: {
    funding_rate_signal: string;
    oi_volume_ratio: number;
    fear_greed_signal: string;
  };
  data_sources: string[];
  last_updated: string;
}

interface CoinGlassData {
  sentiment: MarketSentiment;
  indicators: BullMarketPeakIndicators;
  sell_signal: SellSignalStrength;
  combined_score: number;
  comprehensive?: ComprehensiveMarketData;
  symbol?: string;
  last_updated: string;
  data_sources?: string[];
}

interface ApiResponse {
  success: boolean;
  data?: CoinGlassData;
  fallback_data?: {
    sentiment: MarketSentiment;
    indicators: BullMarketPeakIndicators;
  };
  error?: {
    message: string;
    details: string;
  };
  cached?: boolean;
  request_id?: string;
}

export default function CoinGlassPanel({ className = '', symbol = 'BTC' }: CoinGlassPanelProps) {
  const [data, setData] = useState<CoinGlassData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchCoinGlassData = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      const response = await fetch(`/api/coinglass?endpoint=summary&symbol=${symbol}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result: ApiResponse = await response.json();

      if (result.success && result.data) {
        setData(result.data);
        setLastUpdate(new Date().toLocaleTimeString());
      } else if (result.fallback_data) {
        // Use fallback data if available
        setData({
          sentiment: result.fallback_data.sentiment,
          indicators: result.fallback_data.indicators,
          sell_signal: {
            strength: 'weak',
            shouldSell: false,
            reason: 'Using fallback data',
            confidence: 0,
            last_updated: new Date().toISOString()
          },
          combined_score: 65,
          last_updated: new Date().toISOString(),
          data_sources: ['Fallback Data']
        });
        setError('Using cached data - some features may be limited');
        setLastUpdate(new Date().toLocaleTimeString());
      } else {
        throw new Error(result.error?.message || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('Error fetching CoinGlass data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchCoinGlassData();
    
    // Refresh every 10 minutes
    const interval = setInterval(fetchCoinGlassData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchCoinGlassData]); // Add fetchCoinGlassData to dependency array

  const getStatusColor = (status: string, strength?: string) => {
    if (strength) {
      switch (strength) {
        case 'strong': return 'text-red-400';
        case 'moderate': return 'text-yellow-400';
        case 'weak': return 'text-green-400';
        default: return 'text-gray-400';
      }
    }
    
    switch (status) {
      case 'danger': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'neutral': return 'text-green-400';
      case 'sell': return 'text-red-400';
      case 'caution': return 'text-yellow-400';
      case 'hold': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return '📈';
      case 'bearish': return '📉';
      case 'neutral': return '➡️';
      default: return '❓';
    }
  };

  const getOverallStatusText = (status: string) => {
    switch (status) {
      case 'sell': return 'Consider Selling';
      case 'caution': return 'Exercise Caution';
      case 'hold': return 'Continue Holding';
      default: return 'Unknown';
    }
  };

  const formatLargeNumber = (num: number) => {
    if (!num || typeof num !== 'number' || isNaN(num)) return '0';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const formatFundingRate = (rate: number) => {
    if (!rate || typeof rate !== 'number' || isNaN(rate)) return '0.00%';
    return (rate * 100).toFixed(4) + '%';
  };

  const getSignalColor = (signal: string) => {
    if (!signal) return 'text-gray-400';
    switch (signal.toLowerCase()) {
      case 'buy': return 'text-green-400';
      case 'sell': return 'text-red-400';
      case 'extreme': return 'text-orange-400';
      case 'high': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <h2 className="text-xl font-bold text-white">Loading Market Signals...</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-gray-700 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-red-400">⚠️</span>
          <h2 className="text-xl font-bold text-white">Market Signals Unavailable</h2>
        </div>
        <p className="text-gray-400 mb-4">{error}</p>
        <button
          onClick={fetchCoinGlassData}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Check if symbol is supported
  if (!isSymbolSupported(symbol)) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-2xl">📊</span>
          <div>
            <h2 className="text-xl font-bold text-white">Market Signals - {symbol}</h2>
            <p className="text-sm text-gray-400">CoinGlass Features</p>
          </div>
        </div>
        
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🚫</div>
          <h3 className="text-xl font-semibold text-white mb-2">Symbol Not Supported</h3>
          <p className="text-gray-400 mb-4">
            {symbol} is not supported by CoinGlass features. 
            Enhanced market analysis is only available for selected cryptocurrencies.
          </p>
          
          <div className="bg-gray-700 rounded-lg p-4 text-left">
            <h4 className="font-semibold text-white mb-2">📈 Supported Cryptocurrencies:</h4>
            <div className="text-sm text-gray-300 leading-relaxed">
              <strong>Major:</strong> BTC, ETH, ADA, SOL, MATIC, AVAX, DOT, LINK, UNI, LTC, BCH, XRP<br/>
              <strong>Popular:</strong> DOGE, SHIB, TRX, ATOM, XLM, VET, FIL, THETA, ALGO, XTZ<br/>
              <strong>DeFi:</strong> AAVE, UNI, SUSHI, YFI, MKR, COMP, CRV, SNX<br/>
              <strong>Others:</strong> NEAR, FLOW, ICP, EGLD, HBAR, FTM, ONE, WAVES, BNB, CAKE
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-500">
            💡 Switch to a supported cryptocurrency to access comprehensive market signals, 
            funding rates, open interest data, and enhanced analysis features.
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">📊</span>
          <div>
            <h2 className="text-xl font-bold text-white">Market Signals - {symbol}</h2>
            <p className="text-sm text-gray-400">
              {data.comprehensive ? 'Enhanced' : 'Free'} Analysis • Updated {lastUpdate}
            </p>
          </div>
        </div>
        <button
          onClick={fetchCoinGlassData}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          title="Refresh data"
        >
          🔄
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-yellow-900/50 border border-yellow-500/50 rounded text-yellow-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Overall Status */}
      <div className="mb-6 p-4 bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-white">Overall Assessment</h3>
          <span className={`font-bold ${getStatusColor(data.indicators.overall_status)}`}>
            {getOverallStatusText(data.indicators.overall_status)}
          </span>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <span>Market Score:</span>
            <span className={`font-bold ${getStatusColor(data.indicators.overall_status)}`}>
              {data.combined_score}/100
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span>Sentiment:</span>
            <span className={`font-bold ${getStatusColor(data.sentiment.sentiment)}`}>
              {getSentimentEmoji(data.sentiment.sentiment)} {data.sentiment.sentiment.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700 rounded p-3">
          <div className="text-sm text-gray-400">Fear & Greed</div>
          <div className="text-lg font-bold text-white">
            {data.comprehensive?.sentiment.fear_greed_index || data.sentiment.fear_greed_index}/100
          </div>
          <div className="text-xs text-gray-500">
            {(data.comprehensive?.sentiment.fear_greed_index || data.sentiment.fear_greed_index) > 75 ? 'Extreme Greed' :
             (data.comprehensive?.sentiment.fear_greed_index || data.sentiment.fear_greed_index) > 60 ? 'Greed' :
             (data.comprehensive?.sentiment.fear_greed_index || data.sentiment.fear_greed_index) > 40 ? 'Neutral' :
             (data.comprehensive?.sentiment.fear_greed_index || data.sentiment.fear_greed_index) > 25 ? 'Fear' : 'Extreme Fear'}
          </div>
        </div>
        
        <div className="bg-gray-700 rounded p-3">
          <div className="text-sm text-gray-400">BTC Dominance</div>
          <div className="text-lg font-bold text-white">
            {(data.comprehensive?.market_data.btc_dominance || data.sentiment.btc_dominance).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">
            {(data.comprehensive?.market_data.btc_dominance || data.sentiment.btc_dominance) > 65 ? 'High' :
             (data.comprehensive?.market_data.btc_dominance || data.sentiment.btc_dominance) > 55 ? 'Medium' : 'Low'}
          </div>
        </div>

        {data.comprehensive?.coin_data && data.comprehensive?.derivatives && (
          <>
            <div className="bg-gray-700 rounded p-3">
              <div className="text-sm text-gray-400">{symbol} Price</div>
              <div className="text-lg font-bold text-white">
                ${data.comprehensive.coin_data.price?.toLocaleString() || 'N/A'}
              </div>
              <div className={`text-xs ${(data.comprehensive.coin_data.price_change_24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(data.comprehensive.coin_data.price_change_24h || 0) >= 0 ? '+' : ''}{(data.comprehensive.coin_data.price_change_24h || 0).toFixed(2)}%
              </div>
            </div>
            
            <div className="bg-gray-700 rounded p-3">
              <div className="text-sm text-gray-400">Funding Rate</div>
              <div className={`text-lg font-bold ${(data.comprehensive.derivatives.funding_rate || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatFundingRate(data.comprehensive.derivatives.funding_rate || 0)}
              </div>
              <div className="text-xs text-gray-500">
                Annual: {formatFundingRate(data.comprehensive.derivatives.funding_rate_annual || 0)}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sell Signal */}
      <div className="mb-6 p-4 bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-white">Sell Signal</h3>
          <span className={`font-bold ${getStatusColor('', data.sell_signal.strength)}`}>
            {data.sell_signal.strength.toUpperCase()}
          </span>
        </div>
        <p className="text-sm text-gray-300 mb-2">{data.sell_signal.reason}</p>
        {data.sell_signal.shouldSell && (
          <div className="text-sm bg-red-900/50 border border-red-500/50 rounded p-2 text-red-400">
            ⚠️ Sell signals detected - Consider taking profits
          </div>
        )}
      </div>

      {/* Individual Indicators */}
      <div className="mb-6">
        <h3 className="font-semibold text-white mb-3">Market Indicators</h3>
        <div className="space-y-3">
          {data.indicators.indicators.map((indicator) => (
            <div key={indicator.id} className="bg-gray-700 rounded p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">{indicator.name}</span>
                <span className={`text-xs font-bold ${getStatusColor(indicator.status)}`}>
                  {indicator.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{indicator.description}</span>
                <span>{Math.round(indicator.progress)}%</span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-1.5 mt-2">
                <div
                  className={`h-1.5 rounded-full ${
                    indicator.status === 'danger' ? 'bg-red-400' :
                    indicator.status === 'warning' ? 'bg-yellow-400' : 'bg-green-400'
                  }`}
                  style={{ width: `${Math.min(indicator.progress, 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comprehensive Market Data */}
      {data.comprehensive?.market_data && (
        <>
          {/* Market Overview */}
          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <h3 className="font-semibold text-white mb-4">📊 Market Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-gray-600 rounded p-2">
                <div className="text-gray-400">Total Market Cap</div>
                <div className="text-white font-bold">${formatLargeNumber(data.comprehensive.market_data.total_market_cap || 0)}</div>
                <div className={`text-xs ${(data.comprehensive.market_data.market_cap_change_24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(data.comprehensive.market_data.market_cap_change_24h || 0) >= 0 ? '+' : ''}{(data.comprehensive.market_data.market_cap_change_24h || 0).toFixed(2)}%
                </div>
              </div>
              <div className="bg-gray-600 rounded p-2">
                <div className="text-gray-400">24h Volume</div>
                <div className="text-white font-bold">${formatLargeNumber(data.comprehensive.market_data.total_volume_24h || 0)}</div>
              </div>
              <div className="bg-gray-600 rounded p-2">
                <div className="text-gray-400">Active Coins</div>
                <div className="text-white font-bold">{(data.comprehensive.market_data.active_cryptocurrencies || 0).toLocaleString()}</div>
              </div>
              <div className="bg-gray-600 rounded p-2">
                <div className="text-gray-400">ETH Dominance</div>
                <div className="text-white font-bold">{(data.comprehensive.market_data.eth_dominance || 0).toFixed(1)}%</div>
              </div>
            </div>
          </div>

          {/* Bitcoin Derivatives Data */}
          {data.comprehensive?.derivatives && data.comprehensive?.signals && (
            <div className="mb-6 p-4 bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-white mb-4">⚡ Bitcoin Derivatives</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-600 rounded">
                    <span className="text-gray-300">Open Interest:</span>
                    <div className="text-right">
                      <div className="text-white font-bold">${formatLargeNumber(data.comprehensive.derivatives.open_interest_usd || 0)}</div>
                      <div className={`text-xs ${getSignalColor(data.comprehensive.derivatives.oi_change_signal || '')}`}>
                        {(data.comprehensive.derivatives.oi_change_signal || 'NORMAL').toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-600 rounded">
                    <span className="text-gray-300">Funding Rate:</span>
                    <div className="text-right">
                      <div className={`font-bold ${(data.comprehensive.derivatives.funding_rate || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatFundingRate(data.comprehensive.derivatives.funding_rate || 0)}
                      </div>
                      <div className={`text-xs ${getSignalColor(data.comprehensive.signals.funding_rate_signal || '')}`}>
                        {(data.comprehensive.signals.funding_rate_signal || 'NORMAL').toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-600 rounded">
                    <span className="text-gray-300">Annual Funding:</span>
                    <div className={`font-bold ${(data.comprehensive.derivatives.funding_rate_annual || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatFundingRate(data.comprehensive.derivatives.funding_rate_annual || 0)}
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-600 rounded">
                    <span className="text-gray-300">OI/Volume Ratio:</span>
                    <div className="text-white font-bold">
                      {(data.comprehensive.signals.oi_volume_ratio || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
              {data.comprehensive?.coin_data?.next_funding_time && (
                <div className="mt-3 text-xs text-gray-400">
                  Next funding: {new Date(data.comprehensive.coin_data.next_funding_time).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}

          {/* Trading Metrics */}
          {data.comprehensive?.trading_metrics && (
            <div className="mb-6 p-4 bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-white mb-4">📈 Trading Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="bg-gray-600 rounded p-2">
                  <div className="text-gray-400">24h High</div>
                  <div className="text-white font-bold">${(data.comprehensive.trading_metrics.high_24h || 0).toLocaleString()}</div>
                </div>
                <div className="bg-gray-600 rounded p-2">
                  <div className="text-gray-400">24h Low</div>
                  <div className="text-white font-bold">${(data.comprehensive.trading_metrics.low_24h || 0).toLocaleString()}</div>
                </div>
                <div className="bg-gray-600 rounded p-2">
                  <div className="text-gray-400">Volatility</div>
                  <div className="text-white font-bold">{(data.comprehensive.trading_metrics.volatility || 0).toFixed(2)}%</div>
                </div>
                <div className="bg-gray-600 rounded p-2">
                  <div className="text-gray-400">BTC Volume</div>
                  <div className="text-white font-bold">{formatLargeNumber(data.comprehensive.trading_metrics.volume_24h_btc || 0)} BTC</div>
                </div>
                <div className="bg-gray-600 rounded p-2">
                  <div className="text-gray-400">USD Volume</div>
                  <div className="text-white font-bold">${formatLargeNumber(data.comprehensive.trading_metrics.volume_24h_usd || 0)}</div>
                </div>
                <div className="bg-gray-600 rounded p-2">
                  <div className="text-gray-400">Price Change</div>
                  <div className={`font-bold ${(data.comprehensive.trading_metrics.price_change_pct || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(data.comprehensive.trading_metrics.price_change_pct || 0) >= 0 ? '+' : ''}{(data.comprehensive.trading_metrics.price_change_pct || 0).toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Market Signals */}
          {data.comprehensive?.signals && data.comprehensive?.sentiment && (
            <div className="mb-6 p-4 bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-white mb-4">🚦 Market Signals</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-gray-600 rounded p-3 text-center">
                  <div className="text-gray-400 text-sm">Fear & Greed Signal</div>
                  <div className={`font-bold text-lg ${getSignalColor(data.comprehensive.signals.fear_greed_signal || '')}`}>
                    {(data.comprehensive.signals.fear_greed_signal || 'NEUTRAL').toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-400">
                    {data.comprehensive.sentiment.fear_greed_classification || 'N/A'}
                  </div>
                </div>
                <div className="bg-gray-600 rounded p-3 text-center">
                  <div className="text-gray-400 text-sm">Funding Rate Signal</div>
                  <div className={`font-bold text-lg ${getSignalColor(data.comprehensive.signals.funding_rate_signal || '')}`}>
                    {(data.comprehensive.signals.funding_rate_signal || 'NORMAL').toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-400">
                    {Math.abs(data.comprehensive.derivatives?.funding_rate || 0) > 0.0005 ? 'Extreme Rate' : 'Normal Rate'}
                  </div>
                </div>
                <div className="bg-gray-600 rounded p-3 text-center">
                  <div className="text-gray-400 text-sm">Open Interest</div>
                  <div className={`font-bold text-lg ${getSignalColor(data.comprehensive.derivatives?.oi_change_signal || '')}`}>
                    {(data.comprehensive.derivatives?.oi_change_signal || 'NORMAL').toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-400">
                    ${formatLargeNumber(data.comprehensive.derivatives?.open_interest_usd || 0)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Recommendation */}
      <div className="p-4 bg-blue-900/50 border border-blue-500/50 rounded-lg">
        <h3 className="font-semibold text-white mb-2">💡 Recommendation</h3>
        <p className="text-sm text-blue-300">{data.indicators.summary.hold_recommendation}</p>
      </div>

      {/* Data Sources */}
      {data.data_sources && (
        <div className="mt-4 text-xs text-gray-500">
          <div className="font-medium mb-1">Data Sources:</div>
          <ul className="list-disc list-inside space-y-1">
            {data.data_sources.map((source, index) => (
              <li key={index}>{source}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 