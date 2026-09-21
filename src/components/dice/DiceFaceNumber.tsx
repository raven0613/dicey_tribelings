import { useGameViewport } from '../layout/GameViewportContext';
import { useId } from 'react';
import { DICE_NUMBER_PRESENTATION as config } from '../../configs/dicePresentationConfig';
import { getNumberPaint } from '../../service/dice/diceNumberPaint';
import type { CreatureTag } from '../../types/creatures';

interface DiceFaceNumberProps {
  value: number | '?';
  tags: readonly CreatureTag[];
  scale?: number;
  unitScale: number;
  spinning?: boolean;
}

export function DiceFaceNumber({ value, tags, unitScale, scale = 1, spinning = false }: DiceFaceNumberProps) {
  const { minimumFontSize } = useGameViewport();
  const id = `die-number-${useId()}`;
  const paint = getNumberPaint(tags);
  const fontSize = Math.max(minimumFontSize / unitScale,
    Math.min(config.fontSize, config.maxWidth / (String(value).length * 0.65)));
  const width = Math.min(config.maxWidth, String(value).length * fontSize * 0.65);
  const x = value === '?' ? 50 : config.x;
  const y = value === '?' ? 62 : config.y;
  const centerX = value === '?' ? x : x - width / 2;
  const centerY = y - fontSize * 0.38;
  const angle = paint.angle * Math.PI / 180;
  const dx = Math.cos(angle) * width / 2;
  const dy = Math.sin(angle) * width / 2;

  return <>
    <defs>
      <linearGradient id={id} gradientUnits="userSpaceOnUse"
        x1={centerX - dx} y1={centerY - dy} x2={centerX + dx} y2={centerY + dy}>
        {paint.colors.flatMap((color, index) => paint.hardSplit ? [
          <stop key={`${index}-start`} offset={index / paint.colors.length} stopColor={color} />,
          <stop key={`${index}-end`} offset={(index + 1) / paint.colors.length} stopColor={color} />,
        ] : [<stop key={color} offset={index / (paint.colors.length - 1)} stopColor={color} />])}
      </linearGradient>
    </defs>
    <text x={x} y={y} textAnchor={value === '?' ? 'middle' : 'end'} className="dice-face-number"
      fill={`url(#${id})`} stroke={config.strokeColor} strokeWidth={config.strokeWidth}
      strokeLinejoin="round" paintOrder="stroke fill"
      style={{ fontFamily: config.fontFamily, fontWeight: config.fontWeight, fontSize,
        opacity: spinning ? 0.65 : 1, transform: `scale(${scale})`, transformOrigin: `${centerX}px ${centerY}px` }}>
      {value}
    </text>
  </>;
}
