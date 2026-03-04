'use client';

import {
  useState,
  useEffect,
  type ElementType,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BrainCircuit,
  Key,
  Loader2,
  Eye,
  EyeOff,
  FileText,
  Save,
  Check,
  Zap,
  TrendingUp,
  MessageSquare,
  BarChart3,
  Users,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';
import type { AISettings } from '@/lib/types';

// ── types ──────────────────────────────────────────────────────────────────
type Section = 'provider' | 'prompts' | 'features';

interface FeatureProviderState {
  leadRiskProvider: string;
  clientHealthProvider: string;
  executiveSummaryProvider: string;
  chatProvider: string;
}

type FeatureProviderKey = keyof FeatureProviderState | null;

// ── constants ──────────────────────────────────────────────────────────────
const PROVIDERS = [
  {
    value: 'anthropic',
    label: 'Anthropic Claude',
    desc: 'Claude Sonnet 4.5',
    accentClass: 'border-violet-300 bg-violet-50/60',
    dotClass: 'bg-violet-400',
    selectedClass: 'border-violet-400 ring-2 ring-violet-200',
  },
  {
    value: 'openai',
    label: 'OpenAI',
    desc: 'GPT-4o · Recommended',
    accentClass: 'border-emerald-300 bg-emerald-50/60',
    dotClass: 'bg-emerald-400',
    selectedClass: 'border-emerald-400 ring-2 ring-emerald-200',
  },
  {
    value: 'gemini',
    label: 'Google Gemini',
    desc: 'Gemini Flash 3',
    accentClass: 'border-blue-300 bg-blue-50/60',
    dotClass: 'bg-blue-400',
    selectedClass: 'border-blue-400 ring-2 ring-blue-200',
  },
] as const;

const PROMPTS = [
  {
    key: 'leadRiskPrompt' as keyof PromptState,
    label: 'Lead Risk Analysis',
    desc: 'Vars: {{contactName}}, {{company}}, {{value}}, {{stage}}',
    rows: 10,
  },
  {
    key: 'clientHealthPrompt' as keyof PromptState,
    label: 'Client Health Scoring',
    desc: 'Vars: {{name}}, {{segment}}, {{lifetimeRevenue}}',
    rows: 10,
  },
  {
    key: 'executiveSummaryPrompt' as keyof PromptState,
    label: 'Executive Summary',
    desc: 'Vars: {{totalRevenue}}, {{pipelineValue}}',
    rows: 10,
  },
  {
    key: 'upsellPrompt' as keyof PromptState,
    label: 'Upsell Opportunity Detection',
    desc: 'Vars: {{name}}, {{projects}}, {{recentActivities}}',
    rows: 10,
  },
  {
    key: 'chatPrompt' as keyof PromptState,
    label: 'AI Chat Assistant',
    desc: 'Vars: {{message}}, {{leadsCount}}, {{userRole}}',
    rows: 8,
  },
];

const FEATURES: {
  icon: ElementType;
  label: string;
  desc: string;
  colorClass: string;
  bgClass: string;
  dotClass: string;
  providerKey: FeatureProviderKey;
}[] = [
  {
    icon: TrendingUp,
    label: 'Lead Risk Analysis',
    desc: 'Automatically assess lead quality and provide risk scoring with actionable recommendations',
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50',
    dotClass: 'bg-amber-400',
    providerKey: 'leadRiskProvider',
  },
  {
    icon: Users,
    label: 'Client Health Monitoring',
    desc: 'Track client engagement and identify at-risk accounts before they churn',
    colorClass: 'text-emerald-600',
    bgClass: 'bg-emerald-50',
    dotClass: 'bg-emerald-400',
    providerKey: 'clientHealthProvider',
  },
  {
    icon: Zap,
    label: 'Upsell Opportunity Detection',
    desc: 'Identify cross-sell and upsell opportunities based on client history and patterns',
    colorClass: 'text-violet-600',
    bgClass: 'bg-violet-50',
    dotClass: 'bg-violet-400',
    providerKey: null,
  },
  {
    icon: BarChart3,
    label: 'Executive Summary Generation',
    desc: 'Generate intelligent insights and executive summaries from dashboard metrics',
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50',
    dotClass: 'bg-blue-400',
    providerKey: 'executiveSummaryProvider',
  },
  {
    icon: MessageSquare,
    label: 'AI Chat Assistant',
    desc: 'Get instant answers about your CRM data and receive intelligent recommendations',
    colorClass: 'text-rose-600',
    bgClass: 'bg-rose-50',
    dotClass: 'bg-rose-400',
    providerKey: 'chatProvider',
  },
];

// ── helpers ────────────────────────────────────────────────────────────────
interface PromptState {
  leadRiskPrompt: string;
  clientHealthPrompt: string;
  executiveSummaryPrompt: string;
  upsellPrompt: string;
  chatPrompt: string;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-3">
      {children}
    </p>
  );
}

function KeyStatusPill({ valid }: { valid: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
        valid
          ? 'bg-emerald-100/70 text-emerald-900'
          : 'bg-muted/60 text-muted-foreground'
      }`}>
      <span
        className={`h-1.5 w-1.5 rounded-full shrink-0 ${valid ? 'bg-emerald-400' : 'bg-muted-foreground/40'}`}
      />
      {valid ? 'Configured' : 'Not set'}
    </span>
  );
}

// ── nav items ──────────────────────────────────────────────────────────────
const NAV: { id: Section; label: string; icon: React.ElementType }[] =
  [
    { id: 'provider', label: 'Provider & Keys', icon: Key },
    { id: 'prompts', label: 'AI Prompts', icon: FileText },
    { id: 'features', label: 'Features', icon: BrainCircuit },
  ];

// ── component ──────────────────────────────────────────────────────────────
export default function AdminAISettingsView() {
  const [activeSection, setActiveSection] =
    useState<Section>('provider');
  const queryClient = useQueryClient();
  const { data: settings, isLoading: loading } = useQuery<AISettings>(
    {
      queryKey: ['ai-settings'],
      queryFn: () => api.admin.getAISettings(),
      staleTime: 2 * 60 * 1000,
    },
  );

  // Provider
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [savingProvider, setSavingProvider] = useState(false);

  // API Keys
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);

  // Prompts
  const [prompts, setPrompts] = useState<PromptState>({
    leadRiskPrompt: '',
    clientHealthPrompt: '',
    executiveSummaryPrompt: '',
    upsellPrompt: '',
    chatPrompt: '',
  });
  const [savingPrompt, setSavingPrompt] = useState<string | null>(
    null,
  );

  // Feature-level provider overrides
  const [featureProviders, setFeatureProviders] =
    useState<FeatureProviderState>({
      leadRiskProvider: '',
      clientHealthProvider: '',
      executiveSummaryProvider: '',
      chatProvider: '',
    });
  const [savingFeatureProviders, setSavingFeatureProviders] =
    useState(false);

  // Key validation
  const [validating, setValidating] = useState(false);
  const [liveKeyStatus, setLiveKeyStatus] = useState<{
    anthropic: boolean;
    openai: boolean;
    gemini: boolean;
  } | null>(null);

  useEffect(() => {
    if (!settings) return;
    setSelectedProvider(settings.defaultProvider || 'openai');
    setAnthropicKey(settings.anthropicApiKey || '');
    setOpenaiKey(settings.openaiApiKey || '');
    setGeminiKey(settings.geminiApiKey || '');
    setPrompts({
      leadRiskPrompt: settings.leadRiskPrompt || '',
      clientHealthPrompt: settings.clientHealthPrompt || '',
      executiveSummaryPrompt: settings.executiveSummaryPrompt || '',
      upsellPrompt: settings.upsellPrompt || '',
      chatPrompt: settings.chatPrompt || '',
    });
    setFeatureProviders({
      leadRiskProvider: settings.leadRiskProvider || '',
      clientHealthProvider: settings.clientHealthProvider || '',
      executiveSummaryProvider:
        settings.executiveSummaryProvider || '',
      chatProvider: settings.chatProvider || '',
    });
    // Clear any stale live validation when settings refresh
    setLiveKeyStatus(null);
  }, [settings]);

  const handleSaveProvider = async () => {
    try {
      setSavingProvider(true);
      await api.admin.updateAISettings({
        defaultProvider: selectedProvider,
      });
      toast.success('Default provider updated');
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save';
      toast.error('Failed to update provider', {
        description: message,
      });
    } finally {
      setSavingProvider(false);
    }
  };

  const handleSaveAPIKeys = async () => {
    try {
      setSavingKeys(true);
      await api.admin.updateAISettings({
        anthropicApiKey: anthropicKey,
        openaiApiKey: openaiKey,
        geminiApiKey: geminiKey,
      });
      toast.success('API keys saved');
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save';
      toast.error('Failed to save API keys', {
        description: message,
      });
    } finally {
      setSavingKeys(false);
    }
  };

  const handleValidateKeys = async () => {
    try {
      setValidating(true);
      const results = await api.admin.checkAPIKeys();
      setLiveKeyStatus(results);
      const lines = [
        `Anthropic: ${results.anthropic ? '✓ valid' : '✗ invalid / not set'}`,
        `OpenAI: ${results.openai ? '✓ valid' : '✗ invalid / not set'}`,
        `Gemini: ${results.gemini ? '✓ valid' : '✗ invalid / not set'}`,
      ].join('  ·  ');
      toast.success('Key validation complete', {
        description: lines,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to validate';
      toast.error('Key validation failed', { description: message });
    } finally {
      setValidating(false);
    }
  };

  const handleSaveFeatureProviders = async () => {
    try {
      setSavingFeatureProviders(true);
      await api.admin.updateAISettings({
        leadRiskProvider: featureProviders.leadRiskProvider || null,
        clientHealthProvider:
          featureProviders.clientHealthProvider || null,
        executiveSummaryProvider:
          featureProviders.executiveSummaryProvider || null,
        chatProvider: featureProviders.chatProvider || null,
      });
      toast.success('Feature providers saved');
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save';
      toast.error('Failed to save feature providers', {
        description: message,
      });
    } finally {
      setSavingFeatureProviders(false);
    }
  };

  const handleSavePrompt = async (
    promptKey: keyof PromptState,
    label: string,
  ) => {
    try {
      setSavingPrompt(promptKey);
      await api.admin.updateAISettings({
        [promptKey]: prompts[promptKey],
      });
      toast.success(`${label} prompt saved`);
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save';
      toast.error('Failed to save prompt', { description: message });
    } finally {
      setSavingPrompt(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 min-h-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          AI Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure AI providers, manage API keys, and customize
          prompts
        </p>
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Sidebar nav ──────────────────────────────────────────────── */}
        <nav className="w-52 shrink-0">
          <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            {NAV.map((item, i) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    i > 0 ? 'border-t border-border/40' : ''
                  } ${
                    active
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}>
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-[13px] font-medium">
                    {item.label}
                  </span>
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-foreground shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* ── Provider & Keys ──────────────────────────────────────── */}
          {activeSection === 'provider' && (
            <>
              {/* Default Provider */}
              <section>
                <SectionLabel>Default AI Provider</SectionLabel>
                <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
                  <div className="px-5 py-4 space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Select which AI provider powers intelligent
                      features across the CRM.
                    </p>

                    <div className="grid grid-cols-3 gap-3">
                      {PROVIDERS.map((p) => {
                        const isSelected =
                          selectedProvider === p.value;
                        return (
                          <button
                            key={p.value}
                            onClick={() =>
                              setSelectedProvider(p.value)
                            }
                            className={`relative rounded-lg border px-3.5 py-3 text-left transition-all ${
                              isSelected
                                ? p.selectedClass
                                : 'border-border/60 hover:border-border'
                            }`}>
                            {isSelected && (
                              <Check className="absolute top-2.5 right-2.5 h-3 w-3 text-foreground" />
                            )}
                            <div className="flex items-center gap-2 mb-1.5">
                              <span
                                className={`h-2 w-2 rounded-full shrink-0 ${p.dotClass}`}
                              />
                              <span className="text-[12px] font-semibold text-foreground">
                                {p.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground pl-4">
                              {p.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        size="sm"
                        onClick={handleSaveProvider}
                        disabled={savingProvider}
                        className="gap-1.5">
                        {savingProvider ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Saving…
                          </>
                        ) : (
                          <>
                            <Save className="h-3.5 w-3.5" />
                            Save Provider
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </section>

              {/* API Keys */}
              <section>
                <SectionLabel>API Keys</SectionLabel>
                <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
                  {[
                    {
                      id: 'anthropic',
                      label: 'Anthropic',
                      placeholder: 'sk-ant-api…',
                      value: anthropicKey,
                      onChange: setAnthropicKey,
                      show: showAnthropicKey,
                      setShow: setShowAnthropicKey,
                      valid: liveKeyStatus
                        ? liveKeyStatus.anthropic
                        : !!settings?.anthropicKeyValid,
                      href: 'https://console.anthropic.com/settings/keys',
                      hrefLabel: 'Anthropic Console',
                    },
                    {
                      id: 'openai',
                      label: 'OpenAI',
                      placeholder: 'sk-proj-…',
                      value: openaiKey,
                      onChange: setOpenaiKey,
                      show: showOpenaiKey,
                      setShow: setShowOpenaiKey,
                      valid: liveKeyStatus
                        ? liveKeyStatus.openai
                        : !!settings?.openaiKeyValid,
                      href: 'https://platform.openai.com/api-keys',
                      hrefLabel: 'OpenAI Platform',
                    },
                    {
                      id: 'gemini',
                      label: 'Google Gemini',
                      placeholder: 'AIza…',
                      value: geminiKey,
                      onChange: setGeminiKey,
                      show: showGeminiKey,
                      setShow: setShowGeminiKey,
                      valid: liveKeyStatus
                        ? liveKeyStatus.gemini
                        : !!settings?.geminiKeyValid,
                      href: 'https://makersuite.google.com/app/apikey',
                      hrefLabel: 'Google AI Studio',
                    },
                  ].map((key, i) => (
                    <div
                      key={key.id}
                      className={`px-5 py-4 ${i > 0 ? 'border-t border-border/40' : ''}`}>
                      <div className="flex items-center justify-between mb-2.5">
                        <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold">
                          {key.label}
                        </Label>
                        <KeyStatusPill valid={key.valid} />
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type={key.show ? 'text' : 'password'}
                          value={key.value}
                          onChange={(e) => {
                            key.onChange(e.target.value);
                            // Clear live status when user edits a key
                            setLiveKeyStatus(null);
                          }}
                          placeholder={key.placeholder}
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                          onClick={() => key.setShow(!key.show)}>
                          {key.show ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        Get your key from{' '}
                        <a
                          href={key.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline">
                          {key.hrefLabel}
                        </a>
                      </p>
                    </div>
                  ))}

                  <div className="px-5 py-3.5 border-t border-border/40 bg-muted/20 flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Keys are encrypted at rest
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleValidateKeys}
                        disabled={validating || savingKeys}
                        className="gap-1.5">
                        {validating ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Testing…
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3.5 w-3.5" />
                            Test Connections
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveAPIKeys}
                        disabled={savingKeys || validating}
                        className="gap-1.5">
                        {savingKeys ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Saving…
                          </>
                        ) : (
                          <>
                            <Save className="h-3.5 w-3.5" />
                            Save Keys
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* ── AI Prompts ───────────────────────────────────────────── */}
          {activeSection === 'prompts' && (
            <section className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="px-5 py-4 border-b border-border/40 bg-muted/20">
                  <p className="text-xs text-muted-foreground">
                    Customize the system prompts used for each AI
                    feature. Changes take effect immediately on the
                    next AI call.
                  </p>
                </div>

                {PROMPTS.map((prompt, i) => (
                  <div
                    key={prompt.key}
                    className={`px-5 py-4 ${i > 0 ? 'border-t border-border/40' : ''}`}>
                    <div className="flex items-start justify-between gap-4 mb-2.5">
                      <div>
                        <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold">
                          {prompt.label}
                        </Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                          {prompt.desc}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 h-7 gap-1.5 text-xs px-2.5"
                        disabled={savingPrompt === prompt.key}
                        onClick={() =>
                          handleSavePrompt(prompt.key, prompt.label)
                        }>
                        {savingPrompt === prompt.key ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Saving…
                          </>
                        ) : (
                          <>
                            <Save className="h-3 w-3" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      value={prompts[prompt.key]}
                      onChange={(e) =>
                        setPrompts((prev) => ({
                          ...prev,
                          [prompt.key]: e.target.value,
                        }))
                      }
                      rows={prompt.rows}
                      className="font-mono text-xs resize-none"
                      placeholder={`Enter ${prompt.label.toLowerCase()} prompt…`}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Features ─────────────────────────────────────────────── */}
          {activeSection === 'features' && (
            <section className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border/40 bg-muted/20">
                  <p className="text-xs text-muted-foreground">
                    All features are active. Override the AI provider
                    per-feature — leave blank to use the global
                    default.
                  </p>
                </div>
                {FEATURES.map((feature, i) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={feature.label}
                      className={`flex items-center gap-4 px-5 py-4 ${
                        i > 0 ? 'border-t border-border/40' : ''
                      }`}>
                      <div
                        className={`h-8 w-8 rounded-lg ${feature.bgClass} flex items-center justify-center shrink-0`}>
                        <Icon
                          className={`h-4 w-4 ${feature.colorClass}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-foreground mb-0.5">
                          {feature.label}
                        </p>
                        <p className="text-xs text-muted-foreground leading-snug">
                          {feature.desc}
                        </p>
                      </div>
                      <div className="shrink-0 w-44">
                        {feature.providerKey ? (
                          <Select
                            value={
                              featureProviders[feature.providerKey] ||
                              'default'
                            }
                            onValueChange={(val) =>
                              setFeatureProviders((prev) => ({
                                ...prev,
                                [feature.providerKey!]:
                                  val === 'default' ? '' : val,
                              }))
                            }>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Use default" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">
                                <span className="text-muted-foreground">
                                  Use default
                                </span>
                              </SelectItem>
                              <SelectItem value="anthropic">
                                Anthropic Claude
                              </SelectItem>
                              <SelectItem value="openai">
                                OpenAI GPT-4o
                              </SelectItem>
                              <SelectItem value="gemini">
                                Google Gemini
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-emerald-100/70 text-emerald-900">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="px-5 py-3.5 border-t border-border/40 bg-muted/20 flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleSaveFeatureProviders}
                    disabled={savingFeatureProviders}
                    className="gap-1.5">
                    {savingFeatureProviders ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        Save Feature Settings
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
