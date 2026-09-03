export const PHONE_OTP_STORE = Symbol('PHONE_OTP_STORE');

export interface PhoneOtpStore {
  save(userId: string, code: string, ttlSeconds: number): Promise<void>;
  consume(userId: string, code: string): Promise<boolean>;
}
