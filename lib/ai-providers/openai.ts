import OpenAI from 'openai';
import { AIProvider, AIResponse, AIProviderConfig } from './base';

export class OpenAIProvider extends AIProvider {
  private client: OpenAI | null = null;

  constructor(config: AIProviderConfig) {
    super(config);
    if (config.apiKey) {
      this.client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      });
    }
  }

  getName(): string {
    return 'openai';
  }

  getDisplayName(): string {
    return 'OpenAI (GPT)';
  }

  isAvailable(): boolean {
    return !!this.client && !!this.config.apiKey;
  }

  getDefaultModel(): string {
    return 'gpt-3.5-turbo';
  }

  getSupportedModels(): string[] {
    return [
      'gpt-3.5-turbo',
      'gpt-4',
      'gpt-4-turbo',
      'gpt-4o',
      'gpt-4o-mini'
    ];
  }

  isFree(): boolean {
    return false; // OpenAI requires paid API
  }

  getRequiredEnvVars(): string[] {
    return ['OPENAI_API_KEY'];
  }

  getSetupInstructions(): string {
    return 'Get API key from platform.openai.com/api-keys';
  }

  async analyze(prompt: string): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: this.config.model || this.getDefaultModel(),
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens || 1024,
        temperature: this.config.temperature || 0.3,
      });

      const content = completion.choices[0]?.message?.content || '';

      return {
        content,
        model: completion.model,
        usage: {
          input_tokens: completion.usage?.prompt_tokens,
          output_tokens: completion.usage?.completion_tokens,
          total_tokens: completion.usage?.total_tokens
        }
      };
    } catch (error) {
      throw new Error(`OpenAI API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}