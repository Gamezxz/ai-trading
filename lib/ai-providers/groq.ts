import { AIProvider, AIResponse, AIProviderConfig } from './base';

export class GroqProvider extends AIProvider {
  constructor(config: AIProviderConfig) {
    super(config);
  }

  getName(): string {
    return 'groq';
  }

  getDisplayName(): string {
    return 'Groq (FREE & Fast)';
  }

  isAvailable(): boolean {
    const available = !!this.config.apiKey;
    console.log(`Groq provider availability check: ${available}, API key present: ${!!this.config.apiKey}`);
    return available;
  }

  getDefaultModel(): string {
    return 'llama3-8b-8192';
  }

  getSupportedModels(): string[] {
    return [
      'llama3-8b-8192',
      'llama3-70b-8192',
      'mixtral-8x7b-32768',
      'gemma-7b-it'
    ];
  }

  isFree(): boolean {
    return true; // Groq offers free tier
  }

  getRequiredEnvVars(): string[] {
    return ['GROQ_API_KEY'];
  }

  getSetupInstructions(): string {
    return 'Get FREE API key from console.groq.com';
  }

  async analyze(prompt: string): Promise<AIResponse> {
    if (!this.config.apiKey) {
      throw new Error('Groq API key not configured');
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model || this.getDefaultModel(),
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: this.config.maxTokens || 1024,
          temperature: this.config.temperature || 0.3,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Groq API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      return {
        content,
        model: data.model,
        usage: {
          input_tokens: data.usage?.prompt_tokens,
          output_tokens: data.usage?.completion_tokens,
          total_tokens: data.usage?.total_tokens
        }
      };
    } catch (error) {
      throw new Error(`Groq API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}