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
import { buildLeadRiskPrompt, buildClientHealthPrompt, buildExecutiveSummaryPrompt, buildUpsellPrompt, buildChatPrompt, buildEmailDraftPrompt, buildPipelinePrompt } from '../prompts';

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

  async draftEmail(lead: Record<string, unknown>, emailType: string): Promise<EmailDraft> {
    if (!this.client) throw new Error('Gemini API key not configured');
    const response = await this.client!.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: buildEmailDraftPrompt(lead, emailType),
    });
    const content = response.text || '';
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch {
      return { subject: '', body: content, tone: 'professional' };
    }
  }

  async analyzePipeline(data: Record<string, unknown>): Promise<PipelineInsights> {
    if (!this.client) throw new Error('Gemini API key not configured');
    const response = await this.client!.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: buildPipelinePrompt(data),
    });
    const content = response.text || '';
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch {
      return {
        summary: content,
        bottlenecks: [],
        winProbabilityByStage: {},
        recommendations: [],
        urgentLeads: [],
      };
    }
  }

  async analyzeLeadRisk(lead: Record<string, unknown>): Promise<LeadRiskAnalysis> {
    if (!this.isAvailable()) {
      throw new Error('Gemini API key not configured');
    }

    const response = await this.client!.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: buildLeadRiskPrompt(lead),
    });

    const content = response.text || '';

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      return {
        riskLevel: 'Medium',
        summary: content,
        recommendations: [],
        confidence: 0.75,
      };
    }
  }

  async generateClientHealth(client: Record<string, unknown>): Promise<ClientHealthReport> {
    if (!this.isAvailable()) {
      throw new Error('Gemini API key not configured');
    }

    const response = await this.client!.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: buildClientHealthPrompt(client),
    });

    const content = response.text || '';

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      return {
        healthScore: 75,
        summary: content,
        riskFactors: [],
        strengths: [],
        recommendations: [],
      };
    }
  }

  async generateExecutiveSummary(metrics: Record<string, unknown>): Promise<ExecutiveSummary> {
    if (!this.isAvailable()) {
      throw new Error('Gemini API key not configured');
    }

    const response = await this.client!.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: buildExecutiveSummaryPrompt(metrics),
    });

    const content = response.text || '';

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      return {
        overview: content,
        whatChanged: [],
        whatIsAtRisk: [],
        whatNeedsAttention: [],
        keyInsights: [],
      };
    }
  }

  async generateUpsellStrategy(client: Record<string, unknown>): Promise<UpsellStrategy> {
    if (!this.isAvailable()) {
      throw new Error('Gemini API key not configured');
    }

    const response = await this.client!.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: buildUpsellPrompt(client),
    });

    const content = response.text || '';

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      return {
        opportunities: [],
        approach: content,
        timing: 'Immediate',
      };
    }
  }

  async chat(message: string, context: Record<string, unknown>): Promise<ChatResponse> {
    if (!this.isAvailable()) {
      throw new Error('Gemini API key not configured');
    }

    const response = await this.client!.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: buildChatPrompt(message, context),
    });

    const content = response.text || '';

    return { message: content };
  }
}
