export const desktopConfig = {
  packageName: 'dice-sticker-roguelite',
  executableName: 'DiceStickerRoguelite',
  title: 'Dice Sticker Roguelite',
  appId: 'com.dicestickerroguelite.game',
  scheme: 'dice-game',
  host: 'bundle',
  window: {
    width: 1280,
    height: 800,
    backgroundColor: '#020617',
  },
} as const;

export const desktopUrl = `${desktopConfig.scheme}://${desktopConfig.host}/`;
