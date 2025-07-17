'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { binanceFetcher, ProcessedCandle, BinanceInterval, TickerData } from '@/lib/binance';
import { AIAnalyzer, MarketAnalysis } from '@/lib/ai-analyzer';
import { generateMockData } from '@/lib/mock-data';
import { createBinanceWebSocket, WebSocketKlineData, WebSocketTickerData } from '@/lib/websocket';
import { TechnicalAnalysis, IndicatorArrays } from '@/lib/technical-analysis';

export function useMarketData() {
  const [candleData, setCandleData] = useState<ProcessedCandle[]>([]);
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [indicatorArrays, setIndicatorArrays] = useState<IndicatorArrays | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [currentTimeframe, setCurrentTimeframe] = useState<BinanceInterval>('1d');
  const [currentSymbol, setCurrentSymbol] = useState<string>('BTCUSDT');
  const [isConnected, setIsConnected] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0);
  const [tickerData, setTickerData] = useState<TickerData | null>(null);
  const [wsError, setWsError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<string>('Not initialized');
  const [lastPriceUpdateTime, setLastPriceUpdateTime] = useState<number>(Date.now());

  const wsRef = useRef<ReturnType<typeof createBinanceWebSocket> | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const lastPriceFetchRef = useRef<number>(0);
  const cacheTimeoutRef = useRef<number>(300000); // 5 minute cache for market data
  const priceCacheTimeoutRef = useRef<number>(30000); // 30 second cache for price data
  const isRefreshingRef = useRef<boolean>(false);
  const isChangingTimeframeRef = useRef<boolean>(false);
  const isChangingSymbolRef = useRef<boolean>(false);
  const lastSyncRef = useRef<number>(0); // Debounce connection state sync
  const isConnectingRef = useRef<boolean>(false); // Prevent multiple connection attempts
  const lastConnectionAttemptRef = useRef<number>(0); // Rate limit connections

  // Fetch initial price and ticker data with caching
  const fetchPriceData = useCallback(async (force = false): Promise<void> => {
    const now = Date.now();
    
    // Check cache - only fetch if forced or cache expired
    if (!force && (now - lastPriceFetchRef.current) < priceCacheTimeoutRef.current) {
      console.log('Skipping price data fetch (cached)');
      return;
    }
    
    try {
      console.log(`Fetching initial price data for ${currentSymbol}...`);
      
      // Fetch 24hr ticker data for current price and changes
      const ticker = await binanceFetcher.fetch24hrTicker(currentSymbol);
      setTickerData(ticker);
      setCurrentPrice(parseFloat(ticker.lastPrice));
      setPriceChange(parseFloat(ticker.priceChange));
      setPriceChangePercent(parseFloat(ticker.priceChangePercent));
      
      // Update cache timestamp
      lastPriceFetchRef.current = now;
      
      console.log('Initial price data fetched:', {
        currentPrice: ticker.lastPrice,
        priceChange: ticker.priceChange,
        priceChangePercent: ticker.priceChangePercent
      });
    } catch (error) {
      console.error('Error fetching initial price data:', error);
      // Set fallback price data to prevent null states
      setCurrentPrice(95000); // Fallback BTC price
      setPriceChange(0);
      setPriceChangePercent(0);
      
      // Don't throw, just log - WebSocket might provide updates later
    }
  }, [currentSymbol]);

  const fetchData = useCallback(async (timeframe?: BinanceInterval, force = false): Promise<void> => {
    try {
      setError(null);
      const intervalToUse = timeframe || currentTimeframe;
      const now = Date.now();
      
      // Only fetch if forced (timeframe change) or if we don't have data yet or cache expired
      if (!force && candleData.length > 0 && (now - lastFetchTimeRef.current) < cacheTimeoutRef.current) {
        console.log('Skipping market data fetch (cached)');
        return;
      }
      
      console.log('Fetching market data for timeframe:', intervalToUse);
      
      // Fetch candlestick data only for AI analysis
      const candles = await binanceFetcher.fetchKlines(currentSymbol, intervalToUse, 100);
      console.log('Candles fetched for AI analysis:', candles.length);
      
      // Update latest candle with current live price if available
      if (candles.length > 0 && currentPrice) {
        const latestCandle = candles[candles.length - 1];
        // Only update if the live price is different and realistic
        if (Math.abs(currentPrice - latestCandle.close) / latestCandle.close < 0.05) { // 5% threshold
          latestCandle.close = currentPrice;
          latestCandle.high = Math.max(latestCandle.high, currentPrice);
          latestCandle.low = Math.min(latestCandle.low, currentPrice);
          console.log('Updated latest candle with live price:', currentPrice);
        }
      }
      
      setCandleData(candles);
      
      // Set current price from latest candle if not already set
      if (candles.length > 0 && !currentPrice) {
        const latestCandle = candles[candles.length - 1];
        setCurrentPrice(latestCandle.close);
        console.log('Current price set from candles:', latestCandle.close);
      }
      
      // Analyze the data
      if (candles.length > 0) {
        const marketAnalysis = AIAnalyzer.analyzeMarket(candles);
        console.log('Analysis completed:', marketAnalysis);
        setAnalysis(marketAnalysis);
        
        // Calculate indicator arrays for AI analysis
        const indicators = TechnicalAnalysis.calculateIndicatorArrays(candles);
        console.log('Indicator arrays calculated for AI:', indicators);
        setIndicatorArrays(indicators);
      }
      
      // Update cache timestamp
      lastFetchTimeRef.current = now;
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
      
      // Use mock data as fallback
      console.log('Using mock data as fallback...');
      const mockCandles = generateMockData();
      setCandleData(mockCandles);
      
      if (mockCandles.length > 0) {
        const marketAnalysis = AIAnalyzer.analyzeMarket(mockCandles);
        setAnalysis(marketAnalysis);
        
        // Calculate indicator arrays for mock data
        const indicators = TechnicalAnalysis.calculateIndicatorArrays(mockCandles);
        setIndicatorArrays(indicators);
      }
      
      setLastUpdate(new Date());
    } finally {
      setIsLoading(false);
    }
  }, [currentSymbol, currentTimeframe, currentPrice, candleData.length]);

  // Stable WebSocket handlers (no deps that change frequently)
  const stableHandleKlineUpdate = useCallback((data: WebSocketKlineData) => {
    console.log('Kline update received:', data);
    
    // Minimal state sync - only when absolutely necessary
    const now = Date.now();
    if ((now - lastSyncRef.current) > 5000) { // Only sync every 5 seconds max
      lastSyncRef.current = now;
      if (wsRef.current?.isConnected() && !isConnected) {
        console.log('[Sync] WebSocket connected but state shows disconnected, fixing...');
        setIsConnected(true);
        setConnectionState('Connected');
      }
    }
    
    // Update latest candle data for analysis purposes
    const currentCandle: ProcessedCandle = {
      time: data.k.t / 1000, // Convert to seconds
      open: parseFloat(data.k.o),
      high: parseFloat(data.k.h),
      low: parseFloat(data.k.l),
      close: parseFloat(data.k.c),
      volume: parseFloat(data.k.v),
    };

    // Update current price for price indicator
    setCurrentPrice(currentCandle.close);
    setLastUpdate(new Date());
    setLastPriceUpdateTime(Date.now());
  }, []); // No dependencies - completely stable

  const stableHandleTickerUpdate = useCallback((data: WebSocketTickerData) => {
    const price = parseFloat(data.c);
    
    // Minimal state sync - only when absolutely necessary
    const now = Date.now();
    if ((now - lastSyncRef.current) > 5000) { // Only sync every 5 seconds max
      lastSyncRef.current = now;
      if (wsRef.current?.isConnected() && !isConnected) {
        console.log('[Sync] WebSocket connected but ticker shows disconnected, fixing...');
        setIsConnected(true);
        setConnectionState('Connected');
      }
    }
    
    // Only update price, don't override 24hr change data unless it's meaningful
    setCurrentPrice(price);
    setLastUpdate(new Date());
    setLastPriceUpdateTime(Date.now());
    
    // Only update change data if it's not zero (real ticker data)
    if (parseFloat(data.p) !== 0 || parseFloat(data.P) !== 0) {
      const change = parseFloat(data.p);
      const changePercent = parseFloat(data.P);
      setPriceChange(change);
      setPriceChangePercent(changePercent);
      
      console.log('Ticker update with 24hr data:', {
        price,
        change,
        changePercent: changePercent.toFixed(2) + '%'
      });
    } else {
      console.log('Price update only:', { price });
    }
  }, []); // No dependencies - completely stable

  const stableHandleConnectionChange = useCallback((connected: boolean) => {
    console.log(`[Connection] State change: ${connected ? 'CONNECTED' : 'DISCONNECTED'}`);
    setIsConnected(connected);
    
    if (!connected) {
      console.log('[Connection] WebSocket disconnected');
      setConnectionState('Disconnected');
    } else {
      console.log('[Connection] WebSocket connected');
      setConnectionState('Connected');
    }
  }, []); // No dependencies - completely stable
  
  const stableHandleWebSocketError = useCallback((error: string) => {
    console.error('WebSocket error received:', error);
    setWsError(error);
    
    // Clear error after 10 seconds
    setTimeout(() => {
      setWsError(null);
    }, 10000);
  }, []); // No dependencies - completely stable

  // Create WebSocket connection with proper rate limiting
  const connectWebSocket = useCallback(() => {
    const now = Date.now();
    
    // Rate limiting: Don't allow connections more than once per 2 seconds
    if ((now - lastConnectionAttemptRef.current) < 2000) {
      console.log('[WebSocket] Rate limited - too frequent connection attempt');
      return;
    }
    
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log('[WebSocket] Already connecting, skipping...');
      return;
    }
    
    console.log('[WebSocket] Creating new connection for', currentSymbol, currentTimeframe);
    isConnectingRef.current = true;
    lastConnectionAttemptRef.current = now;
    
    // Clean up existing WebSocket completely
    if (wsRef.current) {
      console.log('[WebSocket] Cleaning up existing connection...');
      wsRef.current.disconnect();
      wsRef.current = null;
    }
    
    // Wait a bit for cleanup to complete
    setTimeout(() => {
      try {
        wsRef.current = createBinanceWebSocket(currentSymbol, currentTimeframe);
        
        wsRef.current.onKline(stableHandleKlineUpdate);
        wsRef.current.onTicker(stableHandleTickerUpdate);
        wsRef.current.onConnection(stableHandleConnectionChange);
        wsRef.current.onError(stableHandleWebSocketError);
        
        // Connect after setting up handlers
        wsRef.current.connect();
        
        // Update connection state immediately
        setConnectionState('Connecting');
        console.log('[WebSocket] Connection initiated');
      } catch (error) {
        console.error('[WebSocket] Failed to create connection:', error);
        setConnectionState('Error');
      } finally {
        isConnectingRef.current = false;
      }
    }, 100);
  }, [currentSymbol, currentTimeframe, stableHandleKlineUpdate, stableHandleTickerUpdate, stableHandleConnectionChange, stableHandleWebSocketError]);

  // Initialize WebSocket - only when symbol or timeframe actually changes
  useEffect(() => {
    console.log('[WebSocket] Initializing for', currentSymbol, currentTimeframe);
    connectWebSocket();
    
    return () => {
      console.log('[WebSocket] Cleanup on symbol/timeframe change');
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
      isConnectingRef.current = false;
    };
  }, [currentSymbol, currentTimeframe]); // ONLY symbol and timeframe - no function deps

  const changeTimeframe = useCallback(async (newTimeframe: BinanceInterval) => {
    if (newTimeframe === currentTimeframe) {
      console.log('Same timeframe selected, skipping change');
      return;
    }
    
    if (isChangingTimeframeRef.current) {
      console.log('Timeframe change already in progress, skipping...');
      return;
    }
    
    console.log('Changing timeframe from', currentTimeframe, 'to', newTimeframe);
    isChangingTimeframeRef.current = true;
    setCurrentTimeframe(newTimeframe);
    setIsLoading(true);
    setError(null);
    
    try {
      // Force fetch new data for AI analysis
      await fetchData(newTimeframe, true);
      console.log('Timeframe changed successfully to', newTimeframe);
    } catch (err) {
      console.error('Failed to change timeframe:', err);
      setError(err instanceof Error ? err.message : 'Failed to change timeframe');
    } finally {
      isChangingTimeframeRef.current = false;
      setIsLoading(false);
    }
  }, [currentTimeframe, fetchData]);

  const changeSymbol = useCallback(async (newSymbol: string) => {
    if (newSymbol === currentSymbol) {
      console.log('Same symbol selected, skipping change');
      return;
    }
    
    if (isChangingSymbolRef.current) {
      console.log('Symbol change already in progress, skipping...');
      return;
    }
    
    console.log('Changing symbol from', currentSymbol, 'to', newSymbol);
    isChangingSymbolRef.current = true;
    setCurrentSymbol(newSymbol);
    setIsLoading(true);
    setError(null);
    
    // Reset connection state - will be updated when WebSocket reconnects
    setIsConnected(false);
    setConnectionState('Connecting');
    
    // Reset states
    setCandleData([]);
    setAnalysis(null);
    setIndicatorArrays(null);
    setCurrentPrice(null);
    setPriceChange(0);
    setPriceChangePercent(0);
    setTickerData(null);
    
    try {
      // The useEffect will handle WebSocket reconnection automatically
      // Wait a bit for the effect to trigger
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force fetch new data for new symbol
      console.log(`[Symbol Change] Fetching data for ${newSymbol}`);
      await fetchPriceData(true);
      await fetchData(currentTimeframe, true);
      console.log(`[Symbol Change] Successfully changed to ${newSymbol}`);
    } catch (err) {
      console.error('Failed to change symbol:', err);
      setError(err instanceof Error ? err.message : 'Failed to change symbol');
    } finally {
      isChangingSymbolRef.current = false;
      setIsLoading(false);
    }
  }, [currentSymbol, currentTimeframe, fetchData, fetchPriceData]);

  const refreshData = useCallback(async () => {
    if (isRefreshingRef.current) {
      console.log('Refresh already in progress, skipping...');
      return;
    }
    
    console.log('Manual refresh triggered - fetching latest live data');
    isRefreshingRef.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      // Force fetch fresh data and price data sequentially to avoid race conditions
      await fetchPriceData(true);
      await fetchData(undefined, true);
      
      // Update analysis with the latest candleData that includes current live price
      if (candleData.length > 0) {
        const marketAnalysis = AIAnalyzer.analyzeMarket(candleData);
        setAnalysis(marketAnalysis);
        
        // Calculate indicator arrays with latest data
        const indicators = TechnicalAnalysis.calculateIndicatorArrays(candleData);
        setIndicatorArrays(indicators);
        
        console.log('Analysis updated with latest live data');
      }
      
      console.log('Manual refresh completed successfully');
    } catch (err) {
      console.error('Manual refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      isRefreshingRef.current = false;
      setIsLoading(false);
    }
  }, [fetchData, fetchPriceData, candleData]);

  // Initial data fetch - fetch price data first, then market data once
  useEffect(() => {
    const initializeData = async () => {
      console.log('Initializing market data (one-time only)...');
      // Fetch price data first for immediate price display
      await fetchPriceData(true);
      // Then fetch market data once for AI analysis
      fetchData(undefined, true);
    };
    
    initializeData();
  }, []); // Empty deps - only run once on mount

  // Reduced frequency monitoring - much less aggressive
  useEffect(() => {
    const monitoringInterval = setInterval(() => {
      const timeSinceLastPriceUpdate = Date.now() - lastPriceUpdateTime;
      
      // Only check for issues every 2 minutes, and less aggressive actions
      if (timeSinceLastPriceUpdate > 120000) {
        // If no price update for 2 minutes, just fetch price data manually
        // Don't try to reconnect WebSocket automatically as it might cause loops
        if (isConnected) {
          console.log('No price update for 2 minutes, fetching price data manually...');
          fetchPriceData(true).catch(err => {
            console.error('Manual price fetch failed:', err);
          });
        }
      }
    }, 120000); // Check every 2 minutes (much less frequent)

    return () => clearInterval(monitoringInterval);
  }, [isConnected, lastPriceUpdateTime, fetchPriceData]);

  // Re-run analysis when candleData changes
  useEffect(() => {
    if (candleData.length > 0) {
      try {
        const marketAnalysis = AIAnalyzer.analyzeMarket(candleData);
        setAnalysis(marketAnalysis);
        
        // Calculate indicator arrays
        const indicators = TechnicalAnalysis.calculateIndicatorArrays(candleData);
        setIndicatorArrays(indicators);
      } catch (err) {
        console.error('Error analyzing market data:', err);
      }
    }
  }, [candleData]);

  return {
    candleData,
    analysis,
    isLoading,
    error,
    lastUpdate,
    currentTimeframe,
    currentSymbol,
    isConnected,
    currentPrice,
    priceChange,
    priceChangePercent,
    tickerData,
    wsError,
    connectionState,
    indicators: analysis?.indicators || null,
    refreshData,
    changeTimeframe,
    changeSymbol
  };
}