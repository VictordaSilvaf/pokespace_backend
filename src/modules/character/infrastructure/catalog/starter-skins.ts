export interface StarterSkinDefinition {
  id: string;
  nameKey: string;
  previewAssetKey: string;
  availableAtCreation: true;
}

export const STARTER_SKINS: readonly StarterSkinDefinition[] = [
  {
    id: 'starter-boy-01',
    nameKey: 'character.skins.STARTER_BOY_01',
    previewAssetKey: 'skins/starter-boy-01',
    availableAtCreation: true,
  },
  {
    id: 'starter-girl-01',
    nameKey: 'character.skins.STARTER_GIRL_01',
    previewAssetKey: 'skins/starter-girl-01',
    availableAtCreation: true,
  },
  {
    id: 'starter-boy-02',
    nameKey: 'character.skins.STARTER_BOY_02',
    previewAssetKey: 'skins/starter-boy-02',
    availableAtCreation: true,
  },
  {
    id: 'starter-girl-02',
    nameKey: 'character.skins.STARTER_GIRL_02',
    previewAssetKey: 'skins/starter-girl-02',
    availableAtCreation: true,
  },
] as const;

export function findStarterSkin(skinId: string): StarterSkinDefinition | undefined {
  return STARTER_SKINS.find((skin) => skin.id === skinId);
}

export function listStarterSkins(): StarterSkinDefinition[] {
  return [...STARTER_SKINS];
}
