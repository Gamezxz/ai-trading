import { NextResponse } from 'next/server';
import { AIProviderFactory } from '@/lib/ai-providers/factory';

export async function GET() {
  try {
    const envVars = {
      AI_PROVIDER: process.env.AI_PROVIDER || 'not set',
      GROQ_API_KEY: process.env.GROQ_API_KEY ? `***configured*** (${process.env.GROQ_API_KEY.substring(0, 10)}...)` : 'not set',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? `***configured*** (${process.env.ANTHROPIC_API_KEY.substring(0, 10)}...)` : 'not set',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? `***configured*** (${process.env.OPENAI_API_KEY.substring(0, 10)}...)` : 'not set',
      HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY ? `***configured*** (${process.env.HUGGINGFACE_API_KEY.substring(0, 10)}...)` : 'not set',
      OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'not set',
    };

    console.log('=== DEBUG: Environment Variables ===');
    Object.entries(envVars).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });

    const providerStatuses = await AIProviderFactory.getProviderStatuses();
    const preferredProvider = AIProviderFactory.getPreferredProvider();
    
    console.log('=== DEBUG: Provider Statuses ===');
    providerStatuses.forEach(status => {
      console.log(`${status.name}: available=${status.available}, configured=${status.configured}`);
    });
    
    return NextResponse.json({
      envVars,
      providerStatuses,
      preferredProvider,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Debug failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}