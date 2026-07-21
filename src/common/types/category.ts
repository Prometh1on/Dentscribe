/**
 * A dentist-facing tag for what kind of appointment a transcript covers.
 * Fixed set rather than a dentist-editable list (unlike style examples or
 * staff names): dental appointment types are a small, standard taxonomy, so
 * there's no real need for a create/remove UI here — see CLAUDE.md's note on
 * this vs. the staff-names quick-list pattern.
 */
export const CONVERSATION_CATEGORIES = [
  'routine-exam',
  'emergency',
  'treatment',
  'hygiene',
  'referral',
  'orthodontic',
  'other',
] as const;

export type ConversationCategory = (typeof CONVERSATION_CATEGORIES)[number];

export const CONVERSATION_CATEGORY_LABELS: Record<ConversationCategory, string> = {
  'routine-exam': 'Routine Exam',
  emergency: 'Emergency',
  treatment: 'Treatment',
  hygiene: 'Hygiene Visit',
  referral: 'Referral',
  orthodontic: 'Orthodontic',
  other: 'Other',
};

/**
 * A short structural hint per category, injected into the formatting prompt
 * so output leans toward the right shape even before the dentist has saved
 * any style examples tagged with that category. Deliberately not a rigid
 * fixed template (headers/section list) — that would fight the few-shot,
 * learn-from-my-own-examples approach this app is built around.
 */
export const CONVERSATION_CATEGORY_HINTS: Record<ConversationCategory, string> = {
  'routine-exam':
    'This is a routine examination. Prioritize presenting complaint (if any), medical history updates, and extraoral/intraoral examination findings.',
  emergency:
    'This is an emergency/pain visit. Prioritize presenting complaint, history of the complaint (onset, character, exacerbating/relieving factors), clinical exam findings, diagnosis, and treatment provided.',
  treatment:
    'This is a treatment/procedure visit. Prioritize the procedure performed, anesthesia used, and clinical steps taken.',
  hygiene: 'This is a hygiene visit. Prioritize periodontal assessment, oral hygiene instruction given, and treatment provided.',
  referral: 'This is a referral. Prioritize the reason for referral and relevant clinical history for the receiving clinician.',
  orthodontic: 'This is an orthodontic assessment. Prioritize skeletal/dental assessment and the proposed plan.',
  other: '',
};
