import { NextResponse } from 'next/server';
import { AIProviderFactory } from '@/lib/ai-providers/factory';

export async function GET() {
  try {
    const providerStatuses = await AIProviderFactory.getProviderStatuses();
    const preferredProvider = AIProviderFactory.getPreferredProvider();
    
    // Check if any provider is available
    const hasAvailableProvider = providerStatuses.some(p => p.available);
    
    return NextResponse.json({ 
      available: hasAvailableProvider,
      currentProvider: preferredProvider,
      providers: providerStatuses,
      recommendation: getRecommendation(providerStatuses)
    });
  } catch (error) {
    console.error('Error checking AI providers:', error);
    return NextResponse.json({ 
      available: false, 
      error: 'Failed to check AI providers',
      providers: []
    }, { status: 500 });
  }
}

function getRecommendation(providers: Array<{name: string; displayName: string; available: boolean; configured: boolean; isFree: boolean}>) {
  const freeAvailable = providers.filter(p => p.isFree && p.available);
  const freeConfigurable = providers.filter(p => p.isFree && !p.configured);
  
  if (freeAvailable.length > 0) {
    return `Using ${freeAvailable[0].displayName} (FREE)`;
  }
  
  if (freeConfigurable.length > 0) {
    const best = freeConfigurable.find(p => p.name === 'groq') || freeConfigurable[0];
    return `Recommend setting up ${best.displayName} (FREE & Fast)`;
  }
  
  return 'Configure any AI provider to enable real AI analysis';
}