const assets = import.meta.glob<string>('../../assets/background/*/*.png', {
  eager: true, query: '?url', import: 'default',
});

export function getBackgroundAssetUrl(directory: string, file: string) {
  return assets[`../../assets/background/${directory}/${file}.png`];
}
