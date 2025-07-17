import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AIResponse, AIProviderConfig } from './base';

export class ClaudeProvider extends AIProvider {
  private client: Anthropic | null = null;

  constructor(config: AIProviderConfig) {
    super(config);
    if (config.apiKey) {
      this.client = new Anthropic({
        apiKey: config.apiKey,
      });
    }
  }

  getName(): string {
    return 'claude';
  }

  getDisplayName(): string {
    return 'Claude (Anthropic)';
  }

  isAvailable(): boolean {
    return !!this.client && !!this.config.apiKey;
  }

  getDefaultModel(): string {
    return 'claude-3-haiku-20240307';
  }

  getSupportedModels(): string[] {
    return [
      'claude-3-haiku-20240307',
      'claude-3-sonnet-20240229',
      'claude-3-opus-20240229'
    ];
  }

  isFree(): boolean {
    return false; // Claude requires paid API
  }

  getRequiredEnvVars(): string[] {
    return ['ANTHROPIC_API_KEY'];
  }

  getSetupInstructions(): string {
    return 'Get API key from console.anthropic.com';
  }

  async analyze(prompt: string): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('Claude client not initialized');
    }

    try {
      const message = await this.client.messages.create({
        model: this.config.model || this.getDefaultModel(),
        max_tokens: this.config.maxTokens || 1024,
        temperature: this.config.temperature || 0.3,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = message.content
        .filter(content => content.type === 'text')
        .map(content => content.text)
        .join('');

      return {
        content,
        model: this.config.model || this.getDefaultModel(),
        usage: {
          input_tokens: message.usage?.input_tokens,
          output_tokens: message.usage?.output_tokens,
          total_tokens: (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0)
        }
      };
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new Error(`Claude API Error: ${error.message}`);
      }
      throw error;
    }
  }
}