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
import { buildLeadRiskPrompt, buildClientHealthPrompt, buildExecutiveSummaryPrompt, buildUpsellPrompt, buildChatPrompt, buildEmailDraftPrompt, buildPipelinePrompt } from '../prompts';

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

  async draftEmail(lead: Record<string, unknown>, emailType: string): Promise<EmailDraft> {
    if (!this.client) throw new Error('OpenAI API key not configured');
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: buildEmailDraftPrompt(lead, emailType) }],
      max_tokens: 1024,
    });
    return JSON.parse(response.choices[0].message.content || '{}');
  }

  async analyzePipeline(data: Record<string, unknown>): Promise<PipelineInsights> {
    if (!this.client) throw new Error('OpenAI API key not configured');
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: buildPipelinePrompt(data) }],
      max_tokens: 1536,
    });
    return JSON.parse(response.choices[0].message.content || '{}');
  }

  async analyzeLeadRisk(lead: Record<string, unknown>): Promise<LeadRiskAnalysis> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await this.client!.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: buildLeadRiskPrompt(lead),
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content);
  }

  async generateClientHealth(client: Record<string, unknown>): Promise<ClientHealthReport> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await this.client!.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: buildClientHealthPrompt(client),
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content);
  }

  async generateExecutiveSummary(metrics: Record<string, unknown>): Promise<ExecutiveSummary> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await this.client!.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: buildExecutiveSummaryPrompt(metrics),
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content);
  }

  async generateUpsellStrategy(client: Record<string, unknown>): Promise<UpsellStrategy> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await this.client!.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: buildUpsellPrompt(client),
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content);
  }

  async chat(message: string, context: Record<string, unknown>): Promise<ChatResponse> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await this.client!.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: buildChatPrompt(message, context),
        },
      ],
    });

    const content = response.choices[0].message.content || '';
    return { message: content };
  }
}
