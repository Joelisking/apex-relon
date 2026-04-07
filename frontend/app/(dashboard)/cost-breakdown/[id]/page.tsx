'use client';

import { use } from 'react';
import CostBreakdownEditor from '@/components/cost-breakdown/CostBreakdownEditor';

export default function CostBreakdownDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CostBreakdownEditor breakdownId={id} />;
}
