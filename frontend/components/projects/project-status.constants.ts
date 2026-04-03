import type { ElementType } from 'react';
import { CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';

export const RISK_HEX: Record<string, string> = {
  'On Track': '#10b981',
  'At Risk': '#f59e0b',
  'High Risk': '#ef4444',
  Blocked: '#ef4444',
};

export const STATUS_HEX: Record<string, string> = {
  Planning: '#3b82f6',
  Active: '#10b981',
  'On Hold': '#f59e0b',
  Completed: '#6b7280',
  Cancelled: '#ef4444',
};

export const STATUS_CHIP: Record<string, string> = {
  Planning: 'text-blue-700 bg-blue-50 border-blue-200',
  Active: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  'On Hold': 'text-amber-700 bg-amber-50 border-amber-200',
  Completed: 'text-gray-600 bg-gray-100 border-gray-200',
  Cancelled: 'text-red-700 bg-red-50 border-red-200',
};

export const RISK_CHIP: Record<string, { classes: string; icon: ElementType }> = {
  'On Track': { classes: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle },
  'At Risk': { classes: 'text-amber-700 bg-amber-50 border-amber-200', icon: AlertTriangle },
  'High Risk': { classes: 'text-red-700 bg-red-50 border-red-200', icon: ShieldAlert },
  Blocked: { classes: 'text-red-700 bg-red-50 border-red-200', icon: ShieldAlert },
};
