import { readSecret, writeSecret, deleteSecret, hasSecret } from '../security/secretStore';
import { CREDENTIAL_NAMES, type CloudCredentialName } from '../../common/types/credentials';

export { CREDENTIAL_NAMES };
export type { CloudCredentialName };

export function getCloudApiKey(name: CloudCredentialName): string | null {
  return readSecret(name);
}

export function setCloudApiKey(name: CloudCredentialName, value: string): void {
  writeSecret(name, value);
}

export function clearCloudApiKey(name: CloudCredentialName): void {
  deleteSecret(name);
}

export function hasCloudApiKey(name: CloudCredentialName): boolean {
  return hasSecret(name);
}
