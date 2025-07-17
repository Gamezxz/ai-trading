import { AIProvider, AIResponse, AIProviderConfig } from './base';

export class OllamaProvider extends AIProvider {
  constructor(config: AIProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'http://localhost:11434'
    });
  }

  getName(): string {
    return 'ollama';
  }

  getDisplayName(): string {
    return 'Ollama (FREE Local)';
  }

  isAvailable(): boolean {
    // Ollama doesn't need API key, just needs to be running locally
    return true;
  }

  getDefaultModel(): string {
    return 'llama3.2';
  }

  getSupportedModels(): string[] {
    return [
      'llama3.2',
      'llama3.1',
      'phi3',
      'gemma2',
      'mistral',
      'codellama'
    ];
  }

  isFree(): boolean {
    return true; // Ollama is completely free and local
  }

  getRequiredEnvVars(): string[] {
    return []; // No API key needed
  }

  getSetupInstructions(): string {
    return 'Install Ollama from ollama.ai and run: ollama run llama3.2';
  }

  async analyze(prompt: string): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model || this.getDefaultModel(),
          prompt: prompt,
          stream: false,
          options: {
            temperature: this.config.temperature || 0.3,
            num_predict: this.config.maxTokens || 1024
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Ollama API Error: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      const content = data.response || '';

      return {
        content,
        model: this.config.model || this.getDefaultModel(),
        usage: {
          total_tokens: data.eval_count || content.length
        }
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        throw new Error('Ollama not running. Please install and start Ollama: ollama run llama3.2');
      }
      throw new Error(`Ollama API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}