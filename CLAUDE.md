# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# BTC Trading Analyzer - Project Context Summary

## Project Overview

BTCUSD Trading Analyzer เป็น Next.js web application ที่ใช้วิเคราะห์การเทรด Bitcoin โดยใช้ข้อมูลจาก Binance API และ AI analysis สำหรับหาจุด entry/exit points (สำหรับการศึกษาเท่านั้น ไม่ทำการเทรดจริง)

## Technical Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS
- **Charts**: TradingView Lightweight Charts
- **Data Source**: Binance Public API & WebSocket
- **AI Integration**: Browser-based Claude AI (window.claude.complete)
- **Real-time**: WebSocket connections with auto-reconnection

## Key Features

### 1. Advanced Chart System

- **TradingView Lightweight Charts** integration
- **15 Timeframes**: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M
- **Default Timeframe**: 1D
- **Chart Types**: Candlestick และ Line charts
- **Real-time Updates**: WebSocket streaming data

### 2. AI Analysis System

- **Dual AI Support**: Real AI (Claude) + Mock AI fallback
- **Browser Integration**: ใช้ window.claude.complete() ไม่ต้อง API keys
- **Clear Source Indication**: แสดงชัดเจนว่าใช้ "Real AI" หรือ "Mock AI"
- **Manual Triggers**: กดปุ่มเพื่อ analyze แทนการทำงานอัตโนมัติ
- **Multiple Timeframe Analysis**: สามารถ analyze timeframe อื่นได้

### 3. Technical Indicators

- **Basic Indicators**: RSI, MACD, SMA (20/50), EMA (12/26)
- **Bollinger Bands**: Upper/Middle/Lower bands
- **Support/Resistance**: คำนวณจาก 20 candles ล่าสุด
- **Volume Analysis**: Volume profile with Point of Control

### 4. Price Line Visualization

- **Support Line**: เส้นเขียวทึบ แสดงระดับ support
- **Resistance Line**: เส้นแดงทึบ แสดงระดับ resistance
- **Entry Price**: เส้นน้ำเงินทึบ แสดงจุด entry ที่ AI แนะนำ
- **Stop Loss**: เส้นแดงประ แสดงจุดตัดขาดทุน
- **Take Profit**: เส้นเขียวประ แสดงจุดเก็บกำไร

### 5. Volume Profile

- **Horizontal Volume Bars**: แสดง volume distribution ตามระดับราคา
- **Point of Control (POC)**: ระดับราคาที่มี volume สูงสุด (สีทอง)
- **Value Area**: พื้นที่ 70% ของ total volume (เส้นประ)
- **Toggle Control**: เปิด/ปิดได้ด้วยปุ่ม toggle

### 6. Real-time Features

- **WebSocket Integration**: Binance WebSocket สำหรับ real-time data
- **Auto-reconnection**: ระบบ reconnect อัตโนมัติพร้อม fallback URLs
- **Connection Status**: แสดงสถานะการเชื่อมต่อ real-time
- **Price Updates**: แสดงราคาปัจจุบันและการเปลี่ยนแปลง

## File Structure

### Components

- `TradingChart.tsx` - หลักของ chart พร้อม TradingView integration
- `AIAnalysisPanel.tsx` - แสดงผล AI analysis และ controls
- `TimeframeSelector.tsx` - Dropdown เลือก timeframe (15 ตัวเลือก)
- `ChartTypeSelector.tsx` - เลือกประเภท chart (candlestick/line)
- `VolumeProfileToggle.tsx` - Toggle เปิด/ปิด volume profile
- `RealTimePriceIndicator.tsx` - แสดงราคาปัจจุบัน

### Libraries

- `binance.ts` - Binance API integration และ data processing
- `websocket.ts` - WebSocket management พร้อม error handling
- `claude-ai.ts` - AI analysis integration (Real + Mock)
- `technical-analysis.ts` - คำนวณ technical indicators
- `ai-analyzer.ts` - Market analysis และ support/resistance detection
- `volume-profile-plugin.ts` - Volume profile calculation และ rendering

### Hooks

- `useMarketData.ts` - จัดการ data fetching, WebSocket, และ analysis

## AI Analysis Details

### Multi-Provider AI Integration

- **Provider Support**: Claude, OpenAI, Groq, Hugging Face, Ollama
- **Backend API**: `/api/ai/analyze` with provider switching
- **Auto Selection**: Automatically uses best available provider
- **Free Options**: Groq (fast), Ollama (local), Hugging Face
- **Paid Options**: Claude (best quality), OpenAI (GPT)

### Mock AI Fallback

- ระบบ AI จำลองที่ใช้ technical indicators
- คำนวณ signals จาก RSI levels (oversold/overbought)
- ใช้เมื่อ Real AI ไม่พร้อมใช้งาน

### Trading Signals

- **Signal Types**: BUY, SELL, HOLD
- **Entry/TP/SL**: คำนวณจากราคาปัจจุบัน (±2%, ±4%)
- **Confidence Levels**: แสดงระดับความมั่นใจของ AI
- **Reasoning**: อธิบายเหตุผลของการ analysis

## WebSocket Implementation

### Connection Management

- **Primary URL**: `wss://stream.binance.com:9443`
- **Fallback URLs**: Multiple backup endpoints
- **Stream Format**: `btcusdt@kline_1d` (ตาม timeframe)
- **Auto-reconnection**: Exponential backoff พร้อม jitter

### Error Handling

- **Timeout Handling**: 10 วินาที connection timeout
- **Ping/Pong**: Heartbeat ทุก 30 วินาที (ตาม Binance requirements)
- **Error Logging**: Detailed error messages และ close codes
- **Graceful Degradation**: Fallback เมื่อ WebSocket fail

## Recent Bug Fixes

### WebSocket Connection Issues

- แก้ไข URL format ให้ตรงกับ Binance documentation
- เปลี่ยนจาก `/ws/streamName` เป็น `/ws/streamName`
- เพิ่ม fallback URLs และ exponential backoff

### Duplicate Timestamp Validation

- เพิ่ม duplicate filtering ใน data processing
- แก้ไข "data must be asc ordered by time" errors
- ปรับปรุง time validation ใน chart component

### Chart Data Ordering

- เพิ่ม data sorting ก่อน setData()
- แก้ไข "Cannot update oldest data" errors
- ปรับปรุง real-time update logic

## Development Commands

```bash
# Development (with Turbopack)
npm run dev

# Build and check for errors
npm run build

# Production
npm start

# Linting and type checking
npm run lint
```

## Critical Architecture Patterns

### Central Data Flow (useMarketData Hook)

The `useMarketData` hook in `hooks/useMarketData.ts` is the central orchestrator managing:
- Initial Binance API data fetching with fallback to mock data
- Real-time WebSocket connection lifecycle
- Technical indicator calculations and AI analysis integration
- Automatic refresh intervals based on timeframe selection

**Key Pattern**: Always use this hook for market data - never directly call Binance API or WebSocket from components.

### WebSocket Implementation (lib/websocket.ts)

**Critical Requirements**:
- Stream format: `wss://stream.binance.com:9443/ws/{symbol}@kline_{interval}`
- Multiple fallback URLs with exponential backoff
- 30-second heartbeat intervals (Binance requirement)
- 10-second connection timeout
- Duplicate timestamp filtering to prevent chart errors

**Error Handling**: Always implement graceful degradation to mock data on WebSocket failures.

### TradingView Chart Integration (components/TradingChart.tsx)

**Critical Data Requirements**:
- Data MUST be sorted ascending by time before calling `setData()`
- Use `update()` for real-time updates, `setData()` for bulk loading
- Implement duplicate filtering to prevent "data must be asc ordered" errors
- Price lines require proper cleanup when switching timeframes

**Chart Stability**: Always validate timestamps and filter duplicates before chart operations.

### AI Integration Patterns (lib/claude-ai.ts)

**Dual System Architecture**:
- Primary: Browser-based `window.claude.complete()` (no API keys needed)
- Fallback: Mock AI using technical indicators
- Always indicate source ("Real AI" vs "Mock AI") in UI
- Structure prompts with market data and technical indicators

**Error Handling**: Implement graceful fallback between Real and Mock AI systems.

### Technical Indicators (lib/technical-analysis.ts)

**Array Processing Patterns**:
- Validate minimum data requirements before calculations
- Use efficient rolling calculations for real-time updates
- Support both single values and time-series arrays
- Handle edge cases for insufficient data gracefully

## Environment Setup

### AI Provider Options

#### 🚀 **Free Providers (Recommended)**

1. **Groq (Fastest & Free)**:
   - Get API key: [console.groq.com](https://console.groq.com/)
   - Models: Llama 3, Mixtral, Gemma
   - Extremely fast inference
   - Add to `.env.local`: `GROQ_API_KEY=gsk_your-key`

2. **Ollama (Local & Free)**:
   - Install: [ollama.ai](https://ollama.ai/)
   - Run: `ollama run llama3.2`
   - No API key needed
   - Completely private and free

3. **Hugging Face (Free)**:
   - Get token: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
   - Add to `.env.local`: `HUGGINGFACE_API_KEY=hf_your-token`

#### 💰 **Paid Providers (Higher Quality)**

1. **Claude (Best Quality)**:
   - Get API key: [console.anthropic.com](https://console.anthropic.com/)
   - Models: Haiku, Sonnet, Opus
   - Add to `.env.local`: `ANTHROPIC_API_KEY=sk-ant-your-key`

2. **OpenAI (GPT)**:
   - Get API key: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Models: GPT-3.5, GPT-4, GPT-4o
   - Add to `.env.local`: `OPENAI_API_KEY=sk-your-key`

### Setup Instructions

1. **Choose Provider** (Recommended: Groq for free fast AI):
   ```bash
   cp .env.example .env.local
   # Edit .env.local and add your chosen provider's API key
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

### API Usage

- **Binance API**: Public API (no keys required)
- **AI Providers**: Configure at least one for real AI analysis
- **Auto Selection**: System picks best available provider
- **Fallback**: Mock AI available when no providers configured

## Future Enhancements

- เพิ่ม technical indicators เพิ่มเติม
- ปรับปรุง Volume Profile visualization
- เพิ่ม historical data analysis
- Backtesting capabilities
- Multi-timeframe analysis

## Important Development Guidelines

### Git Operations
- **Never commit or push** unless explicitly requested by the user
- Always run `npm run lint` and `npm run build` before suggesting commits

### Development Workflow
- User will run `npm run dev` themselves - don't suggest it
- Always check for TypeScript errors with `npm run build`
- Test WebSocket connections thoroughly when making changes to real-time features

### Common Debugging Patterns

**Chart Issues**:
- Check data ordering if seeing "data must be asc ordered" errors
- Verify duplicate filtering in WebSocket data processing
- Ensure proper cleanup of price lines when switching timeframes

**WebSocket Issues**:
- Verify stream format matches Binance API requirements
- Check fallback URL rotation in error cases
- Monitor connection state transitions in browser dev tools

**AI Analysis Issues**:
- Confirm `window.claude.complete()` availability in browser
- Verify Mock AI fallback is working with technical indicators
- Check JSON parsing of AI responses for proper error handling

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Status**: Production Ready
