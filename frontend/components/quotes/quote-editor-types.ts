export interface QuoteFormState {
  leadId: string;
  clientId: string;
  projectId: string;
  validUntil: string;
  notes: string;
  termsAndConditions: string;
  taxRate: number;
  discount: number;
  currency: string;
}

export interface LineItemRow {
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  sortOrder: number;
}
