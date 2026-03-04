'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, User, Loader2 } from 'lucide-react';
import { AuditLog } from '@/lib/types';

export default function AdminAuditLogsView() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/admin/audit-logs?limit=50`,
        {
          headers: {
            Authorization: `Bearer ${document.cookie.split('token=')[1]?.split(';')[0]}`,
          },
        }
      );
      if (response.ok) {
        const logs = await response.json();
        setAuditLogs(logs);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display tracking-tight">Audit Logs</h2>
        <p className="text-muted-foreground mt-1">
          Complete record of all system actions and changes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Audit Trail
          </CardTitle>
          <CardDescription>
            Complete record of all system actions and changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Showing {auditLogs.length} recent activity logs
                </p>
                <Button variant="outline" size="sm" onClick={loadAuditLogs}>
                  Refresh
                </Button>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {auditLogs.map((log: AuditLog, index: number) => (
                  <Card key={log.id || index} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {log.action}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm mb-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {log.user?.name || log.userId}
                            </span>
                            {log.user?.email && (
                              <span className="text-muted-foreground text-xs">
                                ({log.user.email})
                              </span>
                            )}
                            {log.user?.role && (
                              <Badge variant="secondary" className="text-xs">
                                {log.user.role}
                              </Badge>
                            )}
                          </div>
                          {log.details && (
                            <details className="mt-2">
                              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                View details
                              </summary>
                              <pre className="mt-2 text-xs bg-muted p-3 rounded border overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
