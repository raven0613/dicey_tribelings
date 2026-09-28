import type { BackgroundImageAsset } from '../../types/background';
import { getBackgroundAssetUrl } from '../../service/background/backgroundAssets';

interface BackgroundImageProps {
  directory: string;
  asset: BackgroundImageAsset;
  scale: number;
  x: number;
  anchor?: 'top' | 'bottom';
}

export function BackgroundImage({ directory, asset, scale, x, anchor = 'bottom' }: BackgroundImageProps) {
  return <img className="background-image" data-anchor={anchor}
    src={getBackgroundAssetUrl(directory, asset.file)}
    alt="" draggable={false}
    width={asset.width} height={asset.height}
    style={{ left: x, width: asset.width * scale, height: asset.height * scale }} />;
}
