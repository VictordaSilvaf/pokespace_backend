export const CHARACTER_MAX_PER_ACCOUNT = 4;

export function getCharacterMaxPerAccount(): number {
  const raw = Number(process.env.CHARACTER_MAX_PER_ACCOUNT);
  if (Number.isFinite(raw) && raw >= 1) {
    return Math.floor(raw);
  }
  return CHARACTER_MAX_PER_ACCOUNT;
}
