import { Injectable } from '@nestjs/common';
import { WorldSession } from '../../domain/entities/world-session.entity.js';

@Injectable()
export class SessionManager {
  private readonly byConnection = new Map<string, WorldSession>();
  private readonly byCharacter = new Map<string, WorldSession>();

  set(session: WorldSession): void {
    const previous = this.byCharacter.get(session.characterId);
    if (previous && previous.connectionId !== session.connectionId) {
      this.byConnection.delete(previous.connectionId);
    }
    this.byConnection.set(session.connectionId, session);
    this.byCharacter.set(session.characterId, session);
  }

  getByConnection(connectionId: string): WorldSession | undefined {
    return this.byConnection.get(connectionId);
  }

  getByCharacter(characterId: string): WorldSession | undefined {
    return this.byCharacter.get(characterId);
  }

  removeByConnection(connectionId: string): WorldSession | undefined {
    const session = this.byConnection.get(connectionId);
    if (!session) {
      return undefined;
    }
    this.byConnection.delete(connectionId);
    const current = this.byCharacter.get(session.characterId);
    if (current?.connectionId === connectionId) {
      this.byCharacter.delete(session.characterId);
    }
    return session;
  }
}
