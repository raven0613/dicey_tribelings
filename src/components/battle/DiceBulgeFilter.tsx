import { useEffect, useRef } from 'react';
import displacementMap from '../../assets/dice-bulge-map.png';
import { ATTACK_EMPHASIS } from '../../configs/attackPresentationConfig';

interface DiceBulgeFilterProps { id: string; strength: number; duration: number }

/** The map encodes inward sampling vectors, making the visible center swell outward. */
export function DiceBulgeFilter({ id, strength, duration }: DiceBulgeFilterProps) {
  const displacement = useRef<SVGFEDisplacementMapElement>(null);
  const current = useRef(0);
  useEffect(() => {
    const from = current.current;
    const target = strength * ATTACK_EMPHASIS.bulgeScale;
    const started = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const progress = duration ? Math.min(1, (now - started) / duration) : 1;
      // Growing uses the same accelerating curve as the body, without a near-still tail.
      const eased = target > from ? progress ** 2 : 1 - (1 - progress) ** 3;
      current.current = from + (target - from) * eased;
      displacement.current!.setAttribute('scale', String(current.current));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [strength, duration]);

  return <svg width="0" height="0" aria-hidden="true" className="dice-filter-definitions">
    <defs>
      <filter id={id} x="-30%" y="-30%" width="160%" height="160%"
        primitiveUnits="objectBoundingBox" colorInterpolationFilters="sRGB">
        <feFlood floodColor="#808080" result="neutral" />
        <feImage href={displacementMap} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="map" />
        <feMerge result="bulge"><feMergeNode in="neutral" /><feMergeNode in="map" /></feMerge>
        <feDisplacementMap ref={displacement} in="SourceGraphic" in2="bulge" scale="0"
          xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  </svg>;
}
