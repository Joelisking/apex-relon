'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { projectsApi, type CostLog } from '@/lib/api/projects-client';
import { settingsApi } from '@/lib/api/client';
import type { DropdownOption } from '@/lib/types';

interface CostLogsSectionProps {
  projectId: string;
  costLogs: CostLog[];
  estimatedRevenue: number;
  totalCost: number;
  onUpdated: () => void;
  canEditCosts?: boolean;
}

export function CostLogsSection({
  projectId,
  costLogs,
  estimatedRevenue,
  totalCost,
  onUpdated,
  canEditCosts = false,
}: CostLogsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [costCategories, setCostCategories] = useState<DropdownOption[]>([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    amount: '',
  });

  useEffect(() => {
    settingsApi.getDropdownOptions('cost_category').then(setCostCategories).catch(console.error);
  }, []);

  const grossMargin = estimatedRevenue - totalCost;
  const marginPercent =
    estimatedRevenue > 0 ? (grossMargin / estimatedRevenue) * 100 : 0;

  const handleAdd = async () => {
    if (!form.category || !form.description || !form.amount) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      await projectsApi.addCostLog(projectId, {
        date: form.date,
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
      });
      toast.success('Cost log added');
      setForm({
        date: new Date().toISOString().split('T')[0],
        category: '',
        description: '',
        amount: '',
      });
      setShowForm(false);
      onUpdated();
    } catch (error) {
      toast.error('Failed to add cost log', { description: error instanceof Error ? error.message : undefined });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (costId: string) => {
    if (!confirm('Delete this cost entry?')) return;
    try {
      await projectsApi.removeCostLog(projectId, costId);
      toast.success('Cost log removed');
      onUpdated();
    } catch (error) {
      toast.error('Failed to delete cost log', { description: error instanceof Error ? error.message : undefined });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Cost Logs</h3>
        {canEditCosts && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Cost
          </Button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <DatePicker
                value={form.date}
                onChange={(v) => setForm({ ...form, date: v })}
                clearable={false}
                placeholder="Pick date"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {costCategories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Input
              placeholder="What was this cost for?"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Amount ($)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </div>
      )}

      {/* Cost table */}
      {costLogs.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>By</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {canEditCosts && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {costLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs">
                    {format(new Date(log.date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-xs">{log.category}</TableCell>
                  <TableCell className="text-xs">{log.description}</TableCell>
                  <TableCell className="text-xs">
                    {log.user?.name || '-'}
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium">
                    ${log.amount.toLocaleString()}
                  </TableCell>
                  {canEditCosts && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(log.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6 border-2 border-dashed rounded-lg">
          No cost entries yet
        </p>
      )}

      {/* Summary footer */}
      <div className="grid grid-cols-4 gap-3 rounded-lg border p-3">
        <div>
          <p className="text-xs text-muted-foreground">Total Cost</p>
          <p className="text-sm font-semibold">${totalCost.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Est. Revenue</p>
          <p className="text-sm font-semibold">
            ${estimatedRevenue.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Gross Margin</p>
          <p
            className={`text-sm font-semibold ${
              grossMargin >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            ${grossMargin.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Margin %</p>
          <p
            className={`text-sm font-semibold ${
              marginPercent >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {marginPercent.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}
