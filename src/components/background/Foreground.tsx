import type { CSSProperties } from 'react';
import type { BackgroundScene } from '../../types/background';
import { BACKGROUND_PRESENTATION as config } from '../../configs/backgrounds/backgroundConfig';
import { FOREGROUND_MOTION } from '../../configs/backgrounds/foregroundMotionConfig';
import { getBackgroundAssetUrl } from '../../service/background/backgroundAssets';
import { BackgroundImage } from './BackgroundImage';
import { ForegroundVegetation } from './ForegroundVegetation';
import { useForegroundMotion } from './useForegroundMotion';
import './foreground.scss';

export function Foreground({ scene }: { scene: BackgroundScene }) {
  const { root, canvas } = useForegroundMotion(scene);
  const scale = config.width / scene.sourceWidth;
  const imageProps = { directory: scene.assetDirectory, scale };
  const edge = FOREGROUND_MOTION.ground.maxDisplacement + 1;
  return <div ref={root} className="background-plane background-front" aria-hidden="true"
    style={{ zIndex: config.layers.front }}>
    <div className="background-baseline" style={{ zIndex: config.frontLayers.props }}>
      {scene.props.map(asset => <div key={asset.file} className="foreground-prop" data-stone={asset.motion === 'stone' ? '' : undefined}>
        <BackgroundImage {...imageProps} asset={asset} x={asset.x} />
      </div>)}
    </div>
    <ForegroundVegetation scene={scene} />
    <canvas ref={canvas} className="foreground-canvas" style={{ zIndex: config.frontLayers.grass }} />
    <div className="background-ground" data-ground style={{ zIndex: config.frontLayers.ground,
      '--ground-edge': `${edge}px`, '--ground-width': `${scene.ground.width * scale}px`,
      '--ground-edge-image-height': `${scene.ground.height * scale * edge}px`,
      '--ground-image': `url("${getBackgroundAssetUrl(scene.assetDirectory, scene.ground.file)}")`,
    } as CSSProperties}>
      <BackgroundImage {...imageProps} asset={scene.ground} x={0} />
      <div className="foreground-ground-edge" />
    </div>
  </div>;
}
