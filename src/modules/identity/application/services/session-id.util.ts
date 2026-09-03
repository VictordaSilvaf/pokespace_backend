import { randomUUID } from 'node:crypto';

export function createSessionIds(): { sessionId: string; familyId: string } {
  return { sessionId: randomUUID(), familyId: randomUUID() };
}
