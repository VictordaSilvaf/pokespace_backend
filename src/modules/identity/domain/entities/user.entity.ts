import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '../../../../shared/domain/aggregate-root.js';
import { Email } from '../value-objects/email.vo.js';
import { HashedPassword } from '../value-objects/hashed-password.vo.js';
import { UserRegisteredEvent } from '../events/user-registered.event.js';
import { UserLoggedInEvent } from '../events/user-logged-in.event.js';

export class User extends AggregateRoot<string> {
  private constructor(
    id: string,
    private readonly _email: Email,
    private _password: HashedPassword,
    private readonly _createdAt: Date,
  ) {
    super(id);
  }

  static register(email: Email, password: HashedPassword): User {
    const user = new User(randomUUID(), email, password, new Date());
    user.addDomainEvent(new UserRegisteredEvent(user.id, email.value));
    return user;
  }

  static rehydrate(props: {
    id: string;
    email: Email;
    password: HashedPassword;
    createdAt: Date;
  }): User {
    return new User(props.id, props.email, props.password, props.createdAt);
  }

  get email(): Email {
    return this._email;
  }

  get passwordHash(): string {
    return this._password.hash;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  markLoggedIn(): void {
    this.addDomainEvent(new UserLoggedInEvent(this.id));
  }
}
