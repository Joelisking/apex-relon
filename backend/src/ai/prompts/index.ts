// ─── System prompt ────────────────────────────────────────────────────────────
export const SYSTEM_PROMPT = `You are an AI assistant embedded in Relon CRM, a business performance and project management platform built for Apex Consulting & Surveying, Inc. — a DBE/MBE/EBE land surveying firm based in Fort Wayne, Indiana.

Domain context:
- Apex provides survey services: Topographic, Boundary, ROW Engineering, Construction Staking, ALTA/NSPS, Cell Tower, Subdivision Plat, Environmental surveys.
- Projects follow INDOT/municipal workflows — key identifiers include Parcel Number, County, Township/Section/Range, INDOT Des Number.
- Pipeline stages: New → Contacted → Quoted → Negotiation → Won → Lost.
- Key roles: Owner, Project Manager, Party Chief, Survey Technician, Field Crew, Office Admin.
- Competitors include QFactor (bizwatt.com). Apex's advantages are AI analytics, bottleneck detection, and QuickBooks integration.

You respond only with valid JSON when asked. Be concise, specific, and action-oriented. Never fabricate data — base analysis strictly on provided context.`;

// ─── Lead Risk Analysis ───────────────────────────────────────────────────────
export function buildLeadRiskPrompt(lead: Record<string, unknown>): string {
  const activities = (lead.activities as Record<string, unknown>[]) || [];
  const stageHistory = (lead.stageHistory as Record<string, unknown>[]) || [];
  const metrics = (lead.metrics as Record<string, unknown>) || {};

  const recentActivitiesText = activities
    .slice(0, 8)
    .map((a: Record<string, unknown>, idx: number) => {
      const daysAgo = a.createdAt
        ? Math.floor(
            (Date.now() - new Date(a.createdAt as string).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : '?';
      const detail = `${a.reason}${a.notes ? ': ' + a.notes : ''}`;
      return `${idx + 1}. [${a.type}${daysAgo !== '?' ? ` — ${daysAgo}d ago` : ''}] ${detail}`;
    })
    .join('\n');

  const stageTransitions = stageHistory
    .slice(-5)
    .map(
      (h: Record<string, unknown>) =>
        `${h.fromStage} → ${h.toStage}`,
    )
    .join(', ');

  const assignedTeam = [
    lead.assignedTo && `PM: ${(lead.assignedTo as Record<string, unknown>)?.name}`,
    lead.qs && `QS: ${(lead.qs as Record<string, unknown>)?.name}`,
    lead.designer && `Designer: ${(lead.designer as Record<string, unknown>)?.name}`,
  ]
    .filter(Boolean)
    .join(', ') || 'Unassigned';

  const reps = (lead.reps as Record<string, unknown>[]) || [];
  const contactsText =
    reps.length > 0
      ? reps.map((r: Record<string, unknown>) => r.name).join(', ')
      : 'No identified decision-maker';

  return `Analyze this surveying project lead and provide a risk assessment in JSON format.

Lead Details:
- Contact: ${lead.contactName}
- Company: ${lead.company}
- Expected Value: $${lead.expectedValue?.toLocaleString() || '0'}
- Current Stage: ${lead.stage}
- Service Type: ${(lead.serviceType as Record<string, unknown>)?.name || 'Not specified'}
- Urgency: ${lead.urgency}
- Source: ${lead.source}
- Channel: ${lead.channel}
- Likely Start Date: ${lead.likelyStartDate || 'Not set'}
- Notes: ${lead.notes || 'None'}

Team Assignment:
${assignedTeam}

Key Contacts / Decision-Makers:
${contactsText}

Pipeline Timeline:
- Days in Pipeline: ${metrics.daysInPipeline || 'N/A'}
- Days Since Last Contact: ${metrics.daysSinceLastContact || 'N/A'}
- Stage Transitions: ${stageTransitions || 'None recorded'}
- Total Activities: ${metrics.activityCount || activities.length}

Recent Activity:
${recentActivitiesText || 'No recent activities recorded'}

Respond with a JSON object:
{
  "riskLevel": "Low" | "Medium" | "High",
  "summary": "2-sentence risk assessment specific to this lead",
  "recommendations": ["3-5 specific, actionable next steps"],
  "confidence": 0.0 to 1.0
}

Consider: deal size vs. activity level, time in pipeline, whether a decision-maker is identified, urgency, team assignment completeness, and any red flags in the activity notes.`;
}

// ─── Client Health ────────────────────────────────────────────────────────────
export function buildClientHealthPrompt(client: Record<string, unknown>): string {
  const metrics = (client.metrics as Record<string, unknown>) || {};
  const activities = (client.activities as Record<string, unknown>[]) || [];

  const recentActivitiesText = activities
    .slice(0, 10)
    .map((a: Record<string, unknown>, idx: number) => {
      const daysAgo = a.createdAt
        ? Math.floor(
            (Date.now() - new Date(a.createdAt as string).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : '?';
      const detail = `${a.reason}${a.notes ? ': ' + a.notes : ''}`;
      return `${idx + 1}. [${a.type}${daysAgo !== '?' ? ` — ${daysAgo}d ago` : ''}] ${detail}`;
    })
    .join('\n');

  return `Analyze this land surveying client's health status and provide a comprehensive assessment in JSON format.

Client Details:
- Name: ${client.name}
- Segment: ${client.segment}
- Industry: ${client.industry}
- Lifetime Revenue: $${client.lifetimeRevenue?.toLocaleString() || '0'}
- Account Manager: ${(client.accountManager as Record<string, unknown>)?.name || 'Unassigned'}
- Current Status: ${client.status}

Engagement Metrics:
- Days Since Last Contact: ${metrics.daysSinceLastContact || 'N/A'}
- Total Activities: ${metrics.totalActivityCount || 0}
- Recent Activities (30 days): ${metrics.recentActivityCount || 0}
- Engagement Score: ${metrics.engagementScore || 'N/A'}/100

Project History:
- Total Projects: ${metrics.totalProjectCount || 0}
- Active Projects: ${metrics.activeProjectCount || 0}
- Completed Projects: ${metrics.completedProjectCount || 0}
- Average Project Value: $${metrics.avgProjectValue?.toLocaleString() || '0'}
- Recent Revenue (12 months): $${metrics.recentRevenue?.toLocaleString() || '0'}

Recent Activity Detail:
${recentActivitiesText || 'No recent activities recorded'}

Respond with a JSON object:
{
  "healthScore": 0 to 100,
  "summary": "2-3 sentences on overall client health and relationship trajectory",
  "riskFactors": ["Specific risks based on activity patterns, engagement gaps, or revenue trends"],
  "strengths": ["Positive relationship indicators from interaction content"],
  "recommendations": ["3-5 specific actions to strengthen this account"]
}

Weight engagement recency heavily — a client with no contact in 60+ days but strong revenue history is at risk.`;
}

// ─── Executive Summary ────────────────────────────────────────────────────────
export function buildExecutiveSummaryPrompt(metrics: Record<string, unknown>): string {
  const topClientsText =
    ((metrics.topClients as Record<string, unknown>[]) || [])
      .slice(0, 5)
      .map(
        (c: Record<string, unknown>, idx: number) =>
          `${idx + 1}. ${c.clientName}: $${((c.revenue as number) / 1000).toFixed(0)}k`,
      )
      .join('\n') || 'No clients yet';

  const stalledLeadsText =
    ((metrics.stalledLeads as Record<string, unknown>[]) || [])
      .slice(0, 5)
      .map(
        (l: Record<string, unknown>) =>
          `- ${l.company} (${l.stage}, ${l.daysStalled} days stalled)`,
      )
      .join('\n') || 'None';

  const riskyProjectsText =
    ((metrics.projectsAtRisk as Record<string, unknown>[]) || [])
      .slice(0, 5)
      .map((p: Record<string, unknown>) => `- ${p.projectName}: ${p.reason}`)
      .join('\n') || 'None';

  const highValueDealsText =
    ((metrics.highValueDeals as Record<string, unknown>[]) || [])
      .slice(0, 5)
      .map(
        (d: Record<string, unknown>) =>
          `- ${d.company}: $${((d.value as number) / 1000).toFixed(0)}k (${d.stage})`,
      )
      .join('\n') || 'None';

  return `Generate an executive summary for Apex Consulting & Surveying's CRM dashboard. Respond in JSON format.

REVENUE & GROWTH:
- Total Revenue (all-time): $${(metrics.totalRevenue || 0).toLocaleString()}
- Monthly Revenue: $${(metrics.monthlyRevenue || 0).toLocaleString()}
- Quarterly Revenue: $${(metrics.quarterlyRevenue || 0).toLocaleString()}
- Open Pipeline Value: $${(metrics.pipelineValue || 0).toLocaleString()}
- Average Deal Size: $${(metrics.avgDealSize || 0).toLocaleString()}

SALES PERFORMANCE:
- Total Leads: ${metrics.totalLeads || 0}
- Won: ${metrics.wonLeads || 0} | Lost: ${metrics.lostLeads || 0}
- Win Rate: ${metrics.winRate || 0}% (industry benchmark: 25-35% for surveying firms)
- Avg Time to Quote: ${metrics.avgTimeToQuote || 0} days
- Avg Time to Close: ${metrics.avgTimeToClose || 0} days

CLIENT & PROJECT HEALTH:
- Active Clients: ${metrics.activeClients || 0}
- Total Projects: ${metrics.totalProjects || 0}
- Active Projects: ${metrics.activeProjects || 0}

TOP REVENUE CONTRIBUTORS:
${topClientsText}

REVENUE CONCENTRATION RISK:
- Top Client: ${(metrics.revenueConcentration as Record<string, unknown>)?.topClientPercentage || 0}% of revenue
- Top 5 Clients: ${(metrics.revenueConcentration as Record<string, unknown>)?.top5ClientsPercentage || 0}% of revenue
- Risk Level: ${(metrics.revenueConcentration as Record<string, unknown>)?.isHighRisk ? 'HIGH — over 50% revenue concentration in top 5' : 'Healthy'}

STALLED LEADS (30+ days no activity):
${stalledLeadsText}

PROJECTS AT RISK:
${riskyProjectsText}

HIGH-VALUE DEALS IN PIPELINE:
${highValueDealsText}

Respond with a JSON object:
{
  "overview": "2-3 sentences: How is Apex performing? What's the revenue trajectory? Any urgent concerns?",
  "whatChanged": ["2-3 notable changes or deviations from expected patterns"],
  "whatIsAtRisk": ["2-3 specific risks — name clients, projects, or deals where relevant"],
  "whatNeedsAttention": ["2-3 immediate actions for leadership this week"],
  "keyInsights": ["2-3 strategic insights or opportunities specific to the land surveying market"]
}

Focus on: concrete risks with names, actionable leadership decisions, revenue concentration risk, pipeline velocity, and surveying-industry-specific patterns like seasonal INDOT bid cycles.`;
}

// ─── Upsell Strategy ──────────────────────────────────────────────────────────
export function buildUpsellPrompt(client: Record<string, unknown>): string {
  const metrics = (client.metrics as Record<string, unknown>) || {};
  const projects = (client.projects as Record<string, unknown>[]) || [];
  const activities = (client.activities as Record<string, unknown>[]) || [];

  const recentActivitiesText = activities
    .slice(0, 8)
    .map((a: Record<string, unknown>, idx: number) => {
      const daysAgo = a.createdAt
        ? Math.floor(
            (Date.now() - new Date(a.createdAt as string).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : '?';
      const detail = `${a.reason}${a.notes ? ': ' + a.notes : ''}`;
      return `${idx + 1}. [${a.type}${daysAgo !== '?' ? ` — ${daysAgo}d ago` : ''}] ${detail}`;
    })
    .join('\n');

  const projectsText = projects
    .slice(0, 6)
    .map(
      (p: Record<string, unknown>) =>
        `- ${p.name} (${p.status}): $${(p.contractedValue as number | undefined)?.toLocaleString() || '?'}`,
    )
    .join('\n') || '- No projects yet';

  return `Develop a growth and upsell strategy for a Apex Consulting & Surveying client. Respond in JSON format.

Client:
- Name: ${client.name}
- Segment: ${client.segment}
- Industry: ${client.industry}
- Lifetime Revenue: $${client.lifetimeRevenue?.toLocaleString() || '0'}

Performance:
- Engagement Score: ${metrics.engagementScore || 'N/A'}/100
- Active Projects: ${metrics.activeProjectCount || 0}
- Completed Projects: ${metrics.completedProjectCount || 0}
- Recent Revenue (12 months): $${metrics.recentRevenue?.toLocaleString() || '0'}

Project History:
${projectsText}

Recent Interactions:
${recentActivitiesText || 'No recent activities recorded'}

Apex service types to consider: Topographic, Boundary, ROW Engineering, Construction Staking, ALTA/NSPS, Cell Tower, Subdivision Plat, Environmental surveys.

Respond with a JSON object:
{
  "opportunities": [
    {
      "service": "Specific Apex service name",
      "rationale": "Why this client would benefit, based on their history and recent conversations",
      "estimatedValue": "$X,000 – $Y,000",
      "priority": "High" | "Medium" | "Low"
    }
  ],
  "approach": "1-2 sentences on how to position the conversation based on the relationship",
  "timing": "immediate" | "1-3 months" | "3-6 months",
  "talkingPoints": ["2-3 specific talking points grounded in their project history or recent interactions"]
}`;
}

// ─── AI Chat ──────────────────────────────────────────────────────────────────
export function buildChatPrompt(
  message: string,
  context: Record<string, unknown>,
): string {
  const leadsCount = (context.leadsCount as number) || 0;
  const clientsCount = (context.clientsCount as number) || 0;

  const leadsSummary = (
    (context.leadsSummary as Record<string, unknown>[]) || []
  )
    .map(
      (l: Record<string, unknown>) =>
        `• ${l.company} (${l.contactName}): $${l.expectedValue?.toLocaleString()} — Stage: ${l.stage}, Urgency: ${l.urgency}${l.aiRiskLevel ? `, Risk: ${l.aiRiskLevel}` : ''}`,
    )
    .join('\n');

  const clientsSummary = (
    (context.clientsSummary as Record<string, unknown>[]) || []
  )
    .map(
      (c: Record<string, unknown>) =>
        `• ${c.name} (${c.segment}): LTV $${(c.lifetimeRevenue as number)?.toLocaleString()}${c.healthScore != null ? `, Health: ${c.healthScore}%` : ''} — ${c.status}`,
    )
    .join('\n');

  return `You are the Relon CRM assistant for Apex Consulting & Surveying — a land surveying firm in Fort Wayne, IN. Answer based strictly on the data below.

PIPELINE (${leadsCount} total leads):
${leadsSummary || 'No leads data available'}

CLIENTS (${clientsCount} total clients):
${clientsSummary || 'No clients data available'}

User question: "${message}"

Respond concisely and specifically. If you reference dollar amounts, calculate from the data above. If the answer isn't in the data, say so clearly.`;
}

// ─── Email Draft ──────────────────────────────────────────────────────────────
export function buildEmailDraftPrompt(lead: Record<string, unknown>, emailType: string): string {
  return `Draft a ${emailType} email for Apex Consulting & Surveying to send to ${lead.contactName} at ${lead.company}.

Lead context:
- Expected project value: $${lead.expectedValue?.toLocaleString() || '0'}
- Current stage: ${lead.stage}
- Service: ${(lead.serviceType as Record<string, unknown>)?.name || 'N/A'}
- Assigned PM: ${(lead.assignedTo as Record<string, unknown>)?.name || 'N/A'}
- Notes: ${lead.notes || 'None'}

Email type options: follow-up | introduction | proposal | check-in | closing
Requested type: ${emailType}

Write from the perspective of a professional land surveying firm. Be direct and specific. Avoid generic filler.

Return JSON: { "subject": "...", "body": "...", "tone": "professional" | "friendly" | "urgent" }`;
}

// ─── Pipeline Analysis ────────────────────────────────────────────────────────
export function buildPipelinePrompt(data: Record<string, unknown>): string {
  return `Analyze this land surveying firm's sales pipeline and provide strategic insights. Respond in JSON format.

Pipeline snapshot:
- Open leads: ${data.totalLeads}
- By stage: ${JSON.stringify(data.byStage)}
- Total open value: $${(data.totalValue as number)?.toLocaleString()}
- Average deal size: $${(data.avgDealSize as number)?.toLocaleString()}
- Win rate (last 30 days): ${data.winRate}%
- Leads with no activity in 7+ days: ${data.staleLeads}
- By urgency: ${JSON.stringify(data.byUrgency)}

Return JSON:
{
  "summary": "2-3 sentence pipeline health summary",
  "bottlenecks": ["Specific stages or issues causing slowdowns"],
  "winProbabilityByStage": { "New": 0.0, "Contacted": 0.0, "Quoted": 0.0, "Negotiation": 0.0 },
  "recommendations": ["3-5 specific actions to improve pipeline velocity"],
  "urgentLeads": ["Describe leads that need immediate attention based on urgency/staleness"]
}`;
}

// ─── AI Lead Summary ──────────────────────────────────────────────────────────
export function buildLeadSummaryPrompt(context: Record<string, unknown>): string {
  const activities = (context.recentActivities as Record<string, unknown>[]) || [];

  const activitiesText = activities
    .slice(0, 10)
    .map((a: Record<string, unknown>, idx: number) => {
      const date = a.activityDate || (a.date ? new Date(a.date as string).toLocaleDateString() : 'Unknown date');
      const detail = `${a.reason}${a.notes ? ': ' + a.notes : ''}`;
      return `${idx + 1}. [${a.type} — ${date}] ${detail}`;
    })
    .join('\n');

  return `Analyze this land surveying project lead and provide a structured summary. Respond in JSON format.

Lead:
- Contact: ${context.leadName} at ${context.company}
- Stage: ${context.status}
- Expected Value: $${(context.estimatedValue as number)?.toLocaleString()}
- Source: ${context.source}
- Assigned To: ${context.assignedTo || 'Unassigned'}

Timeline:
- Days in Pipeline: ${context.daysInPipeline}
- Days Since Last Contact: ${context.daysSinceLastContact}
- Total Activities: ${context.activityCount}
- Files Uploaded: ${(context.fileCategories as string[])?.length || 0}

Recent Activity:
${activitiesText || 'No activities recorded'}

Respond with:
{
  "summary": "2-3 sentences on the current situation and trajectory",
  "insights": ["3-5 insights about engagement, timeline, or deal quality"],
  "nextActions": ["Top 3 concrete next actions to advance this deal"]
}`;
}
