export const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

export const statusColors: Record<string, string> = {
  OPEN: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  DONE: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export function formatDate(d: string | null | undefined) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function isOverdue(
  dueDate: string | null | undefined,
  status: string,
) {
  if (!dueDate || status === 'DONE' || status === 'CANCELLED')
    return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export function isDueToday(dueDate: string | null | undefined) {
  if (!dueDate) return false;
  const today = new Date().toDateString();
  return new Date(dueDate).toDateString() === today;
}
