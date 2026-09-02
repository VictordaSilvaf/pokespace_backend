import { Injectable } from '@nestjs/common';
import type { User } from '../../domain/entities/user.entity.js';
import type { Email } from '../../domain/value-objects/email.vo.js';
import type { UserRepository } from '../../domain/repositories/user.repository.js';

@Injectable()
export class InMemoryUserRepository implements UserRepository {
  private readonly byId = new Map<string, User>();
  private readonly byEmail = new Map<string, string>();

  async findByEmail(email: Email): Promise<User | null> {
    const id = this.byEmail.get(email.value);
    if (!id) {
      return null;
    }

    return this.byId.get(id) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }

  async save(user: User): Promise<void> {
    this.byId.set(user.id, user);
    this.byEmail.set(user.email.value, user.id);
  }
}
