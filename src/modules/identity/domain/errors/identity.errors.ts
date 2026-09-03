export class IdentityDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidEmailError extends IdentityDomainError {
  constructor(email: string) {
    super(`Invalid email: ${email}`);
  }
}

export class InvalidPhoneError extends IdentityDomainError {
  constructor(phone: string) {
    super(`Invalid phone number: ${phone}`);
  }
}

export class InvalidUsernameError extends IdentityDomainError {
  constructor(message = 'Invalid username') {
    super(message);
  }
}

export class InvalidPasswordError extends IdentityDomainError {
  constructor(message = 'Password does not meet security requirements') {
    super(message);
  }
}

export class AccountLimitReachedError extends IdentityDomainError {
  constructor(channel: 'email' | 'phone', value: string) {
    super(
      `Maximum of 4 accounts reached for ${channel}: ${value}`,
    );
  }
}

export class UsernameAlreadyTakenError extends IdentityDomainError {
  constructor(username: string) {
    super(`Username already taken: ${username}`);
  }
}

export class InvalidCredentialsError extends IdentityDomainError {
  constructor() {
    super('Invalid credentials');
  }
}

export class InvalidResetTokenError extends IdentityDomainError {
  constructor() {
    super('Invalid or expired reset token');
  }
}

export class InvalidRefreshTokenError extends IdentityDomainError {
  constructor() {
    super('Invalid or expired refresh token');
  }
}

export class UserNotFoundError extends IdentityDomainError {
  constructor(userId: string) {
    super(`User not found: ${userId}`);
  }
}

export class AccountLockedError extends IdentityDomainError {
  constructor() {
    super('Account temporarily locked due to too many failed login attempts');
  }
}

export class AccountDeactivatedError extends IdentityDomainError {
  constructor() {
    super('Account is deactivated');
  }
}

export class EmailNotVerifiedError extends IdentityDomainError {
  constructor() {
    super('Email address is not verified');
  }
}

export class InvalidOtpError extends IdentityDomainError {
  constructor() {
    super('Invalid or expired verification code');
  }
}

export class InvalidTwoFactorCodeError extends IdentityDomainError {
  constructor() {
    super('Invalid two-factor authentication code');
  }
}

export class TwoFactorNotEnabledError extends IdentityDomainError {
  constructor() {
    super('Two-factor authentication is not enabled');
  }
}

export class TwoFactorAlreadyEnabledError extends IdentityDomainError {
  constructor() {
    super('Two-factor authentication is already enabled');
  }
}
