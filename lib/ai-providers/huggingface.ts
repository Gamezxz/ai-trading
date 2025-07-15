import { AIProvider, AIResponse, AIProviderConfig } from './base';

export class HuggingFaceProvider extends AIProvider {
  constructor(config: AIProviderConfig) {
    super(config);
  }

  getName(): string {
    return 'huggingface';
  }

  getDisplayName(): string {
    return 'Hugging Face (FREE)';
  }

  isAvailable(): boolean {
    return !!this.config.apiKey;
  }

  getDefaultModel(): string {
    return 'microsoft/DialoGPT-medium';
  }

  getSupportedModels(): string[] {
    return [
      'microsoft/DialoGPT-medium',
      'microsoft/DialoGPT-large',
      'facebook/blenderbot-400M-distill',
      'microsoft/phi-2'
    ];
  }

  isFree(): boolean {
    return true; // Hugging Face has free tier
  }

  getRequiredEnvVars(): string[] {
    return ['HUGGINGFACE_API_KEY'];
  }

  getSetupInstructions(): string {
    return 'Get FREE API key from huggingface.co/settings/tokens';
  }

  async analyze(prompt: string): Promise<AIResponse> {
    if (!this.config.apiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    try {
      const model = this.config.model || this.getDefaultModel();
      const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: this.config.maxTokens || 512,
            temperature: this.config.temperature || 0.3,
            return_full_text: false
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Hugging Face API Error: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      let content = '';
      if (Array.isArray(data) && data[0]?.generated_text) {
        content = data[0].generated_text;
      } else if (data.generated_text) {
        content = data.generated_text;
      } else {
        content = JSON.stringify(data);
      }

      return {
        content,
        model: model,
        usage: {
          total_tokens: content.length // Approximate token count
        }
      };
    } catch (error) {
      throw new Error(`Hugging Face API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}