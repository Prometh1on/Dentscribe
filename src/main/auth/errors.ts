import { AUTH_ERROR_MESSAGES } from '../../common/types/auth';

export class AuthError extends Error {}

export class InvalidCredentialsError extends AuthError {
  constructor() {
    super(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
  }
}

export class AccountLockedError extends AuthError {
  constructor(public readonly lockedUntil: string) {
    super(AUTH_ERROR_MESSAGES.ACCOUNT_LOCKED);
  }
}

export class SessionExpiredError extends AuthError {
  constructor() {
    super(AUTH_ERROR_MESSAGES.SESSION_EXPIRED);
  }
}
