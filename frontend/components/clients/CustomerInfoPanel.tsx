'use client';

import { Mail, Phone, MapPin, Globe, User, Building2, Tag, MapPinned, UserCircle } from 'lucide-react';
import type { Client } from '@/lib/types';

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
      <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium leading-none mb-0.5">
          {label}
        </p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline break-words">
            {value}
          </a>
        ) : (
          <p className="text-sm text-foreground break-words">{value}</p>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 px-1">
      {children}
    </p>
  );
}

interface Props {
  client: Client;
}

export function CustomerInfoPanel({ client }: Props) {
  const contactRows = [
    client.individualName && { icon: User, label: 'Contact Name', value: client.individualName },
    client.individualType && { icon: User, label: 'Contact Type', value: client.individualType },
    client.email && { icon: Mail, label: 'Email', value: client.email, href: `mailto:${client.email}` },
    client.phone && { icon: Phone, label: 'Phone', value: client.phone, href: `tel:${client.phone}` },
    client.address && { icon: MapPin, label: 'Address', value: client.address },
    client.website && {
      icon: Globe,
      label: 'Website',
      value: client.website,
      href: client.website.startsWith('http') ? client.website : `https://${client.website}`,
    },
  ].filter(Boolean) as Array<{ icon: React.ElementType; label: string; value: string; href?: string }>;

  const classificationRows = [
    client.industry && { icon: Building2, label: 'Industry', value: client.industry },
    client.segment && { icon: Tag, label: 'Segment', value: client.segment },
    client.county && { icon: MapPinned, label: 'County', value: client.county },
  ].filter(Boolean) as Array<{ icon: React.ElementType; label: string; value: string }>;

  const accountManagerRow = client.accountManager
    ? { icon: UserCircle, label: 'Account Manager', value: client.accountManager.name }
    : null;

  const hasContact = contactRows.length > 0;
  const hasClassification = classificationRows.length > 0 || accountManagerRow;

  if (!hasContact && !hasClassification) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {hasContact && (
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <SectionTitle>Contact</SectionTitle>
          <div>
            {contactRows.map((row) => (
              <InfoRow key={row.label} {...row} />
            ))}
          </div>
        </div>
      )}

      {hasClassification && (
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <SectionTitle>Classification</SectionTitle>
          <div>
            {classificationRows.map((row) => (
              <InfoRow key={row.label} {...row} />
            ))}
            {accountManagerRow && <InfoRow {...accountManagerRow} />}
          </div>
        </div>
      )}
    </div>
  );
}
