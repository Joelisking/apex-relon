import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIProviderType,
  AIProvider,
  EmailDraft,
  PipelineInsights,
} from './interfaces/provider.interface';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';

@Injectable()
export class AiService {
  private providers: Map<AIProviderType, AIProvider>;
  private defaultProvider: AIProviderType;

  constructor(private config: ConfigService) {
    // Initialize providers
    this.providers = new Map<AIProviderType, AIProvider>([
      [AIProviderType.ANTHROPIC, new AnthropicProvider(config)],
      [AIProviderType.OPENAI, new OpenAIProvider(config)],
      [AIProviderType.GEMINI, new GeminiProvider(config)],
    ]);

    // Set default provider from config
    const configuredDefault = config.get<string>(
      'AI_DEFAULT_PROVIDER'
    );
    this.defaultProvider =
      AIProviderType[
        configuredDefault?.toUpperCase() as keyof typeof AIProviderType
      ] || AIProviderType.OPENAI;

    console.log(
      `✅ AI Service initialized with default provider: ${this.defaultProvider}`
    );
  }

  private getProvider(type?: AIProviderType | string): AIProvider {
    let providerType: AIProviderType;

    if (typeof type === 'string') {
      providerType =
        AIProviderType[
          type.toUpperCase() as keyof typeof AIProviderType
        ] || this.defaultProvider;
    } else {
      providerType = type || this.defaultProvider;
    }

    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`Provider ${providerType} not found`);
    }

    return provider;
  }

  async analyzeLeadRisk(
    lead: Record<string, unknown>,
    provider?: AIProviderType | string
  ) {
    const selectedProvider = this.getProvider(provider);
    return await selectedProvider.analyzeLeadRisk(lead);
  }

  async generateClientHealth(
    client: Record<string, unknown>,
    provider?: AIProviderType | string
  ) {
    const selectedProvider = this.getProvider(provider);
    return await selectedProvider.generateClientHealth(client);
  }

  async generateExecutiveSummary(
    metrics: Record<string, unknown>,
    provider?: AIProviderType | string
  ) {
    const selectedProvider = this.getProvider(provider);
    return await selectedProvider.generateExecutiveSummary(metrics);
  }

  async generateUpsellStrategy(
    client: Record<string, unknown>,
    provider?: AIProviderType | string
  ) {
    const selectedProvider = this.getProvider(provider);
    return await selectedProvider.generateUpsellStrategy(client);
  }

  async chat(
    message: string,
    context: Record<string, unknown>,
    provider?: AIProviderType | string
  ) {
    const selectedProvider = this.getProvider(provider);
    return await selectedProvider.chat(message, context);
  }

  async draftEmail(lead: Record<string, unknown>, emailType: string): Promise<EmailDraft> {
    const provider = this.providers.get(this.defaultProvider) || this.providers.get(AIProviderType.OPENAI)!;
    return provider.draftEmail(lead, emailType);
  }

  async analyzePipeline(data: Record<string, unknown>): Promise<PipelineInsights> {
    const provider = this.providers.get(this.defaultProvider) || this.providers.get(AIProviderType.OPENAI)!;
    return provider.analyzePipeline(data);
  }

  // Get available providers
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  // Get default provider
  getDefaultProvider(): string {
    return this.defaultProvider;
  }
}
