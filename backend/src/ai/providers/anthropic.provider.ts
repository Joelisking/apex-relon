import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  AIProvider,
  LeadRiskAnalysis,
  ClientHealthReport,
  ExecutiveSummary,
  UpsellStrategy,
  ChatResponse,
  EmailDraft,
  PipelineInsights,
} from '../interfaces/provider.interface';
import { buildLeadRiskPrompt, buildClientHealthPrompt, buildExecutiveSummaryPrompt, buildUpsellPrompt, buildChatPrompt, buildEmailDraftPrompt, buildPipelinePrompt } from '../prompts';

@Injectable()
export class AnthropicProvider implements AIProvider {
  private client: Anthropic | null = null;

  constructor(configOrApiKey: ConfigService | string) {
    let apiKey: string | undefined;
    if (typeof configOrApiKey === 'string') {
      apiKey = configOrApiKey;
    } else {
      apiKey = configOrApiKey.get<string>('ANTHROPIC_API_KEY');
    }
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async draftEmail(lead: Record<string, unknown>, emailType: string): Promise<EmailDraft> {
    if (!this.client) throw new Error('Anthropic API key not configured');
    const response = await this.client!.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildEmailDraftPrompt(lead, emailType) }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseJson<EmailDraft>(text);
  }

  async analyzePipeline(data: Record<string, unknown>): Promise<PipelineInsights> {
    if (!this.client) throw new Error('Anthropic API key not configured');
    const response = await this.client!.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1536,
      messages: [{ role: 'user', content: buildPipelinePrompt(data) }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseJson<PipelineInsights>(text);
  }

  async analyzeLeadRisk(lead: Record<string, unknown>): Promise<LeadRiskAnalysis> {
    if (!this.isAvailable()) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await this.client!.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: buildLeadRiskPrompt(lead),
        },
      ],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseLeadRiskResponse(content);
  }

  async generateClientHealth(client: Record<string, unknown>): Promise<ClientHealthReport> {
    if (!this.isAvailable()) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await this.client!.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: buildClientHealthPrompt(client),
        },
      ],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseClientHealthResponse(content);
  }

  async generateExecutiveSummary(metrics: Record<string, unknown>): Promise<ExecutiveSummary> {
    if (!this.isAvailable()) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await this.client!.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1536,
      messages: [
        {
          role: 'user',
          content: buildExecutiveSummaryPrompt(metrics),
        },
      ],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseExecutiveSummaryResponse(content);
  }

  async generateUpsellStrategy(client: Record<string, unknown>): Promise<UpsellStrategy> {
    if (!this.isAvailable()) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await this.client!.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: buildUpsellPrompt(client),
        },
      ],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseUpsellResponse(content);
  }

  async chat(message: string, context: Record<string, unknown>): Promise<ChatResponse> {
    if (!this.isAvailable()) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await this.client!.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: buildChatPrompt(message, context),
        },
      ],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    return { message: content };
  }

  private parseJson<T>(content: string): T {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
    throw new Error('No JSON found in response');
  }

  private parseLeadRiskResponse(content: string): LeadRiskAnalysis {
    try {
      // Try to extract JSON if present
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback parsing
      return {
        riskLevel: 'Medium',
        summary: content,
        recommendations: [],
        confidence: 0.75,
      };
    } catch (error) {
      throw new Error('Failed to parse lead risk analysis');
    }
  }

  private parseClientHealthResponse(content: string): ClientHealthReport {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        healthScore: 75,
        summary: content,
        riskFactors: [],
        strengths: [],
        recommendations: [],
      };
    } catch (error) {
      throw new Error('Failed to parse client health report');
    }
  }

  private parseExecutiveSummaryResponse(content: string): ExecutiveSummary {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        overview: content,
        whatChanged: [],
        whatIsAtRisk: [],
        whatNeedsAttention: [],
        keyInsights: [],
      };
    } catch (error) {
      throw new Error('Failed to parse executive summary');
    }
  }

  private parseUpsellResponse(content: string): UpsellStrategy {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        opportunities: [],
        approach: content,
        timing: 'Immediate',
      };
    } catch (error) {
      throw new Error('Failed to parse upsell strategy');
    }
  }
}
