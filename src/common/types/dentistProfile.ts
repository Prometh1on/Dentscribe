export const TOOTH_NUMBERING_SYSTEMS = ['universal', 'fdi', 'palmer'] as const;
export type ToothNumberingSystem = (typeof TOOTH_NUMBERING_SYSTEMS)[number];

export const TOOTH_NUMBERING_LABELS: Record<ToothNumberingSystem, string> = {
  universal: 'Universal (1-32)',
  fdi: 'FDI (two-digit, e.g. 36)',
  palmer: 'Palmer (quadrant + number)',
};

export const ABBREVIATION_POLICIES = ['preserve', 'expand-all'] as const;
export type AbbreviationPolicy = (typeof ABBREVIATION_POLICIES)[number];

export const ABBREVIATION_POLICY_LABELS: Record<AbbreviationPolicy, string> = {
  preserve: 'Keep abbreviations as spoken (e.g. "MOD")',
  'expand-all': 'Expand all abbreviations in the note (e.g. "mesial-occlusal-distal")',
};

export interface DentistProfile {
  styleNotes: string;
  toothNumbering: ToothNumberingSystem;
  abbreviationPolicy: AbbreviationPolicy;
  specialty: string;
}

export interface TerminologyPreference {
  id: string;
  avoidTerm: string;
  preferTerm: string;
}

export interface CreateTerminologyPreferenceInput {
  avoidTerm: string;
  preferTerm: string;
}

export interface AbbreviationPreference {
  id: string;
  abbreviation: string;
  expansion: string;
}

export interface CreateAbbreviationPreferenceInput {
  abbreviation: string;
  expansion: string;
}
