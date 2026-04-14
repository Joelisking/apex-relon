import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
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

@Injectable()
export class OpenAIProvider implements AIProvider {
  private client: OpenAI | null = null;

  constructor(configOrApiKey: ConfigService | string) {
    let apiKey: string | undefined;
    if (typeof configOrApiKey === 'string') {
      apiKey = configOrApiKey;
    } else {
      apiKey = configOrApiKey.get<string>('OPENAI_API_KEY');
    }
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  private async call(
    prompt: string,
    maxTokens = 1024,
    jsonMode = true,
  ): Promise<string> {
    if (!this.client) throw new Error('OpenAI API key not configured');
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    });
    return response.choices[0].message.content || '';
  }

  async draftEmail(lead: Record<string, unknown>, emailType: string): Promise<EmailDraft> {
    return JSON.parse(await this.call(buildEmailDraftPrompt(lead, emailType)));
  }

  async analyzePipeline(data: Record<string, unknown>): Promise<PipelineInsights> {
    return JSON.parse(await this.call(buildPipelinePrompt(data), 1536));
  }

  async analyzeLeadRisk(lead: Record<string, unknown>): Promise<LeadRiskAnalysis> {
    return JSON.parse(await this.call(buildLeadRiskPrompt(lead)));
  }

  async generateClientHealth(client: Record<string, unknown>): Promise<ClientHealthReport> {
    return JSON.parse(await this.call(buildClientHealthPrompt(client)));
  }

  async generateExecutiveSummary(metrics: Record<string, unknown>): Promise<ExecutiveSummary> {
    return JSON.parse(await this.call(buildExecutiveSummaryPrompt(metrics), 1536));
  }

  async generateUpsellStrategy(client: Record<string, unknown>): Promise<UpsellStrategy> {
    return JSON.parse(await this.call(buildUpsellPrompt(client)));
  }

  async chat(message: string, context: Record<string, unknown>): Promise<ChatResponse> {
    // Chat doesn't need strict JSON mode — plain text response is fine
    const text = await this.call(buildChatPrompt(message, context), 1024, false);
    return { message: text };
  }

  async generateFreeform(prompt: string, maxTokens = 2048): Promise<string> {
    if (!this.client) throw new Error('OpenAI API key not configured');
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: maxTokens,
      messages: [
        { role: 'user', content: prompt },
      ],
    });
    return response.choices[0].message.content || '';
  }
}
