'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  Users,
  RefreshCw,
  Bot,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { API_URL, getTokenFromClientCookies } from '@/lib/api/client';

async function analyticsFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getTokenFromClientCookies() ?? '';
  const res = await fetch(`${API_URL}/analytics/bottleneck${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

interface StageDwell {
  stage: string;
  avgDays: number;
  medianDays: number;
  maxDays: number;
  count: number;
  isCritical: boolean;
}

interface TaskVelocity {
  userId: string;
  userName: string;
  assigned: number;
  completed: number;
  overdue: number;
  completionRate: number;
}

interface OverdueResult {
  userId: string;
  userName: string;
  overdueCount: number;
  avgDaysOverdue: number;
  oldestTaskDays: number;
}

interface StuckProject {
  id: string;
  name: string;
  clientName: string;
  status: string;
  daysSinceUpdate: number;
}

interface AiReport {
  content: string;
  generatedAt: string;
}

// Simple markdown renderer (bold + headers)
function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="prose prose-sm max-w-none text-sm">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h2 key={i} className="text-base font-semibold mt-4 mb-1">{line.slice(3)}</h2>;
        if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-semibold mt-3 mb-1">{line.slice(4)}</h3>;
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold">{line.slice(2, -2)}</p>;
        if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc">{line.slice(2)}</li>;
        if (line.trim() === '') return <br key={i} />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

export function BottleneckDashboard() {
  const [generatingReport, setGeneratingReport] = useState(false);

  const { data: stageDwell = [], isLoading: dwellLoading } = useQuery<StageDwell[]>({
    queryKey: ['bottleneck-stage-dwell'],
    queryFn: () => analyticsFetch<StageDwell[]>('/stage-dwell'),
  });

  const { data: taskVelocity = [], isLoading: velocityLoading } = useQuery<TaskVelocity[]>({
    queryKey: ['bottleneck-task-velocity'],
    queryFn: () => analyticsFetch<TaskVelocity[]>('/task-velocity'),
  });

  const { data: overdue = [] } = useQuery<OverdueResult[]>({
    queryKey: ['bottleneck-overdue'],
    queryFn: () => analyticsFetch<OverdueResult[]>('/overdue'),
  });

  const { data: stuckProjects = [] } = useQuery<StuckProject[]>({
    queryKey: ['bottleneck-stuck'],
    queryFn: () => analyticsFetch<StuckProject[]>('/stuck-projects'),
  });

  const { data: aiReport, refetch: refetchReport } = useQuery<AiReport | null>({
    queryKey: ['bottleneck-ai-report'],
    queryFn: () => analyticsFetch<AiReport | null>('/ai-report/latest'),
  });

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      await analyticsFetch('/ai-report', { method: 'POST' });
      await refetchReport();
      toast.success('AI bottleneck report generated');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const criticalStages = stageDwell.filter((s) => s.isCritical);
  const totalOverdue = overdue.reduce((s, u) => s + u.overdueCount, 0);

  const maxDwellDays = Math.max(...stageDwell.map((s) => s.avgDays), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display tracking-tight">Bottleneck Analytics</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered delay analysis to keep your projects moving.
          </p>
        </div>
        <Button onClick={handleGenerateReport} disabled={generatingReport} size="sm">
          {generatingReport ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Bot className="h-4 w-4 mr-2" />
          )}
          {generatingReport ? 'Generating…' : 'Generate AI Report'}
        </Button>
      </div>

      {/* Alert Banner */}
      {criticalStages.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            <strong>{criticalStages.length} critical bottleneck{criticalStages.length > 1 ? 's' : ''} detected:</strong>{' '}
            {criticalStages.map((s) => `${s.stage} (${s.avgDays}d avg)`).join(', ')}
          </p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Critical Stages</p>
            <p className={`text-2xl font-bold mt-1 ${criticalStages.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {criticalStages.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Overdue Tasks</p>
            <p className={`text-2xl font-bold mt-1 ${totalOverdue > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {totalOverdue}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Stuck Projects</p>
            <p className={`text-2xl font-bold mt-1 ${stuckProjects.length > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {stuckProjects.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Avg Completion Rate</p>
            <p className="text-2xl font-bold mt-1">
              {taskVelocity.length > 0
                ? Math.round(
                    taskVelocity.reduce((s, u) => s + u.completionRate, 0) / taskVelocity.length,
                  )
                : 0}
              %
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Stage Dwell Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Stage Dwell Time (avg days)
            </CardTitle>
            <CardDescription>How long leads/projects sit in each stage</CardDescription>
          </CardHeader>
          <CardContent>
            {dwellLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : stageDwell.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stage history data yet.</p>
            ) : (
              <div className="space-y-3">
                {stageDwell.slice(0, 8).map((s) => (
                  <div key={s.stage} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm flex items-center gap-1.5">
                        {s.isCritical && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                        {s.stage}
                      </span>
                      <span className="text-sm font-mono text-muted-foreground">{s.avgDays}d</span>
                    </div>
                    <Progress
                      value={(s.avgDays / maxDwellDays) * 100}
                      className={s.isCritical ? '[&>div]:bg-red-500' : '[&>div]:bg-blue-500'}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task Velocity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Task Velocity (last 30 days)
            </CardTitle>
            <CardDescription>Completion rate per team member</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {velocityLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : taskVelocity.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No task data yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Done</TableHead>
                    <TableHead>Overdue</TableHead>
                    <TableHead>Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskVelocity.slice(0, 6).map((u) => (
                    <TableRow key={u.userId}>
                      <TableCell className="font-medium text-sm">{u.userName}</TableCell>
                      <TableCell className="text-sm">{u.completed}/{u.assigned}</TableCell>
                      <TableCell>
                        {u.overdue > 0 ? (
                          <Badge variant="destructive" className="text-xs">{u.overdue}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm font-mono ${u.completionRate < 50 ? 'text-red-600' : u.completionRate < 75 ? 'text-amber-600' : 'text-green-600'}`}>
                          {u.completionRate}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stuck Projects */}
      {stuckProjects.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-amber-500" />
              Stuck Projects ({stuckProjects.length})
            </CardTitle>
            <CardDescription>Projects with no updates in 14+ days</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Days Stale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stuckProjects.slice(0, 8).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-sm">{p.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.clientName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{p.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm font-mono ${p.daysSinceUpdate > 30 ? 'text-red-600' : 'text-amber-600'}`}>
                        {p.daysSinceUpdate}d
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* AI Report */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="h-4 w-4 text-violet-500" />
            AI Bottleneck Analysis
          </CardTitle>
          {aiReport && (
            <CardDescription>
              Generated {new Date(aiReport.generatedAt).toLocaleString()}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {aiReport ? (
            <SimpleMarkdown content={aiReport.content} />
          ) : (
            <div className="text-center py-6">
              <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                No AI report generated yet. Click "Generate AI Report" to analyze your bottlenecks.
              </p>
              <Button size="sm" onClick={handleGenerateReport} disabled={generatingReport}>
                {generatingReport ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Bot className="h-4 w-4 mr-2" />
                )}
                Generate Report
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
