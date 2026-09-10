import { afterEach, describe, expect, it } from 'vitest';

import {
  publicizeSpriteAssets,
  type PokemonAssetsResult,
} from './pokemon.dto.js';

describe('publicizeSpriteAssets', () => {
  const previous = process.env.S3_PUBLIC_BASE_URL;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.S3_PUBLIC_BASE_URL;
    } else {
      process.env.S3_PUBLIC_BASE_URL = previous;
    }
  });

  it('prefixes CDN base on asset paths', () => {
    process.env.S3_PUBLIC_BASE_URL = 'https://cdn.example.com';
    const assets: PokemonAssetsResult = {
      walk: {
        assetKey: 'pokemon/1/walk',
        path: 'sprites/creature/376.png',
        frameWidth: 32,
        frameHeight: 32,
        frameCount: 1,
        lookType: 376,
      },
    };
    const next = publicizeSpriteAssets(assets);
    expect(next?.walk?.path).toBe(
      'https://cdn.example.com/sprites/creature/376.png',
    );
    expect(next?.walk?.lookType).toBe(376);
  });

  it('leaves relative path when base unset', () => {
    delete process.env.S3_PUBLIC_BASE_URL;
    const assets: PokemonAssetsResult = {
      portrait: {
        assetKey: 'pokemon/1/portrait',
        path: 'sprites/creature/376.png',
        frameWidth: 64,
        frameHeight: 64,
        frameCount: 1,
      },
    };
    expect(publicizeSpriteAssets(assets)?.portrait?.path).toBe(
      'sprites/creature/376.png',
    );
  });
});
