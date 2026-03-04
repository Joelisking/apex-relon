import { GoogleGenAI, Type } from '@google/genai';
import {
  Lead,
  Client,
  DashboardMetrics,
  ExecutiveSummaryResponse,
  LeadRiskAnalysis,
  ClientHealthReport,
  UpsellStrategy,
} from '../types';

// Initialize Gemini Client
const apiKey = process.env.NEXT_PUBLIC_API_KEY || 'dummy-key';
const ai = new GoogleGenAI({ apiKey });

export const generateExecutiveSummary = async (
  metrics: DashboardMetrics,
  revenueData: { name: string; revenue: number }[],
): Promise<ExecutiveSummaryResponse> => {
  if (apiKey === 'dummy-key') {
    return {
      summary:
        'API Key missing. Showing mock summary: Revenue is up 15% from last month. Two major deals in negotiation phase require CEO attention to close before quarter end. Operational costs remain stable.',
      flags: [
        'Approaching Q4 targets',
        'High dependency on top 2 clients',
        'Pipeline healthy',
      ],
    };
  }

  try {
    const prompt = `
      Act as a Chief Strategy Officer. Analyze the following CRM data for Relon.

      Metrics:
      - Total Revenue: $${metrics.totalRevenue}
      - Active Clients: ${metrics.activeClients}
      - Active Leads: ${metrics.activeLeads}
      - Pipeline Value: $${metrics.pipelineValue}
      - Conversion Rate: ${metrics.conversionRate}
      - Average Deal Size: $${metrics.avgDealSize}

      Revenue Trend (last 6 months): ${JSON.stringify(revenueData)}

      Provide a JSON response with:
      1. 'summary': A concise 3-sentence executive summary highlighting changes, risks, and attention areas.
      2. 'flags': An array of 3 short, punchy "risk flags" or "alerts" for the CEO.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            flags: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    });

    const text = response.text;
    if (!text)
      return { summary: 'No analysis available.', flags: [] };
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini API Error:', error);
    return {
      summary:
        'AI Service temporarily unavailable. Please check your connection or API quota.',
      flags: ['Service Error'],
    };
  }
};

export const analyzeLeadRisk = async (
  lead: Lead,
): Promise<LeadRiskAnalysis> => {
  if (apiKey === 'dummy-key') {
    return {
      riskLevel: 'High Probability',
      summary:
        'Mock Analysis: Lead has high engagement and budget matches services.',
      recommendations: [
        'Follow up within 48 hours',
        'Prepare proposal',
      ],
    };
  }

  try {
    const createdAt = lead.createdAt
      ? new Date(lead.createdAt)
      : new Date();
    const daysSinceCreation = Math.floor(
      (new Date().getTime() - createdAt.getTime()) /
        (1000 * 3600 * 24),
    );

    const prompt = `
          Analyze this sales lead for risk.
          Lead Name: ${lead.contactName || lead.name || 'Unknown'}
          Company: ${lead.company}
          Value: ${lead.expectedValue}
          Stage: ${lead.stage}
          Days since creation: ${daysSinceCreation}
          Urgency: ${lead.urgency}
          Recent Activity Count: ${lead.activities?.length || 0}

          Classify into one of: 'Low', 'Medium', 'High', 'At Risk'.
          Provide a JSON response with:
          - riskLevel: risk classification
          - summary: short 1-sentence summary
          - recommendations: array of 2-3 action items
        `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskLevel: { type: Type.STRING },
            summary: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
      },
    });

    const text = response.text;
    if (!text)
      return {
        riskLevel: 'Unknown',
        summary: 'Analysis failed.',
        recommendations: [],
      };
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini Lead Analysis Error', error);
    return {
      riskLevel: 'Unknown',
      summary: 'AI Service Error',
      recommendations: [],
    };
  }
};

export const generateClientHealthReport = async (
  client: Client,
): Promise<ClientHealthReport> => {
  if (apiKey === 'dummy-key') {
    return {
      healthScore: 85,
      summary:
        'Client shows consistent revenue patterns. Last interaction was recent. Consider upsizing service package.',
      recommendations: [
        'Schedule quarterly business review',
        'Explore upsell opportunities',
      ],
    };
  }

  try {
    const revenue =
      client.totalRevenue || client.lifetimeRevenue || 0;
    const prompt = `
          Analyze this client for health status.
          Client: ${client.name}
          Segment: ${client.segment}
          Lifetime Revenue: $${revenue}
          Last Interaction: ${client.lastInteraction || 'Unknown'}
          Current Status: ${client.status}
          Projects: ${client.projects?.length || 0}

          Provide a JSON response with:
          - healthScore: number 0-100
          - summary: 2-sentence health assessment
          - recommendations: array of 2-3 action items
        `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            healthScore: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
      },
    });

    const text = response.text;
    if (!text)
      return {
        healthScore: 0,
        summary: 'Analysis failed.',
        recommendations: [],
      };
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini Client Analysis Error', error);
    return {
      healthScore: 0,
      summary: 'AI Service Error',
      recommendations: [],
    };
  }
};

export const generateUpsellStrategy = async (
  client: Client,
): Promise<UpsellStrategy> => {
  if (apiKey === 'dummy-key') {
    return {
      strategy: 'Focus on expanding their digital footprint.',
      opportunities: [
        {
          title: 'Advanced Analytics',
          potentialValue: '$15,000',
          description: 'Upgrade their reporting suite.',
        },
        {
          title: 'Staff Training',
          potentialValue: '$5,000',
          description: 'On-site workshops.',
        },
      ],
    };
  }

  try {
    const revenue =
      client.totalRevenue || client.lifetimeRevenue || 0;
    const projects = client.projects?.join(', ') || 'None listed';

    const prompt = `
          Act as a Senior Account Manager. Suggest upsell opportunities for this client.
          Client: ${client.name}
          Industry: ${client.industry}
          Current Revenue: $${revenue}
          Current Projects: ${projects}

          Return a JSON with:
          1. 'strategy': A strategic 1-sentence direction.
          2. 'opportunities': Array of 2 objects with 'title', 'potentialValue', and 'description'.
        `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strategy: { type: Type.STRING },
            opportunities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  potentialValue: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    const text = response.text;
    if (!text)
      return {
        strategy: 'No strategy available.',
        opportunities: [],
      };
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini Upsell Error', error);
    return {
      strategy: 'Error generating strategy.',
      opportunities: [],
    };
  }
};

export const askCRM = async (
  question: string,
  contextData: { leads: Lead[]; clients: Client[] },
): Promise<string> => {
  if (apiKey === 'dummy-key') {
    return (
      "I'm running in demo mode without an API Key. I see " +
      contextData.leads?.length +
      ' leads and ' +
      contextData.clients?.length +
      ' clients in your database.'
    );
  }

  try {
    // We limit context data size for the prompt
    const leadsSummary = contextData.leads
      .map(
        (l) =>
          `${l.name} (${l.company}): $${l.expectedValue}, Stage: ${l.stage}`,
      )
      .join('\n');
    const clientsSummary = contextData.clients
      .map(
        (c) => `${c.name}: $${c.totalRevenue}, Status: ${c.status}`,
      )
      .join('\n');

    const prompt = `
           You are the Relon AI CRM Assistant. You have access to the following live data:
           
           LEADS:
           ${leadsSummary}
           
           CLIENTS:
           ${clientsSummary}
           
           User Question: "${question}"
           
           Answer the user clearly and concisely based *only* on the data above. If you calculate numbers, show your work briefly.
        `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    return (
      response.text || "I couldn't interpret that based on the data."
    );
  } catch (error) {
    console.error('Gemini Chat Error', error);
    return 'I encountered an error connecting to the AI service.';
  }
};
