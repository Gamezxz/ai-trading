/**
 * Format price with appropriate decimal places based on the value
 * For very small numbers, shows significant digits instead of fixed decimals
 */
export function formatPrice(price: number | null | undefined, options?: {
  currency?: string;
  compact?: boolean;
  maxDecimals?: number;
}): string {
  if (price === null || price === undefined || isNaN(price)) {
    return 'N/A';
  }

  const {
    currency = '$',
    compact = false,
    maxDecimals
  } = options || {};

  const absPrice = Math.abs(price);

  // For very large numbers, use compact notation
  if (compact && absPrice >= 1_000_000) {
    return `${currency}${(price / 1_000_000).toFixed(2)}M`;
  }
  if (compact && absPrice >= 1_000) {
    return `${currency}${(price / 1_000).toFixed(2)}K`;
  }

  // Determine appropriate decimal places based on price magnitude
  let decimals: number;
  
  if (maxDecimals !== undefined) {
    decimals = maxDecimals;
  } else if (absPrice >= 1000) {
    decimals = 2; // $1,234.56
  } else if (absPrice >= 1) {
    decimals = 4; // $1.2345
  } else if (absPrice >= 0.01) {
    decimals = 6; // $0.012345
  } else if (absPrice >= 0.0001) {
    decimals = 8; // $0.00012345
  } else {
    // For very small numbers, use significant digits
    return formatSmallPrice(price, currency);
  }

  const formatted = price.toFixed(decimals);
  
  // Remove trailing zeros after decimal point
  const trimmed = formatted.replace(/\.?0+$/, '');
  
  return `${currency}${trimmed}`;
}

/**
 * Format very small prices with scientific notation or significant digits
 */
function formatSmallPrice(price: number, currency: string): string {
  const absPrice = Math.abs(price);
  
  if (absPrice === 0) {
    return `${currency}0`;
  }
  
  // For extremely small numbers, use scientific notation
  if (absPrice < 0.000001) {
    return `${currency}${price.toExponential(3)}`;
  }
  
  // For small numbers, show first significant digits
  const significantDigits = 6;
  const factor = Math.pow(10, significantDigits - Math.floor(Math.log10(absPrice)) - 1);
  const rounded = Math.round(price * factor) / factor;
  
  // Format with appropriate decimal places to show significant digits
  const decimals = Math.max(0, significantDigits - Math.floor(Math.log10(absPrice)) - 1);
  
  return `${currency}${rounded.toFixed(Math.min(decimals, 12))}`;
}

/**
 * Format percentage with appropriate decimal places
 */
export function formatPercentage(value: number | null | undefined, options?: {
  showSign?: boolean;
  decimals?: number;
}): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  const { showSign = true, decimals = 2 } = options || {};
  const sign = showSign && value > 0 ? '+' : '';
  
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format volume numbers with K/M/B suffixes
 */
export function formatVolume(volume: number | null | undefined): string {
  if (volume === null || volume === undefined || isNaN(volume)) {
    return 'N/A';
  }

  const absVolume = Math.abs(volume);
  
  if (absVolume >= 1_000_000_000) {
    return `${(volume / 1_000_000_000).toFixed(2)}B`;
  } else if (absVolume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(2)}M`;
  } else if (absVolume >= 1_000) {
    return `${(volume / 1_000).toFixed(2)}K`;
  } else {
    return volume.toFixed(0);
  }
}

/**
 * Format technical indicator values appropriately
 */
export function formatIndicator(value: number | null | undefined, type: 'price' | 'percentage' | 'ratio' = 'ratio'): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  switch (type) {
    case 'price':
      return formatPrice(value);
    case 'percentage':
      return formatPercentage(value, { showSign: false });
    case 'ratio':
    default:
      // For ratios like RSI, MACD, etc.
      if (Math.abs(value) >= 100) {
        return value.toFixed(2);
      } else if (Math.abs(value) >= 1) {
        return value.toFixed(4);
      } else {
        return value.toFixed(6);
      }
  }
}

/**
 * Auto-detect price precision for a symbol based on current price
 */
export function getSymbolPricePrecision(price: number): number {
  const absPrice = Math.abs(price);
  
  if (absPrice >= 1000) return 2;
  if (absPrice >= 1) return 4;
  if (absPrice >= 0.01) return 6;
  if (absPrice >= 0.0001) return 8;
  return 10;
} 