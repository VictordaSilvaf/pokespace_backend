import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '../../../../shared/domain/aggregate-root.js';
import { Email } from '../value-objects/email.vo.js';
import { PhoneNumber } from '../value-objects/phone-number.vo.js';
import { Username } from '../value-objects/username.vo.js';
import { HashedPassword } from '../value-objects/hashed-password.vo.js';
import { UserRegisteredEvent } from '../events/user-registered.event.js';
import { UserLoggedInEvent } from '../events/user-logged-in.event.js';
import { PasswordChangedEvent } from '../events/password-changed.event.js';
import { PasswordResetCompletedEvent } from '../events/password-reset-completed.event.js';
import { UserLoggedOutEvent } from '../events/user-logged-out.event.js';
import { AccountDeactivatedError } from '../errors/identity.errors.js';

export type UserStatus = 'active' | 'deactivated';

export interface UserProps {
  id: string;
  email: Email;
  phone: PhoneNumber;
  username: Username;
  password: HashedPassword;
  createdAt: Date;
  updatedAt: Date;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  totpSecret: string | null;
  twoFactorEnabled: boolean;
  status: UserStatus;
}

export class User extends AggregateRoot<string> {
  private _email: Email;
  private _phone: PhoneNumber;
  private _password: HashedPassword;
  private _updatedAt: Date;
  private _emailVerifiedAt: Date | null;
  private _phoneVerifiedAt: Date | null;
  private _totpSecret: string | null;
  private _twoFactorEnabled: boolean;
  private _status: UserStatus;

  private constructor(
    id: string,
    email: Email,
    phone: PhoneNumber,
    private readonly _username: Username,
    password: HashedPassword,
    private readonly _createdAt: Date,
    updatedAt: Date,
    emailVerifiedAt: Date | null,
    phoneVerifiedAt: Date | null,
    totpSecret: string | null,
    twoFactorEnabled: boolean,
    status: UserStatus,
  ) {
    super(id);
    this._email = email;
    this._phone = phone;
    this._password = password;
    this._updatedAt = updatedAt;
    this._emailVerifiedAt = emailVerifiedAt;
    this._phoneVerifiedAt = phoneVerifiedAt;
    this._totpSecret = totpSecret;
    this._twoFactorEnabled = twoFactorEnabled;
    this._status = status;
  }

  static register(
    email: Email,
    phone: PhoneNumber,
    username: Username,
    password: HashedPassword,
  ): User {
    const now = new Date();
    const user = new User(
      randomUUID(),
      email,
      phone,
      username,
      password,
      now,
      now,
      null,
      null,
      null,
      false,
      'active',
    );
    user.addDomainEvent(
      new UserRegisteredEvent(
        user.id,
        email.value,
        phone.value,
        username.value,
      ),
    );
    return user;
  }

  static rehydrate(props: UserProps): User {
    return new User(
      props.id,
      props.email,
      props.phone,
      props.username,
      props.password,
      props.createdAt,
      props.updatedAt,
      props.emailVerifiedAt,
      props.phoneVerifiedAt,
      props.totpSecret,
      props.twoFactorEnabled,
      props.status,
    );
  }

  get email(): Email {
    return this._email;
  }

  get phone(): PhoneNumber {
    return this._phone;
  }

  get username(): Username {
    return this._username;
  }

  get passwordHash(): string {
    return this._password.hash;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get emailVerifiedAt(): Date | null {
    return this._emailVerifiedAt;
  }

  get phoneVerifiedAt(): Date | null {
    return this._phoneVerifiedAt;
  }

  get totpSecret(): string | null {
    return this._totpSecret;
  }

  get twoFactorEnabled(): boolean {
    return this._twoFactorEnabled;
  }

  get status(): UserStatus {
    return this._status;
  }

  assertActive(): void {
    if (this._status !== 'active') {
      throw new AccountDeactivatedError();
    }
  }

  markLoggedIn(): void {
    this.assertActive();
    this.addDomainEvent(new UserLoggedInEvent(this.id));
  }

  changePassword(password: HashedPassword): void {
    this._password = password;
    this.touch();
    this.addDomainEvent(new PasswordChangedEvent(this.id));
  }

  completePasswordReset(password: HashedPassword): void {
    this._password = password;
    this.touch();
    this.addDomainEvent(new PasswordResetCompletedEvent(this.id));
  }

  markLoggedOut(): void {
    this.addDomainEvent(new UserLoggedOutEvent(this.id));
  }

  verifyEmail(): void {
    this._emailVerifiedAt = new Date();
    this.touch();
  }

  verifyPhone(): void {
    this._phoneVerifiedAt = new Date();
    this.touch();
  }

  updateEmail(email: Email): void {
    this._email = email;
    this._emailVerifiedAt = null;
    this.touch();
  }

  updatePhone(phone: PhoneNumber): void {
    this._phone = phone;
    this._phoneVerifiedAt = null;
    this.touch();
  }

  setTotpSecret(secret: string | null): void {
    this._totpSecret = secret;
    this.touch();
  }

  enableTwoFactor(): void {
    this._twoFactorEnabled = true;
    this.touch();
  }

  disableTwoFactor(): void {
    this._twoFactorEnabled = false;
    this._totpSecret = null;
    this.touch();
  }

  deactivate(): void {
    this._status = 'deactivated';
    this.touch();
  }

  private touch(): void {
    this._updatedAt = new Date();
  }
}
