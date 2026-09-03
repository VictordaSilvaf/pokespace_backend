import type { SessionMetadata } from '../ports/refresh-token-store.port.js';

export interface RegisterUserCommand {
  email: string;
  phone: string;
  username: string;
  password: string;
}

export interface LoginUserCommand {
  identifier: string;
  password: string;
  metadata?: SessionMetadata;
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
  accessToken: string;
}

export interface LogoutCommand {
  userId: string;
  accessToken: string;
  refreshToken?: string;
  sessionId?: string;
}

export interface RefreshTokenCommand {
  refreshToken: string;
  metadata?: SessionMetadata;
}

export interface GetCurrentUserQuery {
  userId: string;
}

export interface VerifyEmailCommand {
  token: string;
}

export interface ResendVerificationCommand {
  userId: string;
}

export interface SendPhoneOtpCommand {
  userId: string;
}

export interface VerifyPhoneCommand {
  userId: string;
  code: string;
}

export interface SetupTwoFactorCommand {
  userId: string;
}

export interface ConfirmTwoFactorCommand {
  userId: string;
  code: string;
}

export interface DisableTwoFactorCommand {
  userId: string;
  code: string;
}

export interface VerifyTwoFactorLoginCommand {
  tempToken: string;
  code: string;
  metadata?: SessionMetadata;
}

export interface ListSessionsQuery {
  userId: string;
  currentSessionId?: string;
}

export interface RevokeSessionCommand {
  userId: string;
  sessionId: string;
}

export interface LogoutAllCommand {
  userId: string;
  accessToken: string;
}

export interface UpdateProfileCommand {
  userId: string;
  email?: string;
  phone?: string;
}

export interface DeactivateAccountCommand {
  userId: string;
  accessToken: string;
}

export interface DeleteAccountCommand {
  userId: string;
  password: string;
  accessToken: string;
}

export interface AuthResult {
  userId: string;
  email: string;
  phone: string;
  username: string;
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

export interface RegisterResult extends AuthResult {
  verifyToken?: string;
}

export interface TwoFactorChallengeResult {
  requires2fa: true;
  tempToken: string;
}

export type LoginResult = AuthResult | TwoFactorChallengeResult;

export interface UserProfile {
  userId: string;
  email: string;
  phone: string;
  username: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  status: string;
}

export interface MessageResult {
  message: string;
}

export interface ForgotPasswordResult extends MessageResult {
  resetToken?: string;
}

export interface VerifyEmailResult extends MessageResult {
  verifyToken?: string;
}

export interface SendPhoneOtpResult extends MessageResult {
  otp?: string;
}

export interface SetupTwoFactorResult {
  secret: string;
  otpauthUri: string;
}

export interface SessionListResult {
  sessions: Array<{
    sessionId: string;
    familyId: string;
    userAgent?: string;
    ip?: string;
    createdAt: string;
    current: boolean;
  }>;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  username: string;
  sessionId?: string;
}
