import QuoteEditor from '@/components/quotes/QuoteEditor';

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QuoteEditor quoteId={id} />;
}
