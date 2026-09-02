export interface RegisterUserCommand {
  email: string;
  phone: string;
  username: string;
  password: string;
}

export interface LoginUserCommand {
  username: string;
  password: string;
}

export interface ForgotPasswordCommand {
  username: string;
}

export interface ResetPasswordCommand {
  token: string;
  newPassword: string;
}

export interface ChangePasswordCommand {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export interface LogoutCommand {
  userId: string;
  accessToken: string;
}

export interface GetCurrentUserQuery {
  userId: string;
}

export interface AuthResult {
  userId: string;
  email: string;
  phone: string;
  username: string;
  accessToken: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  phone: string;
  username: string;
}

export interface MessageResult {
  message: string;
}

export interface ForgotPasswordResult extends MessageResult {
  resetToken?: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  username: string;
}
