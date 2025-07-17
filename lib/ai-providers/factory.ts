import { AIProvider, AIProviderType, AIProviderConfig, ProviderStatus } from './base';
import { ClaudeProvider } from './claude';
import { OpenAIProvider } from './openai';
import { GroqProvider } from './groq';
import { HuggingFaceProvider } from './huggingface';
import { OllamaProvider } from './ollama';

export class AIProviderFactory {
  private static getEnvValue(key: string): string | undefined {
    const value = process.env[key];
    console.log(`ENV CHECK: ${key} = ${value ? '***SET***' : 'NOT SET'}`);
    return value;
  }

  static createProvider(type: AIProviderType, customConfig?: Partial<AIProviderConfig>): AIProvider {
    const baseConfig: AIProviderConfig = {
      apiKey: '',
      maxTokens: 1024,
      temperature: 0.3,
      ...customConfig
    };

    switch (type) {
      case 'claude':
        return new ClaudeProvider({
          ...baseConfig,
          apiKey: customConfig?.apiKey || this.getEnvValue('ANTHROPIC_API_KEY') || '',
          model: customConfig?.model || this.getEnvValue('CLAUDE_MODEL') || 'claude-3-haiku-20240307'
        });

      case 'openai':
        return new OpenAIProvider({
          ...baseConfig,
          apiKey: customConfig?.apiKey || this.getEnvValue('OPENAI_API_KEY') || '',
          model: customConfig?.model || this.getEnvValue('OPENAI_MODEL') || 'gpt-3.5-turbo'
        });

      case 'groq':
        const groqApiKey = customConfig?.apiKey || this.getEnvValue('GROQ_API_KEY') || '';
        console.log(`Creating Groq provider with API key present: ${!!groqApiKey}`);
        return new GroqProvider({
          ...baseConfig,
          apiKey: groqApiKey,
          model: customConfig?.model || this.getEnvValue('GROQ_MODEL') || 'llama3-8b-8192'
        });

      case 'huggingface':
        return new HuggingFaceProvider({
          ...baseConfig,
          apiKey: customConfig?.apiKey || this.getEnvValue('HUGGINGFACE_API_KEY') || '',
          model: customConfig?.model || this.getEnvValue('HUGGINGFACE_MODEL') || 'microsoft/DialoGPT-medium'
        });

      case 'ollama':
        return new OllamaProvider({
          ...baseConfig,
          apiKey: '', // Ollama doesn't need API key
          baseUrl: customConfig?.baseUrl || this.getEnvValue('OLLAMA_BASE_URL') || 'http://localhost:11434',
          model: customConfig?.model || this.getEnvValue('OLLAMA_MODEL') || 'llama3.2'
        });

      default:
        throw new Error(`Unknown AI provider type: ${type}`);
    }
  }

  static getAllProviders(): AIProvider[] {
    const types: AIProviderType[] = ['claude', 'openai', 'groq', 'huggingface', 'ollama'];
    return types.map(type => this.createProvider(type));
  }

  static async getProviderStatuses(): Promise<ProviderStatus[]> {
    const providers = this.getAllProviders();
    const statuses: ProviderStatus[] = [];

    console.log('Checking provider statuses...');

    for (const provider of providers) {
      const requiredEnvVars = provider.getRequiredEnvVars();
      const isConfigured = requiredEnvVars.length === 0 || requiredEnvVars.every(envVar => 
        this.getEnvValue(envVar) !== undefined
      );
      
      console.log(`Provider ${provider.getName()}: required vars ${JSON.stringify(requiredEnvVars)}, configured: ${isConfigured}`);

      let available = false;
      let error: string | undefined;

      try {
        available = provider.isAvailable();
        
        // Special check for Ollama - test if it's actually running
        if (provider.getName() === 'ollama' && available) {
          try {
            await fetch('http://localhost:11434/api/tags', { 
              method: 'GET',
              signal: AbortSignal.timeout(2000) // 2 second timeout
            });
          } catch {
            available = false;
            error = 'Ollama not running locally';
          }
        }
      } catch (e) {
        available = false;
        error = e instanceof Error ? e.message : 'Unknown error';
      }

      statuses.push({
        name: provider.getName(),
        displayName: provider.getDisplayName(),
        available,
        configured: isConfigured,
        isFree: provider.isFree(),
        model: provider.getDefaultModel(),
        error
      });
    }

    return statuses;
  }

  static getDefaultProvider(): AIProviderType {
    // Try to find the best available provider
    const providers = this.getAllProviders();
    
    // Priority order: Free providers first, then paid
    const priorityOrder: AIProviderType[] = ['groq', 'ollama', 'huggingface', 'claude', 'openai'];
    
    for (const type of priorityOrder) {
      const provider = providers.find(p => p.getName() === type);
      if (provider?.isAvailable()) {
        return type;
      }
    }

    // Fallback to first available provider
    const availableProvider = providers.find(p => p.isAvailable());
    return availableProvider?.getName() as AIProviderType || 'groq';
  }

  static getPreferredProvider(): AIProviderType {
    // Check environment variable for preferred provider
    const preferred = this.getEnvValue('AI_PROVIDER') as AIProviderType;
    if (preferred && ['claude', 'openai', 'groq', 'huggingface', 'ollama'].includes(preferred)) {
      // Check if the preferred provider is actually available
      const provider = this.createProvider(preferred);
      if (provider.isAvailable()) {
        console.log(`Using preferred provider from AI_PROVIDER: ${preferred}`);
        return preferred;
      } else {
        console.log(`Preferred provider ${preferred} not available, falling back to auto selection`);
      }
    }
    
    return this.getDefaultProvider();
  }
}