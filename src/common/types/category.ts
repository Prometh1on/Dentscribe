/**
 * A dentist-facing tag for what kind of appointment a transcript covers.
 * Fixed set rather than a dentist-editable list (unlike style examples or
 * staff names): dental appointment types are a small, standard taxonomy, so
 * there's no real need for a create/remove UI here.
 *
 * Deliberately procedure-shaped (restorative/extraction/endodontic/periodontal)
 * rather than administrative (the earlier "treatment"/"hygiene" pair) — since
 * this tag exists to help retrieve style-matching examples and structure the
 * prompt, and note *structure* follows the procedure performed far more than
 * it follows a scheduling-type label.
 */
export const CONVERSATION_CATEGORIES = [
  'examination',
  'emergency',
  'restorative',
  'extraction',
  'endodontic',
  'periodontal',
  'orthodontic',
  'referral',
  'consultation',
  'other',
] as const;

export type ConversationCategory = (typeof CONVERSATION_CATEGORIES)[number];

export const CONVERSATION_CATEGORY_LABELS: Record<ConversationCategory, string> = {
  examination: 'Examination',
  emergency: 'Emergency',
  restorative: 'Restorative (fillings, crowns)',
  extraction: 'Extraction',
  endodontic: 'Endodontic (root canal)',
  periodontal: 'Periodontal / Hygiene',
  orthodontic: 'Orthodontic',
  referral: 'Referral',
  consultation: 'Consultation',
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
  examination:
    'This is a routine examination. Prioritize presenting complaint (if any), medical history updates, and extraoral/intraoral examination findings.',
  emergency:
    'This is an emergency/pain visit. Prioritize presenting complaint, history of the complaint (onset, character, exacerbating/relieving factors), clinical exam findings, diagnosis, and treatment provided.',
  restorative:
    'This is a restorative procedure visit. Prioritize the procedure performed, anesthesia used, materials, and clinical steps taken.',
  extraction:
    'This is an extraction visit. Prioritize indication, anesthesia, the extraction procedure, and post-operative instructions given.',
  endodontic:
    'This is an endodontic (root canal) visit. Prioritize diagnosis, canals treated, procedure steps, and any dressing/temporary restoration placed.',
  periodontal:
    'This is a periodontal or hygiene visit. Prioritize periodontal assessment/charting, oral hygiene instruction given, and treatment provided.',
  orthodontic: 'This is an orthodontic assessment. Prioritize skeletal/dental assessment and the proposed plan.',
  referral: 'This is a referral. Prioritize the reason for referral and relevant clinical history for the receiving clinician.',
  consultation:
    'This is a consultation. Prioritize what was discussed, options presented, and any plan agreed with the patient, rather than a procedure log.',
  other: '',
};
