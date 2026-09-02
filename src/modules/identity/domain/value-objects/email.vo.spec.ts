import { describe, expect, it } from 'vitest';
import { Email } from './email.vo.js';
import { InvalidEmailError } from '../errors/identity.errors.js';

describe('Email', () => {
  it('normalizes and accepts a valid email', () => {
    const email = Email.create('  Player@Poke.Space ');
    expect(email.value).toBe('player@poke.space');
  });

  it('rejects invalid email', () => {
    expect(() => Email.create('not-an-email')).toThrow(InvalidEmailError);
  });
});
