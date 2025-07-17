'use client';

import { useState, useEffect, useRef } from 'react';
import { useSymbolSearch, BinanceSymbol } from '@/hooks/useSymbolSearch';

export interface TradingPair {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  displayName: string;
}

// Popular trading pairs on Binance (kept for fallback)
export const POPULAR_TRADING_PAIRS: TradingPair[] = [
  {
    symbol: 'BTCUSDT',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    displayName: 'Bitcoin'
  },
  {
    symbol: 'ETHUSDT',
    baseAsset: 'ETH',
    quoteAsset: 'USDT',
    displayName: 'Ethereum'
  },
  {
    symbol: 'BNBUSDT',
    baseAsset: 'BNB',
    quoteAsset: 'USDT',
    displayName: 'BNB'
  },
  {
    symbol: 'ADAUSDT',
    baseAsset: 'ADA',
    quoteAsset: 'USDT',
    displayName: 'Cardano'
  },
  {
    symbol: 'SOLUSDT',
    baseAsset: 'SOL',
    quoteAsset: 'USDT',
    displayName: 'Solana'
  },
  {
    symbol: 'DOGEUSDT',
    baseAsset: 'DOGE',
    quoteAsset: 'USDT',
    displayName: 'Dogecoin'
  },
  {
    symbol: 'MATICUSDT',
    baseAsset: 'MATIC',
    quoteAsset: 'USDT',
    displayName: 'Polygon'
  },
  {
    symbol: 'AVAXUSDT',
    baseAsset: 'AVAX',
    quoteAsset: 'USDT',
    displayName: 'Avalanche'
  },
  {
    symbol: 'DOTUSDT',
    baseAsset: 'DOT',
    quoteAsset: 'USDT',
    displayName: 'Polkadot'
  },
  {
    symbol: 'LTCUSDT',
    baseAsset: 'LTC',
    quoteAsset: 'USDT',
    displayName: 'Litecoin'
  },
  {
    symbol: 'LINKUSDT',
    baseAsset: 'LINK',
    quoteAsset: 'USDT',
    displayName: 'Chainlink'
  },
  {
    symbol: 'UNIUSDT',
    baseAsset: 'UNI',
    quoteAsset: 'USDT',
    displayName: 'Uniswap'
  }
];

interface SymbolSelectorProps {
  currentSymbol: string;
  onSymbolChange: (symbol: string) => void;
  disabled?: boolean;
}

export default function SymbolSelector({ 
  currentSymbol, 
  onSymbolChange, 
  disabled = false 
}: SymbolSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    searchResults,
    isSearching: apiSearching,
    searchError,
    popularSymbols,
    searchSymbols,
    clearSearch
  } = useSymbolSearch();

  // Find current symbol display info
  const getCurrentSymbolDisplay = () => {
    // First try to find in search results or popular symbols
    const found = [...searchResults, ...popularSymbols].find(s => s.symbol === currentSymbol);
    if (found) {
      return found.displayName || `${found.baseAsset}/${found.quoteAsset}`;
    }
    
    // Fallback to popular trading pairs
    const popular = POPULAR_TRADING_PAIRS.find(p => p.symbol === currentSymbol);
    if (popular) {
      return `${popular.baseAsset}/${popular.quoteAsset}`;
    }
    
    // Last resort: just show the symbol
    return currentSymbol;
  };

  // Set placeholder text based on current symbol
  const getPlaceholderText = () => {
    const display = getCurrentSymbolDisplay();
    return isSearching ? 'Search symbols...' : display;
  };

  // Handle input focus
  const handleFocus = () => {
    setShowDropdown(true);
    setIsSearching(true);
    if (searchQuery === '') {
      // Show popular symbols when focused
      searchSymbols('', true);
    }
  };

  // Handle input blur
  const handleBlur = () => {
    // Delay hiding dropdown to allow clicking on items
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setShowDropdown(false);
        if (searchQuery === '') {
          setIsSearching(false);
        }
      }
    }, 150);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSelectedIndex(-1);
    setShowDropdown(true);
    setIsSearching(true);
    searchSymbols(value);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          selectSymbol(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        clearSearchAndHide();
        inputRef.current?.blur();
        break;
    }
  };

  // Select a symbol
  const selectSymbol = (symbol: BinanceSymbol) => {
    onSymbolChange(symbol.symbol);
    clearSearchAndHide();
    inputRef.current?.blur();
  };

  // Clear search and hide dropdown
  const clearSearchAndHide = () => {
    setSearchQuery('');
    setShowDropdown(false);
    setSelectedIndex(-1);
    setIsSearching(false);
    clearSearch();
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        clearSearchAndHide();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  return (
    <div className="flex items-center space-x-1 sm:space-x-2" ref={containerRef}>
      <span className="text-xs sm:text-sm text-gray-400 font-medium hidden sm:inline">Symbol:</span>
      <div className="relative min-w-[120px] sm:min-w-[160px]">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholderText()}
          disabled={disabled}
          className={`
            w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            placeholder-gray-400 hover:bg-gray-700 transition-colors duration-200
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />
        
        {/* Search indicator */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {(apiSearching || isSearching) && searchQuery && (
            <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          )}
          <span className="text-gray-400 text-xs">🔍</span>
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {searchError && (
              <div className="px-3 py-2 text-xs text-red-400 border-b border-gray-700">
                Error: {searchError}
              </div>
            )}
            
            <div ref={dropdownRef}>
              {searchResults.length > 0 ? (
                searchResults.map((symbol, index) => (
                  <button
                    key={symbol.symbol}
                    onClick={() => selectSymbol(symbol)}
                    className={`
                      w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-gray-700 
                      flex items-center justify-between
                      ${index === selectedIndex ? 'bg-gray-700' : ''}
                      ${index === 0 ? 'rounded-t-lg' : ''}
                      ${index === searchResults.length - 1 ? 'rounded-b-lg' : ''}
                    `}
                  >
                    <div>
                      <div className="font-medium text-white">
                        {symbol.baseAsset}/{symbol.quoteAsset}
                      </div>
                      {symbol.displayName && symbol.displayName !== `${symbol.baseAsset}/${symbol.quoteAsset}` && (
                        <div className="text-gray-400 text-xs">
                          {symbol.displayName}
                        </div>
                      )}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {symbol.symbol}
                    </div>
                  </button>
                ))
              ) : !apiSearching ? (
                <div className="px-3 py-2 text-xs text-gray-400">
                  {searchQuery ? 'No symbols found' : 'Start typing to search...'}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
      
      {/* Traditional select as hidden fallback */}
      <select
        value={currentSymbol}
        onChange={(e) => onSymbolChange(e.target.value)}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
      >
        {POPULAR_TRADING_PAIRS.map((pair) => (
          <option
            key={pair.symbol}
            value={pair.symbol}
          >
            {pair.baseAsset}/{pair.quoteAsset}
          </option>
        ))}
      </select>
    </div>
  );
}