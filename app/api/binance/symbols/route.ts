import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Cache for symbol data
interface SymbolCacheEntry {
  data: BinanceSymbol[];
  timestamp: number;
  ttl: number;
}

interface BinanceSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
  displayName?: string;
}

interface ExchangeInfo {
  symbols: BinanceSymbol[];
}

const symbolCache = new Map<string, SymbolCacheEntry>();
const SYMBOL_CACHE_TTL = 1800000; // 30 minutes cache for symbol list

// Get all symbols from Binance Exchange Info
async function getAllSymbols(): Promise<BinanceSymbol[]> {
  const cacheKey = 'all_symbols';
  
  // Check cache first
  const cached = symbolCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
    return cached.data;
  }
  
  console.log('Fetching symbols from Binance Exchange Info...');
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
  
  try {
    const response = await fetch('https://api.binance.com/api/v3/exchangeInfo', {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; BTC-Trading-Analyzer/1.0)',
      },
      cache: 'no-store',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data: ExchangeInfo = await response.json();
    
    // Filter only active trading symbols and add display names
    const activeSymbols = data.symbols
      .filter(symbol => symbol.status === 'TRADING')
      .map(symbol => ({
        ...symbol,
        displayName: `${symbol.baseAsset}/${symbol.quoteAsset}`
      }));
    
    // Cache the results
    symbolCache.set(cacheKey, {
      data: activeSymbols,
      timestamp: Date.now(),
      ttl: SYMBOL_CACHE_TTL
    });
    
    console.log(`Fetched ${activeSymbols.length} active symbols`);
    return activeSymbols;
    
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Failed to fetch symbols from Binance:', error);
    
    // Return popular symbols as fallback
    return [
      { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', status: 'TRADING', displayName: 'Bitcoin/USDT' },
      { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', status: 'TRADING', displayName: 'Ethereum/USDT' },
      { symbol: 'BNBUSDT', baseAsset: 'BNB', quoteAsset: 'USDT', status: 'TRADING', displayName: 'BNB/USDT' },
      { symbol: 'ADAUSDT', baseAsset: 'ADA', quoteAsset: 'USDT', status: 'TRADING', displayName: 'Cardano/USDT' },
      { symbol: 'SOLUSDT', baseAsset: 'SOL', quoteAsset: 'USDT', status: 'TRADING', displayName: 'Solana/USDT' },
      { symbol: 'DOGEUSDT', baseAsset: 'DOGE', quoteAsset: 'USDT', status: 'TRADING', displayName: 'Dogecoin/USDT' },
      { symbol: 'MATICUSDT', baseAsset: 'MATIC', quoteAsset: 'USDT', status: 'TRADING', displayName: 'Polygon/USDT' },
      { symbol: 'AVAXUSDT', baseAsset: 'AVAX', quoteAsset: 'USDT', status: 'TRADING', displayName: 'Avalanche/USDT' },
      { symbol: 'DOTUSDT', baseAsset: 'DOT', quoteAsset: 'USDT', status: 'TRADING', displayName: 'Polkadot/USDT' },
      { symbol: 'LTCUSDT', baseAsset: 'LTC', quoteAsset: 'USDT', status: 'TRADING', displayName: 'Litecoin/USDT' }
    ];
  }
}

// Search symbols based on query
function searchSymbols(symbols: BinanceSymbol[], query: string, limit: number = 50): BinanceSymbol[] {
  if (!query || query.length < 1) {
    // Return popular USDT pairs when no query
    return symbols
      .filter(s => s.quoteAsset === 'USDT')
      .slice(0, limit);
  }
  
  const normalizedQuery = query.toUpperCase();
  
  // Exact matches first
  const exactMatches = symbols.filter(symbol => 
    symbol.symbol === normalizedQuery ||
    symbol.baseAsset === normalizedQuery ||
    `${symbol.baseAsset}${symbol.quoteAsset}` === normalizedQuery
  );
  
  // Partial matches
  const partialMatches = symbols.filter(symbol => 
    !exactMatches.includes(symbol) && (
      symbol.symbol.includes(normalizedQuery) ||
      symbol.baseAsset.includes(normalizedQuery) ||
      symbol.quoteAsset.includes(normalizedQuery) ||
      (symbol.displayName && symbol.displayName.toUpperCase().includes(normalizedQuery))
    )
  );
  
  // Combine results, prioritize USDT pairs
  const allMatches = [...exactMatches, ...partialMatches];
  const usdtMatches = allMatches.filter(s => s.quoteAsset === 'USDT');
  const otherMatches = allMatches.filter(s => s.quoteAsset !== 'USDT');
  
  return [...usdtMatches, ...otherMatches].slice(0, limit);
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  
  console.log(`[${new Date().toISOString()}] Symbol Search Request:`, {
    query,
    limit,
    userAgent: request.headers.get('user-agent')
  });
  
  try {
    // Get all symbols (from cache or API)
    const allSymbols = await getAllSymbols();
    
    // Search and filter symbols
    const searchResults = searchSymbols(allSymbols, query, limit);
    
    const responseTime = Date.now() - startTime;
    
    console.log(`[${new Date().toISOString()}] Symbol Search Success:`, {
      query,
      resultsCount: searchResults.length,
      responseTime: `${responseTime}ms`
    });
    
    return NextResponse.json({
      query,
      results: searchResults,
      totalCount: searchResults.length,
      cached: symbolCache.has('all_symbols')
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-Response-Time': `${responseTime}ms`
      },
    });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      query,
      limit,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    };
    
    console.error(`[${new Date().toISOString()}] Symbol Search Error:`, errorDetails);
    
    return NextResponse.json(
      { 
        error: 'Failed to search symbols',
        details: errorDetails
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'X-Error-Time': `${responseTime}ms`
        }
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 