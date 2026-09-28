import { VIEWPORT_PRESENTATION } from '../viewportConfig';
import { SWAMP_BACKGROUND } from './swampConfig';

export const BACKGROUND_SCENES = { swamp: SWAMP_BACKGROUND } as const;
export const BACKGROUND_PRESENTATION = {
  scene: 'swamp' as keyof typeof BACKGROUND_SCENES,
  width: VIEWPORT_PRESENTATION.referenceWidth,
  layers: {
    back: { 7: 1, 6: 2, 5: 3, 4: 4, 3: 5, 2: 7, 1: 8 },
    enemies: 6,
    front: 9,
    interface: 10,
  },
  frontLayers: { props: 1, hanging: 2, grass: 3, ground: 4 },
} as const;
