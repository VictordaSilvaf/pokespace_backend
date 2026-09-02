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

export class UserNotFoundError extends IdentityDomainError {
  constructor(userId: string) {
    super(`User not found: ${userId}`);
  }
}
