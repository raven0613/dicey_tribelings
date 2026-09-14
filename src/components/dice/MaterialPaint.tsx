import type { FaceMaterial } from '../../types/materials';
import { MATERIAL_CONFIG } from '../../configs/materials/materialConfig';

/** SVG face coating shares the same symbols and palette as reward and inventory surfaces. */
export function MaterialPaint({ material, id }: { material: FaceMaterial; id: string }) {
  const meta = MATERIAL_CONFIG[material];
  return <pattern id={id} width="100" height="100" patternUnits="userSpaceOnUse">
    <rect width="100" height="100" fill={meta.surface} />
    <g stroke={meta.color} strokeWidth="2" fill="none" opacity="0.6">
      {material === 'mirror' && <path d="M0 0L100 100M0 60L60 0M40 100L100 40M0 30H100" />}
      {material === 'resonance' && <><circle cx="50" cy="50" r="40" /><circle cx="50" cy="50" r="30" /></>}
      {material === 'shock' && <path d="M10 0L0 30M40 0L5 100M70 0L35 100M100 0L65 100M100 40L80 100" />}
      {material === 'vial' && <path d="M20 12Q5 35 20 35Q35 35 20 12ZM80 65Q65 90 80 90Q95 90 80 65Z" />}
      {material === 'ripple' && <path d="M0 20Q25 0 50 20T100 20M0 35Q25 15 50 35T100 35M0 85Q25 65 50 85T100 85" />}
      {material === 'gilded' && <path d="M20 8V32M8 20H32M70 65V95M55 80H85M65 15L75 25M75 15L65 25" />}
      {material === 'foil' && <path d="M0 10H100M0 20H100M0 80H100M0 90H100M10 0V100M90 0V100" />}
      {material === 'negative' && <path d="M0 0H50V100H100" strokeWidth="12" />}
      {material === 'echo' && <><circle cx="38" cy="48" r="35" /><circle cx="62" cy="48" r="35" /></>}
    </g>
    {material === 'iridescent' && ['#f9a8d4', '#c4b5fd', '#7dd3fc', '#6ee7b7', '#fde68a'].map((color, i) =>
      <path key={color} d={`M${i * 25 - 30} 0l50 100h25L${i * 25 - 5} 0Z`} fill={color} opacity="0.75" />)}
  </pattern>;
}
