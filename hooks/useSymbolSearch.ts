'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface BinanceSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
  displayName?: string;
}

export interface SymbolSearchResult {
  query: string;
  results: BinanceSymbol[];
  totalCount: number;
  cached: boolean;
}

export function useSymbolSearch() {
  const [searchResults, setSearchResults] = useState<BinanceSymbol[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [popularSymbols, setPopularSymbols] = useState<BinanceSymbol[]>([]);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchCacheRef = useRef<Map<string, { results: BinanceSymbol[]; timestamp: number }>>(new Map());
  
  const SEARCH_DEBOUNCE_MS = 300;
  const CACHE_TTL_MS = 300000; // 5 minutes
  
  // Search symbols with debouncing
  const searchSymbols = useCallback(async (query: string, immediate = false): Promise<void> => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const performSearch = async () => {
      const trimmedQuery = query.trim();
      
      // Check cache first
      const cacheKey = trimmedQuery.toLowerCase();
      const cached = searchCacheRef.current.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
        console.log('Using cached search results for:', trimmedQuery);
        setSearchResults(cached.results);
        setIsSearching(false);
        return;
      }
      
      if (trimmedQuery.length === 0) {
        setSearchResults(popularSymbols);
        setIsSearching(false);
        return;
      }
      
      setIsSearching(true);
      setSearchError(null);
      
      // Create new abort controller
      abortControllerRef.current = new AbortController();
      
      try {
        const response = await fetch(`/api/binance/symbols?q=${encodeURIComponent(trimmedQuery)}&limit=50`, {
          signal: abortControllerRef.current.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data: SymbolSearchResult = await response.json();
        
        // Cache the results
        searchCacheRef.current.set(cacheKey, {
          results: data.results,
          timestamp: Date.now()
        });
        
        setSearchResults(data.results);
        console.log(`Found ${data.results.length} symbols for query: "${trimmedQuery}"`);
        
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Search request was aborted');
          return;
        }
        
        console.error('Symbol search error:', error);
        setSearchError(error instanceof Error ? error.message : 'Search failed');
        
        // Use popular symbols as fallback
        setSearchResults(popularSymbols);
      } finally {
        setIsSearching(false);
        abortControllerRef.current = null;
      }
    };
    
    if (immediate) {
      performSearch();
    } else {
      searchTimeoutRef.current = setTimeout(performSearch, SEARCH_DEBOUNCE_MS);
    }
  }, [popularSymbols]);
  
  // Load popular symbols on mount
  useEffect(() => {
    const loadPopularSymbols = async () => {
      try {
        console.log('Loading popular symbols...');
        const response = await fetch('/api/binance/symbols?limit=20');
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data: SymbolSearchResult = await response.json();
        setPopularSymbols(data.results);
        setSearchResults(data.results);
        console.log(`Loaded ${data.results.length} popular symbols`);
        
      } catch (error) {
        console.error('Failed to load popular symbols:', error);
        
        // Fallback to hardcoded popular symbols
        const fallbackSymbols: BinanceSymbol[] = [
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
        setPopularSymbols(fallbackSymbols);
        setSearchResults(fallbackSymbols);
      }
    };
    
    loadPopularSymbols();
  }, []);
  
  // Clear search
  const clearSearch = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setSearchResults(popularSymbols);
    setIsSearching(false);
    setSearchError(null);
  }, [popularSymbols]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  return {
    searchResults,
    isSearching,
    searchError,
    popularSymbols,
    searchSymbols,
    clearSearch
  };
} 