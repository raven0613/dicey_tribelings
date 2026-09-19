import { useEffect, useState } from 'react';
import { DICE_TRAY_PRESENTATION } from '../../configs/dicePresentationConfig';

export function useDiceSize() {
  const query = `(max-width: ${DICE_TRAY_PRESENTATION.mobileBreakpoint}px)`;
  const [mobile, setMobile] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return mobile ? DICE_TRAY_PRESENTATION.mobileSize : DICE_TRAY_PRESENTATION.size;
}
