import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case.js';
import { LoginUserUseCase } from '../../application/use-cases/login-user.use-case.js';
import {
  EmailAlreadyRegisteredError,
  IdentityDomainError,
  InvalidCredentialsError,
} from '../../domain/errors/identity.errors.js';

class RegisterRequestDto {
  email!: string;
  password!: string;
}

class LoginRequestDto {
  email!: string;
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterRequestDto) {
    this.assertCredentialsPayload(body);

    try {
      return await this.registerUser.execute({
        email: body.email,
        password: body.password,
      });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginRequestDto) {
    this.assertCredentialsPayload(body);

    try {
      return await this.loginUser.execute({
        email: body.email,
        password: body.password,
      });
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  private assertCredentialsPayload(body: {
    email?: string;
    password?: string;
  }): void {
    if (!body?.email || !body?.password) {
      throw new BadRequestException('email and password are required');
    }
  }

  private mapDomainError(error: unknown): never {
    if (error instanceof EmailAlreadyRegisteredError) {
      throw new ConflictException(error.message);
    }

    if (error instanceof InvalidCredentialsError) {
      throw new UnauthorizedException(error.message);
    }

    if (error instanceof IdentityDomainError) {
      throw new BadRequestException(error.message);
    }

    throw error;
  }
}
