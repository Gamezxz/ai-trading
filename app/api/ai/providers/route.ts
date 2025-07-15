import { NextResponse } from 'next/server';
import { AIProviderFactory } from '@/lib/ai-providers/factory';

export async function GET() {
  try {
    const providerStatuses = await AIProviderFactory.getProviderStatuses();
    const currentProvider = AIProviderFactory.getPreferredProvider();
    
    return NextResponse.json({ 
      providers: providerStatuses,
      currentProvider,
      recommendation: getDetailedRecommendations(providerStatuses)
    });
  } catch (error) {
    console.error('Error getting AI providers:', error);
    return NextResponse.json({ 
      error: 'Failed to get AI providers',
      providers: []
    }, { status: 500 });
  }
}

function getDetailedRecommendations(providers: Array<{name: string; displayName: string; available: boolean; configured: boolean; isFree: boolean}>) {
  const recommendations = [];
  
  // Recommend free providers first
  const groq = providers.find(p => p.name === 'groq');
  if (groq && !groq.configured) {
    recommendations.push({
      provider: 'groq',
      title: '🚀 Recommended: Groq (FREE & Fast)',
      description: 'Get FREE API key from console.groq.com - extremely fast inference',
      priority: 1,
      isFree: true
    });
  }
  
  const ollama = providers.find(p => p.name === 'ollama');
  if (ollama && !ollama.available) {
    recommendations.push({
      provider: 'ollama',
      title: '💻 Ollama (FREE Local)',
      description: 'Install locally: ollama.ai - completely free, no API key needed',
      priority: 2,
      isFree: true
    });
  }
  
  const huggingface = providers.find(p => p.name === 'huggingface');
  if (huggingface && !huggingface.configured) {
    recommendations.push({
      provider: 'huggingface',
      title: '🤗 Hugging Face (FREE)',
      description: 'Get FREE API key from huggingface.co/settings/tokens',
      priority: 3,
      isFree: true
    });
  }
  
  // Then paid providers
  const claude = providers.find(p => p.name === 'claude');
  if (claude && !claude.configured) {
    recommendations.push({
      provider: 'claude',
      title: '🧠 Claude (Best Quality)',
      description: 'Premium AI from console.anthropic.com - best analysis quality',
      priority: 4,
      isFree: false
    });
  }
  
  const openai = providers.find(p => p.name === 'openai');
  if (openai && !openai.configured) {
    recommendations.push({
      provider: 'openai',
      title: '🤖 OpenAI GPT',
      description: 'Get API key from platform.openai.com/api-keys',
      priority: 5,
      isFree: false
    });
  }
  
  return recommendations.sort((a, b) => a.priority - b.priority);
}