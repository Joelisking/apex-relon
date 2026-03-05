import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
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

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.providers = new Map<AIProviderType, AIProvider>([
      [AIProviderType.ANTHROPIC, new AnthropicProvider(config)],
      [AIProviderType.OPENAI, new OpenAIProvider(config)],
      [AIProviderType.GEMINI, new GeminiProvider(config)],
    ]);

    const configuredDefault = config.get<string>('AI_DEFAULT_PROVIDER');
    this.defaultProvider =
      AIProviderType[
        configuredDefault?.toUpperCase() as keyof typeof AIProviderType
      ] || AIProviderType.OPENAI;

    console.log(
      `✅ AI Service initialized with default provider: ${this.defaultProvider}`,
    );
  }

  /**
   * Resolve the effective provider for a feature.
   * Priority: explicit arg → DB feature override → DB default → env default → openai
   */
  private async getEffectiveProvider(
    feature: 'leadRisk' | 'clientHealth' | 'executiveSummary' | 'chat' | null,
    explicit?: string,
  ): Promise<AIProvider> {
    if (explicit) {
      return this.resolveProvider(explicit);
    }

    try {
      const settings = await this.prisma.aISettings.findFirst({
        select: {
          defaultProvider: true,
          leadRiskProvider: true,
          clientHealthProvider: true,
          executiveSummaryProvider: true,
          chatProvider: true,
        },
      });

      if (settings) {
        const featureField: Record<string, string | null | undefined> = {
          leadRisk: settings.leadRiskProvider,
          clientHealth: settings.clientHealthProvider,
          executiveSummary: settings.executiveSummaryProvider,
          chat: settings.chatProvider,
        };

        const featureOverride = feature ? featureField[feature] : null;
        const resolved = featureOverride || settings.defaultProvider;

        if (resolved) {
          return this.resolveProvider(resolved);
        }
      }
    } catch {
      // Fall through to env default
    }

    return this.providers.get(this.defaultProvider)!;
  }

  private resolveProvider(type: string): AIProvider {
    const providerType =
      AIProviderType[type.toUpperCase() as keyof typeof AIProviderType] ||
      this.defaultProvider;
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`Provider ${providerType} not found`);
    }
    return provider;
  }

  async analyzeLeadRisk(
    lead: Record<string, unknown>,
    provider?: string,
  ) {
    const p = await this.getEffectiveProvider('leadRisk', provider);
    return p.analyzeLeadRisk(lead);
  }

  async generateClientHealth(
    client: Record<string, unknown>,
    provider?: string,
  ) {
    const p = await this.getEffectiveProvider('clientHealth', provider);
    return p.generateClientHealth(client);
  }

  async generateExecutiveSummary(
    metrics: Record<string, unknown>,
    provider?: string,
  ) {
    const p = await this.getEffectiveProvider('executiveSummary', provider);
    return p.generateExecutiveSummary(metrics);
  }

  async generateUpsellStrategy(
    client: Record<string, unknown>,
    provider?: string,
  ) {
    // Upsell uses the clientHealth provider override (no dedicated setting)
    const p = await this.getEffectiveProvider('clientHealth', provider);
    return p.generateUpsellStrategy(client);
  }

  async chat(
    message: string,
    context: Record<string, unknown>,
    provider?: string,
  ) {
    const p = await this.getEffectiveProvider('chat', provider);
    return p.chat(message, context);
  }

  async draftEmail(
    lead: Record<string, unknown>,
    emailType: string,
  ): Promise<EmailDraft> {
    const p = await this.getEffectiveProvider('leadRisk');
    return p.draftEmail(lead, emailType);
  }

  async analyzePipeline(
    data: Record<string, unknown>,
  ): Promise<PipelineInsights> {
    const p = await this.getEffectiveProvider('executiveSummary');
    return p.analyzePipeline(data);
  }

  /**
   * Send a freeform prompt directly to the AI with only the system context.
   * Use this for reports, analysis, and any case where the prompt is already
   * fully formed (e.g. BottleneckService) — bypasses the CRM chat wrapper.
   */
  async generateFreeform(
    prompt: string,
    provider?: string,
    maxTokens = 2048,
  ): Promise<string> {
    const p = await this.getEffectiveProvider(null, provider);
    return p.generateFreeform(prompt, maxTokens);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  getDefaultProvider(): string {
    return this.defaultProvider;
  }
}
