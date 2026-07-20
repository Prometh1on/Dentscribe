import type { AiConfigSchema } from '../config/aiConfig';

/**
 * Shared gate for both registries. A cloud provider id being selected in config
 * is not sufficient to actually use it — PHI must never reach a vendor without
 * a human having separately confirmed a BAA is in place for that vendor.
 */
export function assertCloudProviderConsent(config: AiConfigSchema, vendorLabel: string): void {
  if (!config.cloudProviderConsentAcknowledged) {
    throw new Error(
      `${vendorLabel} is selected but cloud-provider consent has not been acknowledged. ` +
        'Confirm a BAA is signed with this vendor, then call setCloudProviderConsent(true) before real patient data is sent.'
    );
  }
}
