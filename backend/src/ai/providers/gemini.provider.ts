import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
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

const MODEL = 'gemini-2.0-flash';

@Injectable()
export class GeminiProvider implements AIProvider {
  private client: GoogleGenAI | null = null;

  constructor(configOrApiKey: ConfigService | string) {
    let apiKey: string | undefined;
    if (typeof configOrApiKey === 'string') {
      apiKey = configOrApiKey;
    } else {
      apiKey = configOrApiKey.get<string>('GEMINI_API_KEY');
    }
    if (apiKey) {
      this.client = new GoogleGenAI({ apiKey });
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  private async call(prompt: string): Promise<string> {
    if (!this.client) throw new Error('Gemini API key not configured');
    const response = await this.client.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });
    return response.text || '';
  }

  private parseJson<T>(content: string, fallback: T): T {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]) as T;
    } catch {
      // fall through
    }
    return fallback;
  }

  async draftEmail(lead: Record<string, unknown>, emailType: string): Promise<EmailDraft> {
    const text = await this.call(buildEmailDraftPrompt(lead, emailType));
    return this.parseJson<EmailDraft>(text, { subject: '', body: text, tone: 'professional' });
  }

  async analyzePipeline(data: Record<string, unknown>): Promise<PipelineInsights> {
    const text = await this.call(buildPipelinePrompt(data));
    return this.parseJson<PipelineInsights>(text, {
      summary: text,
      bottlenecks: [],
      winProbabilityByStage: {},
      recommendations: [],
      urgentLeads: [],
    });
  }

  async analyzeLeadRisk(lead: Record<string, unknown>): Promise<LeadRiskAnalysis> {
    const text = await this.call(buildLeadRiskPrompt(lead));
    return this.parseJson<LeadRiskAnalysis>(text, {
      riskLevel: 'Medium',
      summary: text,
      recommendations: [],
      confidence: 0.75,
    });
  }

  async generateClientHealth(client: Record<string, unknown>): Promise<ClientHealthReport> {
    const text = await this.call(buildClientHealthPrompt(client));
    return this.parseJson<ClientHealthReport>(text, {
      healthScore: 75,
      summary: text,
      riskFactors: [],
      strengths: [],
      recommendations: [],
    });
  }

  async generateExecutiveSummary(metrics: Record<string, unknown>): Promise<ExecutiveSummary> {
    const text = await this.call(buildExecutiveSummaryPrompt(metrics));
    return this.parseJson<ExecutiveSummary>(text, {
      overview: text,
      whatChanged: [],
      whatIsAtRisk: [],
      whatNeedsAttention: [],
      keyInsights: [],
    });
  }

  async generateUpsellStrategy(client: Record<string, unknown>): Promise<UpsellStrategy> {
    const text = await this.call(buildUpsellPrompt(client));
    return this.parseJson<UpsellStrategy>(text, {
      opportunities: [],
      approach: text,
      timing: 'Immediate',
    });
  }

  async chat(message: string, context: Record<string, unknown>): Promise<ChatResponse> {
    const text = await this.call(buildChatPrompt(message, context));
    return { message: text };
  }

  async generateFreeform(prompt: string): Promise<string> {
    return this.call(prompt);
  }
}
