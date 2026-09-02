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

export class InvalidPasswordError extends IdentityDomainError {
  constructor(message = 'Password does not meet security requirements') {
    super(message);
  }
}

export class EmailAlreadyRegisteredError extends IdentityDomainError {
  constructor(email: string) {
    super(`Email already registered: ${email}`);
  }
}

export class InvalidCredentialsError extends IdentityDomainError {
  constructor() {
    super('Invalid credentials');
  }
}
