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
import {
  SYSTEM_PROMPT,
  buildLeadRiskPrompt,
  buildClientHealthPrompt,
  buildExecutiveSummaryPrompt,
  buildUpsellPrompt,
  buildChatPrompt,
  buildEmailDraftPrompt,
  buildPipelinePrompt,
} from '../prompts';

const MODEL = 'claude-sonnet-4-6';

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

  private async call(prompt: string, maxTokens = 1024, systemPrompt: string | undefined = SYSTEM_PROMPT): Promise<string> {
    if (!this.client) throw new Error('Anthropic API key not configured');
    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: [{ role: 'user', content: prompt }],
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  private parseJson<T>(content: string): T {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
    throw new Error('No JSON found in Anthropic response');
  }

  async draftEmail(lead: Record<string, unknown>, emailType: string): Promise<EmailDraft> {
    const text = await this.call(buildEmailDraftPrompt(lead, emailType));
    return this.parseJson<EmailDraft>(text);
  }

  async analyzePipeline(data: Record<string, unknown>): Promise<PipelineInsights> {
    const text = await this.call(buildPipelinePrompt(data), 1536);
    return this.parseJson<PipelineInsights>(text);
  }

  async analyzeLeadRisk(lead: Record<string, unknown>): Promise<LeadRiskAnalysis> {
    const text = await this.call(buildLeadRiskPrompt(lead));
    try {
      return this.parseJson<LeadRiskAnalysis>(text);
    } catch {
      return { riskLevel: 'Medium', summary: text, recommendations: [], confidence: 0.75 };
    }
  }

  async generateClientHealth(client: Record<string, unknown>): Promise<ClientHealthReport> {
    const text = await this.call(buildClientHealthPrompt(client));
    try {
      return this.parseJson<ClientHealthReport>(text);
    } catch {
      return { healthScore: 75, summary: text, riskFactors: [], strengths: [], recommendations: [] };
    }
  }

  async generateExecutiveSummary(metrics: Record<string, unknown>): Promise<ExecutiveSummary> {
    const text = await this.call(buildExecutiveSummaryPrompt(metrics), 1536);
    try {
      return this.parseJson<ExecutiveSummary>(text);
    } catch {
      return { overview: text, whatChanged: [], whatIsAtRisk: [], whatNeedsAttention: [], keyInsights: [] };
    }
  }

  async generateUpsellStrategy(client: Record<string, unknown>): Promise<UpsellStrategy> {
    const text = await this.call(buildUpsellPrompt(client));
    try {
      return this.parseJson<UpsellStrategy>(text);
    } catch {
      return { opportunities: [], approach: text, timing: 'Immediate' };
    }
  }

  async chat(message: string, context: Record<string, unknown>): Promise<ChatResponse> {
    const text = await this.call(buildChatPrompt(message, context));
    return { message: text };
  }

  async generateFreeform(prompt: string, maxTokens = 2048): Promise<string> {
    return this.call(prompt, maxTokens, undefined);
  }
}
