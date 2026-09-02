import { Inject, Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../shared/application/use-case.js';
import type { GetCurrentUserQuery, UserProfile } from '../dto/auth.dto.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository.js';
import { UserNotFoundError } from '../../domain/errors/identity.errors.js';

@Injectable()
export class GetCurrentUserUseCase
  implements UseCase<GetCurrentUserQuery, UserProfile>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async execute(query: GetCurrentUserQuery): Promise<UserProfile> {
    const user = await this.users.findById(query.userId);
    if (!user) {
      throw new UserNotFoundError(query.userId);
    }

    return {
      userId: user.id,
      email: user.email.value,
      phone: user.phone.value,
      username: user.username.value,
    };
  }
}
