import { createContext, useContext } from 'react';
import { VIEWPORT_PRESENTATION as config } from '../../configs/viewportConfig';
import type { getGameViewport } from '../../service/layout/gameViewport';

type GameViewportValue = ReturnType<typeof getGameViewport> & { overlay: HTMLDivElement | null };

export const GameViewportContext = createContext<GameViewportValue>({
  scale: 1, width: config.referenceWidth, height: config.referenceHeight,
  mobile: false, minimumFontSize: config.minimumFontSize, overlay: null,
});

export const useGameViewport = () => useContext(GameViewportContext);
