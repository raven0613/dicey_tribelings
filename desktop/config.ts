import { VIEWPORT_PRESENTATION } from '../src/configs/viewportConfig';

const aspectRatio = VIEWPORT_PRESENTATION.referenceWidth / VIEWPORT_PRESENTATION.referenceHeight;
const initialContentWidth = 1280;

export const desktopConfig = {
  packageName: 'dice-sticker-roguelite',
  executableName: 'DiceStickerRoguelite',
  title: 'Dice Sticker Roguelite',
  appId: 'com.dicestickerroguelite.game',
  scheme: 'dice-game',
  host: 'bundle',
  aspectRatio,
  window: {
    width: initialContentWidth,
    height: initialContentWidth / aspectRatio,
    useContentSize: true,
    backgroundColor: '#020617',
  },
} as const;

export const desktopUrl = `${desktopConfig.scheme}://${desktopConfig.host}/`;
