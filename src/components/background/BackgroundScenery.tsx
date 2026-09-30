import { BACKGROUND_PRESENTATION as config } from '../../configs/backgrounds/backgroundConfig';
import type { BackgroundScene } from '../../types/background';
import { BackgroundImage } from './BackgroundImage';
import { Foreground } from './Foreground';

export function BackgroundScenery({ scene }: { scene: BackgroundScene }) {
  const imageProps = { directory: scene.assetDirectory, scale: config.width / scene.sourceWidth };

  return <>
    {scene.back.map((group) => <div key={group.layer} aria-hidden="true"
      className="background-plane background-back" data-back-layer={group.layer}
      style={{ zIndex: config.layers.back[group.layer] }}>
      {group.images.map((asset) => <BackgroundImage key={asset.file} {...imageProps} asset={asset} x={asset.x} />)}
    </div>)}
    <Foreground scene={scene} />
  </>;
}
