'use client';

import {
  Heart,
  Mail,
  Phone,
  MapPin,
  Globe,
  Trash2,
  User,
  Pencil,
  DollarSign,
  Activity,
  Briefcase,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { Client } from '@/lib/types';

const STATUS_HEX: Record<string, string> = {
  Active: '#10b981',
  'At Risk': '#ef4444',
  Dormant: '#f59e0b',
};

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-emerald-100/70 text-emerald-900',
  'At Risk': 'bg-red-100/70    text-red-900',
  Dormant: 'bg-amber-100/70  text-amber-900',
};

const STATUS_DOT: Record<string, string> = {
  Active: 'bg-emerald-400',
  'At Risk': 'bg-red-400',
  Dormant: 'bg-amber-400',
};

function getHealthHex(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-[0.06em] text-muted-foreground font-semibold mb-3">
      {children}
    </p>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3 w-3 text-muted-foreground/40 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.04em]">{label}</p>
        <p className="text-xs text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}

interface Props {
  client: Client;
  clientDisplayName: string;
  clientDisplaySubtitle: string | null;
  clientInitials: string;
  activitiesCount: number;
  projectsCount: number;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function CustomerDetailSidebar({
  client,
  clientDisplayName,
  clientDisplaySubtitle,
  clientInitials,
  activitiesCount,
  projectsCount,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: Props) {
  const accentColor = STATUS_HEX[client.status] ?? '#6b7280';
  const statusColors = STATUS_COLORS[client.status] ?? 'bg-muted text-muted-foreground';
  const statusDot = STATUS_DOT[client.status] ?? 'bg-muted-foreground/30';

  const hasContact =
    client.email ||
    client.phone ||
    client.address ||
    client.website ||
    client.individualName ||
    client.individualType;

  return (
    <div className="w-72 shrink-0 border-r border-border/60 bg-muted/20 flex flex-col overflow-y-auto">
      {/* Accent strip */}
      <div className="h-[3px] w-full shrink-0" style={{ backgroundColor: accentColor }} />

      {/* Header */}
      <div className="px-5 pt-4 pb-4 border-b border-border/40">
        <div className="flex items-start gap-3 mb-3">
          <div
            className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-[13px]"
            style={{ backgroundColor: accentColor }}>
            {clientInitials}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-sm font-semibold leading-tight line-clamp-2 text-foreground">
              {clientDisplayName}
            </h2>
            {clientDisplaySubtitle ? (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {clientDisplaySubtitle}
              </p>
            ) : client.industry ? (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{client.industry}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium rounded-full px-2.5 py-1 ${statusColors}`}>
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDot}`} />
            {client.status}
          </span>
          {client.healthScore != null && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2.5 py-1 bg-muted text-muted-foreground">
              <Heart className="h-2.5 w-2.5" />
              {client.healthScore}%
            </span>
          )}
          {client.segment && (
            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium bg-muted text-muted-foreground">
              {client.segment}
            </span>
          )}
        </div>
      </div>

      {/* Financials */}
      <div className="px-5 py-4 border-b border-border/40">
        <SectionLabel>Financials</SectionLabel>
        <div className="grid grid-cols-1 gap-px bg-border/40 rounded-lg overflow-hidden">
          <div className="bg-card px-3 py-2.5 space-y-0.5">
            <p className="text-[9px] uppercase tracking-[0.06em] text-muted-foreground font-medium flex items-center gap-1">
              <DollarSign className="h-2.5 w-2.5" />
              Lifetime Revenue
            </p>
            <p className="text-[22px] font-bold tabular-nums leading-none text-foreground">
              ${((client.metrics?.totalRevenue || client.lifetimeRevenue || 0) / 1000).toFixed(0)}k
            </p>
          </div>
        </div>

        {client.healthScore != null && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.04em]">
                Health Score
              </p>
              <span
                className="text-[11px] font-semibold tabular-nums"
                style={{ color: getHealthHex(client.healthScore) }}>
                {client.healthScore}%
              </span>
            </div>
            <Progress value={client.healthScore} className="h-1.5" />
          </div>
        )}
      </div>

      {/* Pulse */}
      <div className="px-5 py-4 border-b border-border/40">
        <SectionLabel>Pulse</SectionLabel>
        <div className="grid grid-cols-2 gap-px bg-border/40 rounded-lg overflow-hidden">
          {[
            { label: 'Activities', value: activitiesCount, icon: Activity },
            { label: 'Projects', value: projectsCount, icon: Briefcase },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="bg-card px-2.5 py-2.5 text-center">
                <p className="text-[18px] font-bold tabular-nums leading-none text-foreground mb-1">
                  {m.value}
                </p>
                <div className="flex items-center justify-center gap-1 text-[9px] text-muted-foreground uppercase tracking-[0.04em]">
                  <Icon className="h-2.5 w-2.5" />
                  {m.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contact */}
      {hasContact && (
        <div className="px-5 py-4 border-b border-border/40 space-y-2.5">
          <SectionLabel>Contact</SectionLabel>
          {client.individualName && (
            <InfoRow icon={User} label="Contact Name" value={client.individualName} />
          )}
          {client.individualType && (
            <InfoRow icon={User} label="Type" value={client.individualType} />
          )}
          {client.email && <InfoRow icon={Mail} label="Email" value={client.email} />}
          {client.phone && <InfoRow icon={Phone} label="Phone" value={client.phone} />}
          {client.address && <InfoRow icon={MapPin} label="Address" value={client.address} />}
          {client.website && <InfoRow icon={Globe} label="Website" value={client.website} />}
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto px-5 py-4 border-t border-border/40 space-y-1.5">
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="w-full justify-start gap-2 text-xs">
            <Pencil className="h-3.5 w-3.5" />
            Edit Customer
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="w-full justify-start gap-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5" />
            Archive Customer
          </Button>
        )}
      </div>
    </div>
  );
}
