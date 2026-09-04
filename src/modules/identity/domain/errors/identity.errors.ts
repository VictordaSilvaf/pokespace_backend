export class IdentityDomainError extends Error {
  readonly code: string;
  readonly args?: Record<string, string | number | boolean>;

  constructor(
    code: string,
    message: string,
    args?: Record<string, string | number | boolean>,
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.args = args;
  }
}

export class InvalidEmailError extends IdentityDomainError {
  constructor(email: string) {
    super('INVALID_EMAIL', `Invalid email: ${email}`, { email });
  }
}

export class InvalidPhoneError extends IdentityDomainError {
  constructor(phone: string) {
    super('INVALID_PHONE', `Invalid phone number: ${phone}`, { phone });
  }
}

export class InvalidUsernameError extends IdentityDomainError {
  constructor(code: 'INVALID_USERNAME' | 'INVALID_USERNAME_FORMAT' = 'INVALID_USERNAME') {
    const messages = {
      INVALID_USERNAME: 'Invalid username',
      INVALID_USERNAME_FORMAT:
        'Username must be 3–20 chars: letters, numbers or underscore',
    } as const;
    super(code, messages[code]);
  }
}

export class InvalidPasswordError extends IdentityDomainError {
  constructor(
    code:
      | 'INVALID_PASSWORD'
      | 'INVALID_PASSWORD_HASH'
      | 'PASSWORD_TOO_SHORT' = 'INVALID_PASSWORD',
  ) {
    const messages = {
      INVALID_PASSWORD: 'Password does not meet security requirements',
      INVALID_PASSWORD_HASH: 'Invalid password hash',
      PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
    } as const;
    super(code, messages[code]);
  }
}

export class AccountLimitReachedError extends IdentityDomainError {
  constructor(channel: 'email' | 'phone', value: string) {
    super(
      'ACCOUNT_LIMIT_REACHED',
      `Maximum of 4 accounts reached for ${channel}: ${value}`,
      { channel, value },
    );
  }
}

export class UsernameAlreadyTakenError extends IdentityDomainError {
  constructor(username: string) {
    super('USERNAME_TAKEN', `Username already taken: ${username}`, {
      username,
    });
  }
}

export class InvalidCredentialsError extends IdentityDomainError {
  constructor() {
    super('INVALID_CREDENTIALS', 'Invalid credentials');
  }
}

export class InvalidResetTokenError extends IdentityDomainError {
  constructor() {
    super('INVALID_RESET_TOKEN', 'Invalid or expired reset token');
  }
}

export class InvalidRefreshTokenError extends IdentityDomainError {
  constructor() {
    super('INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
  }
}

export class UserNotFoundError extends IdentityDomainError {
  constructor(userId: string) {
    super('USER_NOT_FOUND', `User not found: ${userId}`, { userId });
  }
}

export class AccountLockedError extends IdentityDomainError {
  constructor() {
    super(
      'ACCOUNT_LOCKED',
      'Account temporarily locked due to too many failed login attempts',
    );
  }
}

export class AccountDeactivatedError extends IdentityDomainError {
  constructor() {
    super('ACCOUNT_DEACTIVATED', 'Account is deactivated');
  }
}

export class EmailNotVerifiedError extends IdentityDomainError {
  constructor() {
    super('EMAIL_NOT_VERIFIED', 'Email address is not verified');
  }
}

export class InvalidOtpError extends IdentityDomainError {
  constructor() {
    super('INVALID_OTP', 'Invalid or expired verification code');
  }
}

export class InvalidTwoFactorCodeError extends IdentityDomainError {
  constructor() {
    super(
      'INVALID_TWO_FACTOR_CODE',
      'Invalid two-factor authentication code',
    );
  }
}

export class TwoFactorNotEnabledError extends IdentityDomainError {
  constructor() {
    super(
      'TWO_FACTOR_NOT_ENABLED',
      'Two-factor authentication is not enabled',
    );
  }
}

export class TwoFactorAlreadyEnabledError extends IdentityDomainError {
  constructor() {
    super(
      'TWO_FACTOR_ALREADY_ENABLED',
      'Two-factor authentication is already enabled',
    );
  }
}
