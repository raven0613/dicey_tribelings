import { useGameViewport } from '../layout/GameViewportContext';
import { DICE_TRAY_PRESENTATION } from '../../configs/dicePresentationConfig';

export function useDiceSize() {
  const { mobile } = useGameViewport();
  return mobile ? DICE_TRAY_PRESENTATION.mobileSize : DICE_TRAY_PRESENTATION.size;
}
