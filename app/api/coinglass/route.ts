import { NextRequest, NextResponse } from 'next/server';
import { getBullMarketPeakIndicators, getMarketSentiment, getSellSignalStrength, getComprehensiveMarketData } from '@/lib/coinglass';

export const runtime = 'edge';

// Simple in-memory cache for production
interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

// Cache TTL in milliseconds - Increased since we're using free APIs
const CACHE_TTL = {
  indicators: 600000,    // 10 minutes for bull market indicators
  sentiment: 300000,     // 5 minutes for sentiment data
  summary: 600000,       // 10 minutes for summary data
  comprehensive: 300000, // 5 minutes for comprehensive data
  binance: 120000,       // 2 minutes for Binance data
  coingecko: 300000,     // 5 minutes for CoinGecko data
};

// Clean up expired cache entries
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      cache.delete(key);
    }
  }
}

// Get cached data or fetch new data
async function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number
): Promise<T> {
  // Clean up expired entries occasionally
  if (Math.random() < 0.1) {
    cleanupCache();
  }

  // Check cache first
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data as T;
  }

  // Fetch fresh data
  try {
    const data = await fetchFn();
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    return data;
  } catch (error) {
    console.error(`Error fetching data for ${key}:`, error);
    
    // Return cached data if available, even if expired
    if (cached) {
      console.log(`Returning stale cache for ${key}`);
      return cached.data as T;
    }
    
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'summary';
    const symbol = searchParams.get('symbol') || 'BTC';

    // Generate request ID for logging
    const requestId = Math.random().toString(36).substring(2, 8);
    console.log(`[${requestId}] CoinGlass API request: ${endpoint} for ${symbol}`);

    const startTime = Date.now();

    let data;

    switch (endpoint) {
      case 'indicators':
        data = await getCachedData(
          'bull-market-indicators',
          () => getBullMarketPeakIndicators(),
          CACHE_TTL.indicators
        );
        break;

      case 'sentiment':
        data = await getCachedData(
          'market-sentiment',
          () => getMarketSentiment(),
          CACHE_TTL.sentiment
        );
        break;

      case 'sell-signal':
        data = await getCachedData(
          'sell-signal-strength',
          () => getSellSignalStrength(),
          CACHE_TTL.sentiment
        );
        break;

      case 'comprehensive':
        data = await getCachedData(
          `comprehensive-market-data-${symbol}`,
          () => getComprehensiveMarketData(symbol),
          CACHE_TTL.comprehensive
        );
        break;

      case 'summary':
      default:
        // Get all data for summary
        const [indicators, sentiment, sellSignal] = await Promise.all([
          getCachedData(
            'bull-market-indicators',
            () => getBullMarketPeakIndicators(),
            CACHE_TTL.indicators
          ),
          getCachedData(
            'market-sentiment',
            () => getMarketSentiment(),
            CACHE_TTL.sentiment
          ),
          getCachedData(
            'sell-signal-strength',
            () => getSellSignalStrength(),
            CACHE_TTL.sentiment
          )
        ]);

        // Try to get comprehensive data, fallback to basic data if failed
        let comprehensiveData;
        try {
          comprehensiveData = await getCachedData(
            `comprehensive-market-data-${symbol}`,
            () => getComprehensiveMarketData(symbol),
            CACHE_TTL.comprehensive
          );
        } catch {
          console.warn(`Comprehensive data unavailable for ${symbol}, using basic data`);
          comprehensiveData = null;
        }

        data = {
          sentiment,
          indicators,
          sell_signal: sellSignal,
          combined_score: Math.round((sentiment.score + indicators.overall_score) / 2),
          comprehensive: comprehensiveData,
          symbol: symbol.toUpperCase(),
          last_updated: new Date().toISOString(),
          data_sources: comprehensiveData?.data_sources || [
            'Alternative.me Fear & Greed Index (Free)',
            'CoinMarketCap Global Metrics (Free)',
            'Derived Market Indicators'
          ]
        };
        break;
    }

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Response completed in ${duration}ms`);

    return NextResponse.json(
      {
        success: true,
        data,
        endpoint,
        cached: cache.has(`${endpoint === 'summary' ? 'bull-market-indicators' : endpoint}`),
        timestamp: new Date().toISOString(),
        request_id: requestId,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, s-maxage=600', // Cache for 5-10 minutes
          'X-Request-ID': requestId,
        },
      }
    );

  } catch (error) {
    console.error('CoinGlass API Error:', error);

    // Return structured error response
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch market data',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
        // Provide fallback data
        fallback_data: {
          sentiment: {
            sentiment: 'neutral',
            score: 65,
            recommendation: 'Data temporarily unavailable. Market appears neutral.',
            fear_greed_index: 73,
            btc_dominance: 63.2,
            last_updated: new Date().toISOString()
          },
          indicators: {
            overall_score: 70,
            overall_status: 'caution',
            indicators: [],
            summary: {
              total_indicators: 0,
              warning_count: 0,
              danger_count: 0,
              hold_recommendation: 'Unable to analyze market conditions at this time'
            },
            last_updated: new Date().toISOString()
          }
        }
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
} 