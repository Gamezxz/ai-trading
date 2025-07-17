export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
}

export interface AIProviderConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export abstract class AIProvider {
  protected config: AIProviderConfig;
  
  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  abstract getName(): string;
  abstract getDisplayName(): string;
  abstract isAvailable(): boolean;
  abstract getDefaultModel(): string;
  abstract getSupportedModels(): string[];
  abstract analyze(prompt: string): Promise<AIResponse>;
  abstract getRequiredEnvVars(): string[];
  abstract isFree(): boolean;
  abstract getSetupInstructions(): string;
}

export type AIProviderType = 'claude' | 'openai' | 'groq' | 'huggingface' | 'ollama';

export interface ProviderStatus {
  name: string;
  displayName: string;
  available: boolean;
  configured: boolean;
  isFree: boolean;
  model: string;
  error?: string;
}