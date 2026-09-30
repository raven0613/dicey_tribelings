import type { BackgroundScene } from '../../types/background';
import { BACKGROUND_PRESENTATION as config } from '../../configs/backgrounds/backgroundConfig';
import { BackgroundImage } from './BackgroundImage';

/** Static presentation stays visible until the mesh renderer has uploaded every texture. */
export function ForegroundVegetation({ scene }: { scene: BackgroundScene }) {
  const imageProps = { directory: scene.assetDirectory, scale: config.width / scene.sourceWidth };
  return <>
    <div className="foreground-static background-hanging" style={{ zIndex: config.frontLayers.hanging }}>
      {scene.hanging.map(asset => <BackgroundImage key={asset.file} {...imageProps} asset={asset} x={asset.x} anchor="top" />)}
    </div>
    <div className="foreground-static background-baseline" style={{ zIndex: config.frontLayers.grass }}>
      {[...scene.grass].sort((a, b) => b.id - a.id).map(group => <div key={group.id}
        className="background-grass-group" data-grass-group={group.id} style={{ left: group.x }}>
        {group.leaves.map(asset => <BackgroundImage key={asset.file} {...imageProps} asset={asset} x={asset.localX} />)}
      </div>)}
    </div>
  </>;
}
