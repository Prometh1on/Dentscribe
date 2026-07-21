export const DOCUMENT_TYPES = ['patient-letter', 'referral-letter', 'consent-form'] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  'patient-letter': 'Patient Letter',
  'referral-letter': 'Referral Letter',
  'consent-form': 'Consent Form',
};
