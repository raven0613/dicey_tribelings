import type { CSSProperties } from 'react';
import type { FaceMaterial } from '../../types/materials';
import { MATERIAL_CONFIG, ULTRA_MATERIALS } from '../../configs/materials/materialConfig';
export function materialStyle(material?: FaceMaterial): CSSProperties {
  return material ? { '--material-color': MATERIAL_CONFIG[material].color, '--material-surface': MATERIAL_CONFIG[material].surface } as CSSProperties : {};
}
export function MaterialBadge({ material, description = false }: { material?: FaceMaterial; description?: boolean }) {
  if (!material) return null;
  const meta = MATERIAL_CONFIG[material];
  return <span className="material-info" style={materialStyle(material)}>
    <span className="material-badge" title={meta.description}>
      <span aria-hidden="true">{meta.symbol}</span>{meta.name}{ULTRA_MATERIALS.includes(material) && <small>超稀有</small>}
    </span>
    {description && <span className="material-description">{meta.description}</span>}
  </span>;
}
