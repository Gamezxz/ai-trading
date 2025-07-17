import { NextRequest, NextResponse } from 'next/server';
import { AIProviderFactory } from '@/lib/ai-providers/factory';
import { AIProviderType } from '@/lib/ai-providers/base';

export async function POST(request: NextRequest) {
  try {
    const { prompt, provider, model } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Determine which provider to use
    const providerType = (provider as AIProviderType) || AIProviderFactory.getPreferredProvider();
    
    console.log(`API Request - Provider requested: ${provider || 'auto'}, Using: ${providerType}`);
    
    // Create the provider instance
    const aiProvider = AIProviderFactory.createProvider(providerType, {
      model: model
    });

    if (!aiProvider.isAvailable()) {
      const envVars = aiProvider.getRequiredEnvVars();
      const setupInstructions = aiProvider.getSetupInstructions();
      
      return NextResponse.json({ 
        error: `${aiProvider.getDisplayName()} not available. ${envVars.length > 0 ? 
          `Required: ${envVars.join(', ')}. ${setupInstructions}` : 
          setupInstructions}`
      }, { status: 503 });
    }

    console.log(`Sending prompt to ${aiProvider.getDisplayName()}...`);
    
    // Call the AI provider
    const result = await aiProvider.analyze(prompt);

    console.log(`Received response from ${aiProvider.getDisplayName()}, length:`, result.content.length);

    return NextResponse.json({ 
      response: result.content,
      model: result.model,
      usage: result.usage,
      provider: {
        name: aiProvider.getName(),
        displayName: aiProvider.getDisplayName(),
        isFree: aiProvider.isFree()
      }
    });

  } catch (error) {
    console.error('Error calling AI provider:', error);
    
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to analyze with AI provider'
    }, { status: 500 });
  }
}