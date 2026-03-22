'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Zap,
  Play,
  Pause,
  MoreHorizontal,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { workflowsApi } from '@/lib/api/workflows-client';
import type { WorkflowRule, WorkflowExecution } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const triggers = [
  { value: 'LEAD_CREATED', label: 'Lead Created' },
  { value: 'LEAD_UPDATED', label: 'Lead Updated' },
  { value: 'LEAD_STAGE_CHANGED', label: 'Lead Stage Changed' },
  { value: 'CLIENT_CREATED', label: 'Customer Created' },
  { value: 'CLIENT_UPDATED', label: 'Customer Updated' },
  { value: 'PROJECT_CREATED', label: 'Project Created' },
  { value: 'PROJECT_UPDATED', label: 'Project Updated' },
  { value: 'TASK_CREATED', label: 'Task Created' },
  { value: 'TASK_COMPLETED', label: 'Task Completed' },
  { value: 'QUOTE_SENT', label: 'Quote Sent' },
  { value: 'QUOTE_ACCEPTED', label: 'Quote Accepted' },
  { value: 'QUOTE_REJECTED', label: 'Quote Rejected' },
];

const actionTypes = [
  { value: 'SEND_NOTIFICATION', label: 'Send Notification' },
  { value: 'SEND_EMAIL', label: 'Send Email' },
  { value: 'CREATE_TASK', label: 'Create Task' },
  { value: 'UPDATE_FIELD', label: 'Update Field' },
  { value: 'ASSIGN_USER', label: 'Assign User' },
];

const testEntityTypes = [
  { value: 'LEAD', label: 'Lead' },
  { value: 'PROJECT', label: 'Project' },
  { value: 'CLIENT', label: 'Customer' },
  { value: 'TASK', label: 'Task' },
];

const operators = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
  { value: 'in', label: 'In List' },
];

interface ConditionRow {
  field: string;
  operator: string;
  value: string;
}

interface ActionRow {
  type: string;
  config: Record<string, string>;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function WorkflowsAdmin() {
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [executions, setExecutions] = useState<WorkflowExecution[]>(
    [],
  );
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(
    null,
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Test Rule dialog state
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testingRule, setTestingRule] = useState<WorkflowRule | null>(null);
  const [testEntityType, setTestEntityType] = useState('LEAD');
  const [testEntityId, setTestEntityId] = useState('');
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<{
    conditionsMet: boolean;
    actionCount: number;
    actions: string[];
    message: string;
  } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('LEAD_CREATED');
  const [isActive, setIsActive] = useState(true);
  const [conditionLogic, setConditionLogic] = useState<'AND' | 'OR'>(
    'AND',
  );
  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([
    { type: 'SEND_NOTIFICATION', config: {} },
  ]);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const data = await workflowsApi.getAll();
      setRules(data);
    } catch (err) {
      console.error('Failed to fetch workflow rules', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const openCreate = () => {
    setEditingRule(null);
    setName('');
    setTrigger('LEAD_CREATED');
    setIsActive(true);
    setConditionLogic('AND');
    setConditions([]);
    setActions([{ type: 'SEND_NOTIFICATION', config: {} }]);
    setDialogOpen(true);
  };

  const openEdit = (rule: WorkflowRule) => {
    setEditingRule(rule);
    setName(rule.name);
    setTrigger(rule.trigger);
    setIsActive(rule.isActive);

    // Parse conditions
    if (rule.conditions && typeof rule.conditions === 'object') {
      setConditionLogic(
        (rule.conditions.logic as 'AND' | 'OR') || 'AND',
      );
      setConditions(
        (
          (rule.conditions.rules as Record<string, string>[]) || []
        ).map((r) => ({
          field: r.field || '',
          operator: r.operator || 'equals',
          value: r.value || '',
        })),
      );
    } else {
      setConditionLogic('AND');
      setConditions([]);
    }

    // Parse actions
    if (Array.isArray(rule.actions)) {
      setActions(
        rule.actions.map((a) => ({
          type: (a.type as string) || 'SEND_NOTIFICATION',
          config: (a.config as Record<string, string>) || {},
        })),
      );
    } else {
      setActions([{ type: 'SEND_NOTIFICATION', config: {} }]);
    }

    setDialogOpen(true);
  };

  const openHistory = async (ruleId: string) => {
    try {
      const data = await workflowsApi.getExecutions(ruleId);
      setExecutions(data);
      setHistoryDialogOpen(true);
    } catch (err) {
      console.error('Failed to fetch executions', err);
    }
  };

  const openTest = (rule: WorkflowRule) => {
    setTestingRule(rule);
    setTestEntityType('LEAD');
    setTestEntityId('');
    setTestResult(null);
    setTestError(null);
    setTestDialogOpen(true);
  };

  const handleRunTest = async () => {
    if (!testingRule) return;
    setTestRunning(true);
    setTestResult(null);
    setTestError(null);
    try {
      const result = await workflowsApi.testRule(testingRule.id, {
        entityType: testEntityType,
        entityId: testEntityId.trim() || undefined,
      });
      setTestResult(result);
    } catch (err) {
      setTestError(
        err instanceof Error ? err.message : 'An unexpected error occurred',
      );
    } finally {
      setTestRunning(false);
    }
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      { field: '', operator: 'equals', value: '' },
    ]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (
    index: number,
    field: keyof ConditionRow,
    value: string,
  ) => {
    const updated = [...conditions];
    updated[index][field] = value;
    setConditions(updated);
  };

  const addAction = () => {
    setActions([
      ...actions,
      { type: 'SEND_NOTIFICATION', config: {} },
    ]);
  };

  const removeAction = (index: number) => {
    if (actions.length <= 1) return;
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (
    index: number,
    field: string,
    value: string,
  ) => {
    const updated = [...actions];
    if (field === 'type') {
      updated[index] = { type: value, config: {} };
    } else {
      updated[index].config[field] = value;
    }
    setActions(updated);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name,
        trigger,
        isActive,
        conditions: {
          logic: conditionLogic,
          rules: conditions.filter((c) => c.field.trim()),
        },
        actions: actions.map((a) => ({
          type: a.type,
          config: a.config,
        })),
      };

      if (editingRule) {
        await workflowsApi.update(editingRule.id, payload);
      } else {
        await workflowsApi.create(payload);
      }
      setDialogOpen(false);
      fetchRules();
      toast.success(editingRule ? 'Workflow updated' : 'Workflow created');
    } catch (err) {
      console.error('Failed to save workflow', err);
      toast.error('Failed to save workflow', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (rule: WorkflowRule) => {
    try {
      await workflowsApi.update(rule.id, {
        isActive: !rule.isActive,
      });
      fetchRules();
    } catch (err) {
      console.error('Failed to toggle workflow', err);
      toast.error('Failed to update workflow');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await workflowsApi.delete(deleteId);
      setDeleteId(null);
      fetchRules();
      toast.success('Workflow deleted');
    } catch (err) {
      console.error('Failed to delete workflow', err);
      toast.error('Failed to delete workflow');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Workflow Automation
          </h1>
          <p className="text-sm text-muted-foreground">
            Automate actions based on triggers and conditions
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Rule
        </Button>
      </div>

      {/* Stats bar */}
      <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="grid grid-cols-3 gap-px bg-border/60">
          <div className="bg-card px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
              Total Rules
            </p>
            <p className="text-[22px] font-bold tabular-nums leading-none text-foreground mt-1">
              {rules.length}
            </p>
          </div>
          <div className="bg-card px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
              Active
            </p>
            <p className="text-[22px] font-bold tabular-nums leading-none text-green-600 mt-1">
              {rules.filter((r) => r.isActive).length}
            </p>
          </div>
          <div className="bg-card px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
              Total Executions
            </p>
            <p className="text-[22px] font-bold tabular-nums leading-none text-foreground mt-1">
              {rules.reduce(
                (sum, r) => sum + (r._count?.executions || 0),
                0,
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Rules list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Zap className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">
            No workflow rules configured
          </p>
          <Button
            onClick={openCreate}
            variant="outline"
            size="sm"
            className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Create your first rule
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={cn(
                'rounded-xl border border-border/60 bg-card p-4 hover:shadow-sm transition-all',
                !rule.isActive && 'opacity-60',
              )}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Zap
                      className={cn(
                        'h-4 w-4',
                        rule.isActive
                          ? 'text-amber-500'
                          : 'text-muted-foreground',
                      )}
                    />
                    <h3 className="text-sm font-semibold">
                      {rule.name}
                    </h3>
                    <Badge
                      className={cn(
                        'text-[10px]',
                        rule.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500',
                      )}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>
                      <span className="font-medium text-foreground">
                        Trigger:
                      </span>{' '}
                      {triggers.find((t) => t.value === rule.trigger)
                        ?.label || rule.trigger}
                    </span>
                    <span>
                      <span className="font-medium text-foreground">
                        Actions:
                      </span>{' '}
                      {Array.isArray(rule.actions)
                        ? rule.actions.length
                        : 0}
                    </span>
                    <span>
                      <span className="font-medium text-foreground">
                        Executions:
                      </span>{' '}
                      {rule._count?.executions || 0}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(rule)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleToggleActive(rule)}>
                      {rule.isActive ? (
                        <>
                          <Pause className="mr-2 h-3.5 w-3.5" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-3.5 w-3.5" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => openHistory(rule.id)}>
                      <History className="mr-2 h-3.5 w-3.5" />
                      Execution History
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openTest(rule)}>
                      <Play className="mr-2 h-3.5 w-3.5" />
                      Test Rule
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteId(rule.id)}>
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule
                ? 'Edit Workflow Rule'
                : 'New Workflow Rule'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Rule Name *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Notify on new lead"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Trigger *
                </label>
                <Select value={trigger} onValueChange={setTrigger}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {triggers.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(!!checked)}
              />
              <label className="text-sm">Active</label>
            </div>

            {/* Conditions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  Conditions (optional)
                </p>
                <div className="flex items-center gap-2">
                  <Select
                    value={conditionLogic}
                    onValueChange={(v) =>
                      setConditionLogic(v as 'AND' | 'OR')
                    }>
                    <SelectTrigger className="w-20 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={addCondition}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                </div>
              </div>
              {conditions.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  No conditions — rule triggers on every matching
                  event
                </p>
              )}
              <div className="space-y-2">
                {conditions.map((cond, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_140px_1fr_32px] gap-2 items-start">
                    <Input
                      value={cond.field}
                      onChange={(e) =>
                        updateCondition(i, 'field', e.target.value)
                      }
                      placeholder="Field (e.g. status)"
                      className="text-sm"
                    />
                    <Select
                      value={cond.operator}
                      onValueChange={(v) =>
                        updateCondition(i, 'operator', v)
                      }>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={cond.value}
                      onChange={(e) =>
                        updateCondition(i, 'value', e.target.value)
                      }
                      placeholder="Value"
                      className="text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeCondition(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  Actions *
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={addAction}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Action
                </Button>
              </div>
              <div className="space-y-3">
                {actions.map((action, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border/60 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Select
                        value={action.type}
                        onValueChange={(v) =>
                          updateAction(i, 'type', v)
                        }>
                        <SelectTrigger className="text-sm flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {actionTypes.map((at) => (
                            <SelectItem
                              key={at.value}
                              value={at.value}>
                              {at.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeAction(i)}
                        disabled={actions.length <= 1}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {/* Action config based on type */}
                    {action.type === 'SEND_NOTIFICATION' && (
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={action.config.title || ''}
                          onChange={(e) =>
                            updateAction(i, 'title', e.target.value)
                          }
                          placeholder="Notification title"
                          className="text-sm"
                        />
                        <Input
                          value={action.config.message || ''}
                          onChange={(e) =>
                            updateAction(i, 'message', e.target.value)
                          }
                          placeholder="Message (supports {{variable}})"
                          className="text-sm"
                        />
                      </div>
                    )}
                    {action.type === 'SEND_EMAIL' && (
                      <div className="space-y-2">
                        <Input
                          value={action.config.to || ''}
                          onChange={(e) =>
                            updateAction(i, 'to', e.target.value)
                          }
                          placeholder="Recipient email or {{variable}}"
                          className="text-sm"
                        />
                        <Input
                          value={action.config.subject || ''}
                          onChange={(e) =>
                            updateAction(i, 'subject', e.target.value)
                          }
                          placeholder="Subject"
                          className="text-sm"
                        />
                        <Textarea
                          value={action.config.body || ''}
                          onChange={(e) =>
                            updateAction(i, 'body', e.target.value)
                          }
                          placeholder="Message body"
                          className="text-sm resize-none"
                          rows={3}
                        />
                      </div>
                    )}
                    {action.type === 'CREATE_TASK' && (
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={action.config.title || ''}
                          onChange={(e) =>
                            updateAction(i, 'title', e.target.value)
                          }
                          placeholder="Task title"
                          className="text-sm"
                        />
                        <Input
                          value={action.config.assignToField || ''}
                          onChange={(e) =>
                            updateAction(
                              i,
                              'assignToField',
                              e.target.value,
                            )
                          }
                          placeholder="Assign to (field name)"
                          className="text-sm"
                        />
                      </div>
                    )}
                    {action.type === 'UPDATE_FIELD' && (
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={action.config.field || ''}
                          onChange={(e) =>
                            updateAction(i, 'field', e.target.value)
                          }
                          placeholder="Field name"
                          className="text-sm"
                        />
                        <Input
                          value={action.config.value || ''}
                          onChange={(e) =>
                            updateAction(i, 'value', e.target.value)
                          }
                          placeholder="New value"
                          className="text-sm"
                        />
                      </div>
                    )}
                    {action.type === 'ASSIGN_USER' && (
                      <Input
                        value={action.config.userId || ''}
                        onChange={(e) =>
                          updateAction(i, 'userId', e.target.value)
                        }
                        placeholder="User ID to assign"
                        className="text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim()}>
              {saving && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingRule ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Execution History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Execution History</DialogTitle>
          </DialogHeader>
          {executions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No executions yet
            </p>
          ) : (
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40">
                    <th className="text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground px-3 py-2">
                      Date
                    </th>
                    <th className="text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground px-3 py-2">
                      Entity
                    </th>
                    <th className="text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground px-3 py-2">
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map((exec) => (
                    <tr
                      key={exec.id}
                      className="border-t border-border/40">
                      <td className="px-3 py-2">
                        {formatDate(exec.executedAt)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs">
                          {exec.entityType} /{' '}
                          {exec.entityId.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          className={cn(
                            'text-[10px]',
                            exec.result === 'SUCCESS'
                              ? 'bg-green-100 text-green-700'
                              : exec.result === 'FAILED'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-500',
                          )}>
                          {exec.result === 'SUCCESS' && (
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                          )}
                          {exec.result === 'FAILED' && (
                            <XCircle className="mr-1 h-3 w-3" />
                          )}
                          {exec.result === 'SKIPPED' && (
                            <AlertTriangle className="mr-1 h-3 w-3" />
                          )}
                          {exec.result}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow Rule</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this rule and all execution
              history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Test Rule Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Test Rule:{' '}
              <span className="font-normal text-muted-foreground">
                {testingRule?.name}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Entity Type
              </label>
              <Select
                value={testEntityType}
                onValueChange={setTestEntityType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {testEntityTypes.map((et) => (
                    <SelectItem key={et.value} value={et.value}>
                      {et.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Entity ID (optional)
              </label>
              <Input
                value={testEntityId}
                onChange={(e) => setTestEntityId(e.target.value)}
                placeholder="Leave blank to test with empty context"
                className="mt-1 text-sm"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Leave blank to test with empty context
              </p>
            </div>

            {/* Results */}
            {testError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                <p className="text-sm text-red-700">{testError}</p>
              </div>
            )}

            {testResult && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  {testResult.conditionsMet ? (
                    <Badge className="bg-green-100 text-green-700 text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Conditions Met
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-700 text-xs gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Conditions Not Met
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {testResult.message}
                </p>

                {testResult.conditionsMet &&
                  testResult.actions.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium mb-1.5">
                        Actions ({testResult.actionCount})
                      </p>
                      <ul className="space-y-1">
                        {testResult.actions.map((action, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-1.5 text-xs text-foreground">
                            <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-500 shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setTestDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={handleRunTest}
              disabled={testRunning}>
              {testRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Test
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
