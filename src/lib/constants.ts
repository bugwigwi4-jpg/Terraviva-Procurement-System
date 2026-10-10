export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  procurement_officer: 'Procurement Officer',
  finance_officer: 'Finance Officer',
  department_head: 'Department Head',
  approver: 'Director / Approver',
  program_manager: 'Program Manager',
  store_keeper: 'Store Keeper',
  auditor: 'Auditor',
  requester: 'Requester',
};

export const REGIONS = ['Mwanza', 'Kagera', 'Geita', 'Shinyanga'];
export const MWANZA_DISTRICTS = [
  'Nyamagana', 'Ilemela', 'Buchosa', 'Magu', 'Sengerema', 'Misungwi', 'Ukerewe', 'Kwimba',
];
export const CURRENCIES = ['TZS', 'USD', 'EUR'];
export const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

export type AttachmentCategory = { value: string; label: string };

export const ATTACHMENT_CATEGORIES: Record<string, AttachmentCategory[]> = {
  requisition: [
    { value: 'specification', label: 'Specification / BOQ' },
    { value: 'quotation_doc', label: 'Supplier quotation' },
    { value: 'photo', label: 'Photo' },
    { value: 'general', label: 'Other supporting document' },
  ],
  supplier: [
    { value: 'tin_certificate', label: 'TIN certificate' },
    { value: 'brela_certificate', label: 'BRELA registration' },
    { value: 'business_license', label: 'Business license' },
    { value: 'tax_clearance', label: 'Tax clearance' },
    { value: 'id_document', label: 'Owner ID' },
    { value: 'bank_letter', label: 'Bank confirmation letter' },
    { value: 'other', label: 'Other' },
  ],
};

export const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-stone-200 text-stone-700',
  in_approval: 'bg-amber-100 text-amber-900',
  pending: 'bg-amber-100 text-amber-900',
  approved: 'bg-emerald-100 text-emerald-900',
  rejected: 'bg-red-100 text-red-900',
  cancelled: 'bg-stone-200 text-stone-600',
  converted: 'bg-sky-100 text-sky-900',
  closed: 'bg-stone-200 text-stone-700',
  suspended: 'bg-orange-100 text-orange-900',
  blacklisted: 'bg-red-100 text-red-900',
  skipped: 'bg-stone-100 text-stone-500',
};
