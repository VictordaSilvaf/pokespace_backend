import { Injectable } from '@nestjs/common';
import type { User } from '../../domain/entities/user.entity.js';
import type { Email } from '../../domain/value-objects/email.vo.js';
import type { PhoneNumber } from '../../domain/value-objects/phone-number.vo.js';
import type { Username } from '../../domain/value-objects/username.vo.js';
import { HashedPassword } from '../../domain/value-objects/hashed-password.vo.js';
import type { UserRepository } from '../../domain/repositories/user.repository.js';

@Injectable()
export class InMemoryUserRepository implements UserRepository {
  private readonly byId = new Map<string, User>();
  private readonly byUsername = new Map<string, string>();
  private readonly idsByEmail = new Map<string, Set<string>>();
  private readonly idsByPhone = new Map<string, Set<string>>();

  async findById(id: string): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }

  async findByUsername(username: Username): Promise<User | null> {
    const id = this.byUsername.get(username.value);
    if (!id) {
      return null;
    }

    return this.byId.get(id) ?? null;
  }

  async countByEmail(email: Email): Promise<number> {
    return this.idsByEmail.get(email.value)?.size ?? 0;
  }

  async countByPhone(phone: PhoneNumber): Promise<number> {
    return this.idsByPhone.get(phone.value)?.size ?? 0;
  }

  async save(user: User): Promise<void> {
    this.byId.set(user.id, user);
    this.byUsername.set(user.username.value, user.id);

    const emailIds = this.idsByEmail.get(user.email.value) ?? new Set<string>();
    emailIds.add(user.id);
    this.idsByEmail.set(user.email.value, emailIds);

    const phoneIds = this.idsByPhone.get(user.phone.value) ?? new Set<string>();
    phoneIds.add(user.id);
    this.idsByPhone.set(user.phone.value, phoneIds);
  }

  async delete(id: string): Promise<void> {
    const user = this.byId.get(id);
    if (!user) {
      return;
    }

    this.byId.delete(id);
    this.byUsername.delete(user.username.value);
    this.idsByEmail.get(user.email.value)?.delete(id);
    this.idsByPhone.get(user.phone.value)?.delete(id);
  }

  async update(user: User): Promise<void> {
    if (!this.byId.has(user.id)) {
      return;
    }

    this.byId.set(user.id, user);
    this.byUsername.set(user.username.value, user.id);
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const user = this.byId.get(id);
    if (!user) {
      return;
    }

    user.changePassword(HashedPassword.fromHash(passwordHash));
    this.byId.set(id, user);
  }
}
