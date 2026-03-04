'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';

export default function AdminSystemView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display tracking-tight">System</h2>
        <p className="text-muted-foreground mt-1">
          Application version and system status
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Application version and system status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Version</p>
              <p className="text-lg font-semibold">v1.0.0</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Environment</p>
              <Badge variant="outline">Production</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Database</p>
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm">Connected</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">API Server</p>
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm">Running</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
