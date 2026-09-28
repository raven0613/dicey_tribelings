import { BACKGROUND_PRESENTATION as config } from '../../configs/backgrounds/backgroundConfig';
import type { BackgroundScene } from '../../types/background';
import { BackgroundImage } from './BackgroundImage';

export function BackgroundScenery({ scene }: { scene: BackgroundScene }) {
  const imageProps = { directory: scene.assetDirectory, scale: config.width / scene.sourceWidth };
  const grassGroups = [...scene.grass].sort((a, b) => b.id - a.id);

  return <>
    {scene.back.map((group) => <div key={group.layer} aria-hidden="true"
      className="background-plane background-back" data-back-layer={group.layer}
      style={{ zIndex: config.layers.back[group.layer] }}>
      {group.images.map((asset) => <BackgroundImage key={asset.file} {...imageProps} asset={asset} x={asset.x} />)}
    </div>)}
    <div className="background-plane background-front" aria-hidden="true" style={{ zIndex: config.layers.front }}>
      <div className="background-baseline" style={{ zIndex: config.frontLayers.props }}>
        {scene.props.map((asset) => <BackgroundImage key={asset.file} {...imageProps} asset={asset} x={asset.x} />)}
      </div>
      <div className="background-hanging" style={{ zIndex: config.frontLayers.hanging }}>
        {scene.hanging.map((asset) => <BackgroundImage key={asset.file} {...imageProps}
          asset={asset} x={asset.x} anchor="top" />)}
      </div>
      <div className="background-baseline" style={{ zIndex: config.frontLayers.grass }}>
        {grassGroups.map((group) => <div key={group.id} className="background-grass-group"
          data-grass-group={group.id} style={{ left: group.x }}>
          {group.leaves.map((asset) => <BackgroundImage key={asset.file} {...imageProps} asset={asset} x={asset.localX} />)}
        </div>)}
      </div>
      <div className="background-ground" style={{ zIndex: config.frontLayers.ground }}>
        <BackgroundImage {...imageProps} asset={scene.ground} x={0} />
      </div>
    </div>
  </>;
}
