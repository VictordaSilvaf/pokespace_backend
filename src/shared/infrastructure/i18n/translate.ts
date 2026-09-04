import { I18nContext, I18nService } from 'nestjs-i18n';

export type TranslateArgs = Record<string, string | number | boolean>;

/** Translate using the active request locale (Accept-Language / ?lang / x-lang). */
export function translate(key: string, args?: TranslateArgs): string {
  const ctx = I18nContext.current();
  if (!ctx) {
    return key;
  }
  return ctx.t(key, { args });
}

export function localizeMessage(
  messageKey: string,
  args?: TranslateArgs,
): { message: string } {
  return { message: translate(messageKey, args) };
}

export type TranslableDomainError = {
  code?: string;
  message: string;
  args?: TranslateArgs;
};

/** Resolve a domain error into a localized HTTP message. */
export function translateDomainError(
  error: TranslableDomainError,
  namespace: 'identity' | 'world' | 'common' | 'character' | 'servers' | 'idempotency',
): string {
  if (error.code) {
    return translate(`${namespace}.errors.${error.code}`, error.args);
  }
  return error.message;
}

/** Translate outside a request (e.g. mailer) with an explicit language. */
export function translateWith(
  i18n: I18nService,
  key: string,
  lang = 'en',
  args?: TranslateArgs,
): string {
  return i18n.t(key, { lang, args });
}
