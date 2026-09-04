export const CHARACTER_MAX_PER_ACCOUNT_DEFAULT = 5;

/** Max characters per account (env override: CHARACTER_MAX_PER_ACCOUNT). */
export function getMaxCharactersPerAccount(): number {
  const raw = Number(process.env.CHARACTER_MAX_PER_ACCOUNT);
  if (Number.isFinite(raw) && raw >= 1) {
    return Math.floor(raw);
  }
  return CHARACTER_MAX_PER_ACCOUNT_DEFAULT;
}

/** @deprecated Prefer getMaxCharactersPerAccount() */
export const MAX_CHARACTERS_PER_ACCOUNT = CHARACTER_MAX_PER_ACCOUNT_DEFAULT;
