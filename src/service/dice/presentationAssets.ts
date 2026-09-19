import displacementMap from '../../assets/dice-bulge-map.png';
import { DICE_CHARACTER_PRESENTATION } from '../../configs/dicePresentationConfig';

let preparation: Promise<void> | undefined;

/** Start decoding while the menu is visible, before these images enter an animation. */
export function prepareDicePresentationAssets(): Promise<void> {
  return preparation ??= Promise.allSettled([
    displacementMap, DICE_CHARACTER_PRESENTATION.gang.face, DICE_CHARACTER_PRESENTATION.gang.hand,
  ].map((source) => {
    const image = new Image();
    image.src = source;
    return image.decode();
  })).then(() => {});
}
