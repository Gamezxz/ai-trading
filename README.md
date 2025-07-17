# 🚀 BTC Trading Analyzer

A sophisticated Bitcoin trading analysis platform built with Next.js, featuring real-time data visualization, AI-powered market analysis, and comprehensive technical indicators.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38B2AC)
![TradingView](https://img.shields.io/badge/TradingView-Charts-blue)

## ✨ Features

### 📊 Advanced Chart System
- **Professional Trading Charts** powered by TradingView Lightweight Charts
- **15 Timeframes**: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M
- **Multiple Chart Types**: Candlestick and Line charts
- **Real-time Updates** via Binance WebSocket streaming

### 🤖 AI-Powered Analysis
- **Multiple AI Providers**: Groq (Free), Hugging Face (Free), Ollama (Local), Claude, OpenAI + Mock AI fallback
- **Optional Configuration**: Works without setup using Mock AI, enhanced with real AI
- **Clear Provider Indication**: Shows which AI provider is being used
- **Automatic & Manual Analysis**: Auto-triggers on symbol change + manual analyze button
- **Multi-timeframe Support**: Analyze any timeframe independently

### 📈 Technical Indicators
- **Core Indicators**: RSI, MACD, SMA (20/50), EMA (12/26)
- **Bollinger Bands**: Upper, Middle, and Lower bands
- **Support/Resistance**: Calculated from latest 20 candles
- **Volume Analysis**: Advanced volume profile with Point of Control

### 🎯 Price Line Visualization
- **Support Line**: Green solid line showing support levels
- **Resistance Line**: Red solid line showing resistance levels
- **Entry Price**: Blue solid line for AI-recommended entry points
- **Stop Loss**: Red dashed line for risk management
- **Take Profit**: Green dashed line for profit targets

### 📊 Volume Profile
- **Horizontal Volume Bars**: Shows volume distribution across price levels
- **Point of Control (POC)**: Price level with highest volume (gold highlight)
- **Value Area**: 70% of total volume area (dashed lines)
- **Toggle Control**: Easy on/off switch for volume profile visibility

### ⚡ Real-time Features
- **WebSocket Integration**: Binance WebSocket for live data streaming
- **Auto-reconnection**: Automatic reconnection with fallback URLs
- **Connection Status**: Real-time connection status indicator
- **Live Price Updates**: Current price and change percentage

### 📊 Market Signals (100% Free)
- **Bull Market Peak Indicators**: Real-time indicators to detect market tops
- **Hold/Sell Signals**: Intelligent recommendations based on market conditions
- **Individual Indicators**: Fear & Greed Index, Bitcoin Dominance, Market Cap Growth, Altcoin Performance, Volume Analysis
- **Market Sentiment Analysis**: Combined sentiment scoring from multiple free sources
- **Free Data Sources**: Alternative.me Fear & Greed Index, CoinMarketCap Global Metrics
- **No API Keys Required**: All data sources are completely free and public
- **Auto-refresh**: Updates every 10 minutes with manual refresh option
- **Progress Tracking**: Visual progress bars showing how close indicators are to warning/danger levels

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS
- **Charts**: TradingView Lightweight Charts
- **Data Source**: Binance Public API & WebSocket
- **AI Integration**: Browser-based Claude AI
- **Real-time**: WebSocket connections with auto-reconnection
- **Styling**: TailwindCSS with custom components

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/btc-trading-analyzer.git
   cd btc-trading-analyzer
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure AI (Optional)**
   ```bash
   # Copy the environment template (optional - app works without this)
   cp .env.example .env.local
   
   # Edit .env.local and add your API keys
   # Recommended: Get free Groq API key from https://console.groq.com/
   ```

4. **Run development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## ⚙️ Environment Configuration

### AI Provider Setup (Optional)

While the application works without any configuration using mock AI, you can enable real AI analysis by setting up environment variables.

**Recommended: Groq (Free)** 🆓
Groq offers free AI API access, making it the best choice for personal use.

Create a `.env.local` file in the project root:

```bash
# Copy this template to .env.local and fill in your API keys

# Choose which AI provider to use: claude, openai, groq, huggingface, ollama
# Default: auto (uses best available provider)
AI_PROVIDER=auto

# ===== FREE AI PROVIDERS (RECOMMENDED) =====

# 🌟 Groq (FREE & Fast) - Get key from: https://console.groq.com/
GROQ_API_KEY=gsk_your-groq-api-key-here
GROQ_MODEL=llama3-8b-8192

# Hugging Face (FREE) - Get key from: https://huggingface.co/settings/tokens
HUGGINGFACE_API_KEY=hf_your-huggingface-token-here
HUGGINGFACE_MODEL=microsoft/DialoGPT-medium

# Ollama (FREE Local) - No API key needed, just install: https://ollama.ai/
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# ===== PAID AI PROVIDERS =====

# Claude (Anthropic) - Get key from: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
CLAUDE_MODEL=claude-3-haiku-20240307

# OpenAI (GPT) - Get key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-3.5-turbo

# ===== MARKET DATA PROVIDERS =====

# Note: All market data providers below use FREE public APIs
# No API keys required for basic functionality
```

### Getting Free AI (Recommended!)

**Option 1: Groq (Fastest & Free)**
1. Visit [Groq Console](https://console.groq.com/)
2. Sign up for a free account
3. Create a new API key
4. Copy the key to your `.env.local` file

**Option 2: Hugging Face (Free)**
1. Visit [Hugging Face](https://huggingface.co/settings/tokens)
2. Create a free account
3. Generate an access token
4. Copy the token to your `.env.local` file

**Option 3: Ollama (Local & Free)**
1. Install [Ollama](https://ollama.ai/) locally
2. Run `ollama pull llama3.2` to download the model
3. No API key needed - runs on your computer

### AI Provider Priority Order

The application automatically selects the best available provider:

1. **Groq** (if API key provided) - Fast & Free
2. **Hugging Face** (if API key provided) - Free online
3. **Ollama** (if running locally) - Free offline
4. **Claude** (if API key provided) - High quality (paid)
5. **OpenAI** (if API key provided) - GPT models (paid)
6. **Mock AI** (always available) - Fallback using technical analysis

### No Configuration Required

If you don't set up any API keys, the application will:
- ✅ Still work perfectly with all features
- ✅ Use intelligent mock AI based on technical indicators
- ✅ Provide trading signals and analysis
- ✅ Show clear indication that it's using "Mock AI"

## 📖 Usage Guide

### Basic Usage

1. **Select Timeframe**: Choose from 15 available timeframes using the dropdown
2. **Chart Type**: Switch between Candlestick and Line charts
3. **AI Analysis**: Click "Test Analysis" to get AI-powered market insights
4. **Volume Profile**: Toggle volume profile visualization on/off
5. **Real-time Data**: Watch live price updates via WebSocket connection

### AI Analysis

The platform supports two types of AI analysis:

- **Real AI**: Uses configured AI providers (Groq, Hugging Face, Ollama, Claude, OpenAI)
- **Mock AI**: Intelligent fallback using technical indicators

**Setting up Real AI:**
1. Add API keys to `.env.local` (see [Environment Configuration](#️-environment-configuration))
2. **Recommended**: Use Groq, Hugging Face, or Ollama for free AI analysis
3. The app automatically detects and uses available providers

**Analysis Results:**
- Trading signals (BUY/SELL/HOLD)
- Entry/exit price recommendations
- Stop loss and take profit levels
- Confidence levels and reasoning
- Clear indication of AI provider used

### Technical Features

- **Support/Resistance Detection**: Automatically calculated levels
- **Multiple Timeframe Analysis**: Analyze different timeframes independently
- **Real-time Price Lines**: Dynamic visualization of trading levels
- **Volume Analysis**: Professional volume profile with POC

## 🔧 Configuration

### Environment Variables

The application works out-of-the-box without any configuration, but supports optional AI providers:

**Without Configuration:**
- ✅ Binance public API endpoints (no auth required)
- ✅ Mock AI analysis using technical indicators
- ✅ WebSocket connections without authentication

**With AI Configuration (Optional):**
- 🤖 Real AI analysis using Groq, Hugging Face, Ollama, Claude, or OpenAI
- 📊 Enhanced market insights and predictions
- 🎯 More sophisticated trading recommendations

See the [Environment Configuration](#️-environment-configuration) section above for setup details.

### WebSocket Configuration

The application automatically handles WebSocket connections with:
- Primary URL: `wss://stream.binance.com:9443`
- Multiple fallback URLs for reliability
- Automatic reconnection with exponential backoff
- Heartbeat mechanism for connection health

## 🔗 API Endpoints

### Market Signals API (Free)

The application includes a built-in API for market analysis using 100% free data sources:

#### Available Endpoints

**1. Bull Market Peak Indicators**
```
GET /api/coinglass?endpoint=indicators
```
Returns detailed bull market peak indicators using free public APIs.

**2. Market Sentiment**
```
GET /api/coinglass?endpoint=sentiment
```
Returns overall market sentiment (bullish/bearish/neutral) from Fear & Greed Index and BTC Dominance.

**3. Sell Signal Strength**
```
GET /api/coinglass?endpoint=sell-signal
```
Returns sell signal strength analysis (weak/moderate/strong) based on multiple indicators.

**4. Complete Summary (Recommended)**
```
GET /api/coinglass?endpoint=summary
```
Returns all data combined: sentiment, indicators, sell signals, and data sources.

#### Response Format

All endpoints return JSON data from free public sources.

#### Example Response
```json
{
  "success": true,
  "data": {
    "sentiment": {
      "sentiment": "neutral",
      "score": 65,
      "recommendation": "Exercise caution - Multiple indicators showing elevated risk levels"
    },
    "indicators": {
      "overall_score": 65,
      "overall_status": "caution",
      "indicators": [
        {
          "id": "fear_greed",
          "name": "Fear & Greed Index",
          "current_value": 75,
          "target_value": 90,
          "progress": 83.3,
          "status": "warning",
          "description": "High greed levels indicate potential market top"
        }
      ]
    },
    "sell_signal": {
      "strength": "moderate",
      "shouldSell": false,
      "reason": "Moderate risk: 4 warning indicators active"
    }
  },
  "cached": false,
  "timestamp": 1752607431781
}
```

#### Caching
- Bull market indicators: 5 minutes cache
- Sentiment data: 1 minute cache
- Automatic fallback to mock data if CoinGlass API is unavailable

## 📁 Project Structure

```
├── components/           # React components
│   ├── TradingChart.tsx         # Main chart component
│   ├── AIAnalysisPanel.tsx     # AI analysis display
│   ├── TimeframeSelector.tsx   # Timeframe dropdown
│   ├── ChartTypeSelector.tsx   # Chart type toggle
│   ├── VolumeProfileToggle.tsx # Volume profile control
│   └── RealTimePriceIndicator.tsx # Price display
├── lib/                 # Core libraries
│   ├── binance.ts              # Binance API integration
│   ├── websocket.ts            # WebSocket management
│   ├── claude-ai.ts            # AI analysis integration
│   ├── technical-analysis.ts   # Technical indicators
│   ├── ai-analyzer.ts          # Market analysis
│   └── volume-profile-plugin.ts # Volume profile calculation
├── hooks/               # React hooks
│   └── useMarketData.ts        # Data fetching and management
└── app/                 # Next.js app directory
    ├── page.tsx                # Main page
    └── api/                    # API routes
```

## 🐛 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check internet connection
   - The app automatically tries fallback URLs
   - Connection status is shown in the UI

2. **Chart Not Loading**
   - Refresh the page
   - Check browser console for errors
   - Ensure JavaScript is enabled

3. **AI Analysis Not Working**
   - Real AI requires Claude browser integration
   - Falls back to Mock AI automatically
   - Check if Claude is available in your browser

### Development Issues

1. **Build Errors**
   ```bash
   npm run lint
   npm run build
   ```

2. **TypeScript Errors**
   - Check type definitions
   - Ensure all imports are correct
   - Run `npm run build` for full type checking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TradingView](https://www.tradingview.com/) for the excellent Lightweight Charts library
- [Binance](https://www.binance.com/) for providing free public API access
- [CoinGlass](https://www.coinglass.com/) for bull market peak indicators and market sentiment data
- [Groq](https://groq.com/) for free AI API access
- [Hugging Face](https://huggingface.co/) for free AI models and API
- [Ollama](https://ollama.ai/) for local AI model hosting
- [Anthropic](https://www.anthropic.com/) for Claude AI integration
- [OpenAI](https://openai.com/) for GPT API access
- [Next.js](https://nextjs.org/) team for the amazing framework

## 📧 Contact

- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

---

**⚠️ Disclaimer**: This application is for educational and analysis purposes only. It does not provide financial advice and should not be used for actual trading decisions. Always do your own research and consult with financial professionals before making investment decisions.

**Status**: Production Ready ✅  
**Version**: 1.0.0  
**Last Updated**: December 2024