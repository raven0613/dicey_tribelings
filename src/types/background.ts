export type BackgroundDepth = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface BackgroundImageAsset {
  file: string;
  width: number;
  height: number;
}

export interface BackgroundSprite extends BackgroundImageAsset {
  x: number;
}

export interface BackgroundGrassLeaf extends BackgroundImageAsset {
  localX: number;
}

export interface BackgroundScene {
  assetDirectory: string;
  color: string;
  sourceWidth: number;
  baselineBottom: number;
  baselineTop: number;
  fullBackground: {
    file: string;
    brightness: number;
    blur: number;
  };
  back: readonly {
    layer: BackgroundDepth;
    images: readonly BackgroundSprite[];
  }[];
  grass: readonly {
    id: number;
    x: number;
    leaves: readonly BackgroundGrassLeaf[];
  }[];
  props: readonly BackgroundSprite[];
  hanging: readonly BackgroundSprite[];
  ground: BackgroundImageAsset;
}
