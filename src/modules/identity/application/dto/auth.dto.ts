export interface RegisterUserCommand {
  email: string;
  password: string;
}

export interface LoginUserCommand {
  email: string;
  password: string;
}

export interface AuthResult {
  userId: string;
  email: string;
  accessToken: string;
}
