import ProposalTemplatesSection from '@/components/admin/ProposalTemplatesSection';

export default function AdminProposalTemplatesPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-display tracking-tight">Proposal Templates</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage Word document templates used to generate proposals.
        </p>
      </div>
      <ProposalTemplatesSection />
    </div>
  );
}
