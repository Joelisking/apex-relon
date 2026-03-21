'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart } from 'lucide-react';
import type { Client } from '@/lib/types';

interface CustomerCardProps {
  client: Client;
  onClick: () => void;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'at risk':
    case 'dormant':
      return 'bg-red-50 text-red-600 border-red-200';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const getHealthColor = (score: number) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

export function CustomerCard({ client, onClick }: CustomerCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all"
      onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
                {(client.individualName || client.name).charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{client.individualName || client.name}</CardTitle>
              <CardDescription className="text-xs">
                {client.individualName ? client.name : client.industry}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={getStatusColor(client.status)}>
            {client.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Lifetime Revenue</span>
            <span className="font-semibold">
              ${((client.lifetimeRevenue || 0) / 1000).toFixed(0)}k
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Segment</span>
            <Badge variant="secondary" className="text-xs">
              {client.segment}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Manager</span>
            <span className="text-xs">
              {client.accountManager?.name || 'Unassigned'}
            </span>
          </div>
        </div>

        <Separator />

        {client.healthScore !== null && client.healthScore !== undefined ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Heart className="h-3 w-3" />
                Health Score
              </span>
              <span className={`font-semibold ${getHealthColor(client.healthScore)}`}>
                {client.healthScore}%
              </span>
            </div>
            <Progress value={client.healthScore} className="h-2" />
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground italic">
              No health score available
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
