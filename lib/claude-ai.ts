import { ProcessedCandle } from './binance';
import { TechnicalIndicators } from './technical-analysis';
import { TradingSignal, MarketAnalysis } from './ai-analyzer';

// Remove the old window.claude declaration as it no longer exists

export interface AIAnalysisResult {
  signal: TradingSignal;
  marketSentiment: string;
  keyFactors: string[];
  riskAssessment: string;
  timeHorizon: string;
  confidenceReasoning: string;
  aiSource: string;
}

export class ClaudeAI {
  static async isAvailable(): Promise<boolean> {
    // Check if we have a Claude API backend endpoint
    try {
      const response = await fetch('/api/ai/check', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Claude AI Backend Status:', data);
        return data.available === true;
      }
    } catch (error) {
      console.log('Claude AI Backend not available:', error);
    }
    
    return false;
  }

  static isInClaudeArtifacts(): boolean {
    // No longer relevant since we're using backend API
    return false;
  }

  static async mockAnalyze(candles: ProcessedCandle[], indicators: TechnicalIndicators, currentLivePrice?: number): Promise<AIAnalysisResult> {
    // Simulate AI thinking time
    await new Promise(resolve => setTimeout(resolve, 2000));

    const currentPrice = currentLivePrice || candles[candles.length - 1].close;
    const rsi = indicators.rsi || 50;
    
    // Generate mock analysis based on technical indicators
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let strength = 50;
    let confidence = 60;
    const reasoning: string[] = [];

    if (rsi < 30) {
      signal = 'BUY';
      strength = 75;
      confidence = 80;
      reasoning.push(`RSI oversold at ${rsi.toFixed(2)} - strong buy signal`);
      reasoning.push('Historical support level nearby');
      reasoning.push('Volume confirms accumulation pattern');
    } else if (rsi > 70) {
      signal = 'SELL';
      strength = 70;
      confidence = 75;
      reasoning.push(`RSI overbought at ${rsi.toFixed(2)} - potential reversal`);
      reasoning.push('Resistance level reached');
      reasoning.push('Profit-taking pressure expected');
    } else {
      reasoning.push('Market in neutral zone - wait for clearer signals');
      reasoning.push('Volume analysis shows indecision');
      reasoning.push('Technical indicators mixed');
    }

    return {
      signal: {
        type: signal,
        strength,
        confidence,
        reasoning,
        entryPrice: currentPrice,
        stopLoss: signal === 'BUY' ? currentPrice * 0.98 : signal === 'SELL' ? currentPrice * 1.02 : currentPrice * 0.99,
        takeProfit: signal === 'BUY' ? currentPrice * 1.04 : signal === 'SELL' ? currentPrice * 0.96 : currentPrice * 1.01
      },
      marketSentiment: signal === 'BUY' ? 'Cautiously optimistic with oversold bounce potential' :
                      signal === 'SELL' ? 'Bearish momentum building, consider profit taking' :
                      'Neutral consolidation phase, waiting for direction',
      keyFactors: [
        `Current RSI: ${rsi.toFixed(2)}`,
        `Price level: $${currentPrice.toFixed(2)}`,
        'Volume profile analysis',
        'Market microstructure signals'
      ],
      riskAssessment: signal === 'HOLD' ? 'Medium risk - unclear direction' :
                     `${signal === 'BUY' ? 'Moderate' : 'Elevated'} risk with defined stop-loss`,
      timeHorizon: 'Short to medium term (1-7 days)',
      confidenceReasoning: `${confidence}% confidence based on ${reasoning.length} confirming factors and current market volatility`,
      aiSource: 'Mock AI'
    };
  }

  static async analyzeMarket(
    candles: ProcessedCandle[], 
    indicators: TechnicalIndicators,
    provider?: string,
    model?: string,
    currentLivePrice?: number
  ): Promise<AIAnalysisResult> {
    const isAvailable = await this.isAvailable();
    
    console.log('Attempting Real AI Analysis:', {
      isAvailable,
      provider: provider || 'auto',
      model: model || 'default',
      currentLivePrice
    });

    if (!isAvailable) {
      throw new Error('AI backend not available. Please configure at least one AI provider.');
    }

    const currentCandle = candles[candles.length - 1];
    const recentCandles = candles.slice(-20); // Increased from 10 to 20
    const shortTermCandles = candles.slice(-50); // Last 50 candles for trend analysis
    
    // Use live price if available, otherwise use candle close price
    const priceToUse = currentLivePrice || currentCandle.close;
    
    const prompt = this.buildAnalysisPrompt(currentCandle, recentCandles, shortTermCandles, indicators, priceToUse);
    
    try {
      console.log('Calling AI backend with prompt length:', prompt.length);
      console.log('Using price for analysis:', priceToUse);
      
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          provider: provider,
          model: model
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`API Error: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('Received AI response:', {
        length: data.response?.length || 0,
        provider: data.provider?.displayName || 'Unknown',
        model: data.model,
        isFree: data.provider?.isFree
      });
      
      const result = this.parseAIResponse(data.response, priceToUse);
      
      // Add provider information to the result
      return {
        ...result,
        aiSource: `${data.provider?.displayName || 'AI'} ${data.provider?.isFree ? '(FREE)' : '(PAID)'}`
      };
    } catch (error) {
      console.error('AI analysis failed:', error);
      
      // Enhanced error message based on error type
      let errorMessage = 'Failed to get AI analysis';
      if (error instanceof Error) {
        if (error.message.includes('authentication') || error.message.includes('auth') || error.message.includes('401')) {
          errorMessage = 'Authentication failed. Please check your API key configuration.';
        } else if (error.message.includes('quota') || error.message.includes('limit') || error.message.includes('429')) {
          errorMessage = 'API quota exceeded. Please try again later.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = `AI analysis error: ${error.message}`;
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  private static buildAnalysisPrompt(
    currentCandle: ProcessedCandle,
    recentCandles: ProcessedCandle[],
    shortTermCandles: ProcessedCandle[],
    indicators: TechnicalIndicators,
    currentLivePrice?: number
  ): string {
    const priceToUse = currentLivePrice || currentCandle.close;
    
    // Calculate additional market context
    const priceChange24h = shortTermCandles.length > 1 ? 
      ((priceToUse - shortTermCandles[0].close) / shortTermCandles[0].close * 100) : 0;
    
    const avgVolume = shortTermCandles.reduce((sum, candle) => sum + candle.volume, 0) / shortTermCandles.length;
    const currentVolumeRatio = currentCandle.volume / avgVolume;
    
    // Calculate support/resistance levels
    const highs = shortTermCandles.map(c => c.high);
    const lows = shortTermCandles.map(c => c.low);
    const resistance = Math.max(...highs);
    const support = Math.min(...lows);
    
    // Price position analysis
    const pricePosition = ((priceToUse - support) / (resistance - support)) * 100;
    
    // MACD analysis
    const macdSignal = indicators.macd.macd && indicators.macd.signal ? 
      (indicators.macd.macd > indicators.macd.signal ? 'BULLISH' : 'BEARISH') : 'NEUTRAL';
    
    // Bollinger position
    const bollPosition = indicators.bollinger.upper && indicators.bollinger.lower ?
      ((priceToUse - indicators.bollinger.lower) / (indicators.bollinger.upper - indicators.bollinger.lower)) * 100 : 50;
    
    // Trend analysis
    const trendDirection = indicators.sma20 && indicators.sma50 ?
      (indicators.sma20 > indicators.sma50 ? 'UPTREND' : 'DOWNTREND') : 'SIDEWAYS';
    
    return `As a professional cryptocurrency trader, analyze the current BTCUSD market conditions and provide trading recommendations.

CURRENT MARKET DATA:
- Current Live Price: $${priceToUse.toFixed(2)}
- 24h Change: ${priceChange24h.toFixed(2)}%
- Current Volume: ${currentCandle.volume.toFixed(0)}
- Volume Ratio (vs 50-period avg): ${currentVolumeRatio.toFixed(2)}x
- High: $${currentCandle.high.toFixed(2)} | Low: $${currentCandle.low.toFixed(2)}

MARKET STRUCTURE:
- Resistance Level: $${resistance.toFixed(2)}
- Support Level: $${support.toFixed(2)}
- Price Position: ${pricePosition.toFixed(1)}% (0%=Support, 100%=Resistance)
- Trend Direction: ${trendDirection}

TECHNICAL INDICATORS:
- RSI: ${indicators.rsi?.toFixed(2) || 'N/A'} ${indicators.rsi ? (indicators.rsi > 70 ? '(OVERBOUGHT)' : indicators.rsi < 30 ? '(OVERSOLD)' : '(NEUTRAL)') : ''}
- MACD: ${indicators.macd.macd?.toFixed(4) || 'N/A'} | Signal: ${indicators.macd.signal?.toFixed(4) || 'N/A'} | Direction: ${macdSignal}
- SMA 20: $${indicators.sma20?.toFixed(2) || 'N/A'} | SMA 50: $${indicators.sma50?.toFixed(2) || 'N/A'}
- EMA 12: $${indicators.ema12?.toFixed(2) || 'N/A'} | EMA 26: $${indicators.ema26?.toFixed(2) || 'N/A'}
- Bollinger Upper: $${indicators.bollinger.upper?.toFixed(2) || 'N/A'} | Lower: $${indicators.bollinger.lower?.toFixed(2) || 'N/A'}
- Bollinger Position: ${bollPosition.toFixed(1)}% ${bollPosition > 80 ? '(NEAR UPPER)' : bollPosition < 20 ? '(NEAR LOWER)' : '(MIDDLE)'}

RECENT PRICE ACTION (Last 20 candles):
${recentCandles.map((candle, i) => {
  const change = i > 0 ? ((candle.close - recentCandles[i-1].close) / recentCandles[i-1].close * 100) : 0;
  return `${i + 1}. Open: $${candle.open.toFixed(2)}, Close: $${candle.close.toFixed(2)}, Vol: ${candle.volume.toFixed(0)}, Change: ${change.toFixed(2)}%`;
}).join('\n')}

VOLUME ANALYSIS:
- Current Volume: ${currentCandle.volume.toFixed(0)}
- Average Volume (50 periods): ${avgVolume.toFixed(0)}
- Volume Trend: ${currentVolumeRatio > 1.5 ? 'HIGH' : currentVolumeRatio < 0.5 ? 'LOW' : 'NORMAL'}

PRICE MOMENTUM:
- Price vs SMA20: ${indicators.sma20 ? ((priceToUse - indicators.sma20) / indicators.sma20 * 100).toFixed(2) : 'N/A'}%
- Price vs SMA50: ${indicators.sma50 ? ((priceToUse - indicators.sma50) / indicators.sma50 * 100).toFixed(2) : 'N/A'}%

Please provide your analysis in the following JSON format (use ONLY numbers for price values, no currency symbols):
{
  "signal": "BUY" | "SELL" | "HOLD",
  "strength": 75,
  "confidence": 80,
  "reasoning": ["reason1", "reason2", "reason3"],
  "entryPrice": ${priceToUse.toFixed(2)},
  "stopLoss": ${priceToUse > 100000 ? (priceToUse * 0.98).toFixed(2) : (priceToUse * 0.97).toFixed(2)},
  "takeProfit": ${priceToUse > 100000 ? (priceToUse * 1.02).toFixed(2) : (priceToUse * 1.03).toFixed(2)},
  "marketSentiment": "Brief sentiment description",
  "keyFactors": ["factor1", "factor2", "factor3"],
  "riskAssessment": "Risk level and explanation",
  "timeHorizon": "Short/Medium/Long term outlook",
  "confidenceReasoning": "Why this confidence level"
}

IMPORTANT: 
- Use CURRENT LIVE PRICE (${priceToUse.toFixed(2)}) as entry price
- Use only numeric values for prices (no $ symbols or commas)
- Calculate stop loss and take profit based on current live price ${priceToUse.toFixed(2)}
- Consider the calculated support (${support.toFixed(2)}) and resistance (${resistance.toFixed(2)}) levels

ANALYSIS PRIORITIES:
1. **Price Position**: Currently at ${pricePosition.toFixed(1)}% between support/resistance
2. **Volume Context**: Volume is ${currentVolumeRatio > 1.5 ? 'HIGH' : currentVolumeRatio < 0.5 ? 'LOW' : 'NORMAL'} (${currentVolumeRatio.toFixed(2)}x average)
3. **RSI Context**: ${indicators.rsi ? (indicators.rsi > 70 ? 'OVERBOUGHT' : indicators.rsi < 30 ? 'OVERSOLD' : 'NEUTRAL') : 'N/A'}
4. **MACD Context**: ${macdSignal} trend
5. **Bollinger Context**: ${bollPosition > 80 ? 'NEAR UPPER BAND' : bollPosition < 20 ? 'NEAR LOWER BAND' : 'MIDDLE RANGE'}
6. **Trend Context**: ${trendDirection}

Focus on:
1. Multi-timeframe confluence analysis
2. Volume-price relationship validation
3. Support/resistance respect or breakout potential
4. Risk-reward optimization based on structural levels
5. Market momentum sustainability
6. Volatility and liquidity considerations

Be specific about entry points, stop losses, and take profit levels based on technical confluence and market structure.`;
  }

  private static parseAIResponse(response: string, currentPrice: number): AIAnalysisResult {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      let jsonString = jsonMatch[0];
      
      // Clean up common JSON formatting issues from AI responses
      jsonString = jsonString
        // Remove dollar signs from numbers
        .replace(/"\$([0-9,.]+)"/g, '"$1"')
        .replace(/\$([0-9,.]+)/g, '$1')
        // Remove commas from numbers
        .replace(/([0-9]),([0-9])/g, '$1$2')
        // Fix common quote issues
        .replace(/'/g, '"')
        // Remove trailing commas
        .replace(/,(\s*[}\]])/g, '$1');

      console.log('Cleaned JSON string:', jsonString);

      const parsed = JSON.parse(jsonString);
      
      // Validate and structure the response
      const signal: TradingSignal = {
        type: parsed.signal || 'HOLD',
        strength: Math.min(100, Math.max(0, parsed.strength || 50)),
        confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
        reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : ['AI analysis completed'],
        entryPrice: parsed.entryPrice || currentPrice,
        stopLoss: parsed.stopLoss || (parsed.signal === 'BUY' ? currentPrice * 0.98 : parsed.signal === 'SELL' ? currentPrice * 1.02 : currentPrice * 0.99),
        takeProfit: parsed.takeProfit || (parsed.signal === 'BUY' ? currentPrice * 1.04 : parsed.signal === 'SELL' ? currentPrice * 0.96 : currentPrice * 1.01)
      };

      return {
        signal,
        marketSentiment: parsed.marketSentiment || 'Neutral market conditions',
        keyFactors: Array.isArray(parsed.keyFactors) ? parsed.keyFactors : ['Technical analysis'],
        riskAssessment: parsed.riskAssessment || 'Moderate risk',
        timeHorizon: parsed.timeHorizon || 'Short term',
        confidenceReasoning: parsed.confidenceReasoning || 'Based on technical indicators',
        aiSource: 'Real AI'
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.error('Original AI response:', response);
      
      // Try to extract any meaningful information from the failed response
      const reasoning = ['AI parsing failed, manual review recommended'];
      let sentiment = 'Unable to determine sentiment';
      
      // Try to extract some basic information even if JSON parsing fails
      if (response.toLowerCase().includes('buy')) {
        reasoning.push('Response suggests buying opportunity');
      } else if (response.toLowerCase().includes('sell')) {
        reasoning.push('Response suggests selling opportunity');
      }
      
      if (response.toLowerCase().includes('bullish')) {
        sentiment = 'Bullish sentiment detected in response';
      } else if (response.toLowerCase().includes('bearish')) {
        sentiment = 'Bearish sentiment detected in response';
      }
      
      // Return fallback analysis with any extracted information
      return {
        signal: {
          type: 'HOLD',
          strength: 50,
          confidence: 30,
          reasoning: reasoning,
          entryPrice: currentPrice,
          stopLoss: currentPrice * 0.98,
          takeProfit: currentPrice * 1.02
        },
        marketSentiment: sentiment,
        keyFactors: ['AI analysis format error', 'Manual review required'],
        riskAssessment: 'High risk - AI response parsing failed',
        timeHorizon: 'Uncertain',
        confidenceReasoning: 'Low confidence due to parsing error',
        aiSource: 'Real AI (Parse Error)'
      };
    }
  }

  static async generateMarketAnalysis(
    candles: ProcessedCandle[],
    indicators: TechnicalIndicators,
    currentTrend: string
  ): Promise<MarketAnalysis> {
    const currentCandle = candles[candles.length - 1];
    
    try {
      const aiResult = await this.analyzeMarket(candles, indicators);
      
      return {
        currentPrice: currentCandle.close,
        trend: currentTrend as 'BULLISH' | 'BEARISH' | 'SIDEWAYS',
        signals: aiResult.signal,
        indicators,
        patterns: [
          `AI Sentiment: ${aiResult.marketSentiment}`,
          `Risk Level: ${aiResult.riskAssessment}`,
          `Time Horizon: ${aiResult.timeHorizon}`
        ],
        support: aiResult.signal.stopLoss || null,
        resistance: aiResult.signal.takeProfit || null
      };
    } catch (error) {
      console.error('AI analysis failed:', error);
      throw error;
    }
  }
}